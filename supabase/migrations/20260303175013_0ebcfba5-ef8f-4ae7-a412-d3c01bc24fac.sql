-- Advanced user tracking tables
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  session_id TEXT NOT NULL UNIQUE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device TEXT NOT NULL DEFAULT 'unknown',
  source TEXT NOT NULL DEFAULT 'direct',
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  scroll_depth NUMERIC(5,2) NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'frio',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES public.user_sessions(session_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen_at ON public.user_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON public.user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_score ON public.user_sessions(score DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON public.user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type_created_at ON public.user_events(type, created_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'Admins can manage user_sessions'
  ) THEN
    CREATE POLICY "Admins can manage user_sessions"
    ON public.user_sessions
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_events' AND policyname = 'Admins can manage user_events'
  ) THEN
    CREATE POLICY "Admins can manage user_events"
    ON public.user_events
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.classify_user_session_status(_score integer)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN coalesce(_score, 0) >= 71 THEN 'quente'
    WHEN coalesce(_score, 0) >= 31 THEN 'morno'
    ELSE 'frio'
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_session_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.score := GREATEST(0, coalesce(NEW.score, 0));
  NEW.total_time_seconds := GREATEST(0, coalesce(NEW.total_time_seconds, 0));
  NEW.total_pages := GREATEST(0, coalesce(NEW.total_pages, 0));
  NEW.total_clicks := GREATEST(0, coalesce(NEW.total_clicks, 0));
  NEW.scroll_depth := LEAST(100, GREATEST(0, coalesce(NEW.scroll_depth, 0)));
  NEW.status := public.classify_user_session_status(NEW.score);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_session_status ON public.user_sessions;
CREATE TRIGGER trg_sync_user_session_status
BEFORE INSERT OR UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_session_status();