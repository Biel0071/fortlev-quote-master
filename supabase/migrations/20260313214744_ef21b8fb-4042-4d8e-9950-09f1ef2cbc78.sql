-- Reviews system tables
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  author_location text,
  rating integer NOT NULL DEFAULT 5,
  title text,
  content text NOT NULL DEFAULT '',
  pros text,
  cons text,
  verified_purchase boolean NOT NULL DEFAULT false,
  approved boolean NOT NULL DEFAULT false,
  origin text NOT NULL DEFAULT 'ai_generated',
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_rating_summary (
  product_id uuid PRIMARY KEY REFERENCES public.store_products(id) ON DELETE CASCADE,
  average_rating numeric NOT NULL DEFAULT 0,
  total_reviews integer NOT NULL DEFAULT 0,
  rating_1 integer NOT NULL DEFAULT 0,
  rating_2 integer NOT NULL DEFAULT 0,
  rating_3 integer NOT NULL DEFAULT 0,
  rating_4 integer NOT NULL DEFAULT 0,
  rating_5 integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_rating_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved reviews" ON public.product_reviews
  FOR SELECT TO public USING (approved = true);
CREATE POLICY "Admins can manage reviews" ON public.product_reviews
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read review images" ON public.review_images
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM public.product_reviews r WHERE r.id = review_id AND r.approved = true)
  );
CREATE POLICY "Admins can manage review images" ON public.review_images
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read rating summaries" ON public.product_rating_summary
  FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage rating summaries" ON public.product_rating_summary
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.recalculate_rating_summary(_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO product_rating_summary (product_id, average_rating, total_reviews, rating_1, rating_2, rating_3, rating_4, rating_5, updated_at)
  SELECT
    _product_id,
    COALESCE(AVG(rating), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE rating = 1),
    COUNT(*) FILTER (WHERE rating = 2),
    COUNT(*) FILTER (WHERE rating = 3),
    COUNT(*) FILTER (WHERE rating = 4),
    COUNT(*) FILTER (WHERE rating = 5),
    now()
  FROM product_reviews
  WHERE product_id = _product_id AND approved = true
  ON CONFLICT (product_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_reviews = EXCLUDED.total_reviews,
    rating_1 = EXCLUDED.rating_1,
    rating_2 = EXCLUDED.rating_2,
    rating_3 = EXCLUDED.rating_3,
    rating_4 = EXCLUDED.rating_4,
    rating_5 = EXCLUDED.rating_5,
    updated_at = now();
END;
$$;