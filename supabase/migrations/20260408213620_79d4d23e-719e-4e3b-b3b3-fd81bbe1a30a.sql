CREATE TABLE IF NOT EXISTS public.quotation_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_preview TEXT NOT NULL,
  responsible_name TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  max_requests_per_hour INTEGER NOT NULL DEFAULT 120,
  created_by UUID,
  last_access_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quotation_access_tokens_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT quotation_access_tokens_rate_limit_check CHECK (max_requests_per_hour > 0)
);

CREATE INDEX IF NOT EXISTS idx_quotation_access_tokens_store_id ON public.quotation_access_tokens(store_id);
CREATE INDEX IF NOT EXISTS idx_quotation_access_tokens_status ON public.quotation_access_tokens(status);
CREATE INDEX IF NOT EXISTS idx_quotation_access_tokens_expires_at ON public.quotation_access_tokens(expires_at);

DROP TRIGGER IF EXISTS trg_quotation_access_tokens_updated_at ON public.quotation_access_tokens;
CREATE TRIGGER trg_quotation_access_tokens_updated_at
BEFORE UPDATE ON public.quotation_access_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.quotation_access_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage quotation access tokens" ON public.quotation_access_tokens;
CREATE POLICY "Admins can manage quotation access tokens"
ON public.quotation_access_tokens
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.token_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES public.quotation_access_tokens(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  ip TEXT,
  user_agent TEXT,
  action TEXT NOT NULL,
  quotation_type TEXT,
  quotation_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_logs_token_id ON public.token_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_token_logs_store_id ON public.token_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_token_logs_action ON public.token_logs(action);
CREATE INDEX IF NOT EXISTS idx_token_logs_created_at ON public.token_logs(created_at DESC);

ALTER TABLE public.token_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read token logs" ON public.token_logs;
CREATE POLICY "Admins can read token logs"
ON public.token_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.fortlev_quotations
ADD COLUMN IF NOT EXISTS source_token_id UUID REFERENCES public.quotation_access_tokens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_via_token BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_fortlev_quotations_source_token_id ON public.fortlev_quotations(source_token_id);

ALTER TABLE public.construction_quotations
ADD COLUMN IF NOT EXISTS source_token_id UUID REFERENCES public.quotation_access_tokens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_via_token BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_construction_quotations_source_token_id ON public.construction_quotations(source_token_id);