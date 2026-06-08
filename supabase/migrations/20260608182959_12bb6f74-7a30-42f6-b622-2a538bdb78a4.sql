-- Phase 2: RLS Isolation & Module/Factory Prep (Robust)

-- 1. Helper for safe RLS policy creation
CREATE OR REPLACE FUNCTION public.create_safe_policy(tbl TEXT, pol_name TEXT, pol_query TEXT) RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'public' AND table_name = tbl) THEN
        EXECUTE 'ALTER TABLE public.' || quote_ident(tbl) || ' ENABLE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = pol_name) THEN
            EXECUTE 'CREATE POLICY ' || quote_ident(pol_name) || ' ON public.' || quote_ident(tbl) || ' FOR SELECT USING (' || pol_query || ')';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure store_id in all operational tables
DO $$ 
DECLARE
    t TEXT;
    target_tables TEXT[] := ARRAY[
        'products', 'categories', 'orders', 'offers', 'store_banners', 
        'home_benefits', 'home_policies', 'home_sections', 'home_footer', 
        'home_departments', 'home_offers', 'home_seo', 
        'fortlev_catalog_products', 'construction_catalog_products', 
        'system_theme_settings', 'store_products', 'store_product_images',
        'store_categories', 'store_pages'
    ];
    default_sid UUID;
BEGIN
    SELECT id INTO default_sid FROM public.stores LIMIT 1;
    
    FOREACH t IN ARRAY target_tables
    LOOP
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'public' AND table_name = t) THEN
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = 'public' AND table_name = t AND column_name = 'store_id') THEN
                EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' ADD COLUMN store_id UUID REFERENCES public.stores(id) DEFAULT ' || quote_literal(default_sid);
                EXECUTE 'UPDATE public.' || quote_ident(t) || ' SET store_id = ' || quote_literal(default_sid) || ' WHERE store_id IS NULL';
            END IF;
            
            -- Enable RLS and add basic policy
            PERFORM public.create_safe_policy(t, 'Store Isolation Select ' || t, 'true'); -- We allow SELECT but code will filter
            
            -- Grant permissions
            EXECUTE 'GRANT SELECT ON public.' || quote_ident(t) || ' TO anon, authenticated';
            EXECUTE 'GRANT INSERT, UPDATE, DELETE ON public.' || quote_ident(t) || ' TO authenticated';
            EXECUTE 'GRANT ALL ON public.' || quote_ident(t) || ' TO service_role';
        END IF;
    END LOOP;
END $$;

-- Cleanup helper
DROP FUNCTION public.create_safe_policy(TEXT, TEXT, TEXT);
