
-- Payment methods configuration
CREATE TABLE public.payment_methods_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL UNIQUE CHECK (method IN ('pix','card','boleto')),
  enabled BOOLEAN DEFAULT true,
  config_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payment_methods_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read payment_methods_config" ON public.payment_methods_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage payment_methods_config" ON public.payment_methods_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fraud rules
CREATE TABLE public.payment_fraud_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payment_fraud_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage fraud_rules" ON public.payment_fraud_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Blacklist
CREATE TABLE public.payment_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('email','cpf','ip','card')),
  value TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payment_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage blacklist" ON public.payment_blacklist FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Subscription plans
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'mensal',
  trial_days INT DEFAULT 0,
  gateway_id UUID REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read plans" ON public.subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage plans" ON public.subscription_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Subscriptions
CREATE TABLE public.payment_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  status TEXT DEFAULT 'active',
  next_billing_at TIMESTAMPTZ,
  gateway_id UUID REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payment_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage subscriptions" ON public.payment_subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Payment logs
CREATE TABLE public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  direction TEXT DEFAULT 'outbound',
  method TEXT,
  url TEXT,
  request_body JSONB DEFAULT '{}'::jsonb,
  response_body JSONB DEFAULT '{}'::jsonb,
  status_code INT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can read logs" ON public.payment_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add rate fields to payment_gateways
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS rate_percent NUMERIC DEFAULT 0;
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS rate_fixed NUMERIC DEFAULT 0;
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS supported_currencies TEXT[] DEFAULT ARRAY['BRL'];
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS supported_methods TEXT[] DEFAULT ARRAY['pix','card','boleto'];
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'production';
ALTER TABLE public.payment_gateways ADD COLUMN IF NOT EXISTS api_url TEXT;

-- Add fields to payment_checkouts
ALTER TABLE public.payment_checkouts ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.payment_checkouts ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.payment_checkouts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.payment_checkouts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.payment_checkouts ADD COLUMN IF NOT EXISTS gateway_id UUID REFERENCES public.payment_gateways(id) ON DELETE SET NULL;
ALTER TABLE public.payment_checkouts ADD COLUMN IF NOT EXISTS allowed_methods TEXT[] DEFAULT ARRAY['pix','card','boleto'];
ALTER TABLE public.payment_checkouts ADD COLUMN IF NOT EXISTS checkout_url TEXT;
