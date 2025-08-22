/**
 * Componente para debug do módulo Chats
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

export function ChatsDebugComponent() {
  const { profile } = useUserProfile();
  const [debug, setDebug] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    try {
      const debugData: any = {
        user: {
          id: profile?.id,
          role: profile?.role,
          company_id: profile?.company_id
        }
      };

      // 1. Contar total de mensagens
      const { count: totalMensagens } = await supabase
        .from('imobipro_messages')
        .select('*', { count: 'exact', head: true });
      
      debugData.totalMensagens = totalMensagens;

      // 2. Buscar instâncias únicas diretamente
      const { data: instancias, error: instanciasError } = await supabase
        .from('imobipro_messages')
        .select('instancia')
        .not('instancia', 'is', null);
      
      debugData.instanciasRaw = instancias;
      debugData.instanciasError = instanciasError;
      
      if (instancias) {
        const instanciasUnicas = [...new Set(instancias.map(i => i.instancia))];
        debugData.instanciasUnicas = instanciasUnicas;
      }

      // 3. Buscar dados da tabela whatsapp_instances
      const { data: whatsappInstances, error: whatsappError } = await supabase
        .from('whatsapp_instances')
        .select('*');
      
      debugData.whatsappInstances = whatsappInstances;
      debugData.whatsappError = whatsappError;

      // 4. Contar conversas por instância
      const { data: conversasPorInstancia } = await supabase
        .from('imobipro_messages')
        .select('instancia, session_id')
        .not('instancia', 'is', null);
      
      if (conversasPorInstancia) {
        const contadores: any = {};
        conversasPorInstancia.forEach(item => {
          if (!contadores[item.instancia]) {
            contadores[item.instancia] = new Set();
          }
          contadores[item.instancia].add(item.session_id);
        });
        
        debugData.conversasPorInstancia = Object.entries(contadores).map(([instancia, sessions]) => ({
          instancia,
          totalConversas: (sessions as Set<string>).size
        }));
      }

      // 5. Buscar samples de mensagens por instância
      for (const instancia of debugData.instanciasUnicas || []) {
        const { data: sample } = await supabase
          .from('imobipro_messages')
          .select('session_id, message, data')
          .eq('instancia', instancia)
          .limit(3);
        
        if (!debugData.samples) debugData.samples = {};
        debugData.samples[instancia] = sample;
      }

      setDebug(debugData);
    } catch (error) {
      setDebug({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto bg-gray-900 border-blue-600">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          🔍 Debug - Módulo Chats
          <Badge variant="outline" className="border-blue-500 text-blue-400">
            {profile?.role}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={runDebug} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Analisando...' : 'Executar Debug'}
        </Button>

        {debug && (
          <div className="space-y-4">
            {/* Informações do usuário */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">👤 Usuário</h3>
              <pre className="text-green-400 text-sm overflow-auto">
                {JSON.stringify(debug.user, null, 2)}
              </pre>
            </div>

            {/* Total de mensagens */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">📊 Total de Mensagens</h3>
              <p className="text-blue-400 text-lg font-mono">{debug.totalMensagens}</p>
            </div>

            {/* Instâncias encontradas */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">🏢 Instâncias na Tabela</h3>
              {debug.instanciasError ? (
                <p className="text-red-400">Erro: {JSON.stringify(debug.instanciasError)}</p>
              ) : (
                <div>
                  <p className="text-blue-400 mb-2">
                    Instâncias únicas: {debug.instanciasUnicas?.length || 0}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {debug.instanciasUnicas?.map((instancia: string) => (
                      <Badge key={instancia} className="bg-blue-900 text-blue-200">
                        {instancia}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Instances */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">📱 WhatsApp Instances</h3>
              {debug.whatsappError ? (
                <p className="text-red-400">Erro: {JSON.stringify(debug.whatsappError)}</p>
              ) : (
                <div>
                  <p className="text-blue-400 mb-2">
                    Total: {debug.whatsappInstances?.length || 0}
                  </p>
                  <pre className="text-green-400 text-sm overflow-auto max-h-32">
                    {JSON.stringify(debug.whatsappInstances, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Conversas por instância */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">💬 Conversas por Instância</h3>
              <div className="space-y-2">
                {debug.conversasPorInstancia?.map((item: any) => (
                  <div key={item.instancia} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                    <span className="text-white">{item.instancia}</span>
                    <Badge className="bg-green-900 text-green-200">
                      {item.totalConversas} conversas
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Samples */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">📝 Samples de Mensagens</h3>
              <div className="space-y-4">
                {debug.samples && Object.entries(debug.samples).map(([instancia, msgs]: [string, any]) => (
                  <div key={instancia} className="border border-gray-600 p-3 rounded">
                    <h4 className="text-blue-400 font-semibold mb-2">{instancia}</h4>
                    <pre className="text-green-400 text-xs overflow-auto max-h-32">
                      {JSON.stringify(msgs, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Erro geral */}
            {debug.error && (
              <div className="bg-red-900 p-4 rounded-lg">
                <h3 className="text-red-300 font-semibold mb-2">❌ Erro</h3>
                <p className="text-red-200">{debug.error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}