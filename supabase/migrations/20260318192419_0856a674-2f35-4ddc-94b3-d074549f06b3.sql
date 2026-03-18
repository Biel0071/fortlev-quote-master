-- Drop old check and add routing_threshold as valid method
ALTER TABLE payment_methods_config DROP CONSTRAINT payment_methods_config_method_check;
ALTER TABLE payment_methods_config ADD CONSTRAINT payment_methods_config_method_check
  CHECK (method = ANY (ARRAY['pix','card','boleto','routing_threshold']));

-- Seed routing threshold config
INSERT INTO payment_methods_config (method, enabled, config_json)
VALUES ('routing_threshold', true, '{"threshold": 980}')
ON CONFLICT (method) DO NOTHING;