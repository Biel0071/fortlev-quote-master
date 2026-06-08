-- Adiciona blueprint_id à tabela stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS blueprint_id UUID REFERENCES public.store_blueprints(id) ON DELETE SET NULL;

-- Adiciona campo para metadados de snapshot na versão do blueprint
ALTER TABLE public.blueprint_versions
ADD COLUMN IF NOT EXISTS snapshot_metadata JSONB DEFAULT '{}'::jsonb;
