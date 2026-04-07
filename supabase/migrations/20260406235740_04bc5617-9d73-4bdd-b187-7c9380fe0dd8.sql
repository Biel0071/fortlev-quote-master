
-- Plans table
CREATE TABLE public.store_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  modules TEXT[] NOT NULL DEFAULT '{}',
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read plans" ON public.store_plans FOR SELECT USING (true);
CREATE POLICY "Admin manage plans" ON public.store_plans FOR ALL TO authenticated USING (public.is_master(auth.uid()));

-- Add plan_id to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.store_plans(id) ON DELETE SET NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'geral';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;

-- Insert default plans
INSERT INTO public.store_plans (name, slug, description, modules, price_monthly, sort_order) VALUES
('Básico', 'basico', 'Produtos e Pedidos', ARRAY['produtos','pedidos'], 0, 1),
('Intermediário', 'intermediario', 'Básico + Cupons, Avaliações, Banners', ARRAY['produtos','pedidos','cupons','avaliacoes','banners'], 99, 2),
('Premium', 'premium', 'Todos os módulos', ARRAY['produtos','pedidos','orcamentos','cupons','avaliacoes','banners','frete','pagamentos','analytics','ia','integracoes'], 199, 3);

-- Function to apply plan permissions to a store
CREATE OR REPLACE FUNCTION public.apply_plan_permissions(_store_id UUID, _plan_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  plan_modules TEXT[];
  m TEXT;
  all_mods TEXT[] := ARRAY['produtos','pedidos','orcamentos','cupons','avaliacoes','banners','frete','pagamentos','analytics','ia','integracoes'];
BEGIN
  SELECT modules INTO plan_modules FROM public.store_plans WHERE id = _plan_id;
  IF plan_modules IS NULL THEN RETURN; END IF;
  
  -- Ensure all permissions exist
  PERFORM public.init_store_permissions(_store_id);
  
  -- Enable/disable based on plan
  FOREACH m IN ARRAY all_mods LOOP
    UPDATE public.store_permissions
    SET enabled = (m = ANY(plan_modules))
    WHERE store_id = _store_id AND module = m;
  END LOOP;
  
  -- Update store plan reference
  UPDATE public.stores SET plan_id = _plan_id WHERE id = _store_id;
END;
$$;
