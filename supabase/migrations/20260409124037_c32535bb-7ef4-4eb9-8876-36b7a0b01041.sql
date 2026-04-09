DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quotation_access_tokens' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.quotation_access_tokens ADD COLUMN name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quotation_access_tokens' AND column_name = 'access_scope'
  ) THEN
    ALTER TABLE public.quotation_access_tokens ADD COLUMN access_scope TEXT NOT NULL DEFAULT 'both';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quotation_access_tokens' AND column_name = 'max_uses'
  ) THEN
    ALTER TABLE public.quotation_access_tokens ADD COLUMN max_uses INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quotation_access_tokens' AND column_name = 'uses_count'
  ) THEN
    ALTER TABLE public.quotation_access_tokens ADD COLUMN uses_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quotation_access_tokens' AND column_name = 'revoked_at'
  ) THEN
    ALTER TABLE public.quotation_access_tokens ADD COLUMN revoked_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quotation_access_tokens' AND column_name = 'revoked_by'
  ) THEN
    ALTER TABLE public.quotation_access_tokens ADD COLUMN revoked_by UUID;
  END IF;
END $$;

UPDATE public.quotation_access_tokens
SET name = COALESCE(NULLIF(TRIM(responsible_name), ''), 'Token sem nome')
WHERE name IS NULL OR TRIM(name) = '';

ALTER TABLE public.quotation_access_tokens
  ALTER COLUMN name SET NOT NULL;

ALTER TABLE public.quotation_access_tokens
  DROP CONSTRAINT IF EXISTS quotation_access_tokens_status_check;

ALTER TABLE public.quotation_access_tokens
  ADD CONSTRAINT quotation_access_tokens_status_check
  CHECK (status IN ('active', 'revoked'));

ALTER TABLE public.quotation_access_tokens
  DROP CONSTRAINT IF EXISTS quotation_access_tokens_access_scope_check;

ALTER TABLE public.quotation_access_tokens
  ADD CONSTRAINT quotation_access_tokens_access_scope_check
  CHECK (access_scope IN ('fortlev', 'construction', 'both'));

ALTER TABLE public.quotation_access_tokens
  DROP CONSTRAINT IF EXISTS quotation_access_tokens_max_uses_check;

ALTER TABLE public.quotation_access_tokens
  ADD CONSTRAINT quotation_access_tokens_max_uses_check
  CHECK (max_uses IS NULL OR max_uses > 0);

ALTER TABLE public.quotation_access_tokens
  DROP CONSTRAINT IF EXISTS quotation_access_tokens_uses_count_check;

ALTER TABLE public.quotation_access_tokens
  ADD CONSTRAINT quotation_access_tokens_uses_count_check
  CHECK (uses_count >= 0);

CREATE INDEX IF NOT EXISTS idx_quotation_access_tokens_store_status ON public.quotation_access_tokens(store_id, status);
CREATE INDEX IF NOT EXISTS idx_quotation_access_tokens_store_scope ON public.quotation_access_tokens(store_id, access_scope);
CREATE INDEX IF NOT EXISTS idx_quotation_access_tokens_last_access ON public.quotation_access_tokens(last_access_at DESC);

ALTER TABLE public.token_logs
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE public.token_logs
  DROP CONSTRAINT IF EXISTS token_logs_action_check;

ALTER TABLE public.token_logs
  ADD CONSTRAINT token_logs_action_check
  CHECK (action IN ('access', 'created_quotation', 'viewed_quotation', 'revoked'));

CREATE INDEX IF NOT EXISTS idx_token_logs_token_created ON public.token_logs(token_id, created_at DESC);

DROP POLICY IF EXISTS "Admins can manage quotation access tokens" ON public.quotation_access_tokens;
CREATE POLICY "Admins can manage quotation access tokens"
ON public.quotation_access_tokens
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read token logs" ON public.token_logs;
CREATE POLICY "Admins can read token logs"
ON public.token_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.hash_access_token(_raw_token text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT md5(_raw_token);
$$;

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

  IF coalesce(length(trim(_raw_token)), 0) < 24 THEN
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

  v_hash := public.hash_access_token(trim(_raw_token));
  v_preview := left(trim(_raw_token), 6) || '...' || right(trim(_raw_token), 4);

  INSERT INTO public.quotation_access_tokens (
    store_id,
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
BEGIN
  IF coalesce(length(trim(_raw_token)), 0) < 24 THEN
    RAISE EXCEPTION 'Acesso inválido ou expirado';
  END IF;

  v_scope := lower(trim(coalesce(_access_scope, '')));
  IF v_scope <> '' AND v_scope NOT IN ('fortlev', 'construction') THEN
    RAISE EXCEPTION 'Escopo inválido';
  END IF;

  v_hash := public.hash_access_token(trim(_raw_token));

  RETURN QUERY
  WITH matched AS (
    SELECT t.*
    FROM public.quotation_access_tokens t
    WHERE t.token_hash = v_hash
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

CREATE OR REPLACE FUNCTION public.revoke_quotation_access_token(
  _token_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.quotation_access_tokens
  SET status = 'revoked', revoked_at = now(), revoked_by = auth.uid(), updated_at = now()
  WHERE id = _token_id
  RETURNING store_id INTO v_store_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Token não encontrado';
  END IF;

  INSERT INTO public.token_logs (token_id, store_id, action, metadata, source)
  VALUES (_token_id, v_store_id, 'revoked', jsonb_build_object('revoked_by', auth.uid()), 'admin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_quotation_access_token(uuid, text, text, text, timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_quotation_access_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_public_quotation_token(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_access_token(text) TO authenticated;