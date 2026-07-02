
-- system_versions
CREATE TABLE public.system_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  branch text,
  commit_hash text,
  commit_author text,
  release_notes text,
  docker_image text,
  environment text NOT NULL DEFAULT 'production',
  status text NOT NULL DEFAULT 'pending',
  is_stable boolean NOT NULL DEFAULT false,
  is_current boolean NOT NULL DEFAULT false,
  rollback_from uuid REFERENCES public.system_versions(id) ON DELETE SET NULL,
  build_seconds integer,
  deploy_seconds integer,
  health text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_versions TO authenticated;
GRANT ALL ON public.system_versions TO service_role;
ALTER TABLE public.system_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master read versions" ON public.system_versions FOR SELECT TO authenticated USING (public.is_master_admin());
CREATE POLICY "master write versions" ON public.system_versions FOR ALL TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());
CREATE TRIGGER trg_system_versions_updated BEFORE UPDATE ON public.system_versions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- platform_servers
CREATE TABLE public.platform_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hostname text,
  ip text,
  os text,
  cpu_cores integer,
  ram_mb integer,
  disk_gb integer,
  docker_version text,
  nginx_version text,
  role text DEFAULT 'app',
  status text NOT NULL DEFAULT 'unknown',
  health_score integer,
  load_avg numeric,
  temperature numeric,
  uptime_seconds bigint,
  last_heartbeat_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_servers TO authenticated;
GRANT ALL ON public.platform_servers TO service_role;
ALTER TABLE public.platform_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master read servers" ON public.platform_servers FOR SELECT TO authenticated USING (public.is_master_admin());
CREATE POLICY "master write servers" ON public.platform_servers FOR ALL TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());
CREATE TRIGGER trg_platform_servers_updated BEFORE UPDATE ON public.platform_servers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- platform_containers
CREATE TABLE public.platform_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES public.platform_servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  image text,
  version_id uuid REFERENCES public.system_versions(id) ON DELETE SET NULL,
  slot text,
  status text NOT NULL DEFAULT 'unknown',
  health text,
  cpu_pct numeric,
  ram_mb integer,
  restart_count integer NOT NULL DEFAULT 0,
  ports text[],
  volumes text[],
  started_at timestamptz,
  last_restart_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_containers TO authenticated;
GRANT ALL ON public.platform_containers TO service_role;
ALTER TABLE public.platform_containers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master read containers" ON public.platform_containers FOR SELECT TO authenticated USING (public.is_master_admin());
CREATE POLICY "master write containers" ON public.platform_containers FOR ALL TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());
CREATE TRIGGER trg_platform_containers_updated BEFORE UPDATE ON public.platform_containers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- platform_alerts
CREATE TABLE public.platform_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_alerts TO authenticated;
GRANT ALL ON public.platform_alerts TO service_role;
ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master read alerts" ON public.platform_alerts FOR SELECT TO authenticated USING (public.is_master_admin());
CREATE POLICY "master write alerts" ON public.platform_alerts FOR ALL TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());

-- platform_backups
CREATE TABLE public.platform_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  location text,
  size_bytes bigint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_backups TO authenticated;
GRANT ALL ON public.platform_backups TO service_role;
ALTER TABLE public.platform_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master read backups" ON public.platform_backups FOR SELECT TO authenticated USING (public.is_master_admin());
CREATE POLICY "master write backups" ON public.platform_backups FOR ALL TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());

CREATE INDEX IF NOT EXISTS idx_system_versions_created ON public.system_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_containers_server ON public.platform_containers(server_id);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_open ON public.platform_alerts(resolved, created_at DESC);
