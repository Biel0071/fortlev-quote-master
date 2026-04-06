
-- Create apps storage bucket for APK uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('apps', 'apps', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to apps bucket
CREATE POLICY "Public read apps" ON storage.objects FOR SELECT TO public USING (bucket_id = 'apps');

-- Allow authenticated users to upload to apps bucket
CREATE POLICY "Auth upload apps" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'apps');

-- Allow authenticated users to update in apps bucket
CREATE POLICY "Auth update apps" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'apps');

-- Allow authenticated users to delete from apps bucket
CREATE POLICY "Auth delete apps" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'apps');

-- Create app_config table for storing app settings like download URL
CREATE TABLE IF NOT EXISTS public.app_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read app_config" ON public.app_config FOR SELECT TO public USING (true);

-- Admin write
CREATE POLICY "Admin write app_config" ON public.app_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
