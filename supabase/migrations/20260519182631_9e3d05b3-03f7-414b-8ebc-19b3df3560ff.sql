-- Add columns for geolocation and classification
ALTER TABLE public.issuing_companies 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT 'material' CHECK (company_type IN ('fortlev', 'material'));

-- Update existing Fortlev companies
UPDATE public.issuing_companies 
SET company_type = 'fortlev' 
WHERE name ILIKE '%fortlev%' OR trading_name ILIKE '%fortlev%';

-- Set a default type for others
UPDATE public.issuing_companies 
SET company_type = 'material' 
WHERE company_type IS NULL;
