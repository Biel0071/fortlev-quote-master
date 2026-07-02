
-- ============ FASHION STORE — FASE 1: SCHEMA ============

-- 1) Produtos da loja de moda
CREATE TABLE IF NOT EXISTS public.fashion_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'feminino',
  price numeric(12,2) NOT NULL DEFAULT 0,
  promo_price numeric(12,2),
  image_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge text,
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);
GRANT SELECT ON public.fashion_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fashion_products TO authenticated;
GRANT ALL ON public.fashion_products TO service_role;
ALTER TABLE public.fashion_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fashion_products_public_read" ON public.fashion_products FOR SELECT USING (active = true);
CREATE POLICY "fashion_products_admin_all" ON public.fashion_products FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- 2) Variantes (tamanho/cor/estoque)
CREATE TABLE IF NOT EXISTS public.fashion_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.fashion_products(id) ON DELETE CASCADE,
  size text NOT NULL,
  color text NOT NULL,
  color_hex text,
  sku text,
  stock integer NOT NULL DEFAULT 0,
  price_override numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, size, color)
);
GRANT SELECT ON public.fashion_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fashion_variants TO authenticated;
GRANT ALL ON public.fashion_variants TO service_role;
ALTER TABLE public.fashion_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fashion_variants_public_read" ON public.fashion_variants FOR SELECT USING (true);
CREATE POLICY "fashion_variants_admin_all" ON public.fashion_variants FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- 3) Clientes
CREATE TABLE IF NOT EXISTS public.fashion_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  cep text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fashion_customers TO authenticated;
GRANT ALL ON public.fashion_customers TO service_role;
ALTER TABLE public.fashion_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fashion_customers_admin_all" ON public.fashion_customers FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- 4) Pedidos
CREATE TABLE IF NOT EXISTS public.fashion_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.fashion_customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  shipping numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  tracking_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fashion_orders TO authenticated;
GRANT INSERT ON public.fashion_orders TO anon;
GRANT ALL ON public.fashion_orders TO service_role;
ALTER TABLE public.fashion_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fashion_orders_public_insert" ON public.fashion_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "fashion_orders_admin_all" ON public.fashion_orders FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- 5) Cupons
CREATE TABLE IF NOT EXISTS public.fashion_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  min_subtotal numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);
GRANT SELECT ON public.fashion_coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fashion_coupons TO authenticated;
GRANT ALL ON public.fashion_coupons TO service_role;
ALTER TABLE public.fashion_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fashion_coupons_public_read" ON public.fashion_coupons FOR SELECT USING (active = true);
CREATE POLICY "fashion_coupons_admin_all" ON public.fashion_coupons FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- 6) Banners
CREATE TABLE IF NOT EXISTS public.fashion_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text,
  subtitle text,
  image_url text,
  gradient text,
  link_url text,
  cta_label text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fashion_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fashion_banners TO authenticated;
GRANT ALL ON public.fashion_banners TO service_role;
ALTER TABLE public.fashion_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fashion_banners_public_read" ON public.fashion_banners FOR SELECT USING (active = true);
CREATE POLICY "fashion_banners_admin_all" ON public.fashion_banners FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_fashion_products_updated ON public.fashion_products;
CREATE TRIGGER trg_fashion_products_updated BEFORE UPDATE ON public.fashion_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_fashion_orders_updated ON public.fashion_orders;
CREATE TRIGGER trg_fashion_orders_updated BEFORE UPDATE ON public.fashion_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED: LOJA + 8 PRODUTOS + VARIANTES + BANNER ============
DO $seed$
DECLARE
  v_store uuid;
  v_pid uuid;
  v_products jsonb := '[
    {"name":"Vestido Midi Floral","slug":"vestido-midi-floral","category":"feminino","price":259.90,"promo":199.90,"badge":"Oferta","featured":true,"grad":"linear-gradient(135deg,#EC4899,#8B5CF6)"},
    {"name":"Blazer Alfaiataria Feminino","slug":"blazer-alfaiataria-feminino","category":"feminino","price":389.90,"promo":null,"badge":"Novo","featured":true,"grad":"linear-gradient(135deg,#8B5CF6,#6366F1)"},
    {"name":"Camisa Social Slim","slug":"camisa-social-slim","category":"masculino","price":179.90,"promo":149.90,"badge":"Oferta","featured":true,"grad":"linear-gradient(135deg,#6366F1,#EC4899)"},
    {"name":"Calça Chino Masculina","slug":"calca-chino-masculina","category":"masculino","price":229.90,"promo":null,"badge":"Novo","featured":false,"grad":"linear-gradient(135deg,#8B5CF6,#EC4899)"},
    {"name":"Conjunto Infantil Verão","slug":"conjunto-infantil-verao","category":"infantil","price":129.90,"promo":99.90,"badge":"Oferta","featured":true,"grad":"linear-gradient(135deg,#F472B6,#8B5CF6)"},
    {"name":"Vestido Infantil Princesa","slug":"vestido-infantil-princesa","category":"infantil","price":159.90,"promo":null,"badge":"Novo","featured":false,"grad":"linear-gradient(135deg,#EC4899,#F472B6)"},
    {"name":"Bolsa Tote Couro","slug":"bolsa-tote-couro","category":"acessorios","price":349.90,"promo":279.90,"badge":"Oferta","featured":true,"grad":"linear-gradient(135deg,#8B5CF6,#EC4899)"},
    {"name":"Óculos de Sol Aviador","slug":"oculos-sol-aviador","category":"acessorios","price":189.90,"promo":null,"badge":"Novo","featured":false,"grad":"linear-gradient(135deg,#6366F1,#8B5CF6)"}
  ]'::jsonb;
  v_item jsonb;
  v_sizes text[] := ARRAY['PP','P','M','G','GG'];
  v_colors jsonb := '[
    {"name":"Preto","hex":"#111111"},
    {"name":"Rosa","hex":"#EC4899"},
    {"name":"Roxo","hex":"#8B5CF6"}
  ]'::jsonb;
  v_sz text;
  v_col jsonb;
BEGIN
  -- Loja
  INSERT INTO public.stores (name, slug, segment, active)
  VALUES ('Moda Fashion Store','moda-fashion','fashion', true)
  ON CONFLICT (slug) DO UPDATE SET segment='fashion', active=true
  RETURNING id INTO v_store;

  -- Banner hero
  INSERT INTO public.fashion_banners (store_id, title, subtitle, gradient, cta_label, link_url, sort_order, active)
  VALUES (v_store,'Coleção Primavera','Até 40% OFF em looks selecionados','linear-gradient(135deg,#8B5CF6 0%,#EC4899 100%)','Comprar agora','/loja/moda-fashion?promo=1',0,true)
  ON CONFLICT DO NOTHING;

  -- Cupom
  INSERT INTO public.fashion_coupons (store_id, code, discount_type, discount_value, min_subtotal, active)
  VALUES (v_store,'MODA10','percent',10,0,true)
  ON CONFLICT (store_id, code) DO NOTHING;

  -- Produtos
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_products) LOOP
    INSERT INTO public.fashion_products (
      store_id, name, slug, category, price, promo_price, badge, featured, active, description, gallery
    ) VALUES (
      v_store,
      v_item->>'name',
      v_item->>'slug',
      v_item->>'category',
      (v_item->>'price')::numeric,
      NULLIF(v_item->>'promo','null')::numeric,
      v_item->>'badge',
      (v_item->>'featured')::boolean,
      true,
      'Peça premium da coleção Moda Fashion. Tecido de alta qualidade, caimento perfeito.',
      jsonb_build_array(v_item->>'grad', v_item->>'grad', v_item->>'grad')
    )
    ON CONFLICT (store_id, slug) DO UPDATE SET price = EXCLUDED.price
    RETURNING id INTO v_pid;

    -- Variantes: 5 tamanhos x 3 cores
    FOREACH v_sz IN ARRAY v_sizes LOOP
      FOR v_col IN SELECT * FROM jsonb_array_elements(v_colors) LOOP
        INSERT INTO public.fashion_variants (product_id, size, color, color_hex, stock, sku)
        VALUES (v_pid, v_sz, v_col->>'name', v_col->>'hex', 10 + floor(random()*20)::int,
                upper(replace(v_item->>'slug','-','')) || '-' || v_sz || '-' || upper(v_col->>'name'))
        ON CONFLICT (product_id, size, color) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END
$seed$;
