ALTER TABLE public.quotation_access_tokens
  DROP CONSTRAINT IF EXISTS quotation_access_tokens_status_check;

ALTER TABLE public.quotation_access_tokens
  ADD CONSTRAINT quotation_access_tokens_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'revoked'::text, 'blocked'::text]));

ALTER TABLE public.quotation_access_tokens
  ADD COLUMN IF NOT EXISTS device_hash text,
  ADD COLUMN IF NOT EXISTS first_access_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_access_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_ip text,
  ADD COLUMN IF NOT EXISTS last_user_agent text,
  ADD COLUMN IF NOT EXISTS blocked_reason text;

CREATE INDEX IF NOT EXISTS idx_quotation_access_tokens_store_status
  ON public.quotation_access_tokens(store_id, status);

CREATE INDEX IF NOT EXISTS idx_quotation_access_tokens_device_hash
  ON public.quotation_access_tokens(device_hash)
  WHERE device_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_public_quotation_token(
  _raw_token text,
  _store_slug text DEFAULT NULL,
  _device_hash text DEFAULT NULL,
  _access_scope text DEFAULT NULL,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS TABLE(
  token_id uuid,
  store_id uuid,
  store_slug text,
  access_scope text,
  token_name text,
  expires_at timestamptz,
  uses_count integer,
  max_uses integer,
  is_first_access boolean,
  device_bound boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_scope text := lower(trim(coalesce(_access_scope, '')));
  v_raw_token text := trim(coalesce(_raw_token, ''));
  v_slug text := nullif(lower(trim(coalesce(_store_slug, ''))), '');
  v_device text := trim(coalesce(_device_hash, ''));
  v_hash text;
  v_token public.quotation_access_tokens%ROWTYPE;
  v_store_slug text;
  v_is_first boolean := false;
BEGIN
  IF length(v_raw_token) < 8 THEN
    RAISE EXCEPTION 'Acesso inválido ou expirado';
  END IF;

  IF v_scope <> '' AND v_scope NOT IN ('fortlev', 'construction') THEN
    RAISE EXCEPTION 'Escopo inválido';
  END IF;

  IF length(v_device) < 8 THEN
    RAISE EXCEPTION 'Dispositivo inválido';
  END IF;

  v_hash := public.hash_access_token(v_raw_token);

  SELECT t.*
  INTO v_token
  FROM public.quotation_access_tokens t
  JOIN public.stores s ON s.id = t.store_id
  WHERE (t.token = v_raw_token OR t.token_hash = v_hash)
    AND (v_slug IS NULL OR lower(s.slug) = v_slug)
  ORDER BY t.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_token.id IS NULL THEN
    RAISE EXCEPTION 'Acesso inválido ou expirado';
  END IF;

  SELECT s.slug INTO v_store_slug
  FROM public.stores s
  WHERE s.id = v_token.store_id
  LIMIT 1;

  IF NOT public.check_rate_limit(
    coalesce(_ip, 'unknown') || ':' || v_token.id::text,
    'quotation_token_validate',
    60,
    10
  ) THEN
    INSERT INTO public.token_logs(token_id, store_id, ip, user_agent, action, metadata, source)
    VALUES (
      v_token.id,
      v_token.store_id,
      _ip,
      _user_agent,
      'rate_limited',
      jsonb_build_object('reason', 'max_10_per_minute'),
      'public'
    );
    RAISE EXCEPTION 'Muitas tentativas. Tente novamente em instantes.';
  END IF;

  IF v_token.status IN ('revoked', 'blocked') THEN
    INSERT INTO public.token_logs(token_id, store_id, ip, user_agent, action, metadata, source)
    VALUES (
      v_token.id,
      v_token.store_id,
      _ip,
      _user_agent,
      CASE WHEN v_token.status = 'blocked' THEN 'bloqueado_device' ELSE 'revogado' END,
      jsonb_build_object('status', v_token.status),
      'public'
    );
    RAISE EXCEPTION 'Acesso inválido ou expirado';
  END IF;

  IF v_token.starts_at > v_now OR v_token.expires_at <= v_now THEN
    INSERT INTO public.token_logs(token_id, store_id, ip, user_agent, action, metadata, source)
    VALUES (
      v_token.id,
      v_token.store_id,
      _ip,
      _user_agent,
      'expirado',
      jsonb_build_object('starts_at', v_token.starts_at, 'expires_at', v_token.expires_at),
      'public'
    );
    RAISE EXCEPTION 'Acesso inválido ou expirado';
  END IF;

  IF v_token.max_uses IS NOT NULL AND v_token.uses_count >= v_token.max_uses THEN
    INSERT INTO public.token_logs(token_id, store_id, ip, user_agent, action, metadata, source)
    VALUES (
      v_token.id,
      v_token.store_id,
      _ip,
      _user_agent,
      'expirado',
      jsonb_build_object('reason', 'max_uses_reached', 'max_uses', v_token.max_uses),
      'public'
    );
    RAISE EXCEPTION 'Acesso inválido ou expirado';
  END IF;

  IF v_scope <> '' AND NOT (v_token.access_scope = 'both' OR v_token.access_scope = v_scope) THEN
    RAISE EXCEPTION 'Acesso inválido para este módulo';
  END IF;

  IF v_token.device_hash IS NULL THEN
    v_is_first := true;

    UPDATE public.quotation_access_tokens
    SET
      device_hash = v_device,
      first_access_at = v_now,
      last_access_at = v_now,
      last_ip = _ip,
      last_user_agent = _user_agent,
      uses_count = uses_count + 1,
      updated_at = v_now
    WHERE id = v_token.id
    RETURNING * INTO v_token;

    INSERT INTO public.token_logs(token_id, store_id, ip, user_agent, action, metadata, source)
    VALUES (
      v_token.id,
      v_token.store_id,
      _ip,
      _user_agent,
      'acesso_inicial',
      jsonb_build_object('store_slug', v_store_slug),
      'public'
    );
  ELSE
    IF v_token.device_hash <> v_device THEN
      INSERT INTO public.token_logs(token_id, store_id, ip, user_agent, action, metadata, source)
      VALUES (
        v_token.id,
        v_token.store_id,
        _ip,
        _user_agent,
        'bloqueado_device',
        jsonb_build_object('store_slug', v_store_slug),
        'public'
      );
      RAISE EXCEPTION 'Este acesso já está sendo usado em outro dispositivo.';
    END IF;

    UPDATE public.quotation_access_tokens
    SET
      last_access_at = v_now,
      last_ip = _ip,
      last_user_agent = _user_agent,
      uses_count = uses_count + 1,
      updated_at = v_now
    WHERE id = v_token.id
    RETURNING * INTO v_token;

    INSERT INTO public.token_logs(token_id, store_id, ip, user_agent, action, metadata, source)
    VALUES (
      v_token.id,
      v_token.store_id,
      _ip,
      _user_agent,
      'reacesso',
      jsonb_build_object('store_slug', v_store_slug),
      'public'
    );
  END IF;

  RETURN QUERY
  SELECT
    v_token.id,
    v_token.store_id,
    v_store_slug,
    v_token.access_scope,
    v_token.name,
    v_token.expires_at,
    v_token.uses_count,
    v_token.max_uses,
    v_is_first,
    (v_token.device_hash IS NOT NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_quotation_access_token(_token_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.quotation_access_tokens
  SET
    status = 'active',
    blocked_reason = NULL,
    device_hash = NULL,
    first_access_at = NULL,
    last_access_at = NULL,
    last_ip = NULL,
    last_user_agent = NULL,
    uses_count = 0,
    revoked_at = NULL,
    revoked_by = NULL,
    updated_at = now()
  WHERE id = _token_id
  RETURNING store_id INTO v_store_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Token não encontrado';
  END IF;

  INSERT INTO public.token_logs(token_id, store_id, action, metadata, source)
  VALUES (_token_id, v_store_id, 'resetado', jsonb_build_object('reset_by', auth.uid()), 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.block_quotation_access_token(_token_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.quotation_access_tokens
  SET
    status = 'blocked',
    blocked_reason = nullif(trim(coalesce(_reason, '')), ''),
    revoked_at = now(),
    revoked_by = auth.uid(),
    updated_at = now()
  WHERE id = _token_id
  RETURNING store_id INTO v_store_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Token não encontrado';
  END IF;

  INSERT INTO public.token_logs(token_id, store_id, action, metadata, source)
  VALUES (
    _token_id,
    v_store_id,
    'bloqueado_admin',
    jsonb_build_object('blocked_by', auth.uid(), 'reason', _reason),
    'admin'
  );
END;
$$;