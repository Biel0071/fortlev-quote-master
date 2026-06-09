DROP POLICY IF EXISTS "Owners can manage access within tenant" ON public.saas_user_access;

CREATE POLICY "Owners can manage access within tenant" ON public.saas_user_access
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.stores s 
        WHERE s.id = tenant_id 
        AND s.owner_id = auth.uid()
    )
);