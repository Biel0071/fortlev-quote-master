
GRANT SELECT ON public.product_comments TO anon, authenticated;
GRANT INSERT ON public.product_comments TO anon, authenticated;
GRANT ALL ON public.product_comments TO service_role;

DROP POLICY IF EXISTS "Public can insert comments for published products" ON public.product_comments;
CREATE POLICY "Public can insert comments for published products"
  ON public.product_comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_products p
      WHERE p.id = product_comments.product_id
        AND p.active = true
        AND p.status = 'published'
    )
    AND char_length(trim(author_name)) BETWEEN 2 AND 60
    AND char_length(trim(comment_text)) BETWEEN 3 AND 1000
    AND rating BETWEEN 1 AND 5
  );
