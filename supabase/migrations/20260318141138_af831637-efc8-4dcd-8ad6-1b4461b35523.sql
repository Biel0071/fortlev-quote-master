
-- Gateways table
CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'allowpay',
  status text NOT NULL DEFAULT 'inactive',
  api_key_encrypted text,
  secret_key_encrypted text,
  webhook_url text,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage gateways" ON public.payment_gateways FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Transactions table
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.store_orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'pix',
  status text NOT NULL DEFAULT 'pending',
  gateway_id uuid REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  external_id text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage transactions" ON public.payment_transactions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Checkouts table
CREATE TABLE public.payment_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  product_id uuid REFERENCES public.store_products(id) ON DELETE SET NULL,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  template text NOT NULL DEFAULT 'default',
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payment checkouts" ON public.payment_checkouts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Webhooks table
CREATE TABLE public.payment_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'gateway',
  response_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payment webhooks" ON public.payment_webhooks FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- API Keys table
CREATE TABLE public.payment_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '["read"]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payment api keys" ON public.payment_api_keys FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
