CREATE OR REPLACE FUNCTION public.log_token_action(
  _raw_token text,
  _store_id uuid,
  _action text,
  _quotation_type text DEFAULT NULL,
  _quotation_id uuid DEFAULT NULL,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _source text DEFAULT 'public',
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token record;
  v_log_id uuid;
  v_hash text;
  v_action text := lower(trim(coalesce(_action, '')));
BEGIN
  IF coalesce(length(trim(_raw_token)), 0) < 24 THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;

  IF _store_id IS NULL THEN
    RAISE EXCEPTION 'store_id obrigatório';
  END IF;

  IF v_action NOT IN ('access', 'created_quotation', 'viewed_quotation', 'revoked') THEN
    RAISE EXCEPTION 'Ação inválida';
  END IF;

  v_hash := public.hash_access_token(trim(_raw_token));

  SELECT id, store_id, status, starts_at, expires_at
  INTO v_token
  FROM public.quotation_access_tokens
  WHERE (token = trim(_raw_token) OR token_hash = v_hash)
    AND store_id = _store_id
  LIMIT 1;

  IF v_token.id IS NULL THEN
    RAISE EXCEPTION 'Token não encontrado para a loja';
  END IF;

  IF v_action IN ('access', 'created_quotation', 'viewed_quotation') THEN
    IF v_token.status <> 'active' OR v_token.starts_at > now() OR v_token.expires_at <= now() THEN
      RAISE EXCEPTION 'Token inválido ou expirado';
    END IF;
  END IF;

  INSERT INTO public.token_logs (
    token_id,
    store_id,
    ip,
    user_agent,
    action,
    quotation_type,
    quotation_id,
    metadata,
    source
  ) VALUES (
    v_token.id,
    _store_id,
    _ip,
    _user_agent,
    v_action,
    _quotation_type,
    _quotation_id,
    coalesce(_metadata, '{}'::jsonb),
    coalesce(_source, 'public')
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_token_action(text, uuid, text, text, uuid, text, text, text, jsonb) TO anon, authenticated;