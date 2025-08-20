import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useChatsDataSimple as useChatsData } from '@/hooks/useChatsDataSimple';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  
  console.log('🎬 ChatsView renderizado. Profile:', profile);
  
  const {
    loading,
    error,
    messagesLoading,
    corretoresLoading,
    conversasLoading,
    corretores,
    selectedCorretor,
    setSelectedCorretor,
    conversas,
    selectedChat,
    setSelectedChat,
    messages,
    sendMessage
  } = useChatsData();

  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Efeito para buscar automaticamente qual corretor tem a conversa do lead
  useEffect(() => {
    if (!crmNavigationInfo) return;
    
    // Para gestores/admins: buscar qual corretor tem a conversa
    const isManager = profile?.role === 'admin' || profile?.role === 'gestor';
    
    if (isManager && !selectedCorretor && corretores.length > 0) {
      console.log('🔍 Buscando corretor que possui conversa com o lead...');
      
      const findCorretorWithConversation = async () => {
        const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
        const targetPhone = normalizePhone(crmNavigationInfo.leadPhone);
        
        try {
          // Buscar em todas as conversas qual corretor tem o telefone
          const { data: chats, error } = await supabase
            .from('whatsapp_chats')
            .select('user_id, contact_phone, lead_id')
            .not('user_id', 'is', null);

          if (error) {
            console.error('Erro ao buscar conversas:', error);
            return;
          }

          // Encontrar chat que corresponde ao telefone
          const matchingChat = chats?.find(chat => {
            const contactPhone = normalizePhone(chat.contact_phone || '');
            return contactPhone.includes(targetPhone.slice(-9));
          });

          if (matchingChat && matchingChat.user_id) {
            const corretor = corretores.find(c => c.corretor_id === matchingChat.user_id);
            if (corretor) {
              console.log('✅ Corretor encontrado automaticamente:', corretor.corretor_nome);
              setSelectedCorretor(matchingChat.user_id);
            }
          } else if (chats?.some(chat => chat.user_id === null)) {
            // Verificar se está nas conversas do SDR Agent
            const sdrAgent = corretores.find(c => c.corretor_id === 'sdr-agent');
            if (sdrAgent) {
              console.log('✅ Conversa encontrada no SDR Agent');
              setSelectedCorretor('sdr-agent');
            }
          } else {
            console.log('❌ Nenhum corretor encontrado com conversa para este telefone');
          }
        } catch (error) {
          console.error('Erro ao buscar corretor:', error);
        }
      };

      findCorretorWithConversation();
    }
  }, [crmNavigationInfo, profile?.role, selectedCorretor, corretores, setSelectedCorretor]);

  // Efeito separado para buscar conversa quando conversas estão disponíveis
  useEffect(() => {
    if (!crmNavigationInfo) return;
    
    // Para gestores/admins: precisa aguardar seleção de corretor para carregar conversas
    const isManagerAwaitingSelection = (profile?.role === 'admin' || profile?.role === 'gestor') && !selectedCorretor;
    
    if (isManagerAwaitingSelection) {
      console.log('👑 Gestor/Admin: aguardando seleção de corretor para buscar conversa');
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
      
      // Buscar conversa que corresponda ao telefone
      const matchingChat = conversas.find(conversa => {
        const contactPhone = normalizePhone(conversa.contact_phone || '');
        const leadPhone = normalizePhone(conversa.lead_phone || '');
        return contactPhone.includes(targetPhone.slice(-9)) || leadPhone.includes(targetPhone.slice(-9));
      });
      
      if (matchingChat) {
        console.log('✅ Conversa encontrada:', matchingChat);
        setSelectedChat(matchingChat.chat_id);
        // Se tiver corretor específico, selecionar também
        if (matchingChat.corretor_id && selectedCorretor !== matchingChat.corretor_id) {
          setSelectedCorretor(matchingChat.corretor_id);
        }
        // Limpar info de navegação já que encontrou
        setCrmNavigationInfo(null);
      } else {
        console.log('❌ Nenhuma conversa encontrada para o telefone:', crmNavigationInfo.leadPhone);
        // Manter info para mostrar aviso ao usuário
      }
    };
    
    findAndSelectChat();
  }, [crmNavigationInfo, conversas, conversasLoading, selectedCorretor, profile?.role, setSelectedChat, setSelectedCorretor]);

  // Scroll para o final das mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Filtrar conversas por termo de busca
  const filteredConversas = conversas.filter(conversa =>
    conversa.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversa.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conversa.last_message && conversa.last_message.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || sendingMessage) return;

    setSendingMessage(true);
    const success = await sendMessage(selectedChat, messageInput);
    
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

  // Renderizar lista de corretores (para gestores)
  const renderCorretoresList = () => (
    <div className="w-80 border-r border-gray-700/50 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col shadow-xl">
      <div className="relative p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 to-gray-850">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Corretores</h2>
        </div>
        <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700/50">
          {corretores.length} corretor(es) ativo(s)
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {corretoresLoading && corretores.length === 0 ? (
            <div className="text-center py-8">
              <div className="relative mx-auto mb-4 w-6 h-6">
                <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-400 text-sm">Carregando corretores...</div>
            </div>
          ) : (
            corretores.map((corretor) => (
            <Card
              key={corretor.corretor_id}
              className={cn(
                "cursor-pointer transition-all duration-300 bg-gradient-to-r from-gray-900/90 to-gray-950/90 border-gray-700/50 hover:from-gray-800/95 hover:to-gray-900/95 hover:shadow-lg hover:border-gray-600/50 backdrop-blur-sm",
                selectedCorretor === corretor.corretor_id && "from-gray-950/95 to-black/90 border-green-600/80 shadow-lg shadow-green-500/30 ring-1 ring-green-500/20"
              )}
              onClick={() => setSelectedCorretor(corretor.corretor_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className={cn(
                        "text-white font-semibold border-2",
                        corretor.corretor_id === 'sdr-agent' 
                          ? "bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500/30" 
                          : "bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500/30"
                      )}>
                        {getInitials(corretor.corretor_nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-900",
                      corretor.corretor_id === 'sdr-agent' ? "bg-purple-500" : "bg-green-500"
                    )}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate flex items-center gap-2 mb-1">
                      {corretor.corretor_nome}
                      {corretor.corretor_id === 'sdr-agent' && (
                        <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs border border-purple-500/30">
                          SDR
                        </Badge>
                      )}
                    </div>
                    <div className={cn(
                      "text-xs flex items-center gap-2",
                      selectedCorretor === corretor.corretor_id ? "text-gray-200" : "text-gray-400"
                    )}>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{corretor.total_conversas} conversa(s)</span>
                      </div>
                      {corretor.corretor_id === 'sdr-agent' && (
                        <>
                          <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                          <span className={cn(
                            selectedCorretor === corretor.corretor_id ? "text-purple-300" : "text-purple-400"
                          )}>Sistema</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    selectedCorretor === corretor.corretor_id ? "text-green-400 transform rotate-90" : "text-gray-400"
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
          {profile?.role !== 'corretor' && selectedCorretor && (
            <div className="text-xs text-blue-400 bg-blue-600/10 px-2 py-1 rounded-full border border-blue-500/30">
              {corretores.find(c => c.corretor_id === selectedCorretor)?.corretor_nome}
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
              key={conversa.chat_id}
              className={cn(
                "cursor-pointer transition-all duration-300 bg-gradient-to-r from-gray-900/90 to-gray-950/90 border-gray-700/50 hover:from-gray-800/95 hover:to-gray-900/95 hover:shadow-lg hover:border-gray-600/50 backdrop-blur-sm h-32 min-h-32 max-h-32",
                selectedChat === conversa.chat_id && "from-gray-950/95 to-black/90 border-green-600/80 shadow-lg shadow-green-500/30 ring-1 ring-green-500/20"
              )}
              onClick={() => setSelectedChat(conversa.chat_id)}
            >
              <CardContent className="p-4 h-full">
                <div className="flex items-start gap-3 h-full">
                  {/* Avatar do Lead Premium */}
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-gray-600/30">
                      <AvatarFallback className={cn(
                        "text-white font-semibold",
                        conversa.corretor_id === 'sdr-agent' 
                          ? "bg-gradient-to-br from-purple-600 to-purple-700" 
                          : "bg-gradient-to-br from-green-600 to-green-700"
                      )}>
                        {getInitials(conversa.lead_name)}
                      </AvatarFallback>
                    </Avatar>
                    {conversa.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full border-2 border-gray-900 flex items-center justify-center">
                        <span className="text-xs text-white font-bold">{conversa.unread_count}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div>
                      {/* Nome do Lead */}
                      <div className="font-medium text-white truncate mb-2 flex items-center gap-2">
                        {conversa.lead_name}
                        {conversa.corretor_id === 'sdr-agent' && (
                          <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs border border-purple-500/30">
                            SDR
                          </Badge>
                        )}
                      </div>
                      
                      {/* Última mensagem */}
                      <div className={cn(
                        "text-sm leading-relaxed line-clamp-2 overflow-hidden mb-2",
                        selectedChat === conversa.chat_id ? "text-gray-100" : "text-gray-300"
                      )}>
                        {conversa.last_message || (
                          <span className={cn(
                            "italic",
                            selectedChat === conversa.chat_id ? "text-gray-300" : "text-gray-500"
                          )}>Nenhuma mensagem</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Informações adicionais */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {conversa.lead_phone && (
                          <div className={cn(
                            "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
                            selectedChat === conversa.chat_id 
                              ? "text-gray-200 bg-gray-800/70" 
                              : "text-gray-400 bg-gray-700/50"
                          )}>
                            <Phone className="h-3 w-3 text-blue-400" />
                            <span className="truncate max-w-20 font-medium">
                              {conversa.lead_phone}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {conversa.last_message_time && (
                          <div className={cn(
                            "text-xs px-2 py-1 rounded-md flex items-center gap-1",
                            selectedChat === conversa.chat_id 
                              ? "text-gray-200 bg-gray-800/70" 
                              : "text-gray-500 bg-gray-800/50"
                          )}>
                            <Clock className="h-3 w-3" />
                            {formatMessageTime(conversa.last_message_time)}
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
    const selectedConversa = conversas.find(c => c.chat_id === selectedChat);
    
    if (!selectedChat || !selectedConversa) {
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
                : 'Selecione um corretor e depois uma conversa'
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
                  {getInitials(selectedConversa.lead_name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white text-lg mb-1">
                {selectedConversa.lead_name}
              </div>
              <div className="text-sm text-gray-300 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-blue-400" />
                  <span className="font-medium">{selectedConversa.lead_phone}</span>
                </div>
                {profile?.role !== 'corretor' && (
                  <>
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-purple-400" />
                      <span>{selectedConversa.corretor_nome}</span>
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
            {messagesLoading ? (
              <div className="text-center py-12">
                <div className="relative mx-auto mb-4 w-8 h-8">
                  <div className="absolute inset-0 border-3 border-blue-500/30 rounded-full"></div>
                  <div className="absolute inset-0 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-gray-300 font-medium">Carregando mensagens...</div>
              </div>
            ) : messages.length === 0 ? (
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
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-3 group",
                    message.from_me ? "justify-end" : "justify-start"
                  )}
                >
                  {!message.from_me && (
                    <Avatar className="w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity">
                      <AvatarFallback className="bg-gradient-to-br from-green-600 to-green-700 text-white text-xs">
                        {getInitials(selectedConversa.lead_name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "relative max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 group-hover:shadow-xl",
                      message.from_me
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md border border-blue-500/30"
                        : "bg-gradient-to-br from-gray-700 to-gray-750 text-gray-100 rounded-bl-md border border-gray-600/50"
                    )}
                  >
                    {/* Indicador de mensagem anterior */}
                    {index > 0 && messages[index - 1].from_me !== message.from_me && (
                      <div className={cn(
                        "absolute w-3 h-3 rotate-45 border-l border-t",
                        message.from_me 
                          ? "-bottom-1.5 right-4 bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500/30"
                          : "-bottom-1.5 left-4 bg-gradient-to-br from-gray-700 to-gray-750 border-gray-600/50"
                      )}></div>
                    )}
                    
                    <div className="text-sm leading-relaxed">{message.content}</div>
                    <div className={cn(
                      "text-xs mt-2 flex items-center gap-1",
                      message.from_me ? "text-blue-100/80 justify-end" : "text-gray-400"
                    )}>
                      <Clock className="h-3 w-3 opacity-60" />
                      {formatMessageTime(message.timestamp)}
                      {message.from_me && (
                        <div className="w-1 h-1 bg-blue-300 rounded-full ml-1"></div>
                      )}
                    </div>
                  </div>
                  
                  {message.from_me && (
                    <Avatar className="w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs">
                        {profile?.nome ? getInitials(profile.nome) : 'EU'}
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
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
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
              Sistema de Mensagens
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
                    const isManagerAwaitingSelection = isManager && !selectedCorretor;
                    
                    if (isManagerAwaitingSelection && corretores.length === 0) {
                      return "Carregando lista de corretores...";
                    } else if (isManagerAwaitingSelection) {
                      return "Buscando automaticamente qual corretor possui conversa com este lead...";
                    } else if (conversasLoading) {
                      return "Aguardando carregamento das conversas...";
                    } else if (conversas.length === 0) {
                      return "Nenhuma conversa disponível para o corretor selecionado.";
                    } else {
                      return "Nenhuma conversa encontrada com este telefone. Verifique se existe um chat ativo para este lead.";
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
            
            {/* Lista de corretores (apenas para gestores/admins) */}
            {profile?.role !== 'corretor' && renderCorretoresList()}
            
            {/* Lista de conversas */}
            {(profile?.role === 'corretor' || selectedCorretor) && renderConversasList()}
            
            {/* Área de mensagens */}
            {renderMessagesArea()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}