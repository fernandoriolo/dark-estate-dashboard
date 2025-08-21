import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { corsHeaders } from "../_shared/cors.ts"

console.log("🔄 Sync N8N Endpoints Edge Function iniciada")

interface SyncRequest {
  company_id: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase com service role para bypass de RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar token do usuário primeiro (mas usar service client para operações)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Erro de autenticação:', authError)
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`👤 Usuário autenticado: ${user.email}`)

    // Parse do request
    const requestData: SyncRequest = await req.json()
    const { company_id } = requestData

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎯 Sincronizando endpoints para company: ${company_id}`)

    // Buscar configuração global
    const { data: globalConfig, error: configError } = await supabase
      .from('global_n8n_config')
      .select('default_bearer_token')
      .eq('company_id', company_id)
      .single()

    if (configError || !globalConfig) {
      console.error('❌ Configuração global não encontrada:', configError)
      return new Response(
        JSON.stringify({ error: 'Configuração global N8N não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔧 Bearer token global: ${globalConfig.default_bearer_token}`)

    // Sincronizar todos os endpoints (usando SERVICE_ROLE para bypass RLS)
    const { data: updatedEndpoints, error: updateError } = await supabase
      .from('n8n_endpoints')
      .update({ 
        bearer_token: globalConfig.default_bearer_token,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', company_id)
      .select('id, endpoint_key, bearer_token')

    if (updateError) {
      console.error('❌ Erro ao atualizar endpoints:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erro ao sincronizar endpoints', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const syncedCount = updatedEndpoints?.length || 0
    console.log(`✅ ${syncedCount} endpoints sincronizados com sucesso`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${syncedCount} endpoints sincronizados com sucesso`,
        synced_count: syncedCount,
        bearer_token: globalConfig.default_bearer_token,
        endpoints: updatedEndpoints
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Erro geral na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})