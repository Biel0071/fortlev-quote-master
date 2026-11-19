ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS featured_order integer NOT NULL DEFAULT 999;

CREATE INDEX IF NOT EXISTS idx_store_products_featured_order
  ON public.store_products (store_id, featured, featured_order);

NOTIFY pgrst, 'reload schema';
