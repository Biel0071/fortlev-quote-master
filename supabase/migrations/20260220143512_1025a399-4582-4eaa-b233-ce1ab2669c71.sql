-- 1) store_products.status (draft|published)
ALTER TABLE public.store_products
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- normalize existing rows (assume existing catalog is published)
UPDATE public.store_products
SET status = 'published'
WHERE status IS NULL OR status = '';

-- 2) product_ai_previews table (versioned)
CREATE TABLE IF NOT EXISTS public.product_ai_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  generated_description text,
  generated_comments_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_images_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, version)
);

CREATE INDEX IF NOT EXISTS idx_product_ai_previews_product_created
  ON public.product_ai_previews(product_id, created_at DESC);

-- 3) product_comments table
CREATE TABLE IF NOT EXISTS public.product_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating integer NOT NULL,
  comment_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_comments_product_created
  ON public.product_comments(product_id, created_at DESC);

-- 4) RLS
ALTER TABLE public.product_ai_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;

-- store_products: ensure admins can SELECT everything (needed for drafts)
DROP POLICY IF EXISTS "Admins can read products" ON public.store_products;
CREATE POLICY "Admins can read products"
ON public.store_products
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- store_products: tighten public reads to published only
DROP POLICY IF EXISTS "Public can read active products" ON public.store_products;
CREATE POLICY "Public can read active products"
ON public.store_products
FOR SELECT
USING (active = true AND status = 'published');

-- product_ai_previews policies
DROP POLICY IF EXISTS "Admins can manage product ai previews" ON public.product_ai_previews;
CREATE POLICY "Admins can manage product ai previews"
ON public.product_ai_previews
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- product_comments policies
DROP POLICY IF EXISTS "Admins can manage product comments" ON public.product_comments;
CREATE POLICY "Admins can manage product comments"
ON public.product_comments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public can read comments for published products" ON public.product_comments;
CREATE POLICY "Public can read comments for published products"
ON public.product_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.store_products p
    WHERE p.id = product_comments.product_id
      AND p.active = true
      AND p.status = 'published'
  )
);

-- ratings validation via constraint (immutable)
ALTER TABLE public.product_comments
DROP CONSTRAINT IF EXISTS product_comments_rating_range;
ALTER TABLE public.product_comments
ADD CONSTRAINT product_comments_rating_range CHECK (rating BETWEEN 1 AND 5);
