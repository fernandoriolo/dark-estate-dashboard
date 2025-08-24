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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Identificar o solicitante
    const { data: authUserData, error: authErr } = await adminClient.auth.getUser(accessToken);
    if (authErr || !authUserData.user) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const requesterId = authUserData.user.id;

    // Buscar perfil do solicitante para validar role e empresa
    const { data: requesterProfile, error: profileErr } = await adminClient
      .from("user_profiles")
      .select("id, role, company_id")
      .eq("id", requesterId)
      .single();

    if (profileErr || !requesterProfile) {
      return jsonResponse({ error: "Requester profile not found" }, 403);
    }

    if (!(["admin", "gestor"].includes(requesterProfile.role))) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const payload = (await req.json()) as CreateUserPayload;
    if (!payload?.email || !payload?.password || !payload?.full_name || !payload?.role) {
      return jsonResponse({ error: "Missing fields" }, 400);
    }

    // Gestor só pode criar corretores
    if (requesterProfile.role === "gestor" && payload.role !== "corretor") {
      return jsonResponse({ error: "Gestor pode criar apenas corretores" }, 403);
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
      return jsonResponse({ error: createErr?.message || "Erro ao criar usuário" }, 400);
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

    // Inserir perfil diretamente (usuário é novo, não existe perfil)
    const { error: insErr } = await adminClient
      .from("user_profiles")
      .insert({ 
        id: newUserId, 
        email: payload.email, 
        ...updates 
      });

    if (insErr) {
      return jsonResponse({ error: `Erro ao criar perfil: ${insErr.message}` }, 400);
    }

    return jsonResponse({
      user_id: newUserId, 
      email: payload.email,
      success: true
    });
  } catch (e: any) {
    return jsonResponse({ error: e?.message || "Internal error" }, 500);
  }
});


