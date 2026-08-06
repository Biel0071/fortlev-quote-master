-- Versão simplificada sem ON CONFLICT slug
DO $$
DECLARE
    v_store_id uuid;
BEGIN
    SELECT id INTO v_store_id FROM public.stores LIMIT 1;
    
    IF v_store_id IS NOT NULL THEN
        -- Transportadora (verificamos manualmente antes de inserir)
        IF NOT EXISTS (SELECT 1 FROM public.order_tracking_carriers WHERE store_id = v_store_id AND name = 'Logística Nacional') THEN
            INSERT INTO public.order_tracking_carriers (store_id, name, slug, website)
            VALUES (v_store_id, 'Logística Nacional', 'logistica-nacional', 'https://rastreio.com');
        END IF;

        -- Status iniciais
        IF NOT EXISTS (SELECT 1 FROM public.order_tracking_status WHERE store_id = v_store_id AND label = 'Objeto postado') THEN
            INSERT INTO public.order_tracking_status (store_id, label, color, progress_percentage)
            VALUES (v_store_id, 'Objeto postado', '#3B82F6', 10);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM public.order_tracking_status WHERE store_id = v_store_id AND label = 'Em transporte') THEN
            INSERT INTO public.order_tracking_status (store_id, label, color, progress_percentage)
            VALUES (v_store_id, 'Em transporte', '#EAB308', 50);
        END IF;
    END IF;
END $$;
