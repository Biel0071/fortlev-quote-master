-- Harden create_store_order against empty carts
CREATE OR REPLACE FUNCTION public.create_store_order(
  _customer_name text,
  _customer_email text,
  _customer_phone text,
  _cep text,
  _address text,
  _notes text,
  _checkout_mode text,
  _lines jsonb,
  _coupon_code text DEFAULT NULL::text
)
RETURNS TABLE(order_id uuid, subtotal numeric, shipping numeric, discount numeric, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_customer_id uuid;
  v_subtotal numeric := 0;
  v_shipping numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_line jsonb;
  v_pid uuid;
  v_qty int;
  v_p record;
  v_unit text;
  v_price numeric;
  v_line_total numeric;
  v_cart_lines jsonb := '[]'::jsonb;
  v_coupon_result record;
  now_ts timestamptz := now();
begin
  if _checkout_mode not in ('whatsapp','gateway') then
    raise exception 'checkout_mode inválido';
  end if;

  -- block empty carts early
  if _lines is null or jsonb_typeof(_lines) <> 'array' or jsonb_array_length(_lines) = 0 then
    raise exception 'Carrinho vazio';
  end if;

  -- customer (best-effort upsert by email, then phone)
  if coalesce(nullif(trim(_customer_email), ''), null) is not null then
    select id into v_customer_id from public.store_customers where lower(email) = lower(trim(_customer_email)) limit 1;
  end if;
  if v_customer_id is null and coalesce(nullif(trim(_customer_phone), ''), null) is not null then
    select id into v_customer_id from public.store_customers where phone = trim(_customer_phone) limit 1;
  end if;

  if v_customer_id is null and (
      coalesce(nullif(trim(_customer_name), ''), null) is not null
      or coalesce(nullif(trim(_customer_email), ''), null) is not null
      or coalesce(nullif(trim(_customer_phone), ''), null) is not null
    ) then
    insert into public.store_customers(name, email, phone, cep, address)
    values (
      nullif(trim(_customer_name), ''),
      nullif(trim(_customer_email), ''),
      nullif(trim(_customer_phone), ''),
      nullif(trim(_cep), ''),
      nullif(trim(_address), '')
    )
    returning id into v_customer_id;
  end if;

  -- compute subtotal from current product prices (promo_price if >0)
  for v_line in select * from jsonb_array_elements(_lines) loop
    v_pid := (v_line->>'product_id')::uuid;
    v_qty := greatest(0, (v_line->>'quantity')::int);
    if v_qty <= 0 then
      continue;
    end if;

    select id, name, unit, price, promo_price, category_id
    into v_p
    from public.store_products
    where id = v_pid
      and active = true
    limit 1;

    if not found then
      raise exception 'Produto inválido';
    end if;

    v_unit := coalesce(v_p.unit, 'un');
    v_price := case when coalesce(v_p.promo_price,0) > 0 then v_p.promo_price else v_p.price end;
    v_line_total := v_price * v_qty;

    v_subtotal := v_subtotal + v_line_total;

    v_cart_lines := v_cart_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_p.id,
      'category_id', v_p.category_id,
      'line_subtotal', v_line_total
    ));
  end loop;

  if v_subtotal <= 0 then
    raise exception 'Carrinho vazio';
  end if;

  -- shipping rule: 7% min 30 (mirrors frontend calcShipping)
  v_shipping := greatest(30, v_subtotal * 0.07);

  -- coupon
  if coalesce(nullif(trim(_coupon_code), ''), null) is not null then
    select * into v_coupon_result
    from public.validate_coupon_cart(trim(_coupon_code), v_cart_lines, v_subtotal);

    if v_coupon_result.ok then
      v_discount := least(v_subtotal, greatest(0, v_coupon_result.discount));
      update public.store_coupons
      set uses_count = uses_count + 1
      where lower(code) = lower(trim(_coupon_code));
    end if;
  end if;

  v_total := greatest(0, v_subtotal + v_shipping - v_discount);

  insert into public.store_orders(
    status,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    cep,
    address,
    notes,
    subtotal,
    shipping,
    discount,
    total,
    checkout_mode,
    coupon_code,
    whatsapp_sent
  )
  values (
    'aguardando',
    v_customer_id,
    nullif(trim(_customer_name), ''),
    nullif(trim(_customer_email), ''),
    nullif(trim(_customer_phone), ''),
    nullif(trim(_cep), ''),
    nullif(trim(_address), ''),
    nullif(trim(_notes), ''),
    v_subtotal,
    v_shipping,
    v_discount,
    v_total,
    _checkout_mode,
    nullif(trim(_coupon_code), ''),
    false
  )
  returning id into v_order_id;

  -- insert items snapshots
  for v_line in select * from jsonb_array_elements(_lines) loop
    v_pid := (v_line->>'product_id')::uuid;
    v_qty := greatest(0, (v_line->>'quantity')::int);
    if v_qty <= 0 then
      continue;
    end if;

    select id, name, unit, price, promo_price
    into v_p
    from public.store_products
    where id = v_pid
      and active = true
    limit 1;

    v_unit := coalesce(v_p.unit, 'un');
    v_price := case when coalesce(v_p.promo_price,0) > 0 then v_p.promo_price else v_p.price end;
    v_line_total := v_price * v_qty;

    insert into public.store_order_items(order_id, product_id, name_snapshot, unit_snapshot, price_snapshot, quantity, line_total)
    values (v_order_id, v_p.id, v_p.name, v_unit, v_price, v_qty, v_line_total);
  end loop;

  return query select v_order_id, v_subtotal, v_shipping, v_discount, v_total;
end;
$function$;