/**
 * Área otimizada de mensagens com infinite scroll e realtime apenas para sessão ativa
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Clock, 
  Send, 
  Phone, 
  User, 
  AlertCircle,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MensagemInfo, ConversaSessionInfo } from '@/types/imobiproChats';

interface MensagensAreaOptimizedProps {
  mensagens: MensagemInfo[];
  selectedSession: string | null;
  conversaInfo: ConversaSessionInfo | null;
  onSendMessage: (content: string) => Promise<boolean>;
  loading: boolean;
  hasMore: boolean;
  onLoadMoreMensagens: () => void;
  onLoadOlderMensagens: () => void;
  canSendMessage: boolean;
  userRole?: string;
  userName?: string;
}

// Função auxiliar para gerar iniciais
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Formatação de tempo otimizada
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

export function MensagensAreaOptimized({
  mensagens,
  selectedSession,
  conversaInfo,
  onSendMessage,
  loading,
  hasMore,
  onLoadMoreMensagens,
  onLoadOlderMensagens,
  canSendMessage,
  userRole,
  userName
}: MensagensAreaOptimizedProps) {
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showLoadOlder, setShowLoadOlder] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  // Scroll automático para o final apenas para novas mensagens
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  }, []);

  // Detectar se o usuário está no final da lista
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
    const isAtTop = scrollTop <= 100;

    // Mostrar botão de carregar mensagens mais antigas se não estiver no topo
    setShowLoadOlder(!isAtTop && hasMore);

    // Detectar scroll para cima para carregar mensagens mais antigas
    if (isAtTop && hasMore && !loading && scrollTop < lastScrollTop.current) {
      console.log('🔄 Carregando mensagens mais antigas...');
      onLoadOlderMensagens();
    }

    lastScrollTop.current = scrollTop;
  }, [hasMore, loading, onLoadOlderMensagens]);

  // Configurar scroll listener
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll automático apenas para mensagens novas (não para carregamento de mais mensagens)
  useEffect(() => {
    // Scroll apenas se há mensagens e não está carregando
    if (mensagens.length > 0 && !loading) {
      // Verificar se a última mensagem é nova (timestamp recente)
      const lastMessage = mensagens[mensagens.length - 1];
      const isRecentMessage = new Date(lastMessage.timestamp).getTime() > Date.now() - 30000; // 30 segundos
      
      if (isRecentMessage) {
        setTimeout(() => scrollToBottom(), 100);
      }
    }
  }, [mensagens.length, loading, scrollToBottom]);

  // Configurar Intersection Observer para infinite scroll no final
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log('🔄 Carregando mais mensagens via intersection...');
          onLoadMoreMensagens();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMoreMensagens]);

  // Enviar mensagem
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedSession || sendingMessage) return;

    setSendingMessage(true);
    const success = await onSendMessage(messageInput.trim());
    
    if (success) {
      setMessageInput('');
      // Scroll para o final após enviar
      setTimeout(() => scrollToBottom(), 100);
    }
    
    setSendingMessage(false);
  }, [messageInput, selectedSession, sendingMessage, onSendMessage, scrollToBottom]);

  // Função para renderizar uma mensagem individual
  const renderMensagem = useCallback((message: MensagemInfo, index: number) => (
    <div
      key={`${message.id}-${index}`}
      className={cn(
        "flex items-end gap-3 group",
        !message.is_from_client ? "justify-end" : "justify-start"
      )}
    >
      {message.is_from_client && (
        <Avatar className="w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity">
          <AvatarFallback className="bg-gradient-to-br from-green-600 to-green-700 text-white text-xs">
            {getInitials(conversaInfo?.cliente_nome || 'Cliente')}
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
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
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
            {conversaInfo?.instancia === 'sdr' ? 'SDR' : (userName ? getInitials(userName) : 'AI')}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  ), [conversaInfo, userName]);

  // Estado de seleção vazia
  if (!selectedSession || !conversaInfo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border-l border-gray-700/50">
        <div className="text-center text-gray-400">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-green-600/20 rounded-full blur-xl"></div>
            <MessageSquare className="relative h-16 w-16 mx-auto opacity-60" />
          </div>
          <div className="text-lg font-medium mb-2 text-gray-300">Selecione uma conversa</div>
          <div className="text-sm max-w-xs">
            {userRole === 'corretor' 
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
      {/* Header da conversa */}
      <div className="relative p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 via-gray-850 to-gray-900/90 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-green-600/5"></div>
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 rounded-full blur-sm opacity-50"></div>
            <Avatar className="relative w-12 h-12 border-2 border-green-500/30">
              <AvatarFallback className="bg-gradient-to-br from-green-600 to-green-700 text-white font-semibold">
                {getInitials(conversaInfo.cliente_nome || 'Cliente')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white text-lg mb-1">
              🎯 {conversaInfo.lead_id ? 'Lead' : 'Conversa'}: {conversaInfo.cliente_nome || 'Cliente'}
            </div>
            <div className="text-sm text-gray-300 flex items-center gap-3">
              {conversaInfo.lead_phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-green-400" />
                  <span className="font-medium">{conversaInfo.lead_phone}</span>
                </div>
              )}
              {userRole !== 'corretor' && (
                <>
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-purple-400" />
                    <span>{conversaInfo.instancia}</span>
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

      {/* Botão de carregar mensagens mais antigas */}
      {showLoadOlder && (
        <div className="p-2 border-b border-gray-700/50 bg-gray-900/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadOlderMensagens}
            disabled={loading}
            className="w-full text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            {loading ? 'Carregando...' : 'Carregar mensagens mais antigas'}
          </Button>
        </div>
      )}

      {/* Área de mensagens com infinite scroll */}
      <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-gray-850/50 to-gray-900/50" ref={scrollAreaRef}>
        <div className="space-y-6">
          {/* Loading inicial */}
          {loading && mensagens.length === 0 && (
            <div className="text-center py-12">
              <div className="relative mx-auto mb-4 w-8 h-8">
                <div className="absolute inset-0 border-3 border-blue-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-300 font-medium">Carregando mensagens...</div>
            </div>
          )}

          {/* Lista de mensagens */}
          {mensagens.length > 0 ? (
            mensagens.map((message, index) => renderMensagem(message, index))
          ) : !loading && (
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
          )}

          {/* Indicador para carregar mais no final */}
          {hasMore && (
            <div ref={loadMoreRef} className="text-center py-4">
              {loading && (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="text-gray-400 text-sm">Carregando mais mensagens...</span>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Área de envio para corretores */}
      {canSendMessage && (
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

      {/* Mensagem para gestores/admins */}
      {!canSendMessage && (
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
}