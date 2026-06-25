ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS quota_limit integer NOT NULL DEFAULT 0;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS quota_used integer NOT NULL DEFAULT 0;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS quota_reset_at timestamptz;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS rate_limit integer NOT NULL DEFAULT 60;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.reset_api_quotas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.api_keys
  SET quota_used = 0, quota_reset_at = now()
  WHERE quota_limit > 0
    AND (quota_reset_at IS NULL OR quota_reset_at < now() - interval '30 days');
$$;