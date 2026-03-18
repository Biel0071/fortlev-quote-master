DROP POLICY IF EXISTS "Admin can read logs" ON public.payment_logs;

CREATE POLICY "Admins can manage payment logs"
ON public.payment_logs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can insert payment logs"
ON public.payment_logs
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can insert webhooks"
ON public.payment_webhooks
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can update webhooks"
ON public.payment_webhooks
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Anon can update transactions"
ON public.payment_transactions
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Anon can insert transactions"
ON public.payment_transactions
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can read transactions"
ON public.payment_transactions
FOR SELECT
TO anon
USING (true);