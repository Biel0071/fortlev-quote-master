
-- Create price_intelligence table
CREATE TABLE public.price_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  unidade text NOT NULL DEFAULT 'unidade',
  preco_min numeric NOT NULL DEFAULT 0,
  preco_max numeric NOT NULL DEFAULT 99999,
  preco_medio numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(categoria, unidade)
);

ALTER TABLE public.price_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage price_intelligence"
  ON public.price_intelligence FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read price_intelligence"
  ON public.price_intelligence FOR SELECT
  TO public
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER set_price_intelligence_updated_at
  BEFORE UPDATE ON public.price_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial data
INSERT INTO public.price_intelligence (categoria, unidade, preco_min, preco_max, preco_medio) VALUES
  ('cimento', 'saco', 20, 120, 38),
  ('argamassa', 'saco', 10, 200, 35),
  ('areia', 'm3', 50, 300, 150),
  ('brita', 'm3', 80, 350, 180),
  ('bloco', 'unidade', 1, 8, 3.5),
  ('bloco', 'milheiro', 400, 1500, 800),
  ('tijolo', 'unidade', 0.50, 3, 1.2),
  ('tijolo', 'milheiro', 300, 1200, 600),
  ('piso', 'm2', 20, 300, 80),
  ('porcelanato', 'm2', 30, 600, 120),
  ('ferro', 'barra', 20, 300, 80),
  ('vergalhao', 'barra', 20, 300, 80),
  ('fio', 'metro', 1, 20, 5),
  ('fio', 'rolo', 50, 800, 200),
  ('cabo eletrico', 'metro', 2, 30, 8),
  ('tubo', 'unidade', 5, 200, 40),
  ('cano', 'unidade', 5, 200, 40),
  ('telha', 'unidade', 2, 100, 25),
  ('tinta', 'litro', 10, 200, 50),
  ('tinta', 'galao', 40, 800, 200),
  ('caixa dagua', 'unidade', 150, 5000, 800),
  ('arame', 'kg', 10, 50, 25),
  ('prego', 'kg', 10, 60, 30),
  ('parafuso', 'caixa', 5, 200, 40),
  ('revestimento', 'm2', 20, 300, 80),
  ('gesso', 'saco', 15, 80, 35),
  ('madeira', 'metro', 5, 150, 40),
  ('porta', 'unidade', 80, 3000, 500),
  ('janela', 'unidade', 100, 5000, 800),
  ('registro', 'unidade', 10, 200, 50),
  ('torneira', 'unidade', 20, 800, 100),
  ('chuveiro', 'unidade', 30, 1500, 200),
  ('vaso sanitario', 'unidade', 100, 3000, 400),
  ('ralo', 'unidade', 5, 100, 25),
  ('caixa sifonada', 'unidade', 10, 150, 40),
  ('impermeabilizante', 'litro', 15, 200, 60),
  ('manta', 'rolo', 50, 800, 200),
  ('conduite', 'metro', 1, 15, 4),
  ('caixa eletrica', 'unidade', 3, 50, 12),
  ('argila', 'saco', 10, 80, 30);
