
-- Trigger functions: never called via RPC
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_store_banners_compat() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_user_session_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_store_order_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at_app_shortener() FROM anon, authenticated, public;

-- Admin-only / server-only functions
REVOKE EXECUTE ON FUNCTION public.bulk_import_products(jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_plan_permissions(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.init_store_permissions(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_products_for_ai_generation(integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.count_products_for_ai_generation() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.recalculate_rating_summary(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.hash_access_token(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_role(uuid) FROM anon, authenticated, public;
