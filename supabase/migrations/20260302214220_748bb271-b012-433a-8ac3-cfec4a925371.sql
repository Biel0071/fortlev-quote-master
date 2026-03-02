-- 1) Customers base (progressive profile by phone)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  email TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customers_name_len CHECK (name IS NULL OR length(trim(name)) BETWEEN 2 AND 120),
  CONSTRAINT customers_phone_norm_len CHECK (length(phone_normalized) BETWEEN 10 AND 15),
  CONSTRAINT customers_email_len CHECK (email IS NULL OR length(trim(email)) <= 255)
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_normalized_key ON public.customers(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_last_seen_at ON public.customers(last_seen_at DESC);

-- 2) Customer sessions
CREATE TABLE IF NOT EXISTS public.customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  is_persistent BOOLEAN NOT NULL DEFAULT false,
  route_type TEXT NOT NULL DEFAULT 'unknown',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_sessions_route_type_check CHECK (route_type IN ('unknown', 'whatsapp', 'gateway')),
  CONSTRAINT customer_sessions_session_id_len CHECK (length(trim(session_id)) BETWEEN 8 AND 200)
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id ON public.customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_last_seen_at ON public.customer_sessions(last_seen_at DESC);

-- 3) Checkout sessions (requested contract)
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  observacoes TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  route_type TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  ip TEXT,
  user_agent TEXT,
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT checkout_sessions_route_type_check CHECK (route_type IN ('whatsapp', 'gateway')),
  CONSTRAINT checkout_sessions_nome_len CHECK (length(trim(nome)) BETWEEN 2 AND 120),
  CONSTRAINT checkout_sessions_telefone_len CHECK (length(regexp_replace(telefone, '\\D', '', 'g')) BETWEEN 10 AND 15),
  CONSTRAINT checkout_sessions_email_len CHECK (email IS NULL OR length(trim(email)) <= 255),
  CONSTRAINT checkout_sessions_cep_len CHECK (cep IS NULL OR length(trim(cep)) <= 12),
  CONSTRAINT checkout_sessions_endereco_len CHECK (endereco IS NULL OR length(trim(endereco)) <= 255),
  CONSTRAINT checkout_sessions_numero_len CHECK (numero IS NULL OR length(trim(numero)) <= 20),
  CONSTRAINT checkout_sessions_complemento_len CHECK (complemento IS NULL OR length(trim(complemento)) <= 255),
  CONSTRAINT checkout_sessions_observacoes_len CHECK (observacoes IS NULL OR length(trim(observacoes)) <= 1000),
  CONSTRAINT checkout_sessions_subtotal_non_negative CHECK (subtotal >= 0),
  CONSTRAINT checkout_sessions_total_non_negative CHECK (total >= 0),
  CONSTRAINT checkout_sessions_cart_items_is_array CHECK (jsonb_typeof(cart_items) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_telefone ON public.checkout_sessions(telefone);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_session_id ON public.checkout_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_created_at ON public.checkout_sessions(created_at DESC);

-- 4) Abandoned checkouts
CREATE TABLE IF NOT EXISTS public.abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  checkout_session_id UUID REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,
  route_type TEXT NOT NULL,
  last_step TEXT NOT NULL DEFAULT 'identify',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  recovery_status TEXT NOT NULL DEFAULT 'open',
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT abandoned_checkouts_route_type_check CHECK (route_type IN ('whatsapp', 'gateway')),
  CONSTRAINT abandoned_checkouts_last_step_check CHECK (last_step IN ('identify', 'delivery', 'redirected', 'completed')),
  CONSTRAINT abandoned_checkouts_recovery_status_check CHECK (recovery_status IN ('open', 'recovered', 'discarded')),
  CONSTRAINT abandoned_checkouts_session_id_len CHECK (length(trim(session_id)) BETWEEN 8 AND 200),
  CONSTRAINT abandoned_checkouts_subtotal_non_negative CHECK (subtotal >= 0),
  CONSTRAINT abandoned_checkouts_total_non_negative CHECK (total >= 0),
  CONSTRAINT abandoned_checkouts_cart_items_is_array CHECK (jsonb_typeof(cart_items) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_session_id ON public.abandoned_checkouts(session_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_customer_id ON public.abandoned_checkouts(customer_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_status ON public.abandoned_checkouts(recovery_status);

-- 5) RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
CREATE POLICY "Admins can manage customers"
ON public.customers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage customer sessions" ON public.customer_sessions;
CREATE POLICY "Admins can manage customer sessions"
ON public.customer_sessions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage checkout sessions" ON public.checkout_sessions;
CREATE POLICY "Admins can manage checkout sessions"
ON public.checkout_sessions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage abandoned checkouts" ON public.abandoned_checkouts;
CREATE POLICY "Admins can manage abandoned checkouts"
ON public.abandoned_checkouts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6) updated_at triggers (reuse existing function)
DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_customer_sessions_updated_at ON public.customer_sessions;
CREATE TRIGGER set_customer_sessions_updated_at
BEFORE UPDATE ON public.customer_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_checkout_sessions_updated_at ON public.checkout_sessions;
CREATE TRIGGER set_checkout_sessions_updated_at
BEFORE UPDATE ON public.checkout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_abandoned_checkouts_updated_at ON public.abandoned_checkouts;
CREATE TRIGGER set_abandoned_checkouts_updated_at
BEFORE UPDATE ON public.abandoned_checkouts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 7) Server-side validated upsert for checkout session data
CREATE OR REPLACE FUNCTION public.upsert_checkout_session(
  _session_id TEXT,
  _consent_given BOOLEAN,
  _is_persistent BOOLEAN,
  _nome TEXT,
  _telefone TEXT,
  _email TEXT,
  _cep TEXT,
  _endereco TEXT,
  _numero TEXT,
  _complemento TEXT,
  _observacoes TEXT,
  _subtotal NUMERIC,
  _total NUMERIC,
  _route_type TEXT,
  _cart_items JSONB,
  _ip TEXT,
  _user_agent TEXT,
  _last_step TEXT DEFAULT 'identify'
)
RETURNS TABLE(checkout_session_id UUID, customer_id UUID, session_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_phone_norm := regexp_replace(v_phone_raw, '\\D', '', 'g');
  IF length(v_phone_norm) < 10 OR length(v_phone_norm) > 15 THEN
    RAISE EXCEPTION 'telefone inválido';
  END IF;

  v_email := nullif(trim(coalesce(_email, '')), '');
  IF v_email IS NOT NULL AND (position('@' in v_email) <= 1 OR length(v_email) > 255) THEN
    RAISE EXCEPTION 'email inválido';
  END IF;

  v_cep := nullif(trim(coalesce(_cep, '')), '');
  IF v_cep IS NOT NULL AND length(v_cep) > 12 THEN
    RAISE EXCEPTION 'cep inválido';
  END IF;

  v_endereco := nullif(trim(coalesce(_endereco, '')), '');
  IF v_endereco IS NOT NULL AND length(v_endereco) > 255 THEN
    RAISE EXCEPTION 'endereco inválido';
  END IF;

  v_numero := nullif(trim(coalesce(_numero, '')), '');
  IF v_numero IS NOT NULL AND length(v_numero) > 20 THEN
    RAISE EXCEPTION 'numero inválido';
  END IF;

  v_complemento := nullif(trim(coalesce(_complemento, '')), '');
  IF v_complemento IS NOT NULL AND length(v_complemento) > 255 THEN
    RAISE EXCEPTION 'complemento inválido';
  END IF;

  v_observacoes := nullif(trim(coalesce(_observacoes, '')), '');
  IF v_observacoes IS NOT NULL AND length(v_observacoes) > 1000 THEN
    RAISE EXCEPTION 'observações inválidas';
  END IF;

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

  INSERT INTO public.customers (name, phone, phone_normalized, email, first_seen_at, last_seen_at)
  VALUES (v_nome, v_phone_raw, v_phone_norm, v_email, now(), now())
  ON CONFLICT (phone_normalized)
  DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.customers.name),
    phone = COALESCE(EXCLUDED.phone, public.customers.phone),
    email = COALESCE(EXCLUDED.email, public.customers.email),
    last_seen_at = now()
  RETURNING id INTO v_customer_id;

  INSERT INTO public.customer_sessions (session_id, customer_id, consent_given, is_persistent, route_type, started_at, last_seen_at)
  VALUES (v_session_id, v_customer_id, coalesce(_consent_given, false), coalesce(_is_persistent, false), v_route_type, now(), now())
  ON CONFLICT (session_id)
  DO UPDATE SET
    customer_id = COALESCE(EXCLUDED.customer_id, public.customer_sessions.customer_id),
    consent_given = (public.customer_sessions.consent_given OR EXCLUDED.consent_given),
    is_persistent = EXCLUDED.is_persistent,
    route_type = EXCLUDED.route_type,
    last_seen_at = now();

  INSERT INTO public.checkout_sessions (
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
    email = COALESCE(EXCLUDED.email, public.checkout_sessions.email),
    cep = COALESCE(EXCLUDED.cep, public.checkout_sessions.cep),
    endereco = COALESCE(EXCLUDED.endereco, public.checkout_sessions.endereco),
    numero = COALESCE(EXCLUDED.numero, public.checkout_sessions.numero),
    complemento = COALESCE(EXCLUDED.complemento, public.checkout_sessions.complemento),
    observacoes = COALESCE(EXCLUDED.observacoes, public.checkout_sessions.observacoes),
    subtotal = EXCLUDED.subtotal,
    total = EXCLUDED.total,
    route_type = EXCLUDED.route_type,
    consent_given = EXCLUDED.consent_given,
    ip = CASE
      WHEN EXCLUDED.consent_given THEN COALESCE(EXCLUDED.ip, public.checkout_sessions.ip)
      ELSE NULL
    END,
    user_agent = CASE
      WHEN EXCLUDED.consent_given THEN COALESCE(EXCLUDED.user_agent, public.checkout_sessions.user_agent)
      ELSE NULL
    END,
    cart_items = EXCLUDED.cart_items,
    updated_at = now()
  RETURNING id INTO v_checkout_id;

  INSERT INTO public.abandoned_checkouts (
    session_id, customer_id, checkout_session_id, route_type, last_step, subtotal, total, cart_items, recovery_status
  )
  VALUES (
    v_session_id, v_customer_id, v_checkout_id, v_route_type, v_last_step, v_subtotal, v_total, v_cart_items,
    CASE WHEN v_last_step = 'completed' THEN 'recovered' ELSE 'open' END
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.abandoned_checkouts
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
      WHEN recovery_status = 'recovered' THEN 'recovered'
      ELSE 'open'
    END,
    recovered_at = CASE
      WHEN v_last_step = 'completed' AND recovered_at IS NULL THEN now()
      ELSE recovered_at
    END,
    updated_at = now()
  WHERE session_id = v_session_id
    AND recovery_status IN ('open', 'recovered')
    AND id = (
      SELECT id FROM public.abandoned_checkouts
      WHERE session_id = v_session_id
      ORDER BY created_at DESC
      LIMIT 1
    );

  RETURN QUERY SELECT v_checkout_id, v_customer_id, v_session_id;
END;
$$;