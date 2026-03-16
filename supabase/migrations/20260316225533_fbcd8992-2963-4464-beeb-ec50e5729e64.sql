
-- Create review_image_pool table
CREATE TABLE public.review_image_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  source text NOT NULL DEFAULT 'scraper_review',
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_review_image_pool_product ON public.review_image_pool(product_id);
CREATE UNIQUE INDEX idx_review_image_pool_unique ON public.review_image_pool(product_id, image_url);

-- Enable RLS
ALTER TABLE public.review_image_pool ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage review image pool"
  ON public.review_image_pool FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public can read
CREATE POLICY "Public can read review image pool"
  ON public.review_image_pool FOR SELECT
  TO public
  USING (true);
