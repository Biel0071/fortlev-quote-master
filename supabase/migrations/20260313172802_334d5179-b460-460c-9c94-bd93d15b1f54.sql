
CREATE OR REPLACE FUNCTION public.bulk_import_products(_data jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_item jsonb;
  v_cat_id uuid;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(_data)
  LOOP
    SELECT id INTO v_cat_id FROM store_categories WHERE lower(name) = lower(v_item->>'category') LIMIT 1;
    
    INSERT INTO store_products (sku, name, category, category_id, unit, price, promo_price, stock, active, status, description)
    VALUES (
      v_item->>'sku',
      v_item->>'name',
      v_item->>'category',
      v_cat_id,
      COALESCE(v_item->>'unit', 'UN'),
      COALESCE((v_item->>'price')::numeric, 0),
      COALESCE((v_item->>'promoPrice')::numeric, 0),
      100,
      true,
      'published',
      v_item->>'description'
    )
    ON CONFLICT (sku) WHERE sku IS NOT NULL AND sku != ''
    DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      category_id = EXCLUDED.category_id,
      unit = EXCLUDED.unit,
      price = EXCLUDED.price,
      promo_price = EXCLUDED.promo_price,
      status = 'published',
      active = true,
      description = EXCLUDED.description;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;
