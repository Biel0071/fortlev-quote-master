-- Encrypted links router, server-side LGPD IP attribution, Site/App active dwell-time, and lead purchase propensity

ALTER TABLE public.tracking_sessions
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'site',
  ADD COLUMN IF NOT EXISTS site_time_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS app_time_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS encrypted_clicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cart_actions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_visits integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ip_masked text,
  ADD COLUMN IF NOT EXISTS purchase_probability integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS lead_quality text NOT NULL DEFAULT 'frio';

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_ip_hash
  ON public.tracking_sessions(ip_hash);

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_prob
  ON public.tracking_sessions(store_id, purchase_probability DESC);

CREATE OR REPLACE FUNCTION public.extract_request_ip_info()
RETURNS TABLE(ip_hash text, ip_masked text, user_agent text, is_bot boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_headers jsonb := '{}'::jsonb;
  v_raw_ip text := '';
  v_ua text := '';
  v_parts text[];
BEGIN
  BEGIN
    v_headers := COALESCE(NULLIF(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    v_headers := '{}'::jsonb;
  END;

  v_raw_ip := COALESCE(
    NULLIF(trim(split_part(COALESCE(v_headers->>'x-forwarded-for', ''), ',', 1)), ''),
    NULLIF(trim(COALESCE(v_headers->>'x-real-ip', '')), ''),
    NULLIF(trim(COALESCE(v_headers->>'cf-connecting-ip', '')), ''),
    ''
  );

  -- Strip optional IPv4 :port suffix
  IF v_raw_ip ~ '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+$' THEN
    v_raw_ip := split_part(v_raw_ip, ':', 1);
  END IF;

  IF length(v_raw_ip) > 0 THEN
    ip_hash := encode(sha256(convert_to(v_raw_ip || '_fenix_lgpd_v1', 'UTF8')), 'hex');
    IF v_raw_ip ~ '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' THEN
      v_parts := string_to_array(v_raw_ip, '.');
      ip_masked := v_parts[1] || '.' || v_parts[2] || '.' || v_parts[3] || '.***';
    ELSIF position(':' in v_raw_ip) > 0 THEN
      v_parts := string_to_array(v_raw_ip, ':');
      ip_masked := COALESCE(v_parts[1], '') || ':' || COALESCE(v_parts[2], '') || ':' || COALESCE(v_parts[3], '') || ':****';
    ELSE
      ip_masked := 'local/***';
    END IF;
  ELSE
    ip_hash := NULL;
    ip_masked := 'local/***';
  END IF;

  v_ua := COALESCE(NULLIF(trim(COALESCE(v_headers->>'user-agent', '')), ''), 'unknown');
  user_agent := left(v_ua, 500);
  is_bot := (v_ua ~* '(googlebot|bingbot|yandexbot|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|curl/|wget/|python-requests|scrapy|go-http-client)');

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_track_visitor_event(
  p_action text,
  p_session_token text,
  p_store_id uuid DEFAULT NULL::uuid,
  p_event_type text DEFAULT NULL::text,
  p_path text DEFAULT NULL::text,
  p_product_id uuid DEFAULT NULL::uuid,
  p_category_id uuid DEFAULT NULL::uuid,
  p_duration integer DEFAULT 0,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_device text DEFAULT 'web'::text,
  p_source text DEFAULT 'direct'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_store_id uuid;
  v_session record;
  v_ip_hash text;
  v_ip_masked text;
  v_hdr_ua text;
  v_is_bot boolean := false;
  v_prior_sessions integer := 0;
  v_return_visits integer := 1;
  v_channel text := 'site';
  v_merged_channel text := 'site';
  v_score_delta integer := 0;
  v_depth integer := 0;
  v_time_inc integer := 0;
  v_page_inc integer := 0;
  v_click_inc integer := 0;
  v_enc_inc integer := 0;
  v_prod_inc integer := 0;
  v_cart_inc integer := 0;
  v_next_site_time integer := 0;
  v_next_app_time integer := 0;
  v_next_total_time integer := 0;
  v_next_pages integer := 0;
  v_next_clicks integer := 0;
  v_next_enc integer := 0;
  v_next_prod integer := 0;
  v_next_cart integer := 0;
  v_next_depth integer := 0;
  v_dwell_pts integer := 0;
  v_nav_pts integer := 0;
  v_intent_pts integer := 0;
  v_return_pts integer := 0;
  v_prob integer := 5;
  v_quality text := 'frio';
  v_next_score integer := 5;
  v_next_temp text := 'frio';
  v_ua_effective text;
BEGIN
  IF p_session_token IS NULL OR length(trim(p_session_token)) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_session_token');
  END IF;

  v_store_id := COALESCE(
    p_store_id,
    (SELECT id FROM public.stores WHERE slug = 'materiais' LIMIT 1),
    (SELECT id FROM public.stores ORDER BY created_at ASC LIMIT 1)
  );

  SELECT r.ip_hash, r.ip_masked, r.user_agent, r.is_bot
    INTO v_ip_hash, v_ip_masked, v_hdr_ua, v_is_bot
    FROM public.extract_request_ip_info() r;

  v_ua_effective := COALESCE(NULLIF(trim(p_device), ''), NULLIF(v_hdr_ua, ''), 'web');
  IF NOT v_is_bot AND v_ua_effective ~* '(googlebot|bingbot|yandexbot|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|curl/|wget/|python-requests|scrapy|go-http-client)' THEN
    v_is_bot := true;
  END IF;

  IF COALESCE(p_metadata->>'channel', '') = 'app'
     OR COALESCE(p_path, '') ~ '^/(google-play|downloads|app/|myjadlog)' THEN
    v_channel := 'app';
  ELSE
    v_channel := 'site';
  END IF;

  IF v_ip_hash IS NOT NULL THEN
    SELECT COUNT(*)::integer
      INTO v_prior_sessions
      FROM public.tracking_sessions
     WHERE ip_hash = v_ip_hash
       AND session_token <> trim(p_session_token);
    v_return_visits := LEAST(20, 1 + COALESCE(v_prior_sessions, 0));
  ELSE
    v_return_visits := 1;
  END IF;

  INSERT INTO public.tracking_sessions (
    session_token,
    store_id,
    first_seen_at,
    last_seen_at,
    device,
    source,
    user_agent,
    ip_hash,
    ip_masked,
    is_bot,
    channel,
    return_visits,
    score,
    temperature,
    purchase_probability,
    lead_quality,
    total_time_seconds,
    site_time_seconds,
    app_time_seconds,
    total_pages,
    total_clicks,
    encrypted_clicks,
    product_views,
    cart_actions,
    scroll_depth
  )
  VALUES (
    trim(p_session_token),
    v_store_id,
    now(),
    now(),
    v_ua_effective,
    COALESCE(NULLIF(trim(p_source), ''), 'direct'),
    COALESCE(NULLIF(v_hdr_ua, 'unknown'), v_ua_effective),
    v_ip_hash,
    v_ip_masked,
    v_is_bot,
    v_channel,
    v_return_visits,
    CASE WHEN v_is_bot THEN 0 ELSE 5 END,
    'frio',
    CASE WHEN v_is_bot THEN 0 ELSE 5 END,
    CASE WHEN v_is_bot THEN 'bot' ELSE 'frio' END,
    0, 0, 0, 0, 0, 0, 0, 0, 0
  )
  ON CONFLICT (session_token) DO UPDATE
    SET last_seen_at = now(),
        store_id = COALESCE(public.tracking_sessions.store_id, EXCLUDED.store_id),
        ip_hash = COALESCE(EXCLUDED.ip_hash, public.tracking_sessions.ip_hash),
        ip_masked = COALESCE(NULLIF(EXCLUDED.ip_masked, 'local/***'), public.tracking_sessions.ip_masked),
        is_bot = (public.tracking_sessions.is_bot OR EXCLUDED.is_bot),
        return_visits = GREATEST(public.tracking_sessions.return_visits, EXCLUDED.return_visits),
        channel = CASE
          WHEN public.tracking_sessions.channel = 'site+app' THEN 'site+app'
          WHEN public.tracking_sessions.channel <> EXCLUDED.channel THEN 'site+app'
          ELSE public.tracking_sessions.channel
        END
  RETURNING * INTO v_session;

  IF p_action IN ('start_session', 'set_consent') THEN
    RETURN jsonb_build_object(
      'ok', true,
      'session_id', v_session.id,
      'ip_masked', v_session.ip_masked,
      'is_bot', v_session.is_bot,
      'purchase_probability', v_session.purchase_probability,
      'lead_quality', v_session.lead_quality
    );
  END IF;

  IF p_action = 'track_event' AND p_event_type IS NOT NULL AND length(trim(p_event_type)) > 0 THEN
    v_score_delta := GREATEST(0, COALESCE((p_metadata->>'score_delta')::numeric, 2)::integer);
    v_depth := GREATEST(0, LEAST(100, COALESCE((p_metadata->>'depth')::numeric, 0)::integer));
    v_time_inc := GREATEST(0, LEAST(600, COALESCE(p_duration, 0)));

    INSERT INTO public.tracking_events (
      session_id,
      store_id,
      type,
      product_id,
      category_id,
      path,
      metadata,
      created_at
    )
    VALUES (
      v_session.id,
      v_store_id,
      trim(p_event_type),
      p_product_id,
      p_category_id,
      p_path,
      COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'ip_masked', COALESCE(v_ip_masked, v_session.ip_masked),
        'channel', v_channel,
        'is_bot', COALESCE(v_session.is_bot, v_is_bot)
      ),
      now()
    );

    IF trim(p_event_type) = 'page_view' AND COALESCE(p_duration, 0) = 0 THEN
      v_page_inc := 1;
    END IF;

    IF trim(p_event_type) IN (
      'click', 'link_click', 'add_to_cart', 'banner_click', 'checkout_start',
      'request_quote', 'search', 'whatsapp_click', 'download_apk', 'app_banner_click', 'category_click'
    ) THEN
      v_click_inc := 1;
    END IF;

    IF trim(p_event_type) = 'link_click' OR COALESCE((p_metadata->>'encrypted')::boolean, false) = true THEN
      v_enc_inc := 1;
    END IF;

    IF trim(p_event_type) = 'product_view' THEN
      v_prod_inc := 1;
    END IF;

    IF trim(p_event_type) IN ('add_to_cart', 'checkout_start', 'purchase', 'request_quote') THEN
      v_cart_inc := 1;
    END IF;

    v_next_site_time := COALESCE(v_session.site_time_seconds, 0) + (CASE WHEN v_channel = 'site' THEN v_time_inc ELSE 0 END);
    v_next_app_time := COALESCE(v_session.app_time_seconds, 0) + (CASE WHEN v_channel = 'app' THEN v_time_inc ELSE 0 END);
    v_next_total_time := COALESCE(v_session.total_time_seconds, 0) + v_time_inc;
    v_next_pages := COALESCE(v_session.total_pages, 0) + v_page_inc;
    v_next_clicks := COALESCE(v_session.total_clicks, 0) + v_click_inc;
    v_next_enc := COALESCE(v_session.encrypted_clicks, 0) + v_enc_inc;
    v_next_prod := COALESCE(v_session.product_views, 0) + v_prod_inc;
    v_next_cart := COALESCE(v_session.cart_actions, 0) + v_cart_inc;
    v_next_depth := GREATEST(COALESCE(v_session.scroll_depth, 0), v_depth);

    v_merged_channel := CASE
      WHEN v_next_site_time > 0 AND v_next_app_time > 0 THEN 'site+app'
      WHEN COALESCE(v_session.channel, 'site') = 'site+app' THEN 'site+app'
      ELSE COALESCE(v_session.channel, v_channel)
    END;

    IF COALESCE(v_session.is_bot, v_is_bot) THEN
      v_prob := 0;
      v_quality := 'bot';
      v_next_temp := 'frio';
      v_next_score := 0;
    ELSE
      v_dwell_pts := CASE
        WHEN v_next_total_time >= 420 THEN 30
        WHEN v_next_total_time >= 240 THEN 27
        WHEN v_next_total_time >= 120 THEN 22
        WHEN v_next_total_time >= 45 THEN 15
        WHEN v_next_total_time >= 15 THEN 8
        ELSE 2
      END;
      IF v_next_site_time > 0 AND v_next_app_time > 0 THEN
        v_dwell_pts := LEAST(32, v_dwell_pts + 4);
      END IF;

      v_nav_pts := LEAST(8, v_next_pages * 2) + LEAST(7, v_next_enc * 2) + ROUND(v_next_depth * 0.05)::integer;
      v_intent_pts := LEAST(12, v_next_prod * 4) + LEAST(28, v_next_cart * 12) + (
        CASE WHEN trim(p_event_type) IN ('whatsapp_click', 'download_apk', 'checkout_start', 'request_quote') THEN 10 ELSE 0 END
      );
      v_intent_pts := LEAST(40, v_intent_pts);
      v_return_pts := LEAST(10, GREATEST(0, COALESCE(v_session.return_visits, v_return_visits) - 1) * 5);

      IF trim(p_event_type) = 'purchase' THEN
        v_prob := 100;
      ELSE
        v_prob := LEAST(98, GREATEST(5, v_dwell_pts + v_nav_pts + v_intent_pts + v_return_pts));
      END IF;

      v_quality := CASE
        WHEN v_prob >= 85 THEN 'pronto_compra'
        WHEN v_prob >= 65 THEN 'quente'
        WHEN v_prob >= 35 THEN 'morno'
        ELSE 'frio'
      END;

      v_next_temp := CASE
        WHEN v_prob >= 65 THEN 'quente'
        WHEN v_prob >= 35 THEN 'morno'
        ELSE 'frio'
      END;

      v_next_score := GREATEST(COALESCE(v_session.score, 0) + v_score_delta, v_prob);
    END IF;

    UPDATE public.tracking_sessions
       SET score = v_next_score,
           temperature = v_next_temp,
           purchase_probability = v_prob,
           lead_quality = v_quality,
           channel = v_merged_channel,
           last_seen_at = now(),
           total_time_seconds = v_next_total_time,
           site_time_seconds = v_next_site_time,
           app_time_seconds = v_next_app_time,
           total_pages = v_next_pages,
           total_clicks = v_next_clicks,
           encrypted_clicks = v_next_enc,
           product_views = v_next_prod,
           cart_actions = v_next_cart,
           scroll_depth = v_next_depth
     WHERE id = v_session.id;

    RETURN jsonb_build_object(
      'ok', true,
      'session_id', v_session.id,
      'score', v_next_score,
      'temperature', v_next_temp,
      'purchase_probability', v_prob,
      'lead_quality', v_quality,
      'is_bot', COALESCE(v_session.is_bot, v_is_bot),
      'ip_masked', COALESCE(v_session.ip_masked, v_ip_masked)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'session_id', v_session.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_resolve_short_link(
  p_slug text,
  p_session_token text DEFAULT NULL::text,
  p_utm_source text DEFAULT NULL::text,
  p_utm_campaign text DEFAULT NULL::text,
  p_referrer text DEFAULT NULL::text,
  p_target_url text DEFAULT NULL::text,
  p_label text DEFAULT NULL::text,
  p_channel text DEFAULT 'site'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_store_id uuid;
  v_session_token text;
  v_ip_hash text;
  v_ip_masked text;
  v_ua text;
  v_is_bot boolean := false;
  v_device text := 'desktop';
  v_browser text := 'other';
  v_row record;
  v_target text;
  v_sys_slug text;
  v_link_id uuid;
  v_link_type text := 'page';
  v_track_res jsonb;
BEGIN
  v_store_id := COALESCE(
    (SELECT id FROM public.stores WHERE slug = 'materiais' LIMIT 1),
    (SELECT id FROM public.stores ORDER BY created_at ASC LIMIT 1)
  );

  v_session_token := COALESCE(
    NULLIF(trim(p_session_token), ''),
    'enc_' || replace(gen_random_uuid()::text, '-', '')
  );

  SELECT r.ip_hash, r.ip_masked, r.user_agent, r.is_bot
    INTO v_ip_hash, v_ip_masked, v_ua, v_is_bot
    FROM public.extract_request_ip_info() r;

  IF lower(COALESCE(v_ua, '')) ~ '(mobile|android|iphone|ipad)' THEN
    v_device := 'mobile';
  END IF;

  IF lower(COALESCE(v_ua, '')) LIKE '%edg/%' THEN v_browser := 'edge';
  ELSIF lower(COALESCE(v_ua, '')) LIKE '%chrome/%' THEN v_browser := 'chrome';
  ELSIF lower(COALESCE(v_ua, '')) LIKE '%safari/%' THEN v_browser := 'safari';
  ELSIF lower(COALESCE(v_ua, '')) LIKE '%firefox/%' THEN v_browser := 'firefox';
  END IF;

  -- Check custom short link in app_short_links first (case-insensitive)
  SELECT * INTO v_row
    FROM public.app_short_links
   WHERE slug = lower(trim(COALESCE(p_slug, '')))
   LIMIT 1;

  IF FOUND THEN
    IF NOT v_row.active THEN
      RETURN jsonb_build_object('ok', false, 'error', 'inactive_link');
    END IF;
    IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
      RETURN jsonb_build_object('ok', false, 'error', 'expired_link');
    END IF;

    v_target := v_row.original_url;
    v_link_id := v_row.id;
    v_store_id := v_row.store_id;

    UPDATE public.app_short_links
       SET clicks = COALESCE(clicks, 0) + 1,
           last_clicked_at = now()
     WHERE id = v_row.id;
  ELSIF p_target_url IS NOT NULL AND length(trim(p_target_url)) > 0 THEN
    v_target := trim(p_target_url);

    -- Validate safe redirect destinations (internal single-slash routes, official domain, or wa.me)
    IF NOT (
      (v_target ~ '^/([^/\\]|$)' AND v_target NOT LIKE '/admin%' AND v_target NOT LIKE '/r/%')
      OR v_target ~* '^https://wa\.me/'
      OR v_target ~* '^https://(www\.)?materialdecontrucao\.online(/|$)'
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'unsafe_target');
    END IF;

    IF v_store_id IS NOT NULL THEN
      v_sys_slug := 'sys-' || substr(encode(sha256(convert_to(v_target, 'UTF8')), 'hex'), 1, 10);
      v_link_type := CASE
        WHEN v_target LIKE '/google-play%' OR v_target LIKE '/downloads%' OR v_target LIKE '/app/%' THEN 'apk'
        WHEN v_target LIKE '/produto/%' THEN 'product'
        ELSE 'page'
      END;

      INSERT INTO public.app_short_links (
        store_id, slug, original_url, title, created_via, link_type, active, clicks, last_clicked_at, metadata
      )
      VALUES (
        v_store_id,
        v_sys_slug,
        v_target,
        COALESCE(NULLIF(trim(p_label), ''), left(v_target, 120)),
        'encrypted_router',
        v_link_type,
        true,
        1,
        now(),
        jsonb_build_object('sample_token', left(COALESCE(p_slug, ''), 120))
      )
      ON CONFLICT (slug) DO UPDATE
        SET clicks = COALESCE(public.app_short_links.clicks, 0) + 1,
            last_clicked_at = now(),
            title = COALESCE(NULLIF(public.app_short_links.title, ''), EXCLUDED.title)
      RETURNING id INTO v_link_id;
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_link_id IS NOT NULL AND v_store_id IS NOT NULL THEN
    INSERT INTO public.app_short_link_clicks (
      short_link_id, store_id, session_token, ip_hash, user_agent, device, browser,
      utm_source, utm_campaign, referrer, created_at
    )
    VALUES (
      v_link_id, v_store_id, v_session_token, v_ip_hash, v_ua, v_device, v_browser,
      NULLIF(trim(p_utm_source), ''), NULLIF(trim(p_utm_campaign), ''), NULLIF(trim(p_referrer), ''), now()
    );
  END IF;

  v_track_res := public.rpc_track_visitor_event(
    'track_event',
    v_session_token,
    v_store_id,
    'link_click',
    v_target,
    NULL,
    NULL,
    0,
    jsonb_build_object(
      'encrypted', true,
      'slug', left(COALESCE(p_slug, ''), 80),
      'label', COALESCE(NULLIF(trim(p_label), ''), 'encrypted_link'),
      'channel', CASE WHEN COALESCE(p_channel, 'site') = 'app' THEN 'app' ELSE 'site' END,
      'utm_source', p_utm_source,
      'utm_campaign', p_utm_campaign,
      'score_delta', 4
    ),
    v_ua,
    COALESCE(NULLIF(trim(p_referrer), ''), 'encrypted_link')
  );

  RETURN jsonb_build_object(
    'ok', true,
    'destination_url', v_target,
    'session_token', v_session_token,
    'is_bot', COALESCE((v_track_res->>'is_bot')::boolean, v_is_bot),
    'ip_masked', COALESCE(v_track_res->>'ip_masked', v_ip_masked),
    'purchase_probability', COALESCE((v_track_res->>'purchase_probability')::integer, 5),
    'lead_quality', COALESCE(v_track_res->>'lead_quality', 'frio')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.extract_request_ip_info() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_track_visitor_event(text, text, uuid, text, text, uuid, uuid, integer, jsonb, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_resolve_short_link(text, text, text, text, text, text, text, text) TO anon, authenticated, service_role;
