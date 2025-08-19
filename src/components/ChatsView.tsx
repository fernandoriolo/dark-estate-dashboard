import { useState, useRef, useEffect } from 'react';
import { useChatsDataSimple as useChatsData } from '@/hooks/useChatsDataSimple';
import { useUserProfile } from '@/hooks/useUserProfile';
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
  
  console.log('🎬 ChatsView renderizado. Profile:', profile);
  
  const {
    loading,
    error,
    messagesLoading,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="w-80 border-r border-gray-700 bg-gray-900 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Corretores</h2>
        </div>
        <div className="text-sm text-gray-400">
          {corretores.length} corretor(es) com conversas
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {corretores.map((corretor) => (
            <Card
              key={corretor.corretor_id}
              className={cn(
                "cursor-pointer transition-all duration-200 bg-gray-800 border-gray-600 hover:bg-gray-750",
                selectedCorretor === corretor.corretor_id && "bg-blue-600/20 border-blue-500"
              )}
              onClick={() => setSelectedCorretor(corretor.corretor_id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={cn(
                      "text-white",
                      corretor.corretor_id === 'sdr-agent' ? "bg-purple-600" : "bg-blue-600"
                    )}>
                      {getInitials(corretor.corretor_nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate flex items-center gap-2">
                      {corretor.corretor_nome}
                      {corretor.corretor_id === 'sdr-agent' && (
                        <Badge className="bg-purple-600 text-white text-xs">
                          SDR
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {corretor.total_conversas} conversa(s)
                      {corretor.corretor_id === 'sdr-agent' && (
                        <span className="text-purple-400">• Sem corretor</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  // Renderizar lista de conversas
  const renderConversasList = () => (
    <div className={cn(
      "border-r border-gray-700 bg-gray-900 flex flex-col",
      profile?.role === 'corretor' ? "w-80" : "w-96"
    )}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-5 w-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">
            {profile?.role === 'corretor' ? 'Minhas Conversas' : 'Conversas'}
          </h2>
        </div>
        
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
          />
        </div>

        <div className="text-sm text-gray-400 mt-2">
          {filteredConversas.length} conversa(s)
          {profile?.role !== 'corretor' && selectedCorretor && (
            <div className="mt-1 text-blue-400">
              Corretor: {corretores.find(c => c.corretor_id === selectedCorretor)?.corretor_nome}
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredConversas.map((conversa) => (
            <Card
              key={conversa.chat_id}
              className={cn(
                "cursor-pointer transition-all duration-200 bg-gray-800 border-gray-600 hover:bg-gray-750",
                selectedChat === conversa.chat_id && "bg-green-600/20 border-green-500"
              )}
              onClick={() => setSelectedChat(conversa.chat_id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Avatar do Lead */}
                  <Avatar className="w-12 h-12 mt-1">
                    <AvatarFallback className={cn(
                      "text-white",
                      conversa.corretor_id === 'sdr-agent' ? "bg-purple-600" : "bg-green-600"
                    )}>
                      {getInitials(conversa.lead_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    {/* Nome do Lead */}
                    <div className="font-medium text-white truncate mb-1 flex items-center gap-2">
                      {conversa.lead_name}
                      {conversa.corretor_id === 'sdr-agent' && (
                        <Badge className="bg-purple-600 text-white text-xs">
                          SDR
                        </Badge>
                      )}
                    </div>
                    
                    {/* Última mensagem */}
                    <div className="text-sm text-gray-300 truncate mb-2">
                      {conversa.last_message || 'Nenhuma mensagem'}
                    </div>
                    
                    {/* Informações adicionais */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {conversa.lead_phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="h-3 w-3" />
                            <span className="truncate max-w-20">
                              {conversa.lead_phone}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {conversa.unread_count > 0 && (
                          <Badge className="bg-green-600 text-white text-xs">
                            {conversa.unread_count}
                          </Badge>
                        )}
                        {conversa.last_message_time && (
                          <div className="text-xs text-gray-500">
                            {formatMessageTime(conversa.last_message_time)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredConversas.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <div>Nenhuma conversa encontrada</div>
              {searchTerm && (
                <div className="text-sm mt-1">
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
        <div className="flex-1 flex items-center justify-center bg-gray-800">
          <div className="text-center text-gray-400">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <div className="text-lg font-medium mb-2">Selecione uma conversa</div>
            <div className="text-sm">
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
      <div className="flex-1 flex flex-col bg-gray-800">
        {/* Header da conversa */}
        <div className="p-4 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-green-600 text-white">
                {getInitials(selectedConversa.lead_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold text-white">
                {selectedConversa.lead_name}
              </div>
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <Phone className="h-3 w-3" />
                {selectedConversa.lead_phone}
                {profile?.role !== 'corretor' && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <User className="h-3 w-3" />
                    {selectedConversa.corretor_nome}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Área de mensagens */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messagesLoading ? (
              <div className="text-center py-8 text-gray-400">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Carregando mensagens...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <div>Nenhuma mensagem ainda</div>
                <div className="text-sm mt-1">
                  Seja o primeiro a enviar uma mensagem!
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.from_me ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                      message.from_me
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-100"
                    )}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className={cn(
                      "text-xs mt-1",
                      message.from_me ? "text-blue-100" : "text-gray-400"
                    )}>
                      {formatMessageTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Área de envio (apenas para corretores) */}
        {profile?.role === 'corretor' && (
          <div className="p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex gap-2">
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
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                disabled={sendingMessage}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendingMessage}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {sendingMessage ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Pressione Enter para enviar • Shift+Enter para quebrar linha
            </div>
          </div>
        )}

        {/* Mensagem para gestores/admins */}
        {profile?.role !== 'corretor' && (
          <div className="p-4 border-t border-gray-700 bg-gray-900">
            <div className="text-center text-gray-400 text-sm">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              Apenas o corretor responsável pode enviar mensagens
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div>Carregando conversas...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-red-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <div className="text-lg font-medium mb-2">Erro ao carregar</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* Lista de corretores (apenas para gestores/admins) */}
      {profile?.role !== 'corretor' && renderCorretoresList()}
      
      {/* Lista de conversas */}
      {(profile?.role === 'corretor' || selectedCorretor) && renderConversasList()}
      
      {/* Área de mensagens */}
      {renderMessagesArea()}
    </div>
  );
}