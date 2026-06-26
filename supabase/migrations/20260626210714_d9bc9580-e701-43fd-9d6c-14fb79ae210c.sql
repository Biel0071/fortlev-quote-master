
-- 1) Custo financeiro por chave de API
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS cost_limit_brl numeric(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_used_brl numeric(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_call_brl numeric(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS key_prefix text;

-- Preenche key_prefix para chaves existentes
UPDATE public.api_keys SET key_prefix = left(key, 11) WHERE key_prefix IS NULL;

-- 2) Coluna de custo nos logs (para auditoria por requisição)
ALTER TABLE public.api_usage_logs
  ADD COLUMN IF NOT EXISTS cost_brl numeric(12,4) NOT NULL DEFAULT 0;

-- 3) Ampliar RLS: admins da loja gerenciam só as chaves da sua loja
DROP POLICY IF EXISTS "admins manage api_keys" ON public.api_keys;

CREATE POLICY "Master manages all api_keys"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

CREATE POLICY "Store admins manage their api_keys"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND store_id IN (
      SELECT store_id FROM public.saas_user_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND store_id IN (
      SELECT store_id FROM public.saas_user_access WHERE user_id = auth.uid()
    )
  );

-- 4) Logs visíveis para o admin da loja correspondente
DROP POLICY IF EXISTS "admins read api_usage_logs" ON public.api_usage_logs;

CREATE POLICY "Master reads all api_usage_logs"
  ON public.api_usage_logs
  FOR SELECT
  TO authenticated
  USING (public.is_master_admin());

CREATE POLICY "Store admins read their api_usage_logs"
  ON public.api_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND store_id IN (
      SELECT store_id FROM public.saas_user_access WHERE user_id = auth.uid()
    )
  );

-- 5) Função usada por edge functions para validar a chave e debitar quota/custo
CREATE OR REPLACE FUNCTION public.api_consume_key(
  _raw_key text,
  _endpoint text,
  _method text,
  _scope text,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS TABLE (
  ok boolean,
  status_code int,
  message text,
  api_key_id uuid,
  store_id uuid,
  permissions text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k public.api_keys%ROWTYPE;
  v_cost numeric;
  v_now timestamptz := now();
BEGIN
  IF _raw_key IS NULL OR length(trim(_raw_key)) < 16 THEN
    RETURN QUERY SELECT false, 401, 'Chave de API inválida', NULL::uuid, NULL::uuid, NULL::text[];
    RETURN;
  END IF;

  SELECT * INTO k FROM public.api_keys WHERE key = trim(_raw_key) LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 401, 'Chave de API inválida', NULL::uuid, NULL::uuid, NULL::text[];
    RETURN;
  END IF;

  IF NOT k.active OR k.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 401, 'Chave revogada', k.id, k.store_id, k.permissions;
    RETURN;
  END IF;

  IF k.expires_at IS NOT NULL AND k.expires_at <= v_now THEN
    RETURN QUERY SELECT false, 401, 'Chave expirada', k.id, k.store_id, k.permissions;
    RETURN;
  END IF;

  IF k.starts_at > v_now THEN
    RETURN QUERY SELECT false, 401, 'Chave ainda não está ativa', k.id, k.store_id, k.permissions;
    RETURN;
  END IF;

  IF _scope IS NOT NULL AND _scope <> '' AND NOT (_scope = ANY(k.permissions)) THEN
    RETURN QUERY SELECT false, 403, 'Escopo não permitido: ' || _scope, k.id, k.store_id, k.permissions;
    RETURN;
  END IF;

  IF k.quota_limit > 0 AND k.quota_used >= k.quota_limit THEN
    RETURN QUERY SELECT false, 429, 'Quota mensal esgotada', k.id, k.store_id, k.permissions;
    RETURN;
  END IF;

  v_cost := coalesce(k.cost_per_call_brl, 0);
  IF k.cost_limit_brl > 0 AND (k.cost_used_brl + v_cost) > k.cost_limit_brl THEN
    RETURN QUERY SELECT false, 402, 'Limite de custo atingido', k.id, k.store_id, k.permissions;
    RETURN;
  END IF;

  UPDATE public.api_keys
  SET
    quota_used = quota_used + 1,
    cost_used_brl = cost_used_brl + v_cost,
    last_used_at = v_now
  WHERE id = k.id;

  INSERT INTO public.api_usage_logs (api_key_id, store_id, endpoint, method, status_code, ip, user_agent, cost_brl)
  VALUES (k.id, k.store_id, _endpoint, _method, 200, _ip, _user_agent, v_cost);

  RETURN QUERY SELECT true, 200, 'ok', k.id, k.store_id, k.permissions;
END;
$$;

REVOKE ALL ON FUNCTION public.api_consume_key(text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.api_consume_key(text, text, text, text, text, text) TO service_role;

-- 6) Trigger para preencher key_prefix em inserts novos
CREATE OR REPLACE FUNCTION public.set_api_key_prefix()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.key_prefix IS NULL THEN
    NEW.key_prefix := left(NEW.key, 11);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_api_keys_prefix ON public.api_keys;
CREATE TRIGGER trg_api_keys_prefix
  BEFORE INSERT OR UPDATE OF key ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_api_key_prefix();
