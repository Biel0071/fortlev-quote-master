
-- Fortlev quotations
CREATE TABLE public.fortlev_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  customer_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  company_info_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  freight numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  taxes_json jsonb,
  validity text NOT NULL DEFAULT '7 dias',
  observations text NOT NULL DEFAULT '',
  payment_conditions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_time text NOT NULL DEFAULT '',
  show_client_data boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  branding_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fortlev_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read fortlev quotations" ON public.fortlev_quotations FOR SELECT USING (true);
CREATE POLICY "Public can insert fortlev quotations" ON public.fortlev_quotations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update fortlev quotations" ON public.fortlev_quotations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete fortlev quotations" ON public.fortlev_quotations FOR DELETE USING (true);

-- Construction quotations
CREATE TABLE public.construction_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  customer_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  company_info_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  freight numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  validity text NOT NULL DEFAULT '5 dias',
  observations text NOT NULL DEFAULT '',
  payment_method text NOT NULL DEFAULT 'PIX',
  delivery_date text NOT NULL DEFAULT '',
  show_client_data boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.construction_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read construction quotations" ON public.construction_quotations FOR SELECT USING (true);
CREATE POLICY "Public can insert construction quotations" ON public.construction_quotations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update construction quotations" ON public.construction_quotations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete construction quotations" ON public.construction_quotations FOR DELETE USING (true);

-- Sales records
CREATE TABLE public.sales_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store text NOT NULL,
  quotation_id uuid NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  sold_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read sales records" ON public.sales_records FOR SELECT USING (true);
CREATE POLICY "Public can insert sales records" ON public.sales_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update sales records" ON public.sales_records FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete sales records" ON public.sales_records FOR DELETE USING (true);

-- Indexes
CREATE INDEX idx_fortlev_quotations_created ON public.fortlev_quotations(created_at DESC);
CREATE INDEX idx_construction_quotations_created ON public.construction_quotations(created_at DESC);
CREATE INDEX idx_sales_records_store ON public.sales_records(store, created_at DESC);
CREATE INDEX idx_sales_records_quotation ON public.sales_records(quotation_id);
