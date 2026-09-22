ALTER TABLE public.token_logs DROP CONSTRAINT IF EXISTS token_logs_action_check;
ALTER TABLE public.token_logs ADD CONSTRAINT token_logs_action_check CHECK (action = ANY (ARRAY[
  'access','created_quotation','viewed_quotation','revoked',
  'acesso_inicial','reacesso','bloqueado_device','bloqueado_ip','expirado','revogado','rate_limited'
]));