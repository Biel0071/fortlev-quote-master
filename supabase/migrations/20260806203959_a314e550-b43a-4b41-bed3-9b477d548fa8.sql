ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS customer_cpf text;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;
GRANT SELECT ON public.store_orders TO anon;