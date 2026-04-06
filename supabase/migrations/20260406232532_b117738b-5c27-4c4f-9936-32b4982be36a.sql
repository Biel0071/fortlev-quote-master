
-- Store permissions: controls which modules are enabled per store
CREATE TABLE public.store_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  module text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (store_id, module)
);

ALTER TABLE public.store_permissions ENABLE ROW LEVEL SECURITY;

-- Master admins can manage all store permissions
CREATE POLICY "Masters can manage store_permissions"
ON public.store_permissions
FOR ALL
TO authenticated
USING (public.is_master(auth.uid()))
WITH CHECK (public.is_master(auth.uid()));

-- Store admins can read permissions for their own stores
CREATE POLICY "Store admins can read own store permissions"
ON public.store_permissions
FOR SELECT
TO authenticated
USING (
  store_id IN (
    SELECT usa.store_id FROM public.user_store_access usa WHERE usa.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER set_store_permissions_updated_at
  BEFORE UPDATE ON public.store_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Function to initialize default permissions for a new store
CREATE OR REPLACE FUNCTION public.init_store_permissions(_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  modules text[] := ARRAY[
    'produtos', 'pedidos', 'orcamentos', 'cupons', 'avaliacoes',
    'banners', 'frete', 'pagamentos', 'analytics', 'ia', 'integracoes'
  ];
  m text;
BEGIN
  FOREACH m IN ARRAY modules LOOP
    INSERT INTO public.store_permissions (store_id, module, enabled)
    VALUES (_store_id, m, false)
    ON CONFLICT (store_id, module) DO NOTHING;
  END LOOP;
END;
$$;
