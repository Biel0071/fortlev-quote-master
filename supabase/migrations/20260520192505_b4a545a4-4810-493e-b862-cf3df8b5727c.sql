-- Add fiscal columns to fortlev_quotations
ALTER TABLE public.fortlev_quotations 
ADD COLUMN IF NOT EXISTS fiscal_status TEXT DEFAULT 'pre_visualizacao_sem_validade_fiscal',
ADD COLUMN IF NOT EXISTS access_key TEXT,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS series TEXT,
ADD COLUMN IF NOT EXISTS protocol TEXT,
ADD COLUMN IF NOT EXISTS emission_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receipt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS c_stat INTEGER,
ADD COLUMN IF NOT EXISTS xml_content TEXT,
ADD COLUMN IF NOT EXISTS xml_hash TEXT,
ADD COLUMN IF NOT EXISTS portal_token TEXT;

-- Add fiscal columns to construction_quotations
ALTER TABLE public.construction_quotations 
ADD COLUMN IF NOT EXISTS fiscal_status TEXT DEFAULT 'pre_visualizacao_sem_validade_fiscal',
ADD COLUMN IF NOT EXISTS access_key TEXT,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS series TEXT,
ADD COLUMN IF NOT EXISTS protocol TEXT,
ADD COLUMN IF NOT EXISTS emission_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receipt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS c_stat INTEGER,
ADD COLUMN IF NOT EXISTS xml_content TEXT,
ADD COLUMN IF NOT EXISTS xml_hash TEXT,
ADD COLUMN IF NOT EXISTS portal_token TEXT;

-- Create index on access_key for fast lookups in the customer portal
CREATE INDEX IF NOT EXISTS idx_fortlev_quotations_access_key ON public.fortlev_quotations(access_key);
CREATE INDEX IF NOT EXISTS idx_construction_quotations_access_key ON public.construction_quotations(access_key);
