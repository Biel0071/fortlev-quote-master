-- Fila de importação de mídia (fotos/vídeos) processada por IA
CREATE TABLE IF NOT EXISTS public.media_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  frame_urls jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','analyzing','creating','completed','failed')),
  progress integer NOT NULL DEFAULT 0,
  ai_result jsonb,
  product_id uuid REFERENCES public.store_products(id) ON DELETE SET NULL,
  error_message text,
  processing_started_at timestamptz,
  completed_at timestamptz,
  batch_id uuid,
  batch_position integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_import_jobs TO authenticated;
GRANT ALL ON public.media_import_jobs TO service_role;

ALTER TABLE public.media_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_import_jobs_admin_all"
  ON public.media_import_jobs
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_store_access usa
      WHERE usa.user_id = auth.uid() AND usa.store_id = media_import_jobs.store_id
    )
    OR EXISTS (
      SELECT 1 FROM public.saas_user_access sua
      WHERE sua.user_id = auth.uid() AND sua.store_id = media_import_jobs.store_id
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_store_access usa
      WHERE usa.user_id = auth.uid() AND usa.store_id = media_import_jobs.store_id
    )
    OR EXISTS (
      SELECT 1 FROM public.saas_user_access sua
      WHERE sua.user_id = auth.uid() AND sua.store_id = media_import_jobs.store_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_media_import_queue
  ON public.media_import_jobs (status, created_at)
  WHERE status IN ('queued','processing');

CREATE INDEX IF NOT EXISTS idx_media_import_store
  ON public.media_import_jobs (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_import_batch
  ON public.media_import_jobs (batch_id, batch_position);

CREATE TRIGGER trg_media_import_jobs_updated_at
  BEFORE UPDATE ON public.media_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Suporte a vídeo na galeria do produto
ALTER TABLE public.store_product_images
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image'
  CHECK (media_type IN ('image','video'));
