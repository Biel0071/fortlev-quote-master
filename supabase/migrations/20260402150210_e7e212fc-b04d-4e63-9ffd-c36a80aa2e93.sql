
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS is_promotion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_percentage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promotion_limit_per_customer integer DEFAULT NULL;
