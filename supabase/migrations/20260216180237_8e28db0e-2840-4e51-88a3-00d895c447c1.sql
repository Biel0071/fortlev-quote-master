-- 1) Extend existing store_banners to support desktop/mobile assets for the Home hero carousel
ALTER TABLE public.store_banners
ADD COLUMN IF NOT EXISTS image_desktop_path text,
ADD COLUMN IF NOT EXISTS image_mobile_path text;

-- 2) Home editable blocks
CREATE TABLE IF NOT EXISTS public.home_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NULL,
  icon text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.home_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NULL,
  icon text NULL,
  link_url text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sections decide which categories appear in the Home “Produtos por categoria” area
CREATE TABLE IF NOT EXISTS public.home_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.store_categories(id) ON DELETE CASCADE,
  title_override text NULL,
  subtitle_override text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);

-- Footer singleton
CREATE TABLE IF NOT EXISTS public.home_footer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE DEFAULT 'main',
  logo_path text NULL,
  store_name text NULL,
  address text NULL,
  whatsapp text NULL,
  hours text NULL,
  extra_note text NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) RLS
ALTER TABLE public.home_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_footer ENABLE ROW LEVEL SECURITY;

-- Admin full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_benefits' AND policyname='Admins can manage home benefits'
  ) THEN
    CREATE POLICY "Admins can manage home benefits" ON public.home_benefits
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_policies' AND policyname='Admins can manage home policies'
  ) THEN
    CREATE POLICY "Admins can manage home policies" ON public.home_policies
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_sections' AND policyname='Admins can manage home sections'
  ) THEN
    CREATE POLICY "Admins can manage home sections" ON public.home_sections
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_footer' AND policyname='Admins can manage home footer'
  ) THEN
    CREATE POLICY "Admins can manage home footer" ON public.home_footer
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END$$;

-- Public read only active rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_benefits' AND policyname='Public can read active home benefits'
  ) THEN
    CREATE POLICY "Public can read active home benefits" ON public.home_benefits
      FOR SELECT
      USING (active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_policies' AND policyname='Public can read active home policies'
  ) THEN
    CREATE POLICY "Public can read active home policies" ON public.home_policies
      FOR SELECT
      USING (active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_sections' AND policyname='Public can read active home sections'
  ) THEN
    CREATE POLICY "Public can read active home sections" ON public.home_sections
      FOR SELECT
      USING (active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_footer' AND policyname='Public can read active home footer'
  ) THEN
    CREATE POLICY "Public can read active home footer" ON public.home_footer
      FOR SELECT
      USING (active = true);
  END IF;
END$$;

-- 4) updated_at triggers (use existing public.set_updated_at())
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_home_benefits_updated_at') THEN
    CREATE TRIGGER trg_home_benefits_updated_at
    BEFORE UPDATE ON public.home_benefits
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_home_policies_updated_at') THEN
    CREATE TRIGGER trg_home_policies_updated_at
    BEFORE UPDATE ON public.home_policies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_home_sections_updated_at') THEN
    CREATE TRIGGER trg_home_sections_updated_at
    BEFORE UPDATE ON public.home_sections
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_home_footer_updated_at') THEN
    CREATE TRIGGER trg_home_footer_updated_at
    BEFORE UPDATE ON public.home_footer
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 5) Seed defaults (idempotent)
INSERT INTO public.home_footer(key, store_name, whatsapp, active)
VALUES ('main', 'Materiais de Construção', '31973484203', true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.home_benefits(title, subtitle, icon, sort_order, active)
SELECT * FROM (VALUES
  ('Frete rápido', 'Entregas ágeis na região', 'truck', 0, true),
  ('Desconto no Pix', 'Economize no pagamento', 'badge-percent', 1, true),
  ('Compra segura', 'Ambiente protegido', 'shield-check', 2, true),
  ('Retire na loja', 'Opção de retirada', 'store', 3, true)
) AS v(title, subtitle, icon, sort_order, active)
WHERE NOT EXISTS (SELECT 1 FROM public.home_benefits);

INSERT INTO public.home_policies(title, subtitle, icon, link_url, sort_order, active)
SELECT * FROM (VALUES
  ('Entrega', 'Prazos e regiões atendidas', 'truck', '/p/entrega', 0, true),
  ('Troca', 'Regras e prazos de troca', 'refresh-cw', '/p/troca', 1, true),
  ('Garantia', 'Condições de garantia', 'badge-check', '/p/garantia', 2, true),
  ('Pagamento', 'Formas de pagamento', 'credit-card', '/p/pagamento', 3, true)
) AS v(title, subtitle, icon, link_url, sort_order, active)
WHERE NOT EXISTS (SELECT 1 FROM public.home_policies);
