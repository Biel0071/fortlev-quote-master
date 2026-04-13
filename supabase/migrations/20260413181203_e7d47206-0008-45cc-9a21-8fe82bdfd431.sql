CREATE TABLE IF NOT EXISTS public.app_shortener_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'default',
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_shortener_tokens_store_id
  ON public.app_shortener_tokens(store_id);

CREATE INDEX IF NOT EXISTS idx_app_shortener_tokens_active
  ON public.app_shortener_tokens(active);

CREATE TABLE IF NOT EXISTS public.app_short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  original_url text NOT NULL,
  title text,
  created_via text NOT NULL DEFAULT 'admin',
  expires_at timestamp with time zone,
  active boolean NOT NULL DEFAULT true,
  clicks integer NOT NULL DEFAULT 0,
  last_clicked_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_short_links_store_id
  ON public.app_short_links(store_id);

CREATE INDEX IF NOT EXISTS idx_app_short_links_slug
  ON public.app_short_links(slug);

CREATE INDEX IF NOT EXISTS idx_app_short_links_active
  ON public.app_short_links(active);

CREATE OR REPLACE FUNCTION public.set_updated_at_app_shortener()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_shortener_tokens_updated_at ON public.app_shortener_tokens;
CREATE TRIGGER trg_app_shortener_tokens_updated_at
BEFORE UPDATE ON public.app_shortener_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_app_shortener();

DROP TRIGGER IF EXISTS trg_app_short_links_updated_at ON public.app_short_links;
CREATE TRIGGER trg_app_short_links_updated_at
BEFORE UPDATE ON public.app_short_links
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_app_shortener();

ALTER TABLE public.app_shortener_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_short_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage app_shortener_tokens" ON public.app_shortener_tokens;
CREATE POLICY "Admins can manage app_shortener_tokens"
ON public.app_shortener_tokens
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage app_short_links" ON public.app_short_links;
CREATE POLICY "Admins can manage app_short_links"
ON public.app_short_links
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));