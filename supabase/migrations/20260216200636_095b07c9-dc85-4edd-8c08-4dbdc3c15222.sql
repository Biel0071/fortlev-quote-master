-- Add lightweight metrics columns for hybrid featured-products ranking
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS views BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales BIGINT NOT NULL DEFAULT 0;

-- Helpful index for sorting (optional but cheap)
CREATE INDEX IF NOT EXISTS idx_store_products_metrics
  ON public.store_products (views DESC, clicks DESC, sales DESC);
