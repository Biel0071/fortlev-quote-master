-- Shipping rules configuration
CREATE TABLE IF NOT EXISTS public.shipping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_freight NUMERIC NOT NULL DEFAULT 30,
  rate_percent NUMERIC NOT NULL DEFAULT 7,
  rate_per_km NUMERIC NOT NULL DEFAULT 0.5,
  max_weight_kg NUMERIC NOT NULL DEFAULT 500,
  max_distance_km NUMERIC NOT NULL DEFAULT 400,
  formula_description TEXT NOT NULL DEFAULT 'Frete = MAX(mínimo, subtotal × taxa%)',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shipping rules" ON public.shipping_rules
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read active shipping rules" ON public.shipping_rules
FOR SELECT TO public
USING (active = true);

-- Shipping zones
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_km NUMERIC NOT NULL DEFAULT 0,
  max_km NUMERIC NOT NULL DEFAULT 50,
  base_price NUMERIC NOT NULL DEFAULT 30,
  per_km_price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read active shipping zones" ON public.shipping_zones
FOR SELECT TO public
USING (active = true);

-- Seed default shipping rule
INSERT INTO public.shipping_rules (min_freight, rate_percent, rate_per_km, max_weight_kg, max_distance_km, formula_description)
VALUES (30, 7, 0.50, 500, 400, 'Frete = MAX(R$30, subtotal × 7%)');

-- Seed default zones
INSERT INTO public.shipping_zones (name, min_km, max_km, base_price, per_km_price, sort_order) VALUES
  ('Local (0-50km)', 0, 50, 30, 0, 1),
  ('Regional (50-100km)', 50, 100, 50, 0.30, 2),
  ('Estadual (100-200km)', 100, 200, 80, 0.40, 3),
  ('Interestadual (200-400km)', 200, 400, 120, 0.50, 4);