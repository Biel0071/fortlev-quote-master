
CREATE TABLE public.image_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.store_products(id) ON DELETE CASCADE,
  images_found INT NOT NULL DEFAULT 0,
  images_saved INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  processing_time INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.image_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage image_import_logs"
  ON public.image_import_logs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_image_import_logs_product ON public.image_import_logs(product_id);
CREATE INDEX idx_image_import_logs_created ON public.image_import_logs(created_at DESC);
