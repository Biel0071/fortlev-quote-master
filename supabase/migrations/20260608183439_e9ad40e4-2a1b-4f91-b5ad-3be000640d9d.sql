-- 1. Store Blueprints
CREATE TABLE public.store_blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL, -- 'Material de Construção', 'Moda', etc.
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- categories, products, modules, banners
    preview_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Store Templates (Visuals)
CREATE TABLE public.store_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    preview_image TEXT,
    theme_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- default colors, fonts, layout
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Store Module Definitions (Catalog)
CREATE TABLE public.store_module_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- GRANTS
GRANT ALL ON public.store_blueprints TO service_role;
GRANT ALL ON public.store_templates TO service_role;
GRANT ALL ON public.store_module_definitions TO service_role;

GRANT SELECT ON public.store_blueprints TO authenticated, anon;
GRANT SELECT ON public.store_templates TO authenticated, anon;
GRANT SELECT ON public.store_module_definitions TO authenticated, anon;

-- RLS
ALTER TABLE public.store_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_module_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for blueprints" ON public.store_blueprints FOR SELECT USING (true);
CREATE POLICY "Allow public read for templates" ON public.store_templates FOR SELECT USING (true);
CREATE POLICY "Allow public read for module definitions" ON public.store_module_definitions FOR SELECT USING (true);

-- Admin can manage
CREATE POLICY "Admin can manage blueprints" ON public.store_blueprints FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage templates" ON public.store_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage module definitions" ON public.store_module_definitions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Seed some initial data
INSERT INTO public.store_module_definitions (key, name, description, icon) VALUES
('crm', 'CRM', 'Gestão de leads e clientes', 'users'),
('whatsapp_ia', 'WhatsApp IA', 'Atendimento automatizado via WhatsApp', 'message-square'),
('seo', 'SEO Pro', 'Otimização avançada para motores de busca', 'search'),
('blog', 'Blog', 'Publicação de artigos e notícias', 'file-text'),
('delivery', 'Delivery', 'Sistema de entregas e rastreamento', 'truck'),
('marketplace', 'Marketplace', 'Permite múltiplos vendedores', 'shopping-bag');

INSERT INTO public.store_templates (name, slug, theme_config) VALUES
('Moderno', 'moderno', '{"colors": {"primary": "#2563eb", "secondary": "#f8fafc"}, "fonts": {"body": "Inter"}}'),
('Minimalista', 'minimalista', '{"colors": {"primary": "#000000", "secondary": "#ffffff"}, "fonts": {"body": "Geist"}}'),
('Corporativo', 'corporativo', '{"colors": {"primary": "#1e3a8a", "secondary": "#f3f4f6"}, "fonts": {"body": "Roboto"}}');

INSERT INTO public.store_blueprints (name, slug, description, category, config) VALUES
('Material de Construção', 'construcao', 'Blueprint otimizado para lojas de materiais de construção', 'Varejo', '{"modules": ["crm", "delivery"], "categories": ["Hidráulica", "Elétrica", "Pisos"]}'),
('Moda & Acessórios', 'moda', 'Focado em visuais e coleções', 'Moda', '{"modules": ["seo", "blog"], "categories": ["Inverno", "Verão", "Promoções"]}');
