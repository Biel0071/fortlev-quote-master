
-- Daily reviews engine configuration
CREATE TABLE public.reviews_daily_engine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  max_reviews_per_day integer NOT NULL DEFAULT 40,
  min_reviews_per_day integer NOT NULL DEFAULT 5,
  max_reviews_per_product integer NOT NULL DEFAULT 3,
  max_total_per_product integer NOT NULL DEFAULT 150,
  start_hour integer NOT NULL DEFAULT 8,
  end_hour integer NOT NULL DEFAULT 22,
  image_percentage integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews_daily_engine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage daily engine config"
  ON public.reviews_daily_engine FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read daily engine config"
  ON public.reviews_daily_engine FOR SELECT TO public
  USING (true);

-- Daily engine run log
CREATE TABLE public.reviews_daily_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  reviews_generated integer NOT NULL DEFAULT 0,
  images_attached integer NOT NULL DEFAULT 0,
  products_covered integer NOT NULL DEFAULT 0,
  target_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews_daily_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage daily runs"
  ON public.reviews_daily_runs FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read daily runs"
  ON public.reviews_daily_runs FOR SELECT TO public
  USING (true);

-- Seed default config row
INSERT INTO public.reviews_daily_engine (enabled, max_reviews_per_day, min_reviews_per_day)
VALUES (false, 40, 5);
