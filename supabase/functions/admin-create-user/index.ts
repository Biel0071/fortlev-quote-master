import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ success: false, error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ success: false, error: "Configuração do servidor incompleta" }, 500);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return json({ success: false, error: "Não autorizado" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isMaster, error: masterError } = await adminClient.rpc("is_master", {
      _user_id: caller.id,
    });

    if (masterError || !isMaster) {
      return json({ success: false, error: "Apenas Admin Master pode criar usuários" }, 403);
    }

    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();
    const role = String(body?.role ?? "operator").trim();
    const storeIds = Array.isArray(body?.store_ids)
      ? body.store_ids.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    const pagePermissions = Array.isArray(body?.page_permissions) ? body.page_permissions : [];

    if (!name || !email || !password) {
      return json({ success: false, error: "name, email e password obrigatórios" }, 400);
    }

    const { data: existingAdmin } = await adminClient
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingAdmin) {
      return json({ success: false, error: "Este email já está cadastrado no painel" }, 409);
    }

    let newUserId: string | null = null;
    let reusedExistingAuthUser = false;

    const { data: createdAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { invited_name: name },
    });

    if (createError) {
      const msg = createError.message.toLowerCase();
      const alreadyExists =
        msg.includes("already") || msg.includes("registered") || msg.includes("exists");

      if (!alreadyExists) {
        return json({ success: false, error: createError.message }, 400);
      }

      const { data: listed, error: listError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) {
        return json({ success: false, error: "Não foi possível localizar usuário existente" }, 500);
      }

      const existingAuthUser = listed.users.find(
        (u) => (u.email ?? "").trim().toLowerCase() === email
      );

      if (!existingAuthUser) {
        return json({ success: false, error: "Usuário já existe na autenticação" }, 400);
      }

      newUserId = existingAuthUser.id;
      reusedExistingAuthUser = true;
    } else {
      newUserId = createdAuthUser.user.id;
    }

    if (!newUserId) {
      return json({ success: false, error: "Não foi possível obter o ID do usuário" }, 500);
    }

    const { error: adminInsertError } = await adminClient.from("admin_users").insert({
      user_id: newUserId,
      name,
      email,
      role,
      created_by: caller.id,
    });

    if (adminInsertError) {
      return json({ success: false, error: adminInsertError.message }, 400);
    }

    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: newUserId,
      role: "admin",
    });

    if (roleError && roleError.code !== "23505") {
      return json({ success: false, error: roleError.message }, 400);
    }

    await adminClient.from("user_store_access").delete().eq("user_id", newUserId);
    await adminClient.from("user_page_permissions").delete().eq("user_id", newUserId);

    if (role !== "master" && storeIds.length > 0) {
      const { error: storeAccessError } = await adminClient.from("user_store_access").insert(
        storeIds.map((storeId) => ({ user_id: newUserId as string, store_id: storeId }))
      );

      if (storeAccessError) {
        return json({ success: false, error: storeAccessError.message }, 400);
      }
    }

    if (pagePermissions.length > 0) {
      const { error: pagePermError } = await adminClient.from("user_page_permissions").insert(
        pagePermissions.map((p: Record<string, unknown>) => ({
          user_id: newUserId as string,
          page: String(p.page ?? ""),
          can_view: Boolean(p.can_view),
          can_create: Boolean(p.can_create),
          can_edit: Boolean(p.can_edit),
          can_delete: Boolean(p.can_delete),
        }))
      );

      if (pagePermError) {
        return json({ success: false, error: pagePermError.message }, 400);
      }
    }

    await adminClient.from("activity_logs").insert({
      user_id: caller.id,
      user_name: caller.email,
      action: "invited_user",
      entity: "admin_users",
      entity_id: newUserId,
      metadata: { invited_email: email, role, reused_existing_auth_user: reusedExistingAuthUser },
    });

    return json({
      success: true,
      user_id: newUserId,
      reused_existing_auth_user: reusedExistingAuthUser,
    });
  } catch (e) {
    console.error("admin-create-user error", e);
    const message = e instanceof Error ? e.message : "Erro interno";
    return json({ success: false, error: message }, 500);
  }
});
