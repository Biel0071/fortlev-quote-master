-- Módulo de Rastreamento Enterprise (Fase 1: Schema)
-- Autor: Lovable Agent
-- Data: 2026-08-06

-- 1. Transportadoras
CREATE TABLE IF NOT EXISTS public.order_tracking_carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    website TEXT,
    tracking_url_template TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, name)
);

-- 2. Status de Rastreamento
CREATE TABLE IF NOT EXISTS public.order_tracking_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    progress_percentage INTEGER DEFAULT 0,
    is_terminal BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, label)
);

-- 3. Endereços de Rastreamento
CREATE TABLE IF NOT EXISTS public.order_tracking_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('origin', 'destination')),
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'Brasil',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Rastreamento Principal
CREATE TABLE IF NOT EXISTS public.order_tracking_main (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.store_orders(id) ON DELETE CASCADE NOT NULL,
    carrier_id UUID REFERENCES public.order_tracking_carriers(id) ON DELETE SET NULL,
    tracking_code TEXT NOT NULL,
    current_status_id UUID REFERENCES public.order_tracking_status(id),
    posted_at TIMESTAMPTZ,
    estimated_delivery_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    origin_address_id UUID REFERENCES public.order_tracking_addresses(id),
    destination_address_id UUID REFERENCES public.order_tracking_addresses(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, tracking_code)
);

-- 5. Timeline de Eventos
CREATE TABLE IF NOT EXISTS public.order_tracking_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id UUID REFERENCES public.order_tracking_main(id) ON DELETE CASCADE NOT NULL,
    status_id UUID REFERENCES public.order_tracking_status(id),
    title TEXT NOT NULL,
    description TEXT,
    location_city TEXT,
    location_state TEXT,
    location_lat DECIMAL,
    location_lng DECIMAL,
    responsible TEXT,
    event_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Arquivos e Comprovantes
CREATE TABLE IF NOT EXISTS public.order_tracking_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id UUID REFERENCES public.order_tracking_main(id) ON DELETE CASCADE NOT NULL,
    timeline_event_id UUID REFERENCES public.order_tracking_timeline(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT, -- 'photo', 'signature', 'document'
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Histórico de Notificações
CREATE TABLE IF NOT EXISTS public.order_tracking_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id UUID REFERENCES public.order_tracking_main(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('email', 'whatsapp', 'push')),
    status TEXT DEFAULT 'sent',
    recipient TEXT,
    message_content TEXT,
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.order_tracking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id UUID REFERENCES public.order_tracking_main(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_carriers TO authenticated;
GRANT ALL ON public.order_tracking_carriers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_status TO authenticated;
GRANT ALL ON public.order_tracking_status TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_addresses TO authenticated;
GRANT ALL ON public.order_tracking_addresses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_main TO authenticated;
GRANT ALL ON public.order_tracking_main TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_timeline TO authenticated;
GRANT ALL ON public.order_tracking_timeline TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_files TO authenticated;
GRANT ALL ON public.order_tracking_files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_notifications TO authenticated;
GRANT ALL ON public.order_tracking_notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_logs TO authenticated;
GRANT ALL ON public.order_tracking_logs TO service_role;

-- RLS
ALTER TABLE public.order_tracking_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_main ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_logs ENABLE ROW LEVEL SECURITY;

-- Políticas Admin
DO $$ BEGIN
    CREATE POLICY "Admins can manage order carriers" ON public.order_tracking_carriers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage order tracking status" ON public.order_tracking_status FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage order tracking addresses" ON public.order_tracking_addresses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage order tracking" ON public.order_tracking_main FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage order tracking timeline" ON public.order_tracking_timeline FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage order tracking files" ON public.order_tracking_files FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage order tracking notifications" ON public.order_tracking_notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can view order tracking logs" ON public.order_tracking_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN others THEN NULL; END $$;

-- Políticas Cliente
DO $$ BEGIN
    CREATE POLICY "Customers can view their order tracking" ON public.order_tracking_main FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.store_orders WHERE store_orders.id = order_tracking_main.order_id AND store_orders.customer_id = auth.uid()));
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Customers can view order tracking timeline" ON public.order_tracking_timeline FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_tracking_main INNER JOIN public.store_orders ON order_tracking_main.order_id = store_orders.id WHERE order_tracking_main.id = order_tracking_timeline.tracking_id AND store_orders.customer_id = auth.uid()));
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Customers can view order tracking files" ON public.order_tracking_files FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_tracking_main INNER JOIN public.store_orders ON order_tracking_main.order_id = store_orders.id WHERE order_tracking_main.id = order_tracking_files.tracking_id AND store_orders.customer_id = auth.uid()));
EXCEPTION WHEN others THEN NULL; END $$;

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_order_tracking_carriers_updated_at ON public.order_tracking_carriers;
CREATE TRIGGER update_order_tracking_carriers_updated_at BEFORE UPDATE ON public.order_tracking_carriers FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_tracking_main_updated_at ON public.order_tracking_main;
CREATE TRIGGER update_order_tracking_main_updated_at BEFORE UPDATE ON public.order_tracking_main FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Seeding function for status
CREATE OR REPLACE FUNCTION public.seed_order_tracking_status(target_store_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.order_tracking_status (store_id, label, color, icon, progress_percentage, "order")
    VALUES 
    (target_store_id, 'Pedido Criado', '#94A3B8', 'Package', 0, 1),
    (target_store_id, 'Pagamento Aprovado', '#10B981', 'CreditCard', 10, 2),
    (target_store_id, 'Separando Pedido', '#F59E0B', 'Clock', 20, 3),
    (target_store_id, 'Em Embalagem', '#3B82F6', 'Box', 30, 4),
    (target_store_id, 'Aguardando Coleta', '#8B5CF6', 'Truck', 40, 5),
    (target_store_id, 'Coletado', '#06B6D4', 'Truck', 50, 6),
    (target_store_id, 'Em Transporte', '#3B82F6', 'Truck', 70, 7),
    (target_store_id, 'Saiu para Entrega', '#10B981', 'MapPin', 90, 8),
    (target_store_id, 'Entregue', '#059669', 'CheckCircle', 100, 9),
    (target_store_id, 'Cancelado', '#EF4444', 'XCircle', 100, 10)
    ON CONFLICT (store_id, label) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
