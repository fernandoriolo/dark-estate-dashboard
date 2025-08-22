import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useImobiproChats } from '@/hooks/useImobiproChats';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  MessageSquare, 
  Send, 
  Phone, 
  Clock, 
  Search,
  AlertCircle,
  ChevronRight,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Função auxiliar para gerar iniciais
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function ChatsView() {
  const { profile } = useUserProfile();
  const location = useLocation();
  
  console.log('🎬 ChatsView renderizado com nova arquitetura. Profile:', profile);
  
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
    
    // Ações
    setSelectedInstancia,
    setSelectedSession,
    setSearchTerm,
    sendMessage,
    refreshData
  } = useImobiproChats();

  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [crmNavigationInfo, setCrmNavigationInfo] = useState<{leadName: string; leadPhone: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Processar parâmetros de navegação vindos do CRM
  useEffect(() => {
    const state = location.state as { leadPhone?: string; leadName?: string } | null;
    if (state?.leadPhone && state?.leadName) {
      console.log('📞 Navegação do CRM detectada:', { phone: state.leadPhone, name: state.leadName });
      setCrmNavigationInfo({ leadName: state.leadName, leadPhone: state.leadPhone });
    }
  }, [location.state]);

  // Efeito para buscar automaticamente qual instância tem a conversa do lead
  useEffect(() => {
    if (!crmNavigationInfo) return;
    
    // Para gestores/admins: buscar qual instância tem a conversa
    const isManager = profile?.role === 'admin' || profile?.role === 'gestor';
    
    if (isManager && !selectedInstancia && instancias.length > 0) {
      console.log('🔍 Buscando instância que possui conversa com o lead...');
      
      const findInstanciaWithConversation = async () => {
        const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
        const targetPhone = normalizePhone(crmNavigationInfo.leadPhone);
        
        try {
          // Verificar cada instância para encontrar conversas que correspondam
          for (const instancia of instancias) {
            // Simular busca nas conversas da instância (seria feito via API)
            console.log(`🔍 Verificando instância: ${instancia.instancia}`);
            
            // TODO: Implementar busca real por telefone quando tivermos dados estruturados
            // Por ora, selecionar SDR como fallback
            if (instancia.is_sdr) {
              console.log('✅ Selecionando SDR como instância padrão');
              setSelectedInstancia(instancia.instancia);
              break;
            }
          }
        } catch (error) {
          console.error('Erro ao buscar instância:', error);
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
      console.log('👑 Gestor/Admin: aguardando seleção de instância para buscar conversa');
      return;
    }
    
    // Aguardar conversas serem carregadas
    if (conversasLoading) {
      console.log('⏳ Aguardando carregamento das conversas...');
      return;
    }
    
    if (!conversas.length) {
      console.log('📭 Nenhuma conversa disponível ainda');
      return;
    }
    
    // Buscar conversa correspondente ao telefone do lead
    const findAndSelectChat = () => {
      // Normalizar telefone removendo caracteres especiais
      const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
      const targetPhone = normalizePhone(crmNavigationInfo.leadPhone);
      
      // Buscar conversa por nome do cliente (extraído da primeira mensagem)
      const matchingChat = conversas.find(conversa => {
        const clienteNome = conversa.cliente_nome?.toLowerCase() || '';
        const leadName = crmNavigationInfo.leadName.toLowerCase();
        
        // Tentar match por nome ou por session_id se tiver formato específico
        return clienteNome.includes(leadName) || 
               leadName.includes(clienteNome) ||
               conversa.primeiro_contato?.toLowerCase().includes(leadName);
      });
      
      if (matchingChat) {
        console.log('✅ Conversa encontrada:', matchingChat);
        setSelectedSession(matchingChat.session_id);
        // Limpar info de navegação já que encontrou
        setCrmNavigationInfo(null);
      } else {
        console.log('❌ Nenhuma conversa encontrada para:', crmNavigationInfo.leadName);
        // Manter info para mostrar aviso ao usuário
      }
    };
    
    findAndSelectChat();
  }, [crmNavigationInfo, conversas, conversasLoading, selectedInstancia, profile?.role, setSelectedSession]);

  // Scroll para o final das mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  // Filtrar conversas já é feito pelo hook através do searchTerm
  const filteredConversas = conversas;

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedSession || sendingMessage) return;

    setSendingMessage(true);
    const success = await sendMessage(selectedSession, messageInput);
    
    if (success) {
      setMessageInput('');
    }
    setSendingMessage(false);
  };

  // Formatação de tempo
  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ptBR
      });
    } catch {
      return 'Agora há pouco';
    }
  };

  // Renderizar lista de instâncias/corretores (para gestores)
  const renderInstanciasList = () => (
    <div className="w-80 border-r border-gray-700/50 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col shadow-xl">
      <div className="relative p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 to-gray-850">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Instâncias/Corretores</h2>
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
                      {instancia.instance_display_name}
                      {instancia.is_sdr && (
                        <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs border border-purple-500/30">
                          SDR
                        </Badge>
                      )}
                    </div>
                    {instancia.corretor_nome && !instancia.is_sdr && (
                      <div className="text-xs text-gray-400 truncate mb-1">
                        {instancia.corretor_nome}
                      </div>
                    )}
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

  // Renderizar lista de conversas
  const renderConversasList = () => (
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
            {profile?.role === 'corretor' ? 'Minhas Conversas' : 'Conversas'}
          </h2>
        </div>
        
        {/* Busca Premium */}
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
            {filteredConversas.length} conversa(s)
          </div>
          {profile?.role !== 'corretor' && selectedInstancia && (
            <div className="text-xs text-blue-400 bg-blue-600/10 px-2 py-1 rounded-full border border-blue-500/30">
              {instancias.find(i => i.instancia === selectedInstancia)?.instance_display_name}
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {conversasLoading && conversas.length === 0 ? (
            <div className="text-center py-8">
              <div className="relative mx-auto mb-4 w-6 h-6">
                <div className="absolute inset-0 border-2 border-green-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-400 text-sm">Carregando conversas...</div>
            </div>
          ) : (
            filteredConversas.map((conversa) => (
            <Card
              key={conversa.session_id}
              className={cn(
                "cursor-pointer transition-all duration-300 bg-gradient-to-r from-gray-900/90 to-gray-950/90 border-gray-700/50 hover:from-gray-800/95 hover:to-gray-900/95 hover:shadow-lg hover:border-gray-600/50 backdrop-blur-sm h-32 min-h-32 max-h-32",
                selectedSession === conversa.session_id && "from-gray-950/95 to-black/90 border-green-600/80 shadow-lg shadow-green-500/30 ring-1 ring-green-500/20"
              )}
              onClick={() => setSelectedSession(conversa.session_id)}
            >
              <CardContent className="p-4 h-full">
                <div className="flex items-start gap-3 h-full">
                  {/* Avatar do Lead Premium */}
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-gray-600/30">
                      <AvatarFallback className={cn(
                        "text-white font-semibold",
                        conversa.instancia === 'sdr' 
                          ? "bg-gradient-to-br from-purple-600 to-purple-700" 
                          : "bg-gradient-to-br from-green-600 to-green-700"
                      )}>
                        {getInitials(conversa.cliente_nome || 'Cliente')}
                      </AvatarFallback>
                    </Avatar>
                    {conversa.has_unread && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full border-2 border-gray-900 flex items-center justify-center">
                        <span className="text-xs text-white font-bold">!</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div>
                      {/* Nome do Cliente */}
                      <div className="font-medium text-white truncate mb-2 flex items-center gap-2">
                        {conversa.cliente_nome || 'Cliente'}
                        {conversa.instancia === 'sdr' && (
                          <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs border border-purple-500/30">
                            SDR
                          </Badge>
                        )}
                      </div>
                      
                      {/* Última mensagem */}
                      <div className={cn(
                        "text-sm leading-relaxed line-clamp-2 overflow-hidden mb-2",
                        selectedSession === conversa.session_id ? "text-gray-100" : "text-gray-300"
                      )}>
                        {conversa.ultima_mensagem || (
                          <span className={cn(
                            "italic",
                            selectedSession === conversa.session_id ? "text-gray-300" : "text-gray-500"
                          )}>Nenhuma mensagem</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Informações adicionais */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
                          selectedSession === conversa.session_id 
                            ? "text-gray-200 bg-gray-800/70" 
                            : "text-gray-400 bg-gray-700/50"
                        )}>
                          <MessageSquare className="h-3 w-3 text-blue-400" />
                          <span className="font-medium">
                            {conversa.total_mensagens} msgs
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {conversa.ultima_mensagem_time && (
                          <div className={cn(
                            "text-xs px-2 py-1 rounded-md flex items-center gap-1",
                            selectedSession === conversa.session_id 
                              ? "text-gray-200 bg-gray-800/70" 
                              : "text-gray-500 bg-gray-800/50"
                          )}>
                            <Clock className="h-3 w-3" />
                            {formatMessageTime(conversa.ultima_mensagem_time)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
          
          {filteredConversas.length === 0 && !loading && !conversasLoading && (
            <div className="text-center py-12">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-full blur-xl"></div>
                <MessageSquare className="relative h-12 w-12 mx-auto opacity-50" />
              </div>
              <div className="text-gray-300 font-medium mb-2">Nenhuma conversa encontrada</div>
              {searchTerm && (
                <div className="text-sm text-gray-400">
                  Tente ajustar o termo de busca
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Renderizar área de mensagens
  const renderMessagesArea = () => {
    const selectedConversa = conversas.find(c => c.session_id === selectedSession);
    
    if (!selectedSession || !selectedConversa) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border-l border-gray-700/50">
          <div className="text-center text-gray-400">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-green-600/20 rounded-full blur-xl"></div>
              <MessageSquare className="relative h-16 w-16 mx-auto opacity-60" />
            </div>
            <div className="text-lg font-medium mb-2 text-gray-300">Selecione uma conversa</div>
            <div className="text-sm max-w-xs">
              {profile?.role === 'corretor' 
                ? 'Escolha uma conversa para visualizar as mensagens'
                : 'Selecione uma instância e depois uma conversa'
              }
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-800 to-gray-850 border-l border-gray-700/50 shadow-2xl">
        {/* Header da conversa - Design Premium */}
        <div className="relative p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 via-gray-850 to-gray-900/90 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-green-600/5"></div>
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 rounded-full blur-sm opacity-50"></div>
              <Avatar className="relative w-12 h-12 border-2 border-green-500/30">
                <AvatarFallback className="bg-gradient-to-br from-green-600 to-green-700 text-white font-semibold">
                  {getInitials(selectedConversa.cliente_nome || 'Cliente')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white text-lg mb-1">
                {selectedConversa.cliente_nome || 'Cliente'}
              </div>
              <div className="text-sm text-gray-300 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                  <span className="font-medium">Sessão: {selectedConversa.session_id.slice(0, 8)}...</span>
                </div>
                {profile?.role !== 'corretor' && (
                  <>
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-purple-400" />
                      <span>{selectedConversa.instancia}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
              <Clock className="h-3 w-3 inline mr-1" />
              Online
            </div>
          </div>
        </div>

        {/* Área de mensagens - Design Moderno */}
        <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-gray-850/50 to-gray-900/50">
          <div className="space-y-6">
            {mensagensLoading ? (
              <div className="text-center py-12">
                <div className="relative mx-auto mb-4 w-8 h-8">
                  <div className="absolute inset-0 border-3 border-blue-500/30 rounded-full"></div>
                  <div className="absolute inset-0 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-gray-300 font-medium">Carregando mensagens...</div>
              </div>
            ) : mensagens.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-xl"></div>
                  <MessageSquare className="relative h-12 w-12 mx-auto opacity-50" />
                </div>
                <div className="text-gray-300 font-medium mb-2">Nenhuma mensagem ainda</div>
                <div className="text-sm text-gray-400">
                  Seja o primeiro a enviar uma mensagem!
                </div>
              </div>
            ) : (
              mensagens.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-3 group",
                    !message.is_from_client ? "justify-end" : "justify-start"
                  )}
                >
                  {message.is_from_client && (
                    <Avatar className="w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity">
                      <AvatarFallback className="bg-gradient-to-br from-green-600 to-green-700 text-white text-xs">
                        {getInitials(selectedConversa.cliente_nome || 'Cliente')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "relative max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 group-hover:shadow-xl",
                      !message.is_from_client
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md border border-blue-500/30"
                        : "bg-gradient-to-br from-gray-700 to-gray-750 text-gray-100 rounded-bl-md border border-gray-600/50"
                    )}
                  >
                    <div className="text-sm leading-relaxed">{message.content}</div>
                    <div className={cn(
                      "text-xs mt-2 flex items-center gap-1",
                      !message.is_from_client ? "text-blue-100/80 justify-end" : "text-gray-400"
                    )}>
                      <Clock className="h-3 w-3 opacity-60" />
                      {formatMessageTime(message.timestamp)}
                      {!message.is_from_client && (
                        <div className="w-1 h-1 bg-blue-300 rounded-full ml-1"></div>
                      )}
                    </div>
                    {message.has_tool_calls && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          Tool Call
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {!message.is_from_client && (
                    <Avatar className="w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs">
                        {selectedConversa.instancia === 'sdr' ? 'SDR' : (profile?.nome ? getInitials(profile.nome) : 'AI')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Área de envio - Design Premium */}
        {profile?.role === 'corretor' && (
          <div className="relative p-6 border-t border-gray-700/50 bg-gradient-to-r from-gray-900/90 via-gray-850 to-gray-900/90 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/3 to-purple-600/3"></div>
            <div className="relative flex gap-3">
              <div className="flex-1 relative">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="bg-gray-800/80 border-gray-600/50 text-white placeholder-gray-400 rounded-xl px-4 py-3 pr-12 backdrop-blur-sm shadow-lg focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  disabled={sendingMessage}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <MessageSquare className="h-4 w-4" />
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendingMessage}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/30"
              >
                {sendingMessage ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-xs text-gray-400 mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                <span>Pressione Enter para enviar</span>
              </div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <span>Shift+Enter para quebrar linha</span>
            </div>
          </div>
        )}

        {/* Mensagem para gestores/admins - Design Elegante */}
        {profile?.role !== 'corretor' && (
          <div className="relative p-6 border-t border-gray-700/50 bg-gradient-to-r from-gray-900/90 via-gray-850 to-gray-900/90 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/5 to-orange-600/5"></div>
            <div className="relative text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600/10 border border-amber-600/20 rounded-full">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span className="text-amber-300 text-sm font-medium">
                  Apenas o corretor responsável pode enviar mensagens
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900">
        <div className="text-center">
          <div className="relative mx-auto mb-6 w-12 h-12">
            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-gray-300 font-medium text-lg mb-2">Carregando conversas...</div>
          <div className="text-gray-400 text-sm">Aguarde enquanto buscamos suas mensagens</div>
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
          <div className="text-lg font-medium mb-3 text-red-300">Erro ao carregar</div>
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
              onClick={() => refreshData()} 
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
              Sistema de Mensagens - Nova Arquitetura
            </CardTitle>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400 font-medium">Online</span>
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
                  {(() => {
                    const isManager = profile?.role === 'admin' || profile?.role === 'gestor';
                    const isManagerAwaitingSelection = isManager && !selectedInstancia;
                    
                    if (isManagerAwaitingSelection && instancias.length === 0) {
                      return "Carregando lista de instâncias...";
                    } else if (isManagerAwaitingSelection) {
                      return "Buscando automaticamente qual instância possui conversa com este lead...";
                    } else if (conversasLoading) {
                      return "Aguardando carregamento das conversas...";
                    } else if (conversas.length === 0) {
                      return "Nenhuma conversa disponível para a instância selecionada.";
                    } else {
                      return "Nenhuma conversa encontrada com este nome. Verifique se existe um chat ativo para este lead.";
                    }
                  })()}
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
            {(profile?.role === 'corretor' || selectedInstancia) && renderConversasList()}
            
            {/* Área de mensagens */}
            {renderMessagesArea()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}