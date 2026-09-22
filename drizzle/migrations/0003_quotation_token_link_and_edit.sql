ALTER TABLE public.fortlev_quotations ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.fortlev_quotations ADD COLUMN IF NOT EXISTS token_name text;
ALTER TABLE public.construction_quotations ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.construction_quotations ADD COLUMN IF NOT EXISTS token_name text;

CREATE OR REPLACE FUNCTION public.fill_quotation_token_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t record;
BEGIN
  IF NEW.source_token_id IS NOT NULL THEN
    SELECT store_id, name INTO t FROM public.quotation_access_tokens WHERE id = NEW.source_token_id;
    IF FOUND THEN
      NEW.store_id := coalesce(NEW.store_id, t.store_id);
      NEW.token_name := coalesce(NEW.token_name, t.name);
      NEW.created_via_token := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fortlev_quotations_token_meta ON public.fortlev_quotations;
CREATE TRIGGER trg_fortlev_quotations_token_meta
BEFORE INSERT OR UPDATE ON public.fortlev_quotations
FOR EACH ROW EXECUTE FUNCTION public.fill_quotation_token_meta();

DROP TRIGGER IF EXISTS trg_construction_quotations_token_meta ON public.construction_quotations;
CREATE TRIGGER trg_construction_quotations_token_meta
BEFORE INSERT OR UPDATE ON public.construction_quotations
FOR EACH ROW EXECUTE FUNCTION public.fill_quotation_token_meta();

UPDATE public.fortlev_quotations q
SET store_id = t.store_id, token_name = t.name
FROM public.quotation_access_tokens t
WHERE q.source_token_id = t.id AND (q.store_id IS NULL OR q.token_name IS NULL);

UPDATE public.construction_quotations q
SET store_id = t.store_id, token_name = t.name
FROM public.quotation_access_tokens t
WHERE q.source_token_id = t.id AND (q.store_id IS NULL OR q.token_name IS NULL);

CREATE OR REPLACE FUNCTION public.update_quotation_access_token(
  _token_id uuid,
  _name text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL,
  _max_uses integer DEFAULT NULL,
  _clear_max_uses boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _name IS NOT NULL AND length(trim(_name)) < 2 THEN
    RAISE EXCEPTION 'Nome inválido';
  END IF;

  IF _max_uses IS NOT NULL AND _max_uses <= 0 THEN
    RAISE EXCEPTION 'Limite de acessos inválido';
  END IF;

  UPDATE public.quotation_access_tokens
  SET
    name = coalesce(nullif(trim(coalesce(_name, '')), ''), name),
    responsible_name = coalesce(nullif(trim(coalesce(_name, '')), ''), responsible_name),
    expires_at = coalesce(_expires_at, expires_at),
    max_uses = CASE WHEN _clear_max_uses THEN NULL ELSE coalesce(_max_uses, max_uses) END,
    updated_at = now()
  WHERE id = _token_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token não encontrado';
  END IF;
END;
$$;