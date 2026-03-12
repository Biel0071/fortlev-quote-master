
-- Add domain and favicon columns to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS favicon_path text;

-- Create store_domains table for multiple domains per store
CREATE TABLE public.store_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(domain)
);

ALTER TABLE public.store_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store domains" ON public.store_domains
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read store domains" ON public.store_domains
  FOR SELECT TO public
  USING (true);
