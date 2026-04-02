
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read store_settings"
  ON public.store_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Only admins can modify store_settings"
  ON public.store_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_allowlist WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

INSERT INTO public.store_settings (key, value)
VALUES ('app_download_url', null);
