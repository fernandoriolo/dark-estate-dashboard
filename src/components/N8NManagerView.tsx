import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Server,
  Shield,
  Plus,
  Settings,
  Database,
  Activity,
  Lock,
  Key,
  Zap,
  ArrowRight,
  CheckCircle,
  Globe
} from 'lucide-react';
import GlobalN8NConfigModal from './GlobalN8NConfigModal';
import TestGlobalConfig from './TestGlobalConfig';
import EndpointTester from './EndpointTester';
import { useGlobalN8NConfig } from '@/hooks/useGlobalN8NConfig';
import { useN8NEndpoints } from '@/hooks/useN8NEndpoints';

const N8NManagerView: React.FC = () => {
  const [showGlobalConfig, setShowGlobalConfig] = useState(false);
  const [showEndpointTester, setShowEndpointTester] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { config: globalConfig, loading: globalLoading, isAdmin, syncAllEndpoints } = useGlobalN8NConfig();
  const { endpoints, loading: endpointsLoading } = useN8NEndpoints();
  
  const totalEndpoints = endpoints.length;
  const activeEndpoints = endpoints.filter(e => e.is_active).length;
  
  // Verificar sincronização de Bearer Tokens
  const syncedEndpoints = globalConfig ? 
    endpoints.filter(e => e.bearer_token === globalConfig.default_bearer_token).length : 0;
  const unsyncedEndpoints = totalEndpoints - syncedEndpoints;

  const handleSyncEndpoints = async () => {
    try {
      setSyncing(true);
      await syncAllEndpoints();
      console.log('✅ Sincronização manual concluída');
    } catch (error: any) {
      console.error('❌ Erro na sincronização manual:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Server className="h-8 w-8 text-blue-400" />
            N8N Manager
          </h1>
          <p className="text-gray-400 mt-2">
            Gerencie endpoints N8N, configure HMAC e Bearer tokens
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowGlobalConfig(true)}
            variant="outline"
            className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/20"
            disabled={!isAdmin}
          >
            <Shield className="mr-2 h-4 w-4" />
            Configuração Global
          </Button>
          <Button 
            onClick={() => setShowEndpointTester(true)}
            className="bg-orange-600 hover:bg-orange-700"
            disabled={!isAdmin}
          >
            <Settings className="mr-2 h-4 w-4" />
            Testar Endpoints
          </Button>
          {unsyncedEndpoints > 0 && (
            <Button 
              onClick={handleSyncEndpoints}
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-600/20"
              disabled={!isAdmin || syncing}
            >
              <Shield className="mr-2 h-4 w-4" />
              {syncing ? 'Sincronizando...' : `Sincronizar ${unsyncedEndpoints} Endpoints`}
            </Button>
          )}
        </div>
      </div>

      {/* Status */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-green-400" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
              <h3 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Configuração Atual
              </h3>
              <ul className="text-blue-200/80 text-sm space-y-1">
                <li>• Configuração Global: {globalConfig ? '✅ Configurada' : '⚠️ Não configurada'}</li>
                <li>• HMAC Secret: {globalConfig?.hmac_secret ? '✅ Definido' : '❌ Não definido'}</li>
                <li>• Bearer Token Padrão: {globalConfig?.default_bearer_token ? '✅ Definido' : '❌ Não definido'}</li>
                <li>• Timeout: {globalConfig?.default_timeout_ms || 30000}ms</li>
                <li>• Retry Attempts: {globalConfig?.retry_attempts || 3}</li>
                <li>• <span className={syncedEndpoints === totalEndpoints ? 'text-green-300' : 'text-red-300'}>
                  Sincronização: {syncedEndpoints}/{totalEndpoints} endpoints 
                  {syncedEndpoints === totalEndpoints ? ' ✅' : ' ⚠️'}
                </span></li>
              </ul>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
              <h3 className="text-yellow-300 font-medium mb-2">🔧 Funcionalidades Implementadas</h3>
              <div className="grid grid-cols-2 gap-2 text-yellow-200/80 text-sm">
                <div>✅ Configuração global de HMAC</div>
                <div>✅ Bearer tokens centralizados</div>
                <div>✅ Propagação automática</div>
                <div>✅ Auditoria completa</div>
                <div>✅ Edge Function segura</div>
                <div>✅ Logs de eventos</div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">📝 Como Funciona:</h3>
              <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
                <li>Modal "Configuração Global" → salva HMAC e Bearer no banco</li>
                <li>Pergunta se deve aplicar a todos os endpoints existentes</li>
                <li>Se confirmado → atualiza bearer_token em toda tabela n8n_endpoints</li>
                <li>Todas as chamadas N8N passam pela Edge Function centralizada</li>
                <li>Edge Function usa configuração global para HMAC e autenticação</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Como Funciona a Segurança */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            Segurança & Arquitetura do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Fluxo Principal */}
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-600/30 rounded-lg p-4">
              <h3 className="text-purple-300 font-medium mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Fluxo de Autenticação Segura
              </h3>
              
              {/* Fluxo Visual */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex flex-col items-center space-y-2 flex-1 max-w-32">
                  <div className="bg-blue-600/20 p-3 rounded-full border border-blue-500/30">
                    <Globe className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-300">1. Frontend</div>
                    <div className="text-xs text-gray-400">React App</div>
                  </div>
                </div>
                
                <ArrowRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                
                <div className="flex flex-col items-center space-y-2 flex-1 max-w-32">
                  <div className="bg-green-600/20 p-3 rounded-full border border-green-500/30">
                    <Server className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-green-300">2. Edge Function</div>
                    <div className="text-xs text-gray-400">Supabase</div>
                  </div>
                </div>
                
                <ArrowRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                
                <div className="flex flex-col items-center space-y-2 flex-1 max-w-32">
                  <div className="bg-orange-600/20 p-3 rounded-full border border-orange-500/30">
                    <Settings className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-orange-300">3. N8N Webhook</div>
                    <div className="text-xs text-gray-400">Automação</div>
                  </div>
                </div>
              </div>

              {/* Detalhamento do Fluxo */}
              <div className="space-y-4 bg-gray-900/40 rounded-lg p-4">
                <h4 className="text-purple-200 font-medium mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Como Funciona o Fluxo Completo
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="bg-blue-600/20 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="text-blue-400 text-sm font-bold">1</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-300 mb-2">Frontend (React)</div>
                      <div className="text-xs text-gray-400 leading-relaxed text-left">
                        • Usuário interage com a aplicação (ex: cadastra cliente)<br/>
                        • Frontend coleta dados do formulário<br/>
                        • Chama função do Supabase Edge Functions<br/>
                        • <span className="text-yellow-300">Nunca manipula secrets diretamente</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="bg-green-600/20 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="text-green-400 text-sm font-bold">2</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-300 mb-2">Edge Function (Supabase)</div>
                      <div className="text-xs text-gray-400 leading-relaxed text-left">
                        • Recebe payload do frontend<br/>
                        • Busca configuração HMAC/Bearer no banco<br/>
                        • Monta evento padronizado N8N com <code className="bg-gray-800/50 px-1 rounded">idempotencyKey</code><br/>
                        • Gera assinatura HMAC-SHA256 do payload<br/>
                        • <span className="text-yellow-300">Adiciona headers de autenticação</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="bg-orange-600/20 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="text-orange-400 text-sm font-bold">3</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-orange-300 mb-2">N8N Webhook</div>
                      <div className="text-xs text-gray-400 leading-relaxed text-left">
                        • Recebe requisição HTTP com headers<br/>
                        • Valida Bearer token (autorização)<br/>
                        • Recalcula HMAC do payload recebido<br/>
                        • Compara assinaturas (integridade)<br/>
                        • <span className="text-yellow-300">Processa automação apenas se válido</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-900/20 border border-purple-600/20 rounded-lg p-3 mt-4">
                  <div className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Segurança em Camadas
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-300">
                    <div>
                      <div className="text-purple-200 font-medium mb-1">🔐 Autenticação</div>
                      <div>Bearer Token identifica quem está enviando</div>
                    </div>
                    <div>
                      <div className="text-purple-200 font-medium mb-1">🛡️ Integridade</div>
                      <div>HMAC garante que dados não foram alterados</div>
                    </div>
                    <div>
                      <div className="text-purple-200 font-medium mb-1">🔄 Idempotência</div>
                      <div>Evita processamento duplicado de eventos</div>
                    </div>
                    <div>
                      <div className="text-purple-200 font-medium mb-1">⚡ Performance</div>
                      <div>Edge Functions próximas ao usuário</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* HMAC Explicação */}
            <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-600/30 rounded-lg p-4">
              <h3 className="text-red-300 font-medium mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                HMAC-SHA256: Assinatura Digital
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-200">O que é?</div>
                    <div className="text-xs text-gray-400">
                      Hash-based Message Authentication Code que garante integridade e autenticidade dos dados
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-200">Como funciona?</div>
                    <div className="text-xs text-gray-400 font-mono bg-gray-900/50 p-2 rounded mt-1">
                      HMAC = SHA256(secret_key + payload_json)
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-200">Segurança</div>
                    <div className="text-xs text-gray-400">
                      Impossível falsificar sem conhecer a chave secreta. N8N valida cada requisição.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bearer Token */}
            <div className="bg-gradient-to-r from-yellow-900/20 to-green-900/20 border border-yellow-600/30 rounded-lg p-4">
              <h3 className="text-yellow-300 font-medium mb-3 flex items-center gap-2">
                <Key className="h-4 w-4" />
                Bearer Token: Autorização HTTP
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-yellow-200">📋 Função Principal</div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Identifica quem está fazendo a requisição</li>
                    <li>• Autoriza acesso aos endpoints N8N</li>
                    <li>• Enviado no header: <code className="bg-gray-900/50 px-1 rounded">Authorization: Bearer token</code></li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-yellow-200">🔄 Configuração Flexível</div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Token global padrão para todos endpoints</li>
                    <li>• Tokens específicos por endpoint (sobrescreve global)</li>
                    <li>• Atualização centralizada via modal</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Edge Functions */}
            <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-600/30 rounded-lg p-4">
              <h3 className="text-cyan-300 font-medium mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Edge Functions: Processamento Seguro
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-cyan-800/20 p-3 rounded border border-cyan-600/20">
                    <div className="text-sm font-medium text-cyan-200 mb-1">⚡ Performance</div>
                    <div className="text-xs text-gray-400">Execução próxima ao usuário</div>
                  </div>
                  <div className="bg-cyan-800/20 p-3 rounded border border-cyan-600/20">
                    <div className="text-sm font-medium text-cyan-200 mb-1">🔒 Segurança</div>
                    <div className="text-xs text-gray-400">Service Role keys nunca no frontend</div>
                  </div>
                  <div className="bg-cyan-800/20 p-3 rounded border border-cyan-600/20">
                    <div className="text-sm font-medium text-cyan-200 mb-1">🎯 Centralização</div>
                    <div className="text-xs text-gray-400">Único ponto de configuração</div>
                  </div>
                </div>
                
                <div className="bg-gray-900/50 p-3 rounded">
                  <div className="text-sm font-medium text-cyan-200 mb-2">🔄 Fluxo na Edge Function:</div>
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Recebe dados do frontend (sem secrets)</li>
                    <li>Busca configuração HMAC/Bearer no banco (Supabase)</li>
                    <li>Monta payload padronizado N8N</li>
                    <li>Gera assinatura HMAC-SHA256</li>
                    <li>Envia para N8N com headers seguros</li>
                    <li>Retorna resultado para o frontend</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Vantagens */}
            <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-600/30 rounded-lg p-4">
              <h3 className="text-emerald-300 font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Vantagens desta Arquitetura
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-emerald-200">🛡️ Segurança Máxima</div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Secrets nunca expostos no frontend</li>
                    <li>• Assinatura HMAC em cada requisição</li>
                    <li>• Validação dupla (Bearer + HMAC)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-emerald-200">⚙️ Gestão Centralizada</div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Um local para configurar tudo</li>
                    <li>• Propagação automática para endpoints</li>
                    <li>• Auditoria completa de mudanças</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rodapé */}
      <div className="text-center py-8">
        <p className="text-gray-500 text-xs font-mono">
          Developed by N8N Labz
        </p>
      </div>

      {/* Modal de Configuração Global */}
      <GlobalN8NConfigModal 
        open={showGlobalConfig}
        onOpenChange={setShowGlobalConfig}
      />

      {/* Modal de Teste de Endpoints */}
      <EndpointTester 
        open={showEndpointTester}
        onOpenChange={setShowEndpointTester}
      />
    </div>
  );
};

export default N8NManagerView;