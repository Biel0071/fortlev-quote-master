DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quotation_access_tokens' AND column_name = 'token'
  ) THEN
    ALTER TABLE public.quotation_access_tokens ADD COLUMN token TEXT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotation_access_tokens_token_unique
ON public.quotation_access_tokens(token)
WHERE token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_quotation_access_token(
  _store_id uuid,
  _name text,
  _raw_token text,
  _access_scope text,
  _expires_at timestamptz,
  _starts_at timestamptz DEFAULT now(),
  _max_uses integer DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  token_preview text,
  store_id uuid,
  access_scope text,
  status text,
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses integer,
  uses_count integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_now timestamptz := now();
  v_scope text := lower(trim(coalesce(_access_scope, 'both')));
  v_hash text;
  v_preview text;
  v_token text := trim(_raw_token);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _store_id IS NULL THEN
    RAISE EXCEPTION 'store_id obrigatório';
  END IF;

  IF coalesce(length(trim(_name)), 0) < 2 THEN
    RAISE EXCEPTION 'Nome do token inválido';
  END IF;

  IF coalesce(length(v_token), 0) < 24 THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;

  IF _expires_at IS NULL OR _expires_at <= v_now THEN
    RAISE EXCEPTION 'Validade inválida';
  END IF;

  IF _starts_at IS NULL THEN
    _starts_at := v_now;
  END IF;

  IF _max_uses IS NOT NULL AND _max_uses <= 0 THEN
    RAISE EXCEPTION 'Limite de usos inválido';
  END IF;

  IF v_scope NOT IN ('fortlev', 'construction', 'both') THEN
    RAISE EXCEPTION 'Escopo inválido';
  END IF;

  v_hash := public.hash_access_token(v_token);
  v_preview := left(v_token, 6) || '...' || right(v_token, 4);

  INSERT INTO public.quotation_access_tokens (
    store_id,
    token,
    token_hash,
    token_preview,
    responsible_name,
    name,
    starts_at,
    expires_at,
    status,
    access_scope,
    max_uses,
    uses_count,
    created_by
  ) VALUES (
    _store_id,
    v_token,
    v_hash,
    v_preview,
    trim(_name),
    trim(_name),
    _starts_at,
    _expires_at,
    'active',
    v_scope,
    _max_uses,
    0,
    auth.uid()
  )
  RETURNING quotation_access_tokens.id INTO v_id;

  RETURN QUERY
  SELECT t.id, t.name, t.token_preview, t.store_id, t.access_scope, t.status, t.starts_at, t.expires_at, t.max_uses, t.uses_count, t.created_at
  FROM public.quotation_access_tokens t
  WHERE t.id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_public_quotation_token(
  _raw_token text,
  _access_scope text DEFAULT NULL,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS TABLE (
  token_id uuid,
  store_id uuid,
  access_scope text,
  token_name text,
  expires_at timestamptz,
  uses_count integer,
  max_uses integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_now timestamptz := now();
  v_scope text;
  v_token text := trim(_raw_token);
BEGIN
  IF coalesce(length(v_token), 0) < 24 THEN
    RAISE EXCEPTION 'Acesso inválido ou expirado';
  END IF;

  v_scope := lower(trim(coalesce(_access_scope, '')));
  IF v_scope <> '' AND v_scope NOT IN ('fortlev', 'construction') THEN
    RAISE EXCEPTION 'Escopo inválido';
  END IF;

  v_hash := public.hash_access_token(v_token);

  RETURN QUERY
  WITH matched AS (
    SELECT t.*
    FROM public.quotation_access_tokens t
    WHERE (t.token = v_token OR t.token_hash = v_hash)
      AND t.status = 'active'
      AND t.starts_at <= v_now
      AND t.expires_at > v_now
      AND (t.max_uses IS NULL OR t.uses_count < t.max_uses)
      AND (
        v_scope = ''
        OR t.access_scope = 'both'
        OR t.access_scope = v_scope
      )
    LIMIT 1
  ), updated AS (
    UPDATE public.quotation_access_tokens t
    SET
      uses_count = t.uses_count + 1,
      last_access_at = v_now,
      updated_at = v_now
    FROM matched m
    WHERE t.id = m.id
    RETURNING t.*
  ), logged AS (
    INSERT INTO public.token_logs (token_id, store_id, ip, user_agent, action, metadata, source)
    SELECT u.id, u.store_id, _ip, _user_agent, 'access', jsonb_build_object('scope', coalesce(v_scope, ''), 'validated_at', v_now), 'public'
    FROM updated u
    RETURNING id
  )
  SELECT u.id, u.store_id, u.access_scope, u.name, u.expires_at, u.uses_count, u.max_uses
  FROM updated u;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acesso inválido ou expirado';
  END IF;
END;
$$;