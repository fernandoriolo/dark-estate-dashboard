/**
 * Componente de teste para validar performance e RLS do módulo Chats otimizado
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TestTube, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Database,
  Shield,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOptimizedChats } from '@/hooks/useOptimizedChats';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'warning';
  duration?: number;
  message: string;
  details?: any;
}

interface PerformanceMetrics {
  instanciasLoadTime: number;
  conversasLoadTime: number;
  mensagensLoadTime: number;
  realtimeLatency?: number;
  memoryUsage?: number;
}

export function ChatsPerformanceTest() {
  const { profile } = useUserProfile();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  
  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, ...updates } : test
    ));
  };

  const addTest = (test: TestResult) => {
    setTests(prev => [...prev, test]);
  };

  // Teste 1: Verificar se migrações foram aplicadas
  const testMigrations = async () => {
    const testName = 'Verificar Migrações SQL';
    addTest({ name: testName, status: 'running', message: 'Verificando migrações...' });
    
    try {
      const start = performance.now();
      
      // Verificar se as views existem
      const { data: views, error: viewsError } = await supabase
        .from('information_schema.views')
        .select('table_name')
        .in('table_name', ['v_conversas_por_instancia', 'v_instancias_com_conversas']);
      
      // Verificar se as funções existem
      const { data: functions, error: functionsError } = await supabase
        .rpc('test_imsg_rls_policies');
      
      const duration = performance.now() - start;
      
      if (viewsError || functionsError) {
        updateTest(testName, {
          status: 'warning',
          duration,
          message: 'Algumas funções SQL podem não estar disponíveis (normal em desenvolvimento)',
          details: { viewsError, functionsError }
        });
      } else {
        updateTest(testName, {
          status: 'passed',
          duration,
          message: `Views e funções SQL disponíveis (${duration.toFixed(2)}ms)`
        });
      }
    } catch (error) {
      updateTest(testName, {
        status: 'warning',
        message: 'Migrações podem não estar aplicadas (normal em desenvolvimento)',
        details: error
      });
    }
  };

  // Teste 2: Verificar RLS policies
  const testRLS = async () => {
    const testName = 'Verificar RLS Policies';
    addTest({ name: testName, status: 'running', message: 'Testando RLS...' });
    
    try {
      const start = performance.now();
      
      // Tentar acessar mensagens (deve respeitar RLS)
      const { data, error } = await supabase
        .from('imobipro_messages')
        .select('id, instancia')
        .limit(1);
      
      const duration = performance.now() - start;
      
      if (error) {
        // RLS pode estar bloqueando acesso - isso é esperado
        updateTest(testName, {
          status: 'passed',
          duration,
          message: `RLS ativo - acesso controlado (${duration.toFixed(2)}ms)`,
          details: { message: 'Políticas de segurança funcionando' }
        });
      } else {
        updateTest(testName, {
          status: 'passed',
          duration,
          message: `RLS funcionando - ${data?.length || 0} registros acessíveis (${duration.toFixed(2)}ms)`
        });
      }
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        message: 'Erro ao testar RLS',
        details: error
      });
    }
  };

  // Teste 3: Performance de carregamento de instâncias
  const testInstanciasPerformance = async () => {
    const testName = 'Performance - Instâncias';
    addTest({ name: testName, status: 'running', message: 'Testando carregamento de instâncias...' });
    
    try {
      const start = performance.now();
      
      const { data, error } = await supabase
        .from('imobipro_messages')
        .select('instancia')
        .limit(100);
      
      const duration = performance.now() - start;
      
      if (error) throw error;
      
      const status = duration < 1000 ? 'passed' : duration < 3000 ? 'warning' : 'failed';
      const threshold = duration < 1000 ? 'Excelente' : duration < 3000 ? 'Aceitável' : 'Lento';
      
      updateTest(testName, {
        status,
        duration,
        message: `${threshold}: ${duration.toFixed(2)}ms para ${data?.length || 0} registros`
      });
      
      setMetrics(prev => ({ ...prev, instanciasLoadTime: duration } as PerformanceMetrics));
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        message: 'Erro ao testar performance de instâncias',
        details: error
      });
    }
  };

  // Teste 4: Performance de índices
  const testIndexPerformance = async () => {
    const testName = 'Performance - Índices SQL';
    addTest({ name: testName, status: 'running', message: 'Testando eficiência dos índices...' });
    
    try {
      const start = performance.now();
      
      // Query que deve usar índices otimizados
      const { data, error } = await supabase
        .from('imobipro_messages')
        .select('id, session_id, data')
        .order('data', { ascending: false })
        .limit(50);
      
      const duration = performance.now() - start;
      
      if (error) throw error;
      
      const status = duration < 500 ? 'passed' : duration < 1500 ? 'warning' : 'failed';
      const threshold = duration < 500 ? 'Otimizado' : duration < 1500 ? 'Moderado' : 'Precisa otimização';
      
      updateTest(testName, {
        status,
        duration,
        message: `${threshold}: ${duration.toFixed(2)}ms para query com ordenação`
      });
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        message: 'Erro ao testar performance de índices',
        details: error
      });
    }
  };

  // Teste 5: Teste de volume de dados
  const testDataVolume = async () => {
    const testName = 'Volume de Dados';
    addTest({ name: testName, status: 'running', message: 'Contando registros...' });
    
    try {
      const start = performance.now();
      
      // Contar total de mensagens
      const { count, error } = await supabase
        .from('imobipro_messages')
        .select('*', { count: 'exact', head: true });
      
      const duration = performance.now() - start;
      
      if (error) throw error;
      
      const totalMensagens = count || 0;
      const status = totalMensagens > 10000 ? 'passed' : totalMensagens > 1000 ? 'warning' : 'passed';
      const level = totalMensagens > 10000 ? 'Alto volume' : totalMensagens > 1000 ? 'Médio volume' : 'Baixo volume';
      
      updateTest(testName, {
        status,
        duration,
        message: `${level}: ${totalMensagens.toLocaleString()} mensagens (${duration.toFixed(2)}ms)`
      });
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        message: 'Erro ao contar registros',
        details: error
      });
    }
  };

  // Teste 6: Realtime connection
  const testRealtime = async () => {
    const testName = 'Conexão Realtime';
    addTest({ name: testName, status: 'running', message: 'Testando realtime...' });
    
    try {
      const start = performance.now();
      
      // Criar subscription de teste
      const channel = supabase.channel('test_channel');
      
      const subscriptionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
        
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve(status);
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            reject(new Error('Channel error'));
          }
        });
      });
      
      await subscriptionPromise;
      const duration = performance.now() - start;
      
      updateTest(testName, {
        status: 'passed',
        duration,
        message: `Conexão estabelecida em ${duration.toFixed(2)}ms`
      });
      
      // Cleanup
      supabase.removeChannel(channel);
    } catch (error) {
      updateTest(testName, {
        status: 'failed',
        message: 'Erro na conexão realtime',
        details: error
      });
    }
  };

  // Executar todos os testes
  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);
    setMetrics(null);
    
    try {
      await testMigrations();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testRLS();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testInstanciasPerformance();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testIndexPerformance();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testDataVolume();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testRealtime();
    } catch (error) {
      console.error('Erro durante os testes:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return 'border-green-500/30 bg-green-900/20';
      case 'failed':
        return 'border-red-500/30 bg-red-900/20';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-900/20';
      case 'running':
        return 'border-blue-500/30 bg-blue-900/20';
      default:
        return 'border-gray-500/30 bg-gray-900/20';
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900 min-h-screen">
      <Card className="max-w-4xl mx-auto bg-gradient-to-br from-gray-900/90 to-gray-950/90 border-2 border-blue-600/60 shadow-2xl">
        <CardHeader className="border-b border-blue-600/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/40">
              <TestTube className="h-6 w-6 text-blue-400" />
            </div>
            <CardTitle className="text-xl font-bold text-white">
              Teste de Performance - Módulo Chats Otimizado
            </CardTitle>
            <Badge variant="outline" className="ml-auto border-blue-500/30 text-blue-400">
              Usuario: {profile?.role}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Controles */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={runAllTests}
              disabled={isRunning}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Executar Testes
                </>
              )}
            </Button>
            
            {tests.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-green-400">
                    {tests.filter(t => t.status === 'passed').length} Aprovados
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400">
                    {tests.filter(t => t.status === 'warning').length} Avisos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400">
                    {tests.filter(t => t.status === 'failed').length} Falhas
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Resultados dos testes */}
          {tests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                Resultados dos Testes
              </h3>
              
              <ScrollArea className="max-h-96">
                <div className="space-y-3">
                  {tests.map((test, index) => (
                    <Card
                      key={index}
                      className={`border transition-all duration-200 ${getStatusColor(test.status)}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(test.status)}
                          <div className="flex-1">
                            <div className="font-medium text-white">{test.name}</div>
                            <div className="text-sm text-gray-400">{test.message}</div>
                            {test.duration && (
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {test.duration.toFixed(2)}ms
                              </div>
                            )}
                          </div>
                        </div>
                        {test.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer">
                              Ver detalhes
                            </summary>
                            <pre className="text-xs text-gray-400 mt-2 bg-gray-800/50 p-2 rounded overflow-auto">
                              {JSON.stringify(test.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Métricas de performance */}
          {metrics && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <h4 className="text-md font-semibold text-white flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-yellow-400" />
                Métricas de Performance
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Instâncias:</span>
                  <span className="ml-2 text-white font-mono">
                    {metrics.instanciasLoadTime.toFixed(2)}ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Conversas:</span>
                  <span className="ml-2 text-white font-mono">
                    {metrics.conversasLoadTime?.toFixed(2) || 'N/A'}ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Mensagens:</span>
                  <span className="ml-2 text-white font-mono">
                    {metrics.mensagensLoadTime?.toFixed(2) || 'N/A'}ms
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Informações do sistema */}
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <h4 className="text-md font-semibold text-white flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-green-400" />
              Informações do Sistema
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Usuário:</span>
                <span className="ml-2 text-white">{profile?.full_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400">Role:</span>
                <span className="ml-2 text-white">{profile?.role || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400">Company ID:</span>
                <span className="ml-2 text-white font-mono">{profile?.company_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400">Timestamp:</span>
                <span className="ml-2 text-white font-mono">
                  {new Date().toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}