CREATE TABLE IF NOT EXISTS public.apks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  version TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  download_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.apks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view apks" ON public.apks;
DROP POLICY IF EXISTS "Authenticated users can insert apks" ON public.apks;
DROP POLICY IF EXISTS "Authenticated users can update apks" ON public.apks;
DROP POLICY IF EXISTS "Authenticated users can delete apks" ON public.apks;

CREATE POLICY "Authenticated users can view apks"
ON public.apks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert apks"
ON public.apks
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update apks"
ON public.apks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete apks"
ON public.apks
FOR DELETE
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_apks_store_id ON public.apks(store_id);
CREATE INDEX IF NOT EXISTS idx_apks_active ON public.apks(active);
CREATE INDEX IF NOT EXISTS idx_apks_download_token ON public.apks(download_token);