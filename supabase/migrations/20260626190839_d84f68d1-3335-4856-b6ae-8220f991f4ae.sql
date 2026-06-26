
-- 1) Recreate upsert_checkout_session with column-conflict resolution
CREATE OR REPLACE FUNCTION public.upsert_checkout_session(
  _session_id text, _consent_given boolean, _is_persistent boolean,
  _nome text, _telefone text, _email text, _cep text, _endereco text,
  _numero text, _complemento text, _observacoes text,
  _subtotal numeric, _total numeric, _route_type text,
  _cart_items jsonb, _ip text, _user_agent text, _last_step text DEFAULT 'identify'::text
)
RETURNS TABLE(checkout_session_id uuid, customer_id uuid, session_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_session_id TEXT;
  v_nome TEXT;
  v_phone_raw TEXT;
  v_phone_norm TEXT;
  v_email TEXT;
  v_cep TEXT;
  v_endereco TEXT;
  v_numero TEXT;
  v_complemento TEXT;
  v_observacoes TEXT;
  v_subtotal NUMERIC;
  v_total NUMERIC;
  v_route_type TEXT;
  v_cart_items JSONB;
  v_last_step TEXT;
  v_customer_id UUID;
  v_checkout_id UUID;
BEGIN
  v_session_id := trim(coalesce(_session_id, ''));
  IF length(v_session_id) < 8 OR length(v_session_id) > 200 THEN
    RAISE EXCEPTION 'session_id inválido';
  END IF;

  v_nome := trim(coalesce(_nome, ''));
  IF length(v_nome) < 2 OR length(v_nome) > 120 THEN
    RAISE EXCEPTION 'nome inválido';
  END IF;

  v_phone_raw := trim(coalesce(_telefone, ''));
  v_phone_norm := regexp_replace(v_phone_raw, '\D', '', 'g');
  IF length(v_phone_norm) < 10 OR length(v_phone_norm) > 15 THEN
    RAISE EXCEPTION 'telefone inválido';
  END IF;

  v_email := nullif(trim(coalesce(_email, '')), '');
  IF v_email IS NOT NULL AND (position('@' in v_email) <= 1 OR length(v_email) > 255) THEN
    RAISE EXCEPTION 'email inválido';
  END IF;

  v_cep := nullif(trim(coalesce(_cep, '')), '');
  v_endereco := nullif(trim(coalesce(_endereco, '')), '');
  v_numero := nullif(trim(coalesce(_numero, '')), '');
  v_complemento := nullif(trim(coalesce(_complemento, '')), '');
  v_observacoes := nullif(trim(coalesce(_observacoes, '')), '');

  v_subtotal := greatest(0, coalesce(_subtotal, 0));
  v_total := greatest(0, coalesce(_total, 0));

  v_route_type := lower(trim(coalesce(_route_type, '')));
  IF v_route_type NOT IN ('whatsapp', 'gateway') THEN
    RAISE EXCEPTION 'route_type inválido';
  END IF;

  v_cart_items := coalesce(_cart_items, '[]'::jsonb);
  IF jsonb_typeof(v_cart_items) <> 'array' THEN
    RAISE EXCEPTION 'cart_items inválido';
  END IF;

  v_last_step := lower(trim(coalesce(_last_step, 'identify')));
  IF v_last_step NOT IN ('identify', 'delivery', 'redirected', 'completed') THEN
    v_last_step := 'identify';
  END IF;

  INSERT INTO public.customers AS c (name, phone, phone_normalized, email, first_seen_at, last_seen_at)
  VALUES (v_nome, v_phone_raw, v_phone_norm, v_email, now(), now())
  ON CONFLICT (phone_normalized)
  DO UPDATE SET
    name = COALESCE(EXCLUDED.name, c.name),
    phone = COALESCE(EXCLUDED.phone, c.phone),
    email = COALESCE(EXCLUDED.email, c.email),
    last_seen_at = now()
  RETURNING c.id INTO v_customer_id;

  INSERT INTO public.customer_sessions AS cs (session_id, customer_id, consent_given, is_persistent, route_type, started_at, last_seen_at)
  VALUES (v_session_id, v_customer_id, coalesce(_consent_given, false), coalesce(_is_persistent, false), v_route_type, now(), now())
  ON CONFLICT (session_id)
  DO UPDATE SET
    customer_id = COALESCE(EXCLUDED.customer_id, cs.customer_id),
    consent_given = (cs.consent_given OR EXCLUDED.consent_given),
    is_persistent = EXCLUDED.is_persistent,
    route_type = EXCLUDED.route_type,
    last_seen_at = now();

  INSERT INTO public.checkout_sessions AS chk (
    session_id, customer_id, nome, telefone, email, cep, endereco, numero, complemento, observacoes,
    subtotal, total, route_type, consent_given, ip, user_agent, cart_items
  )
  VALUES (
    v_session_id, v_customer_id, v_nome, v_phone_raw, v_email, v_cep, v_endereco, v_numero, v_complemento, v_observacoes,
    v_subtotal, v_total, v_route_type, coalesce(_consent_given, false),
    CASE WHEN coalesce(_consent_given, false) THEN nullif(trim(coalesce(_ip, '')), '') ELSE NULL END,
    CASE WHEN coalesce(_consent_given, false) THEN nullif(trim(coalesce(_user_agent, '')), '') ELSE NULL END,
    v_cart_items
  )
  ON CONFLICT (session_id)
  DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone,
    email = COALESCE(EXCLUDED.email, chk.email),
    cep = COALESCE(EXCLUDED.cep, chk.cep),
    endereco = COALESCE(EXCLUDED.endereco, chk.endereco),
    numero = COALESCE(EXCLUDED.numero, chk.numero),
    complemento = COALESCE(EXCLUDED.complemento, chk.complemento),
    observacoes = COALESCE(EXCLUDED.observacoes, chk.observacoes),
    subtotal = EXCLUDED.subtotal,
    total = EXCLUDED.total,
    route_type = EXCLUDED.route_type,
    consent_given = EXCLUDED.consent_given,
    ip = CASE WHEN EXCLUDED.consent_given THEN COALESCE(EXCLUDED.ip, chk.ip) ELSE NULL END,
    user_agent = CASE WHEN EXCLUDED.consent_given THEN COALESCE(EXCLUDED.user_agent, chk.user_agent) ELSE NULL END,
    cart_items = EXCLUDED.cart_items,
    updated_at = now()
  RETURNING chk.id INTO v_checkout_id;

  INSERT INTO public.abandoned_checkouts (
    session_id, customer_id, checkout_session_id, route_type, last_step, subtotal, total, cart_items, recovery_status
  )
  VALUES (
    v_session_id, v_customer_id, v_checkout_id, v_route_type, v_last_step, v_subtotal, v_total, v_cart_items,
    CASE WHEN v_last_step = 'completed' THEN 'recovered' ELSE 'open' END
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.abandoned_checkouts ab
  SET
    customer_id = v_customer_id,
    checkout_session_id = v_checkout_id,
    route_type = v_route_type,
    last_step = v_last_step,
    subtotal = v_subtotal,
    total = v_total,
    cart_items = v_cart_items,
    recovery_status = CASE
      WHEN v_last_step = 'completed' THEN 'recovered'
      WHEN ab.recovery_status = 'recovered' THEN 'recovered'
      ELSE 'open'
    END,
    recovered_at = CASE
      WHEN v_last_step = 'completed' AND ab.recovered_at IS NULL THEN now()
      ELSE ab.recovered_at
    END,
    updated_at = now()
  WHERE ab.session_id = v_session_id
    AND ab.recovery_status IN ('open', 'recovered')
    AND ab.id = (
      SELECT ac.id FROM public.abandoned_checkouts ac
      WHERE ac.session_id = v_session_id
      ORDER BY ac.created_at DESC
      LIMIT 1
    );

  RETURN QUERY SELECT v_checkout_id, v_customer_id, v_session_id;
END;
$function$;

-- 2) Tracking columns: capture IP/UA always
ALTER TABLE public.tracking_sessions
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS user_agent text;
