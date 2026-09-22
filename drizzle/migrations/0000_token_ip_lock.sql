ALTER TABLE public.quotation_access_tokens ADD COLUMN IF NOT EXISTS locked_ip text;

CREATE OR REPLACE FUNCTION public.enforce_token_ip_lock(_token_id uuid, _ip text, _is_first boolean DEFAULT false, _user_agent text DEFAULT null)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip text := nullif(trim(coalesce(_ip, '')), '');
  v_token public.quotation_access_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_token FROM public.quotation_access_tokens WHERE id = _token_id FOR UPDATE;
  IF v_token.id IS NULL THEN
    RAISE EXCEPTION 'Acesso inválido ou expirado';
  END IF;

  IF v_ip IS NULL THEN
    RETURN true;
  END IF;

  IF _is_first OR v_token.locked_ip IS NULL THEN
    UPDATE public.quotation_access_tokens SET locked_ip = v_ip, updated_at = now() WHERE id = _token_id;
    RETURN true;
  END IF;

  IF v_token.locked_ip <> v_ip THEN
    INSERT INTO public.token_logs(token_id, store_id, ip, user_agent, action, metadata, source)
    VALUES (_token_id, v_token.store_id, v_ip, _user_agent, 'bloqueado_ip',
      jsonb_build_object('locked_ip', v_token.locked_ip, 'attempt_ip', v_ip), 'public');
    RAISE EXCEPTION 'Este acesso está travado em outra rede/IP.';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_quotation_access_token(_token_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.quotation_access_tokens
  SET device_hash = NULL,
      locked_ip = NULL,
      first_access_at = NULL,
      uses_count = 0,
      status = 'active',
      blocked_reason = NULL,
      updated_at = now()
  WHERE id = _token_id;
END;
$$;