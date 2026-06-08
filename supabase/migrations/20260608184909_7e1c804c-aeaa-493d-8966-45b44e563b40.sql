-- Versionamento de Blueprints
CREATE TABLE public.blueprint_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_id UUID NOT NULL REFERENCES public.store_blueprints(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_label TEXT, -- Ex: v1, v2, Summer Edition
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Snapshot completo (categorias, banners, paginas, tema, módulos, configs, IA)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT false
);

-- Garantir que blueprint_id + version_number seja único
CREATE UNIQUE INDEX blueprint_version_number_idx ON public.blueprint_versions(blueprint_id, version_number);

-- Adicionar suporte a metadados de IA no Blueprint se não existir (ou complementar)
ALTER TABLE public.store_blueprints 
ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT '{
    "tone": "professional",
    "keywords": [],
    "goals": [],
    "prompts": {},
    "rules": []
}'::jsonb;

-- Motor de Automação (Automation Engine)
CREATE TABLE public.store_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- product_created, order_placed, seo_missing, banner_expired, etc.
    action_type TEXT NOT NULL, -- generate_ai_description, send_whatsapp, generate_seo, notify_admin, etc.
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_run_at TIMESTAMP WITH TIME ZONE
);

-- Permissões
GRANT ALL ON public.blueprint_versions TO authenticated;
GRANT ALL ON public.blueprint_versions TO service_role;
GRANT ALL ON public.store_automations TO authenticated;
GRANT ALL ON public.store_automations TO service_role;

-- RLS
ALTER TABLE public.blueprint_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage all blueprint versions" 
ON public.blueprint_versions FOR ALL 
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE POLICY "Store owners can manage their automations" 
ON public.store_automations FOR ALL 
USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE POLICY "Master admin can manage all automations" 
ON public.store_automations FOR ALL 
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- Função para capturar snapshot da loja e salvar como blueprint
CREATE OR REPLACE FUNCTION public.capture_store_snapshot(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_snapshot JSONB;
BEGIN
    SELECT jsonb_build_object(
        'categories', (SELECT jsonb_agg(row_to_json(c)) FROM public.store_categories c WHERE c.store_id = p_store_id),
        'banners', (SELECT jsonb_agg(row_to_json(b)) FROM public.store_banners b WHERE b.store_id = p_store_id),
        'pages', (SELECT jsonb_agg(row_to_json(p)) FROM public.store_pages p WHERE p.store_id = p_store_id),
        'theme', (SELECT row_to_json(t) FROM public.store_themes t WHERE t.store_id = p_store_id LIMIT 1),
        'modules', (SELECT jsonb_agg(row_to_json(m)) FROM public.store_modules m WHERE m.store_id = p_store_id),
        'settings', (SELECT row_to_json(s) FROM public.store_settings s WHERE s.store_id = p_store_id LIMIT 1),
        'ai_config', (SELECT row_to_json(a) FROM public.store_ai_configs a WHERE a.store_id = p_store_id LIMIT 1)
    ) INTO v_snapshot;
    
    RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
