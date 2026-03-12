import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is master/admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isMaster } = await adminClient.rpc("is_master", { _user_id: caller.id });
    if (!isMaster) {
      return new Response(JSON.stringify({ error: "Apenas Admin Master pode criar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { name, email, password, role, store_ids, page_permissions } = body;

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: "name, email e password obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user via admin API (doesn't change caller session)
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { invited_name: name.trim() },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUserData.user.id;

    // Insert admin_users record
    await adminClient.from("admin_users").insert({
      user_id: newUserId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || "operator",
      created_by: caller.id,
    });

    // Insert user_roles
    await adminClient.from("user_roles").insert({
      user_id: newUserId,
      role: "admin",
    });

    // Insert store access
    if (role !== "master" && store_ids && store_ids.length > 0) {
      await adminClient.from("user_store_access").insert(
        store_ids.map((storeId: string) => ({ user_id: newUserId, store_id: storeId }))
      );
    }

    // Insert page permissions
    if (page_permissions && page_permissions.length > 0) {
      await adminClient.from("user_page_permissions").insert(
        page_permissions.map((p: any) => ({ ...p, user_id: newUserId }))
      );
    }

    // Log activity
    await adminClient.from("activity_logs").insert({
      user_id: caller.id,
      user_name: caller.email,
      action: "invited_user",
      entity: "admin_users",
      entity_id: newUserId,
      metadata: { invited_email: email, role },
    });

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
