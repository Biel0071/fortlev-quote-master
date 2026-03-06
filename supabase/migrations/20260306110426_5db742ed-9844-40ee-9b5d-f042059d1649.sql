
-- Extended role enum to include master and operator
-- We'll use a new enum for the permission system
CREATE TYPE public.admin_role AS ENUM ('master', 'admin', 'operator');

-- Stores table
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Admin users table (extends auth.users with admin-specific data)
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role admin_role NOT NULL DEFAULT 'operator',
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- User-store access
CREATE TABLE public.user_store_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);
ALTER TABLE public.user_store_access ENABLE ROW LEVEL SECURITY;

-- User page permissions
CREATE TABLE public.user_page_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, page, store_id)
);
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Activity logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- stores: admins can manage, public read active
CREATE POLICY "Admins can manage stores" ON public.stores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read active stores" ON public.stores FOR SELECT TO authenticated
  USING (active = true);

-- admin_users: only admins
CREATE POLICY "Admins can manage admin_users" ON public.admin_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own admin_users row" ON public.admin_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- user_store_access: admins manage, users read own
CREATE POLICY "Admins can manage user_store_access" ON public.user_store_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own store access" ON public.user_store_access FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- user_page_permissions: admins manage, users read own
CREATE POLICY "Admins can manage permissions" ON public.user_page_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own permissions" ON public.user_page_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- activity_logs: admins only
CREATE POLICY "Admins can manage activity_logs" ON public.activity_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default stores matching existing StoreContext
INSERT INTO public.stores (name, slug) VALUES
  ('Materiais de Construção', 'materiais'),
  ('Home Completa Fortlev', 'fortlev'),
  ('Construção (Orçamentos)', 'construcao');

-- Function to check admin role level
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.admin_users WHERE user_id = _user_id AND status = 'active' LIMIT 1;
$$;

-- Function to check if user is master
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id AND role = 'master' AND status = 'active'
  );
$$;

-- Indexes
CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_user_store_access_user_id ON public.user_store_access(user_id);
CREATE INDEX idx_user_page_permissions_user_id ON public.user_page_permissions(user_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
