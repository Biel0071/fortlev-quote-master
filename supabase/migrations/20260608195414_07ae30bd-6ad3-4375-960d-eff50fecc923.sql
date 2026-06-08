-- Adiciona colunas extras para definições de módulos
ALTER TABLE public.store_module_definitions 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS required_plan TEXT DEFAULT 'Free',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Cria tabela de logs de sistema (caso não exista via psql check anterior, mas para garantir estrutura completa)
CREATE TABLE IF NOT EXISTS public.system_event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL DEFAULT 'info',
    event_type TEXT NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilita RLS nos logs de sistema
ALTER TABLE public.system_event_logs ENABLE ROW LEVEL SECURITY;

-- Permissões para logs de sistema
GRANT ALL ON public.system_event_logs TO service_role;
GRANT SELECT ON public.system_event_logs TO authenticated;

-- Políticas para logs de sistema
CREATE POLICY "Admins can view system logs" ON public.system_event_logs
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Adiciona campos de white label à tabela app_config se necessário
ALTER TABLE public.app_config 
ADD COLUMN IF NOT EXISTS platform_name TEXT DEFAULT 'SaaS Master',
ADD COLUMN IF NOT EXISTS platform_logo TEXT,
ADD COLUMN IF NOT EXISTS platform_colors JSONB DEFAULT '{"primary": "#3b82f6", "secondary": "#64748b"}'::jsonb;

-- Garante que o service_role e admin podem gerenciar tudo
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
