CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.role = 'master'
      AND au.status = 'active'
  )
  OR EXISTS (
    SELECT 1
    FROM public.admin_allowlist aa
    WHERE lower(aa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;