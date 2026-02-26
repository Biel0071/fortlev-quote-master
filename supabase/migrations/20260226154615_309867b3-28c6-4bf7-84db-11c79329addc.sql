ALTER TABLE public.home_footer
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS facebook_url text;