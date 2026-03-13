-- Allow anyone to insert reviews (they go as pending/unapproved)
CREATE POLICY "Anyone can submit reviews"
ON public.product_reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (
  approved = false
  AND origin = 'customer'
);