
-- 1) Expiry / validity window on api_keys
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS starts_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON public.api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- 2) Usage logs table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  ip text,
  user_agent text,
  duration_ms integer,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.api_usage_logs TO authenticated;
GRANT ALL ON public.api_usage_logs TO service_role;

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read api_usage_logs"
  ON public.api_usage_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key_created ON public.api_usage_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_store_created ON public.api_usage_logs(store_id, created_at DESC);
