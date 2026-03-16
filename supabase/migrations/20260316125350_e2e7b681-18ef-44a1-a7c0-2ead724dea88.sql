
CREATE TABLE public.pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  filter_used text NOT NULL DEFAULT 'all',
  total_products integer NOT NULL DEFAULT 0,
  completed integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  images_imported integer NOT NULL DEFAULT 0,
  descriptions_generated integer NOT NULL DEFAULT 0,
  avg_time_ms numeric NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  worker_count integer NOT NULL DEFAULT 15,
  processed_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pipeline_runs"
  ON public.pipeline_runs
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_pipeline_runs_updated_at
  BEFORE UPDATE ON public.pipeline_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
