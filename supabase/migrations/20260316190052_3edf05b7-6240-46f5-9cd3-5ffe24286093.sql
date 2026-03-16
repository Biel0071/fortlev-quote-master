
-- Image review queue for AI-validated product images
CREATE TABLE public.image_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.store_products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  image_path TEXT,
  source TEXT DEFAULT 'scraper',
  confidence NUMERIC DEFAULT 0,
  ai_analysis TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.image_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage image review queue"
  ON public.image_review_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- AI system reports for daily intelligence
CREATE TABLE public.ai_system_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL UNIQUE,
  metrics_json JSONB DEFAULT '{}'::jsonb,
  analysis_text TEXT,
  alerts JSONB DEFAULT '[]'::jsonb,
  suggestions JSONB DEFAULT '[]'::jsonb,
  comparison_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_system_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read AI reports"
  ON public.ai_system_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- System memory for event tracking
CREATE TABLE public.system_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  impact TEXT DEFAULT 'low',
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read system memory"
  ON public.system_memory FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert memory"
  ON public.system_memory FOR INSERT
  WITH CHECK (true);
