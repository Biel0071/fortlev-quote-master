ALTER TABLE payment_methods_config DROP CONSTRAINT payment_methods_config_method_check;
ALTER TABLE payment_methods_config ADD CONSTRAINT payment_methods_config_method_check CHECK (method = ANY (ARRAY['pix','card','boleto','routing_threshold','gateway_enabled']));
INSERT INTO payment_methods_config (method, enabled, config_json) VALUES ('gateway_enabled', false, '{"enabled": false}'::jsonb);