-- 1. Criar função auxiliar para verificar acesso à loja (evita joins recursivos complexos nas policies)
CREATE OR REPLACE FUNCTION public.check_user_store_access(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM saas_user_access 
    WHERE user_id = _user_id 
    AND store_id = _store_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_user_store_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_store_access TO service_role;

-- 2. Atualizar policies de store_categories
DROP POLICY IF EXISTS "Store Isolation - Categories Select" ON public.store_categories;
CREATE POLICY "Store Isolation - Categories Select" ON public.store_categories
FOR SELECT TO public
USING (
  is_master_admin() OR 
  active = true OR 
  check_user_store_access(auth.uid(), store_id)
);

-- 3. Atualizar policies de store_products
DROP POLICY IF EXISTS "Store Isolation - Products Select" ON public.store_products;
CREATE POLICY "Store Isolation - Products Select" ON public.store_products
FOR SELECT TO public
USING (
  is_master_admin() OR 
  active = true OR 
  check_user_store_access(auth.uid(), store_id)
);

-- 4. Atualizar policies de store_orders
DROP POLICY IF EXISTS "Store Isolation - Orders Admin Select" ON public.store_orders;
CREATE POLICY "Store Isolation - Orders Admin Select" ON public.store_orders
FOR SELECT TO public
USING (
  is_master_admin() OR 
  check_user_store_access(auth.uid(), store_id)
);

DROP POLICY IF EXISTS "Store Isolation - Orders Admin Update" ON public.store_orders;
CREATE POLICY "Store Isolation - Orders Admin Update" ON public.store_orders
FOR UPDATE TO public
USING (
  is_master_admin() OR 
  check_user_store_access(auth.uid(), store_id)
)
WITH CHECK (
  is_master_admin() OR 
  check_user_store_access(auth.uid(), store_id)
);

-- 5. Corrigir Store Isolation Select store_banners
DROP POLICY IF EXISTS "Store Isolation Select store_banners" ON public.store_banners;
CREATE POLICY "Store Isolation Select store_banners" ON public.store_banners
FOR SELECT TO public
USING (
  is_master_admin() OR 
  active = true OR 
  check_user_store_access(auth.uid(), store_id)
);
