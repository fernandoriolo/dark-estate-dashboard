import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { corsHeaders } from "../_shared/cors.ts"

console.log("🚀 N8N Endpoint Manager Edge Function iniciada")

interface N8NRequest {
  endpointKey: string
  payload: any
  idempotencyKey?: string
}

interface N8NEndpoint {
  id: string
  endpoint_key: string
  url: string
  bearer_token: string
  is_active: boolean
  company_id: string
}

interface GlobalN8NConfig {
  hmac_secret: string
  default_bearer_token: string
  default_timeout_ms: number
  retry_attempts: number
}

// Função para gerar HMAC-SHA256
async function generateHMAC(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return `hmac-sha256=${hashHex}`
}

// Função para fazer chamada HTTP com retry
async function makeN8NCall(
  url: string, 
  payload: any, 
  bearerToken: string, 
  hmacSecret: string,
  maxRetries: number = 3,
  timeoutMs: number = 30000
): Promise<any> {
  const body = JSON.stringify(payload)
  const timestamp = Date.now().toString()
  
  // Gerar HMAC signature
  const signature = await generateHMAC(hmacSecret, body)
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${bearerToken}`,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
    'User-Agent': 'IMOBIPRO-N8N-Client/1.0'
  }

  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt}/${maxRetries} para ${url}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const responseData = await response.json()
      console.log(`✅ Sucesso na tentativa ${attempt}`)
      
      return {
        success: true,
        status: response.status,
        data: responseData
      }
      
    } catch (error: any) {
      console.error(`❌ Erro na tentativa ${attempt}:`, error.message)
      lastError = error
      
      if (attempt < maxRetries) {
        // Exponential backoff com jitter
        const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 30000)
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError || new Error('Todas as tentativas falharam')
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

    // Criar cliente Supabase com service role para acessar configurações
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar token do usuário
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
    const requestData: N8NRequest = await req.json()
    const { endpointKey, payload, idempotencyKey } = requestData

    if (!endpointKey) {
      return new Response(
        JSON.stringify({ error: 'endpointKey é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎯 Processando chamada para endpoint: ${endpointKey}`)

    // Buscar endpoint na tabela
    const { data: endpoint, error: endpointError } = await supabase
      .from('n8n_endpoints')
      .select('*')
      .eq('endpoint_key', endpointKey)
      .eq('is_active', true)
      .single()

    if (endpointError || !endpoint) {
      console.error(`❌ Endpoint não encontrado: ${endpointKey}`, endpointError)
      return new Response(
        JSON.stringify({ error: `Endpoint '${endpointKey}' não encontrado ou inativo` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar configuração global
    const { data: globalConfig, error: configError } = await supabase
      .from('global_n8n_config')
      .select('*')
      .eq('company_id', endpoint.company_id)
      .single()

    if (configError) {
      console.error('❌ Erro ao buscar configuração global:', configError)
      return new Response(
        JSON.stringify({ error: 'Configuração global N8N não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔧 Configuração global carregada para company: ${endpoint.company_id}`)

    // Fazer chamada para N8N
    try {
      const result = await makeN8NCall(
        endpoint.url,
        payload,
        endpoint.bearer_token,
        globalConfig.hmac_secret,
        globalConfig.retry_attempts || 3,
        globalConfig.default_timeout_ms || 30000
      )

      // Log de auditoria (opcional - implementar se necessário)
      await supabase.from('webhook_events').insert({
        endpoint_key: endpointKey,
        company_id: endpoint.company_id,
        user_id: user.id,
        payload: payload,
        response_status: result.status,
        idempotency_key: idempotencyKey,
        created_at: new Date().toISOString()
      }).select().single()

      console.log(`✅ Chamada N8N concluída com sucesso: ${endpointKey}`)

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error: any) {
      console.error(`❌ Erro na chamada N8N para ${endpointKey}:`, error)

      // Log de erro
      await supabase.from('webhook_events').insert({
        endpoint_key: endpointKey,
        company_id: endpoint.company_id,
        user_id: user.id,
        payload: payload,
        response_status: 0,
        error_message: error.message,
        idempotency_key: idempotencyKey,
        created_at: new Date().toISOString()
      }).select().single()

      return new Response(
        JSON.stringify({
          success: false,
          status: 0,
          error: error.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: any) {
    console.error('❌ Erro geral na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})