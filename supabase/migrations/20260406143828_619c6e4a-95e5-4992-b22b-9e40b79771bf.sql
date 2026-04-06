-- Apply promotional prices (15-35% discount) to key products that don't have promo_price yet

-- Caixas d'Água Fortlev (20-25% discount)
UPDATE store_products SET promo_price = ROUND(price * 0.75, 2), is_promotion = true, discount_percentage = 25 WHERE id = '31f0affc-e596-413e-b113-9c17ef3ecab2' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.78, 2), is_promotion = true, discount_percentage = 22 WHERE id = '1f6a420a-b46b-4d75-b888-8aa6c1e4ee2a' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.75, 2), is_promotion = true, discount_percentage = 25 WHERE id = '0b1202d1-d3a5-4271-ad13-eeead2a3f0b3' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = '8b13a472-154d-422b-b567-fb8c726eaada' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = 'a787085e-0984-481a-9644-61c08f796870' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.78, 2), is_promotion = true, discount_percentage = 22 WHERE id = '978068df-f401-4997-803b-81354d216453' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.78, 2), is_promotion = true, discount_percentage = 22 WHERE id = '494af806-59f1-4f5d-bd1a-4cd7b14e3c16' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.75, 2), is_promotion = true, discount_percentage = 25 WHERE id = 'cb426409-f5fd-4d4f-9f44-0f94ec5937c0' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = 'e5c8e09d-ecba-4da6-b401-aa8fac3cc961' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = 'dff3c30d-69d7-47bc-870e-87137e201b4c' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = 'daeadbc0-b89e-477f-b8da-28f1eda6688d' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.82, 2), is_promotion = true, discount_percentage = 18 WHERE id = 'c7dd4267-f322-4147-a2cd-6969800c5453' AND (promo_price IS NULL OR promo_price = 0);

-- KMR 10000L (20%)
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = '1b4511bd-1a4f-4aec-a667-8beaeef12169' AND (promo_price IS NULL OR promo_price = 0);

-- Fossa Séptica Fortlev (18%)
UPDATE store_products SET promo_price = ROUND(price * 0.82, 2), is_promotion = true, discount_percentage = 18 WHERE id = '9b4e6839-85d2-4310-a249-b8468ece0c83' AND (promo_price IS NULL OR promo_price = 0);

-- Tanques Fortlev (20%)
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = '0736a79a-f70a-4b64-9d89-8974d451bc60' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = 'ea44340a-1b19-42e0-98d7-b19c1e9059d4' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = '27d65346-7eb1-44d3-8c2b-163add211981' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = '987af0db-ce09-404e-83c7-9eb31bd7f585' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = 'f3e8c5f9-84c5-48b1-82d6-6d1160ec4ca9' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.82, 2), is_promotion = true, discount_percentage = 18 WHERE id = '1d3f1556-e419-4557-a7b7-fd58a5120f75' AND (promo_price IS NULL OR promo_price = 0);

-- Cimento LIZ CP2 e CP4 (15%)
UPDATE store_products SET promo_price = ROUND(price * 0.85, 2), is_promotion = true, discount_percentage = 15 WHERE id = '38c51f55-fbf0-41c4-b223-b9993e7efb40' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.85, 2), is_promotion = true, discount_percentage = 15 WHERE id = 'df447713-81f6-4326-acba-fc83645bfc7c' AND (promo_price IS NULL OR promo_price = 0);

-- Betoneira 400L CSM (18%)
UPDATE store_products SET promo_price = ROUND(price * 0.82, 2), is_promotion = true, discount_percentage = 18 WHERE id = 'c85ead3d-ae2b-4823-b3a0-75de80041b7c' AND (promo_price IS NULL OR promo_price = 0);

-- Blocos (20%)
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = '9a4875e3-2067-4d8e-b936-56f36fe6b7e4' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = 'fef0b373-84d1-4ba7-b341-13f03cbcef38' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = '4cb67f3a-fe47-40c9-88c6-647377e8e6b1' AND (promo_price IS NULL OR promo_price = 0);

-- Tijolos (18%)
UPDATE store_products SET promo_price = ROUND(price * 0.82, 2), is_promotion = true, discount_percentage = 18 WHERE id = 'b32567b6-6882-41a3-b5cb-861bed59467d' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.82, 2), is_promotion = true, discount_percentage = 18 WHERE id = '46742601-a3b6-48fc-8060-616cebc0e8d1' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.82, 2), is_promotion = true, discount_percentage = 18 WHERE id = '8b8f783f-47e3-492c-a1ba-82f7e27ace4c' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.82, 2), is_promotion = true, discount_percentage = 18 WHERE id = 'bc3df43c-6a0a-421d-8a6b-cd53c16acd43' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.82, 2), is_promotion = true, discount_percentage = 18 WHERE id = '2abf30ad-f9e8-403a-b788-0960f0480b81' AND (promo_price IS NULL OR promo_price = 0);

-- Telhas (15-20%)
UPDATE store_products SET promo_price = ROUND(price * 0.82, 2), is_promotion = true, discount_percentage = 18 WHERE id = '88cbebc5-0da4-4de9-819b-558eadd7bfd9' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = '281a9c1c-1013-479a-a95f-66006b63b207' AND (promo_price IS NULL OR promo_price = 0);

-- Areia e Brita (15%)
UPDATE store_products SET promo_price = ROUND(price * 0.85, 2), is_promotion = true, discount_percentage = 15 WHERE id = 'a4aef52b-b730-4c85-a884-44b8ceb784a1' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.85, 2), is_promotion = true, discount_percentage = 15 WHERE id = 'bd56cd67-3b4c-435b-8cd4-94c4a0ad4dbe' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.85, 2), is_promotion = true, discount_percentage = 15 WHERE id = 'f2ebaf40-e55b-42f4-9ae6-9a1b959b5e7d' AND (promo_price IS NULL OR promo_price = 0);
UPDATE store_products SET promo_price = ROUND(price * 0.85, 2), is_promotion = true, discount_percentage = 15 WHERE id = '196a749a-e28d-4bc6-9f2e-a589ad9c00a8' AND (promo_price IS NULL OR promo_price = 0);

-- Churrasqueira (20%)
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = 'd9596c71-5f44-426c-bbb2-c52dd5362080' AND (promo_price IS NULL OR promo_price = 0);

-- Bloco Concreto Celular (20%)
UPDATE store_products SET promo_price = ROUND(price * 0.80, 2), is_promotion = true, discount_percentage = 20 WHERE id = '67ad45f0-ab43-4e12-895a-d1f57035f420' AND (promo_price IS NULL OR promo_price = 0);