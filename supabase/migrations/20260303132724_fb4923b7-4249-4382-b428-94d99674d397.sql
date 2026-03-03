-- Banner system hardening + compatibility + new bucket

-- 1) Ensure site-banners bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-banners', 'site-banners', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    name = EXCLUDED.name;

-- 2) Storage policies for site-banners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can manage site banners'
  ) THEN
    CREATE POLICY "Admins can manage site banners"
    ON storage.objects
    FOR ALL
    USING ((bucket_id = 'site-banners') AND public.has_role(auth.uid(), 'admin'))
    WITH CHECK ((bucket_id = 'site-banners') AND public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can read site banners'
  ) THEN
    CREATE POLICY "Public can read site banners"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'site-banners');
  END IF;
END $$;

-- 3) Ensure requested compatibility columns exist in store_banners
ALTER TABLE public.store_banners
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS is_active boolean,
  ADD COLUMN IF NOT EXISTS position integer;

ALTER TABLE public.store_banners
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN position SET DEFAULT 0;

-- 4) Backfill compatibility columns both directions
UPDATE public.store_banners
SET
  link = COALESCE(NULLIF(TRIM(link), ''), NULLIF(TRIM(link_url), '')),
  link_url = COALESCE(NULLIF(TRIM(link_url), ''), NULLIF(TRIM(link), '')),
  is_active = COALESCE(is_active, active, true),
  active = COALESCE(active, is_active, true),
  position = COALESCE(position, sort_order, 0),
  sort_order = COALESCE(sort_order, position, 0)
WHERE
  link IS DISTINCT FROM COALESCE(NULLIF(TRIM(link), ''), NULLIF(TRIM(link_url), ''))
  OR link_url IS DISTINCT FROM COALESCE(NULLIF(TRIM(link_url), ''), NULLIF(TRIM(link), ''))
  OR is_active IS DISTINCT FROM COALESCE(is_active, active, true)
  OR active IS DISTINCT FROM COALESCE(active, is_active, true)
  OR position IS DISTINCT FROM COALESCE(position, sort_order, 0)
  OR sort_order IS DISTINCT FROM COALESCE(sort_order, position, 0);

-- 5) Keep old/new columns in sync for all inserts/updates
CREATE OR REPLACE FUNCTION public.sync_store_banners_compat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.link_url := COALESCE(NULLIF(TRIM(NEW.link_url), ''), NULLIF(TRIM(NEW.link), ''));
  NEW.link := NEW.link_url;

  NEW.active := COALESCE(NEW.active, NEW.is_active, true);
  NEW.is_active := NEW.active;

  NEW.sort_order := COALESCE(NEW.sort_order, NEW.position, 0);
  NEW.position := NEW.sort_order;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_store_banners_compat ON public.store_banners;
CREATE TRIGGER trg_sync_store_banners_compat
BEFORE INSERT OR UPDATE ON public.store_banners
FOR EACH ROW
EXECUTE FUNCTION public.sync_store_banners_compat();

-- 6) Ensure updated_at is maintained automatically
DROP TRIGGER IF EXISTS trg_store_banners_set_updated_at ON public.store_banners;
CREATE TRIGGER trg_store_banners_set_updated_at
BEFORE UPDATE ON public.store_banners
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();