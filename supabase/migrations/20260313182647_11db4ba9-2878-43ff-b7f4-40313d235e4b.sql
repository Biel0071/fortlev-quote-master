
CREATE TABLE public.scrape_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_urls INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL DEFAULT 0,
  total_products INTEGER NOT NULL DEFAULT 0,
  execution_time_seconds FLOAT NOT NULL DEFAULT 0,
  domains TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed'
);

ALTER TABLE public.scrape_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scrape_history"
  ON public.scrape_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated admins can insert scrape_history"
  ON public.scrape_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated admins can delete scrape_history"
  ON public.scrape_history FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
