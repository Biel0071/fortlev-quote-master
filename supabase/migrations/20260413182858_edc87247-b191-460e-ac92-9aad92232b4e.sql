ALTER TABLE public.app_short_links
  ADD COLUMN IF NOT EXISTS campaign_origin text,
  ADD COLUMN IF NOT EXISTS link_type text NOT NULL DEFAULT 'page',
  ADD COLUMN IF NOT EXISTS token_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_short_links_token_id_fkey'
      AND conrelid = 'public.app_short_links'::regclass
  ) THEN
    ALTER TABLE public.app_short_links
      ADD CONSTRAINT app_short_links_token_id_fkey
      FOREIGN KEY (token_id) REFERENCES public.app_shortener_tokens(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_short_links_link_type_check'
      AND conrelid = 'public.app_short_links'::regclass
  ) THEN
    ALTER TABLE public.app_short_links
      ADD CONSTRAINT app_short_links_link_type_check
      CHECK (link_type IN ('apk','product','page'));
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.app_short_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id uuid NOT NULL REFERENCES public.app_short_links(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  session_token text,
  token_prefix text,
  ip_hash text,
  user_agent text,
  device text,
  browser text,
  country text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,
  utm_source text,
  utm_campaign text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_short_link_clicks_short_link_id ON public.app_short_link_clicks(short_link_id);
CREATE INDEX IF NOT EXISTS idx_app_short_link_clicks_store_id ON public.app_short_link_clicks(store_id);
CREATE INDEX IF NOT EXISTS idx_app_short_link_clicks_created_at ON public.app_short_link_clicks(created_at DESC);

CREATE TABLE IF NOT EXISTS public.apk_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  short_link_id uuid REFERENCES public.app_short_links(id) ON DELETE SET NULL,
  session_token text,
  source_campaign text,
  utm_source text,
  utm_campaign text,
  ip_hash text,
  country text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,
  device text,
  browser text,
  user_agent text,
  status text NOT NULL DEFAULT 'downloaded',
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  returned_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'apk_downloads_status_check'
      AND conrelid = 'public.apk_downloads'::regclass
  ) THEN
    ALTER TABLE public.apk_downloads
      ADD CONSTRAINT apk_downloads_status_check
      CHECK (status IN ('downloaded','returned','active'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_apk_downloads_store_id ON public.apk_downloads(store_id);
CREATE INDEX IF NOT EXISTS idx_apk_downloads_downloaded_at ON public.apk_downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_apk_downloads_short_link_id ON public.apk_downloads(short_link_id);

CREATE TABLE IF NOT EXISTS public.analytics_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  sessions integer NOT NULL DEFAULT 0,
  events integer NOT NULL DEFAULT 0,
  hot_leads integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_summary_store_date ON public.analytics_summary(store_id, summary_date DESC);

ALTER TABLE public.app_short_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apk_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_summary ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_short_link_clicks' AND policyname='Admins can manage app_short_link_clicks'
  ) THEN
    CREATE POLICY "Admins can manage app_short_link_clicks"
      ON public.app_short_link_clicks
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='apk_downloads' AND policyname='Admins can manage apk_downloads'
  ) THEN
    CREATE POLICY "Admins can manage apk_downloads"
      ON public.apk_downloads
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analytics_summary' AND policyname='Admins can manage analytics_summary'
  ) THEN
    CREATE POLICY "Admins can manage analytics_summary"
      ON public.analytics_summary
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_analytics_summary_updated_at'
      AND tgrelid = 'public.analytics_summary'::regclass
  ) THEN
    CREATE TRIGGER trg_analytics_summary_updated_at
      BEFORE UPDATE ON public.analytics_summary
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at_app_shortener();
  END IF;
END$$;