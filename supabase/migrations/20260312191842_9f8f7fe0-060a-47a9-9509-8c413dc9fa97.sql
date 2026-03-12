-- Fix: allow public to read active products regardless of status
DROP POLICY IF EXISTS "Public can read active products" ON public.store_products;
CREATE POLICY "Public can read active products"
  ON public.store_products
  FOR SELECT
  TO public
  USING (active = true);

-- Also update all active products to published status for consistency
UPDATE public.store_products SET status = 'published' WHERE active = true AND status = 'draft';