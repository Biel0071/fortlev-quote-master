-- Tracking/session hardening
ALTER TABLE public.user_sessions
ADD COLUMN IF NOT EXISTS temperature text NOT NULL DEFAULT 'frio';

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
  NEW.temperature := NEW.status;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_session_status ON public.user_sessions;
CREATE TRIGGER trg_sync_user_session_status
BEFORE INSERT OR UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_session_status();

-- Required performance indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON public.user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_created_at ON public.store_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_store_products_category_id ON public.store_products(category_id);

-- Structured logs for critical events/errors
CREATE TABLE IF NOT EXISTS public.system_event_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info',
  event_type text NOT NULL,
  source text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_event_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_event_logs'
      AND policyname = 'Admins can manage system logs'
  ) THEN
    CREATE POLICY "Admins can manage system logs"
    ON public.system_event_logs
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Basic generic rate-limit table
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_key_created_at
  ON public.rate_limit_events(key, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rate_limit_events'
      AND policyname = 'Admins can manage rate limit events'
  ) THEN
    CREATE POLICY "Admins can manage rate limit events"
    ON public.rate_limit_events
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Server-side helper for edge functions
CREATE OR REPLACE FUNCTION public.check_rate_limit(_key text, _event_type text, _window_seconds integer, _max_hits integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF coalesce(length(trim(_key)), 0) = 0 THEN
    RETURN false;
  END IF;

  IF coalesce(_window_seconds, 0) <= 0 OR coalesce(_max_hits, 0) <= 0 THEN
    RETURN true;
  END IF;

  DELETE FROM public.rate_limit_events
  WHERE created_at < now() - make_interval(secs => _window_seconds);

  SELECT count(*) INTO v_count
  FROM public.rate_limit_events
  WHERE key = _key
    AND event_type = _event_type
    AND created_at >= now() - make_interval(secs => _window_seconds);

  IF v_count >= _max_hits THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_events(key, event_type)
  VALUES (_key, _event_type);

  RETURN true;
END;
$$;