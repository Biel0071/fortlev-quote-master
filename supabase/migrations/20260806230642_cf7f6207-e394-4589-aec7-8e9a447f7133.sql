-- Create Unified Leads View
CREATE OR REPLACE VIEW public.store_customer_contacts AS
WITH all_contacts AS (
    -- From store_orders
    SELECT 
        customer_cpf as document,
        customer_name as name,
        customer_phone as phone,
        customer_email as email,
        'Pedido' as source,
        id::text as reference_id,
        subtotal as value,
        created_at,
        store_id,
        address,
        cep
    FROM public.store_orders
    WHERE customer_name IS NOT NULL

    UNION ALL

    -- From fortlev_quotations (extracting from customer_json)
    SELECT 
        customer_json->>'document' as document,
        customer_json->>'name' as name,
        customer_json->>'phone' as phone,
        customer_json->>'email' as email,
        'Orçamento Fortlev' as source,
        id::text as reference_id,
        total as value,
        created_at,
        NULL::uuid as store_id, 
        customer_json->>'address' as address,
        customer_json->>'cep' as cep
    FROM public.fortlev_quotations

    UNION ALL

    -- From construction_quotations
    SELECT 
        customer_json->>'document' as document,
        customer_json->>'name' as name,
        customer_json->>'phone' as phone,
        customer_json->>'email' as email,
        'Orçamento Construção' as source,
        id::text as reference_id,
        total as value,
        created_at,
        NULL::uuid as store_id,
        customer_json->>'address' as address,
        customer_json->>'cep' as cep
    FROM public.construction_quotations

    UNION ALL

    -- From crm_leads
    SELECT 
        document,
        name,
        phone,
        email,
        'CRM Lead' as source,
        id::text as reference_id,
        total_spent as value,
        created_at,
        NULL::uuid as store_id,
        NULL as address,
        NULL as cep
    FROM public.crm_leads

    UNION ALL

    -- From store_customers
    SELECT 
        NULL as document,
        name,
        phone,
        email,
        'Cliente Loja' as source,
        id::text as reference_id,
        0 as value,
        created_at,
        store_id,
        address,
        cep
    FROM public.store_customers
),
ranked_contacts AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(document, email, phone, name) 
            ORDER BY created_at DESC
        ) as rn
    FROM all_contacts
)
SELECT 
    document,
    name,
    phone,
    email,
    source,
    reference_id,
    value,
    address,
    cep,
    store_id,
    created_at
FROM ranked_contacts
WHERE rn = 1;

-- Grant access
GRANT SELECT ON public.store_customer_contacts TO authenticated;
GRANT SELECT ON public.store_customer_contacts TO service_role;
