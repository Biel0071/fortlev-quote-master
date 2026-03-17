
-- Update existing Fortlev products: set prices to 20% below market, set featured/best_seller flags
-- Market reference prices from Fortlev catalog

-- Update existing caixas d'água prices (20% below market)
UPDATE store_products SET price = 152.00, featured = true, best_seller = false, category = 'Hidráulica', category_id = (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
  description = 'Caixa d''água de polietileno Fortlev 500L. Resistente a raios UV, atóxica, leve e fácil de instalar. Tampa de rosca com vedação. Garantia Fortlev.'
WHERE id = '978068df-f401-4997-803b-81354d216453';

UPDATE store_products SET price = 199.20, featured = true, best_seller = true, category = 'Hidráulica', category_id = (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
  description = 'Caixa d''água de polietileno Fortlev 1000L. Ideal para residências. Resistente a raios UV, atóxica, tampa de rosca. Garantia Fortlev.'
WHERE id = '31f0affc-e596-413e-b113-9c17ef3ecab2';

UPDATE store_products SET price = 416.00, featured = true, best_seller = true, category = 'Hidráulica', category_id = (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
  description = 'Caixa d''água de polietileno Fortlev 2000L. Alta capacidade para residências e comércios. Atóxica, resistente a UV. Garantia Fortlev.'
WHERE id = '1f6a420a-b46b-4d75-b888-8aa6c1e4ee2a';

UPDATE store_products SET price = 520.00, featured = true, best_seller = true, category = 'Hidráulica', category_id = (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
  description = 'Caixa d''água de polietileno Fortlev 3000L. Para uso residencial e comercial. Resistente, atóxica, tampa com vedação. Garantia Fortlev.'
WHERE id = '0b1202d1-d3a5-4271-ad13-eeead2a3f0b3';

UPDATE store_products SET price = 1359.20, featured = true, best_seller = true, category = 'Hidráulica', category_id = (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
  description = 'Caixa d''água de polietileno Fortlev 5000L. Grande capacidade para condomínios e comércios. Atóxica, UV resistente. Garantia Fortlev.'
WHERE id = '8b13a472-154d-422b-b567-fb8c726eaada';

UPDATE store_products SET price = 2399.20, featured = true, best_seller = true, category = 'Hidráulica', category_id = (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
  description = 'Caixa d''água de polietileno Fortlev 10.000L. Capacidade industrial. Resistente, atóxica, fácil instalação. Garantia Fortlev.'
WHERE id = 'a787085e-0984-481a-9644-61c08f796870';

UPDATE store_products SET price = 4400.00, featured = true, category = 'Hidráulica', category_id = (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
  description = 'Caixa d''água de polietileno Fortlev 20.000L. Uso comercial e industrial. Máxima resistência e durabilidade. Garantia Fortlev.'
WHERE id = 'daeadbc0-b89e-477f-b8da-28f1eda6688d';

UPDATE store_products SET price = 50.22, featured = false, category = 'Hidráulica', category_id = (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
  description = 'Cano PVC para esgoto 75mm Fortlev. Barra de 6 metros. Alta resistência e vedação perfeita nas conexões.'
WHERE id = '86d1d1ba-de05-468a-af3b-78d3fc331aa7';

UPDATE store_products SET price = 1502.32, featured = true, category = 'Hidráulica', category_id = (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
  description = 'Fossa séptica biodigestor Fortlev 700L/dia. Sistema de tratamento de esgoto compacto e eficiente. Ideal para áreas sem rede de esgoto.'
WHERE id = '9b4e6839-85d2-4310-a249-b8468ece0c83';

-- Insert new Fortlev products (21 new products to reach 30 total)
INSERT INTO store_products (name, price, promo_price, unit, featured, best_seller, active, category, category_id, description)
VALUES
-- Caixas d'Água menores
('Caixa d''Água de Polietileno 100L - FORTLEV', 71.20, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Caixa d''água de polietileno Fortlev 100L. Compacta e leve, ideal para espaços reduzidos. Atóxica, resistente a UV. Altura: 41cm, Diâmetro: 56cm.'),

('Caixa d''Água de Polietileno 150L - FORTLEV', 92.00, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Caixa d''água de polietileno Fortlev 150L. Perfeita para apartamentos e casas pequenas. Atóxica, tampa de rosca. Altura: 48cm, Diâmetro: 64cm.'),

('Caixa d''Água de Polietileno 250L - FORTLEV', 119.20, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Caixa d''água de polietileno Fortlev 250L. Ideal para pequenas residências. Resistente a UV, atóxica. Altura: 55cm, Diâmetro: 77cm.'),

('Caixa d''Água de Polietileno 310L - FORTLEV', 135.20, 0, 'un', true, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Caixa d''água de polietileno Fortlev 310L. Boa capacidade para residências. Atóxica, resistente a UV, tampa com vedação. Altura: 60cm, Diâmetro: 82cm.'),

('Caixa d''Água de Polietileno 750L - FORTLEV', 175.20, 0, 'un', true, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Caixa d''água de polietileno Fortlev 750L. Capacidade intermediária para residências. Atóxica, UV resistente. Altura: 80cm, Diâmetro: 110cm.'),

('Caixa d''Água de Polietileno 1500L - FORTLEV', 319.20, 0, 'un', true, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Caixa d''água de polietileno Fortlev 1500L. Excelente para residências maiores. Atóxica, resistente, tampa de rosca. Altura: 100cm, Diâmetro: 140cm.'),

('Caixa d''Água de Polietileno 7500L - FORTLEV', 2159.20, 0, 'un', true, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Caixa d''água de polietileno Fortlev 7500L. Grande capacidade para condomínios e indústrias. Atóxica, UV resistente. Altura: 175cm, Diâmetro: 240cm.'),

('Caixa d''Água de Polietileno 15000L - FORTLEV', 3360.00, 0, 'un', true, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Caixa d''água de polietileno Fortlev 15000L. Capacidade industrial. Máxima resistência e durabilidade. Altura: 222cm, Diâmetro: 300cm.'),

-- Tanques de Polietileno
('Tanque de Polietileno 1000L - FORTLEV', 213.14, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque de polietileno Fortlev 1000L. Ideal para armazenamento de água. Tampa rosqueável, resistente a UV. Altura: 88cm, Diâmetro: 122cm.'),

('Tanque de Polietileno 2000L - FORTLEV', 445.12, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque de polietileno Fortlev 2000L. Para armazenamento de água em propriedades rurais e urbanas. UV resistente. Altura: 110cm, Diâmetro: 154cm.'),

('Tanque de Polietileno 3000L - FORTLEV', 556.40, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque de polietileno Fortlev 3000L. Robusto e durável para uso comercial e rural. Resistente a UV. Altura: 128cm, Diâmetro: 176cm.'),

('Tanque de Polietileno 5000L - FORTLEV', 1454.34, 0, 'un', true, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque de polietileno Fortlev 5000L. Alta capacidade para uso agrícola e industrial. Resistente, atóxico. Altura: 153cm, Diâmetro: 208cm.'),

('Tanque de Polietileno 10000L - FORTLEV', 2567.14, 0, 'un', true, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque de polietileno Fortlev 10000L. Capacidade industrial. Ideal para agropecuária e indústria. Altura: 193cm, Diâmetro: 264cm.'),

('Tanque de Polietileno 15000L - FORTLEV', 3595.20, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque de polietileno Fortlev 15000L. Para grandes volumes de armazenamento. UV resistente. Altura: 222cm, Diâmetro: 300cm.'),

('Tanque de Polietileno 20000L - FORTLEV', 4708.00, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque de polietileno Fortlev 20000L. Máxima capacidade para uso industrial e agrícola. Altura: 245cm, Diâmetro: 330cm.'),

-- Tanques Industriais
('Tanque Industrial de Polietileno 10000L - FORTLEV', 2687.10, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque industrial de polietileno Fortlev 10000L. Reforçado para uso industrial pesado. Resistente a produtos químicos. Altura: 193cm, Diâmetro: 264cm.'),

('Tanque Industrial de Polietileno 15000L - FORTLEV', 3763.20, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque industrial de polietileno Fortlev 15000L. Para armazenamento industrial de alta demanda. Altura: 222cm, Diâmetro: 300cm.'),

('Tanque Industrial de Polietileno 20000L - FORTLEV', 4928.00, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque industrial de polietileno Fortlev 20000L. Capacidade máxima para indústria e agronegócio. Altura: 245cm, Diâmetro: 330cm.'),

-- Tanques Verdes
('Tanque de Polietileno Verde 10000L - FORTLEV', 2639.12, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque de polietileno verde Fortlev 10000L. Versão verde para harmonizar com ambientes externos. UV resistente. Altura: 193cm, Diâmetro: 264cm.'),

('Tanque de Polietileno Verde 15000L - FORTLEV', 3696.00, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque de polietileno verde Fortlev 15000L. Versão verde para jardins e áreas externas. UV resistente. Altura: 222cm, Diâmetro: 300cm.'),

('Tanque de Polietileno Verde 20000L - FORTLEV', 4840.00, 0, 'un', false, false, true, 'Hidráulica', (SELECT id FROM store_categories WHERE slug = 'hidraulica' LIMIT 1),
 'Tanque de polietileno verde Fortlev 20000L. Versão verde de máxima capacidade. Ideal para sítios e fazendas. Altura: 245cm, Diâmetro: 330cm.');
