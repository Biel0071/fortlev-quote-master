
CREATE TABLE public.store_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL DEFAULT 'app',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT 'app.apk',
  file_size BIGINT DEFAULT 0,
  version TEXT DEFAULT '1.0.0',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_store_apps_active_store ON public.store_apps(store_id) WHERE active = true;

ALTER TABLE public.store_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store_apps"
  ON public.store_apps FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read active store_apps"
  ON public.store_apps FOR SELECT
  TO public
  USING (active = true);
