-- ai_generation_logs
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.store_products(id) ON DELETE SET NULL,
  status text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created
  ON public.ai_generation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_product
  ON public.ai_generation_logs(product_id, created_at DESC);

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage ai generation logs" ON public.ai_generation_logs;
CREATE POLICY "Admins can manage ai generation logs"
ON public.ai_generation_logs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- RPCs to fetch/count eligible products
CREATE OR REPLACE FUNCTION public.get_products_for_ai_generation(p_offset integer, p_limit integer)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.store_products p
  WHERE
    p.status = 'draft'
    OR coalesce(nullif(trim(p.description), ''), '') = ''
    OR NOT EXISTS (
      SELECT 1
      FROM public.store_product_images i
      WHERE i.product_id = p.id
    )
  ORDER BY p.created_at ASC
  LIMIT greatest(0, least(p_limit, 100))
  OFFSET greatest(0, p_offset);
$$;

CREATE OR REPLACE FUNCTION public.count_products_for_ai_generation()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)
  FROM public.store_products p
  WHERE
    p.status = 'draft'
    OR coalesce(nullif(trim(p.description), ''), '') = ''
    OR NOT EXISTS (
      SELECT 1
      FROM public.store_product_images i
      WHERE i.product_id = p.id
    );
$$;

-- Allow admin to call the RPCs via RLS (functions are SECURITY DEFINER but still require EXECUTE privilege;
-- default is ok, and access is protected by policies on tables and our edge function role check).
