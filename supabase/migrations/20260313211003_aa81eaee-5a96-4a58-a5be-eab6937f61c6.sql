CREATE TABLE IF NOT EXISTS public.cache_product_interpretation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name_hash text NOT NULL UNIQUE,
  product_name text NOT NULL,
  interpretation jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_queries_layered jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_acceptance_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_rejection_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_image_prompt text,
  description text,
  technical_sheet jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cache_product_interpretation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage interpretation cache"
  ON public.cache_product_interpretation
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));