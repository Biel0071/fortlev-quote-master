-- Unified tracking model
CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device TEXT NOT NULL DEFAULT 'unknown',
  source TEXT NOT NULL DEFAULT 'direct',
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  scroll_depth INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  temperature TEXT NOT NULL DEFAULT 'frio',
  CONSTRAINT tracking_sessions_temperature_check CHECK (temperature IN ('frio', 'morno', 'quente')),
  CONSTRAINT tracking_sessions_total_time_non_negative CHECK (total_time_seconds >= 0),
  CONSTRAINT tracking_sessions_total_pages_non_negative CHECK (total_pages >= 0),
  CONSTRAINT tracking_sessions_total_clicks_non_negative CHECK (total_clicks >= 0),
  CONSTRAINT tracking_sessions_scroll_depth_range CHECK (scroll_depth >= 0 AND scroll_depth <= 100),
  CONSTRAINT tracking_sessions_score_non_negative CHECK (score >= 0)
);

CREATE TABLE IF NOT EXISTS public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.tracking_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  product_id UUID NULL,
  category_id UUID NULL,
  path TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tracking_sessions' AND policyname = 'Admins can manage tracking sessions'
  ) THEN
    CREATE POLICY "Admins can manage tracking sessions"
    ON public.tracking_sessions
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tracking_events' AND policyname = 'Admins can manage tracking events'
  ) THEN
    CREATE POLICY "Admins can manage tracking events"
    ON public.tracking_events
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tracking_sessions' AND policyname = 'Users can read own tracking sessions'
  ) THEN
    CREATE POLICY "Users can read own tracking sessions"
    ON public.tracking_sessions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tracking_events' AND policyname = 'Users can read own tracking events'
  ) THEN
    CREATE POLICY "Users can read own tracking events"
    ON public.tracking_events
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.tracking_sessions s
        WHERE s.id = tracking_events.session_id
          AND s.user_id = auth.uid()
      )
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_session_token ON public.tracking_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_last_seen_at ON public.tracking_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_score ON public.tracking_sessions(score DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_temperature ON public.tracking_sessions(temperature);
CREATE INDEX IF NOT EXISTS idx_tracking_events_session_id ON public.tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_created_at ON public.tracking_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type_created_at ON public.tracking_events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_product_id ON public.tracking_events(product_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_category_id ON public.tracking_events(category_id);