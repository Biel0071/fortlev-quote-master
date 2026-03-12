
-- Set domain for the active store
UPDATE public.stores SET domain = 'fortlev-quote-wiz.lovable.app' WHERE slug = 'construcao';

-- Mark fortlev and materiais as inactive since they don't have real products yet
UPDATE public.stores SET active = false WHERE slug IN ('fortlev', 'materiais');
