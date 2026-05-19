-- Tabela de empresas emissoras (Multi-empresa)
CREATE TABLE public.issuing_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trading_name text,
  cnpj text UNIQUE NOT NULL,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  email text,
  website text,
  seller_name text,
  seller_role text,
  signature_url text,
  logo_url text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.issuing_companies ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para issuing_companies
CREATE POLICY "Public read active companies" ON public.issuing_companies FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage companies" ON public.issuing_companies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed inicial de empresas
INSERT INTO public.issuing_companies (name, trading_name, cnpj, address, city, state, zip_code, phone, email, website, is_default)
VALUES 
('Depósito Vista Alegre LTDA', 'Vista Alegre Materiais', '12.345.678/0001-90', 'Av. Principal, 1000', 'São Paulo', 'SP', '01000-000', '(11) 99999-9999', 'contato@vistaalegre.com.br', 'www.vistaalegre.com.br', true),
('Fortlev Indústria e Comércio de Plásticos LTDA', 'Fortlev Matriz - ES', '10.921.911/0001-05', 'Rua Aracruz, 245', 'Serra', 'ES', '29161-001', '(27) 2121-6700', 'contato@fortlev.com.br', 'www.fortlev.com.br', false),
('Fortlev Indústria e Comércio de Plásticos LTDA', 'Fortlev Unidade MG', '10.921.911/0002-88', 'Rodovia BR 146, km 485', 'Cabo Verde', 'MG', '37720-000', '(35) 3736-1000', 'unidade.mg@fortlev.com.br', 'www.fortlev.com.br', false),
('Fortlev Indústria e Comércio de Plásticos LTDA', 'Fortlev Unidade BA', '10.921.911/0003-69', 'Via Atlântica, s/n', 'Camaçari', 'BA', '42810-000', '(71) 3622-8000', 'unidade.ba@fortlev.com.br', 'www.fortlev.com.br', false),
('Fortlev Indústria e Comércio de Plásticos LTDA', 'Fortlev Unidade PE', '10.921.911/0004-40', 'Rodovia BR 101 Sul, km 95', 'Jaboatão dos Guararapes', 'PE', '54345-160', '(81) 3479-8100', 'unidade.pe@fortlev.com.br', 'www.fortlev.com.br', false),
('Fortlev Indústria e Comércio de Plásticos LTDA', 'Fortlev Unidade SC', '10.921.911/0005-20', 'Rua Dona Francisca, 8300', 'Joinville', 'SC', '89219-600', '(47) 3461-1200', 'unidade.sc@fortlev.com.br', 'www.fortlev.com.br', false);

-- Tabela de Leads (CRM)
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  document text,
  source text DEFAULT 'manual', -- manual, whatsapp, site, ads
  status text DEFAULT 'new', -- new, contact, quoting, closed, lost
  conversion_rate numeric(5,2),
  total_spent numeric(12,2) DEFAULT 0,
  last_purchase timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para crm_leads
CREATE POLICY "Admins manage leads" ON public.crm_leads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tabela de Rastreamento (Order Tracking)
CREATE TABLE public.order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL, -- referencial
  status text NOT NULL, -- pending, processing, shipped, delivered, cancelled
  description text,
  location text,
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para order_tracking
CREATE POLICY "Public read tracking" ON public.order_tracking FOR SELECT USING (true);
CREATE POLICY "Admins manage tracking" ON public.order_tracking FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Adicionar colunas extras nas tabelas de orçamentos
ALTER TABLE public.fortlev_quotations ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.issuing_companies(id);
ALTER TABLE public.fortlev_quotations ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.crm_leads(id);
ALTER TABLE public.fortlev_quotations ADD COLUMN IF NOT EXISTS is_order boolean DEFAULT false;

ALTER TABLE public.construction_quotations ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.issuing_companies(id);
ALTER TABLE public.construction_quotations ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.crm_leads(id);
ALTER TABLE public.construction_quotations ADD COLUMN IF NOT EXISTS is_order boolean DEFAULT false;

-- Trigger para updated_at
CREATE TRIGGER trg_issuing_companies_updated_at BEFORE UPDATE ON public.issuing_companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_leads_updated_at BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices
CREATE INDEX idx_issuing_companies_cnpj ON public.issuing_companies(cnpj);
CREATE INDEX idx_crm_leads_phone ON public.crm_leads(phone);
CREATE INDEX idx_crm_leads_document ON public.crm_leads(document);
CREATE INDEX idx_order_tracking_order_id ON public.order_tracking(order_id);
CREATE INDEX idx_fortlev_quotations_company ON public.fortlev_quotations(company_id);
CREATE INDEX idx_construction_quotations_company ON public.construction_quotations(company_id);