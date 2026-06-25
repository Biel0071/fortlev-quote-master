
-- API Keys table
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  key text UNIQUE NOT NULL DEFAULT ('sk_' || encode(gen_random_bytes(32), 'hex')),
  permissions text[] NOT NULL DEFAULT ARRAY['quotation:read','quotation:create']::text[],
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage api_keys"
  ON public.api_keys FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_api_keys_store ON public.api_keys(store_id);
CREATE INDEX idx_api_keys_key ON public.api_keys(key) WHERE active = true;

CREATE TRIGGER trg_api_keys_updated
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- API Webhooks table
CREATE TABLE public.api_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event text NOT NULL,
  url text NOT NULL,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_webhooks TO authenticated;
GRANT ALL ON public.api_webhooks TO service_role;

ALTER TABLE public.api_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage api_webhooks"
  ON public.api_webhooks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_api_webhooks_store_event ON public.api_webhooks(store_id, event) WHERE active = true;

CREATE TRIGGER trg_api_webhooks_updated
  BEFORE UPDATE ON public.api_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
