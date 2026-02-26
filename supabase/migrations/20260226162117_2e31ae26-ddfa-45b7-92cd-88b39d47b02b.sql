-- visitor tracking (clickstream) table
CREATE TABLE IF NOT EXISTS public.visitor_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_token text NOT NULL,
  event_type text NOT NULL,
  path text NULL,
  product_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_visitor_tracking_created_at ON public.visitor_tracking (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_session ON public.visitor_tracking (session_token);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_event_type ON public.visitor_tracking (event_type);

ALTER TABLE public.visitor_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read visitor_tracking"
ON public.visitor_tracking
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage visitor_tracking"
ON public.visitor_tracking
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- cookie consent audit table (hashed)
CREATE TABLE IF NOT EXISTS public.cookie_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_token text NOT NULL,
  consent text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text NULL,
  user_agent_hash text NULL
);

CREATE INDEX IF NOT EXISTS idx_cookie_consent_created_at ON public.cookie_consent (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cookie_consent_session ON public.cookie_consent (session_token);

ALTER TABLE public.cookie_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read cookie_consent"
ON public.cookie_consent
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage cookie_consent"
ON public.cookie_consent
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
