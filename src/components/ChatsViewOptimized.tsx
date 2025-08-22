/**
 * Componente otimizado de Chats com carregamento seletivo
 * Arquitetura 3 colunas: Instâncias → Conversas → Mensagens
 * Performance otimizada para milhares de mensagens
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOptimizedChats } from '@/hooks/useOptimizedChats';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ConversasListOptimized } from '@/components/ConversasListOptimized';
import { MensagensAreaOptimized } from '@/components/MensagensAreaOptimized';
import { 
  Users, 
  MessageSquare, 
  Search,
  AlertCircle,
  ChevronRight,
  RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Função auxiliar para gerar iniciais
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function ChatsViewOptimized() {
  const { profile } = useUserProfile();
  const location = useLocation();
  
  console.log('🚀 ChatsViewOptimized renderizado com nova arquitetura otimizada. Profile:', profile);
  
  const {
    // Estados de loading
    loading,
    instanciasLoading,
    conversasLoading,
    mensagensLoading,
    
    // Estados de erro
    error,
    
    // Dados
    instancias,
    conversas,
    mensagens,
    
    // Seleções
    selectedInstancia,
    selectedSession,
    searchTerm,
    
    // Paginação
    conversasHasMore,
    mensagensHasMore,
    
    // Ações
    setSelectedInstancia,
    setSelectedSession,
    setSearchTerm,
    loadMoreConversas,
    loadMoreMensagens,
    loadOlderMensagens,
    sendMessage,
    refreshData
  } = useOptimizedChats();

  const [crmNavigationInfo, setCrmNavigationInfo] = useState<{leadName: string; leadPhone: string} | null>(null);
  
  // Processar parâmetros de navegação vindos do CRM
  useEffect(() => {
    const state = location.state as { leadPhone?: string; leadName?: string } | null;
    if (state?.leadPhone && state?.leadName) {
      console.log('📞 Navegação do CRM detectada (otimizada):', { phone: state.leadPhone, name: state.leadName });
      setCrmNavigationInfo({ leadName: state.leadName, leadPhone: state.leadPhone });
    }
  }, [location.state]);

  // Efeito para buscar automaticamente qual instância tem a conversa do lead
  useEffect(() => {
    if (!crmNavigationInfo) return;
    
    // Para gestores/admins: buscar qual instância tem a conversa
    const isManager = profile?.role === 'admin' || profile?.role === 'gestor';
    
    if (isManager && !selectedInstancia && instancias.length > 0) {
      console.log('🔍 Buscando instância que possui conversa com o lead (otimizada)...');
      
      const findInstanciaWithConversation = async () => {
        try {
          // Por ora, selecionar SDR como fallback
          const sdrInstance = instancias.find(i => i.is_sdr);
          if (sdrInstance) {
            console.log('✅ Selecionando SDR como instância padrão (otimizada)');
            setSelectedInstancia(sdrInstance.instancia);
          }
        } catch (error) {
          console.error('Erro ao buscar instância (otimizada):', error);
        }
      };

      findInstanciaWithConversation();
    }
  }, [crmNavigationInfo, profile?.role, selectedInstancia, instancias, setSelectedInstancia]);

  // Efeito para buscar conversa quando conversas estão disponíveis
  useEffect(() => {
    if (!crmNavigationInfo) return;
    
    // Para gestores/admins: precisa aguardar seleção de instância para carregar conversas
    const isManagerAwaitingSelection = (profile?.role === 'admin' || profile?.role === 'gestor') && !selectedInstancia;
    
    if (isManagerAwaitingSelection) {
      console.log('👑 Gestor/Admin: aguardando seleção de instância para buscar conversa (otimizada)');
      return;
    }
    
    // Aguardar conversas serem carregadas
    if (conversasLoading) {
      console.log('⏳ Aguardando carregamento das conversas (otimizada)...');
      return;
    }
    
    if (!conversas.length) {
      console.log('📭 Nenhuma conversa disponível ainda (otimizada)');
      return;
    }
    
    // Buscar conversa correspondente ao telefone/nome do lead
    const findAndSelectChat = () => {
      const targetName = crmNavigationInfo.leadName.toLowerCase();
      
      // Buscar conversa por nome do cliente
      const matchingChat = conversas.find(conversa => {
        const clienteNome = conversa.cliente_nome?.toLowerCase() || '';
        
        // Tentar match por nome
        return clienteNome.includes(targetName) || 
               targetName.includes(clienteNome) ||
               conversa.primeiro_contato?.toLowerCase().includes(targetName);
      });
      
      if (matchingChat) {
        console.log('✅ Conversa encontrada (otimizada):', matchingChat);
        setSelectedSession(matchingChat.session_id);
        // Limpar info de navegação já que encontrou
        setCrmNavigationInfo(null);
      } else {
        console.log('❌ Nenhuma conversa encontrada para (otimizada):', crmNavigationInfo.leadName);
        // Manter info para mostrar aviso ao usuário
      }
    };
    
    findAndSelectChat();
  }, [crmNavigationInfo, conversas, conversasLoading, selectedInstancia, profile?.role, setSelectedSession]);

  // Renderizar lista de instâncias/corretores (para gestores)
  const renderInstanciasList = () => (
    <div className="w-80 border-r border-gray-700/50 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col shadow-xl">
      <div className="relative p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 to-gray-850">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Instâncias</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshData}
            disabled={loading}
            className="ml-auto p-2 hover:bg-blue-600/20"
          >
            <RefreshCcw className={cn("h-4 w-4 text-blue-400", loading && "animate-spin")} />
          </Button>
        </div>
        <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700/50">
          {instancias.length} instância(s) ativa(s)
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {instanciasLoading && instancias.length === 0 ? (
            <div className="text-center py-8">
              <div className="relative mx-auto mb-4 w-6 h-6">
                <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-400 text-sm">Carregando instâncias...</div>
            </div>
          ) : (
            instancias.map((instancia) => (
            <Card
              key={instancia.instancia}
              className={cn(
                "cursor-pointer transition-all duration-300 bg-gradient-to-r from-gray-900/90 to-gray-950/90 border-gray-700/50 hover:from-gray-800/95 hover:to-gray-900/95 hover:shadow-lg hover:border-gray-600/50 backdrop-blur-sm",
                selectedInstancia === instancia.instancia && "from-gray-950/95 to-black/90 border-green-600/80 shadow-lg shadow-green-500/30 ring-1 ring-green-500/20"
              )}
              onClick={() => setSelectedInstancia(instancia.instancia)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className={cn(
                        "text-white font-semibold border-2",
                        instancia.is_sdr 
                          ? "bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500/30" 
                          : "bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500/30"
                      )}>
                        {instancia.is_sdr ? 'SDR' : getInitials(instancia.corretor_nome || instancia.instancia)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-900",
                      instancia.is_sdr ? "bg-purple-500" : "bg-green-500"
                    )}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate flex items-center gap-2 mb-1">
                      {instancia.instancia}
                      {instancia.is_sdr && (
                        <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs border border-purple-500/30">
                          SDR
                        </Badge>
                      )}
                    </div>
                    <div className={cn(
                      "text-xs flex items-center gap-2",
                      selectedInstancia === instancia.instancia ? "text-gray-200" : "text-gray-400"
                    )}>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{instancia.total_conversas} conversa(s)</span>
                      </div>
                      {instancia.status && (
                        <>
                          <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                          <Badge 
                            variant={instancia.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {instancia.status}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    selectedInstancia === instancia.instancia ? "text-green-400 transform rotate-90" : "text-gray-400"
                  )} />
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Renderizar lista de conversas com busca
  const renderConversasSection = () => (
    <div className={cn(
      "border-r border-gray-700/50 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col shadow-xl",
      profile?.role === 'corretor' ? "w-80" : "w-96"
    )}>
      <div className="relative p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 to-gray-850">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-blue-600/5"></div>
        <div className="relative flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-600/20 rounded-lg border border-green-500/30">
            <MessageSquare className="h-5 w-5 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            {profile?.role === 'corretor' ? 'Meus Leads' : 'Conversas'}
          </h2>
        </div>
        
        {/* Busca Otimizada */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-gray-800/80 border-gray-600/50 text-white placeholder-gray-400 rounded-xl backdrop-blur-sm focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700/50">
            {conversas.length} conversa(s)
          </div>
          {profile?.role !== 'corretor' && selectedInstancia && (
            <div className="text-xs text-blue-400 bg-blue-600/10 px-2 py-1 rounded-full border border-blue-500/30">
              {instancias.find(i => i.instancia === selectedInstancia)?.instance_display_name}
            </div>
          )}
        </div>
      </div>

      {/* Lista de conversas otimizada */}
      <ConversasListOptimized
        conversas={conversas}
        selectedSession={selectedSession}
        onSelectSession={setSelectedSession}
        loading={conversasLoading}
        hasMore={conversasHasMore}
        onLoadMore={loadMoreConversas}
        instanciaName={selectedInstancia ? instancias.find(i => i.instancia === selectedInstancia)?.instance_display_name : undefined}
      />
    </div>
  );

  // Estados de loading e erro
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900">
        <div className="text-center">
          <div className="relative mx-auto mb-6 w-12 h-12">
            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-gray-300 font-medium text-lg mb-2">Carregando conversas otimizadas...</div>
          <div className="text-gray-400 text-sm">Sistema de carregamento seletivo ativo</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-full blur-xl"></div>
            <AlertCircle className="relative h-16 w-16 mx-auto text-red-400" />
          </div>
          <div className="text-lg font-medium mb-3 text-red-300">Erro ao carregar (Otimizado)</div>
          <div className="text-sm text-gray-400 bg-gray-800/50 p-4 rounded-lg border border-red-500/20">
            {error}
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Recarregar
            </button>
            <button 
              onClick={refreshData} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900">
      {/* Card Principal com Bordas Verdes */}
      <Card className="h-full bg-gradient-to-br from-gray-900/90 to-gray-950/90 border-2 border-green-600/60 shadow-2xl shadow-green-500/20 overflow-hidden">
        <CardHeader className="pb-4 border-b border-green-600/30 bg-gradient-to-r from-gray-900/80 to-gray-850/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg border border-green-500/40">
              <MessageSquare className="h-6 w-6 text-green-400" />
            </div>
            <CardTitle className="text-xl font-bold text-white">
              Sistema de Mensagens - Arquitetura Otimizada
            </CardTitle>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400 font-medium">Online</span>
              <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                v2.0 Otimizada
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        {/* Notificação de navegação do CRM */}
        {crmNavigationInfo && (
          <div className="px-6 py-3 bg-yellow-900/20 border-b border-yellow-600/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="flex-1">
                <p className="text-sm text-yellow-300">
                  Navegação do CRM: Buscando conversa para <strong>{crmNavigationInfo.leadName}</strong> ({crmNavigationInfo.leadPhone})
                </p>
                <p className="text-xs text-yellow-400/80 mt-1">
                  Sistema otimizado com carregamento seletivo ativo
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCrmNavigationInfo(null)}
                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30"
              >
                ✕
              </Button>
            </div>
          </div>
        )}
        
        <CardContent className="p-0 h-[calc(100%-5rem)] overflow-hidden">
          <div className="h-full flex bg-gradient-to-br from-gray-800/50 via-gray-850/50 to-gray-900/50 text-white relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[size:20px_20px]"></div>
            </div>
            
            {/* Lista de instâncias/corretores (apenas para gestores/admins) */}
            {profile?.role !== 'corretor' && renderInstanciasList()}
            
            {/* Lista de conversas */}
            {(profile?.role === 'corretor' || selectedInstancia) && renderConversasSection()}
            
            {/* Área de mensagens otimizada */}
            <MensagensAreaOptimized
              mensagens={mensagens}
              selectedSession={selectedSession}
              conversaInfo={conversas.find(c => c.session_id === selectedSession) || null}
              onSendMessage={sendMessage}
              loading={mensagensLoading}
              hasMore={mensagensHasMore}
              onLoadMoreMensagens={loadMoreMensagens}
              onLoadOlderMensagens={loadOlderMensagens}
              canSendMessage={profile?.role === 'corretor'}
              userRole={profile?.role}
              userName={profile?.full_name}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}