-- Cache de buscas de imagens por termo (TTL lógico de 24h controlado na função)
CREATE TABLE IF NOT EXISTS public.search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL UNIQUE,
  images_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Controle de limite diário de buscas por usuário
CREATE TABLE IF NOT EXISTS public.search_image_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  searches_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT search_image_usage_user_date_unique UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_search_cache_created_at ON public.search_cache (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_image_usage_date ON public.search_image_usage (usage_date DESC);

ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_image_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'search_cache' AND policyname = 'Admins can manage search cache'
  ) THEN
    CREATE POLICY "Admins can manage search cache"
    ON public.search_cache
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'search_image_usage' AND policyname = 'Admins can manage search image usage'
  ) THEN
    CREATE POLICY "Admins can manage search image usage"
    ON public.search_image_usage
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_search_cache_updated_at'
  ) THEN
    CREATE TRIGGER trg_search_cache_updated_at
    BEFORE UPDATE ON public.search_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_search_image_usage_updated_at'
  ) THEN
    CREATE TRIGGER trg_search_image_usage_updated_at
    BEFORE UPDATE ON public.search_image_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;