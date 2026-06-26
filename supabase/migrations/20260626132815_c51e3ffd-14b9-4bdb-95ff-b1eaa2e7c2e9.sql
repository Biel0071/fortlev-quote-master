
-- APKs: admin-only writes
DROP POLICY IF EXISTS "Authenticated users can insert apks" ON public.apks;
DROP POLICY IF EXISTS "Authenticated users can update apks" ON public.apks;
DROP POLICY IF EXISTS "Authenticated users can delete apks" ON public.apks;
CREATE POLICY "Admins can insert apks" ON public.apks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update apks" ON public.apks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete apks" ON public.apks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- payment_transactions: drop anon read/update
DROP POLICY IF EXISTS "Anon can read transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Anon can update transactions" ON public.payment_transactions;

-- payment_webhooks: drop anon update
DROP POLICY IF EXISTS "Anon can update webhooks" ON public.payment_webhooks;

-- saas_subscriptions: drop tautological policy
DROP POLICY IF EXISTS "Tenants can view own subscription" ON public.saas_subscriptions;

-- saas_rbac_permissions: authenticated only
DROP POLICY IF EXISTS "RBAC is public" ON public.saas_rbac_permissions;
CREATE POLICY "RBAC readable by authenticated" ON public.saas_rbac_permissions FOR SELECT TO authenticated USING (true);

-- sales_records: admin-only
DROP POLICY IF EXISTS "Public can read sales records" ON public.sales_records;
DROP POLICY IF EXISTS "Public can insert sales records" ON public.sales_records;
DROP POLICY IF EXISTS "Public can update sales records" ON public.sales_records;
DROP POLICY IF EXISTS "Public can delete sales records" ON public.sales_records;
CREATE POLICY "Admins manage sales records" ON public.sales_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- store_orders: tighten customer email policy
DROP POLICY IF EXISTS "Customers can read own orders" ON public.store_orders;
CREATE POLICY "Customers can read own orders"
ON public.store_orders FOR SELECT TO authenticated
USING (
  customer_email IS NOT NULL
  AND length(trim(customer_email)) > 0
  AND (auth.jwt() ->> 'email') IS NOT NULL
  AND length(trim(auth.jwt() ->> 'email')) > 0
  AND lower(customer_email) = lower(auth.jwt() ->> 'email')
);

-- store_ai_configs / store_modules: authenticated read only
DROP POLICY IF EXISTS "Public AI configs are viewable by everyone" ON public.store_ai_configs;
CREATE POLICY "AI configs readable by authenticated" ON public.store_ai_configs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public modules are viewable by everyone" ON public.store_modules;
CREATE POLICY "Modules readable by authenticated" ON public.store_modules FOR SELECT TO authenticated USING (true);

-- construction_quotations: remove unconditional public update/delete
DROP POLICY IF EXISTS "Public can update construction quotations" ON public.construction_quotations;
DROP POLICY IF EXISTS "Public can delete construction quotations" ON public.construction_quotations;
CREATE POLICY "Admins update construction quotations" ON public.construction_quotations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete construction quotations" ON public.construction_quotations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- fortlev_quotations: same treatment
DROP POLICY IF EXISTS "Public can update fortlev quotations" ON public.fortlev_quotations;
DROP POLICY IF EXISTS "Public can delete fortlev quotations" ON public.fortlev_quotations;
CREATE POLICY "Admins update fortlev quotations" ON public.fortlev_quotations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete fortlev quotations" ON public.fortlev_quotations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
