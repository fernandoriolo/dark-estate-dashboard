// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export type CreateUserPayload = {
  email: string;
  password: string;
  full_name: string;
  role: "corretor" | "gestor" | "admin";
  phone?: string;
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Identificar o solicitante
    const { data: authUserData, error: authErr } = await adminClient.auth.getUser(accessToken);
    if (authErr || !authUserData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const requesterId = authUserData.user.id;

    // Buscar perfil do solicitante para validar role e empresa
    const { data: requesterProfile, error: profileErr } = await adminClient
      .from("user_profiles")
      .select("id, role, company_id")
      .eq("id", requesterId)
      .single();

    if (profileErr || !requesterProfile) {
      return new Response(JSON.stringify({ error: "Requester profile not found" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    if (!(["admin", "gestor"].includes(requesterProfile.role))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    const payload = (await req.json()) as CreateUserPayload;
    if (!payload?.email || !payload?.password || !payload?.full_name || !payload?.role) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Gestor só pode criar corretores
    if (requesterProfile.role === "gestor" && payload.role !== "corretor") {
      return new Response(JSON.stringify({ error: "Gestor pode criar apenas corretores" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    // Criar usuário confirmado com senha temporária
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name,
        role: payload.role,
        phone: payload.phone || "",
      },
    });

    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Erro ao criar usuário" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Garantir perfil completo e vínculo de empresa
    const newUserId = created.user.id;
    const updates = {
      full_name: payload.full_name,
      role: payload.role,
      phone: payload.phone || null,
      is_active: true,
      company_id: requesterProfile.company_id || null,
    } as Record<string, any>;

    // Tentar atualizar; se não existir, inserir
    const { error: upErr } = await adminClient
      .from("user_profiles")
      .update(updates)
      .eq("id", newUserId);

    if (upErr) {
      const { error: insErr } = await adminClient
        .from("user_profiles")
        .insert({ id: newUserId, email: payload.email, ...updates });
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }

    return new Response(
      JSON.stringify({ user_id: newUserId, email: payload.email }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


