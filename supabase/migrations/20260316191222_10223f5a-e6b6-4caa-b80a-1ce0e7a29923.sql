
-- Product recommendations table for upsell/cross-sell
CREATE TABLE public.product_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  recommended_product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'related' CHECK (type IN ('upsell', 'cross_sell', 'related')),
  score numeric NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, recommended_product_id, type)
);

ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read recommendations" ON public.product_recommendations
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage recommendations" ON public.product_recommendations
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
