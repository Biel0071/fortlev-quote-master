CREATE TABLE public.store_models (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    model_type TEXT NOT NULL CHECK (model_type IN ('budget', 'invoice')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(store_id, model_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_models TO authenticated;
GRANT SELECT ON public.store_models TO anon;
GRANT ALL ON public.store_models TO service_role;

ALTER TABLE public.store_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own store models" ON public.store_models
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.stores s 
            WHERE s.id = store_id 
            AND (s.owner_id = auth.uid())
        )
    );

-- Also allow reading for anonymous users if it's the active store
CREATE POLICY "Public can read active store models" ON public.store_models
    FOR SELECT USING (active = true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_store_models_updated_at') THEN
        CREATE TRIGGER update_store_models_updated_at BEFORE UPDATE ON public.store_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;