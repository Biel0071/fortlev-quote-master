
-- 1. Add new roles to the admin_role enum
ALTER TYPE public.admin_role ADD VALUE IF NOT EXISTS 'gerente';
ALTER TYPE public.admin_role ADD VALUE IF NOT EXISTS 'visualizador';

-- 2. Add store_id column to activity_logs for multi-store context
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

-- 3. Add ip column to activity_logs
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS ip text;

-- 4. Update get_admin_role to include new roles
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::text FROM public.admin_users WHERE user_id = _user_id AND status = 'active' LIMIT 1;
$$;

-- 5. Update is_master to also check allowlist
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id AND role = 'master' AND status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_allowlist WHERE email = (SELECT email FROM auth.users WHERE id = _user_id)
  );
$$;
