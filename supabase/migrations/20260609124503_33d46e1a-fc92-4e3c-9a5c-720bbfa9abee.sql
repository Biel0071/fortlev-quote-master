-- 1. Criar função para verificar se o usuário é o dono da loja de forma segura (sem recursão)
CREATE OR REPLACE FUNCTION public.check_user_is_owner(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores 
    WHERE tenant_id = _tenant_id 
    AND owner_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_user_is_owner TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_owner TO service_role;

-- 2. Corrigir a policy recursiva na saas_user_access
DROP POLICY IF EXISTS "Owners can manage access within tenant" ON public.saas_user_access;

CREATE POLICY "Owners can manage access within tenant" 
ON public.saas_user_access 
FOR ALL 
TO authenticated
USING (
  check_user_is_owner(auth.uid(), tenant_id)
)
WITH CHECK (
  check_user_is_owner(auth.uid(), tenant_id)
);

-- 3. Adicionar suporte para Master Admin gerenciar acessos (opcional mas recomendado)
CREATE POLICY "Admins can manage access" 
ON public.saas_user_access 
FOR ALL 
TO authenticated
USING (is_master_admin())
WITH CHECK (is_master_admin());

-- 4. Verificar se a função is_master_admin existe, caso contrário criar uma versão básica
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_master_admin') THEN
        CREATE OR REPLACE FUNCTION public.is_master_admin()
        RETURNS BOOLEAN 
        LANGUAGE sql 
        STABLE 
        SECURITY DEFINER
        SET search_path = public
        AS $f$
          SELECT EXISTS (
            SELECT 1 FROM public.admin_allowlist 
            WHERE email = (auth.jwt() ->> 'email')
          );
        $f$;
    END IF;
END $$;
