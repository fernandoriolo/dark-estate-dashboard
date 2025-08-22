/**
 * Lista otimizada de conversas com infinite scroll e keyset pagination
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ConversaSessionInfo } from '@/types/imobiproChats';

interface ConversasListOptimizedProps {
  conversas: ConversaSessionInfo[];
  selectedSession: string | null;
  onSelectSession: (sessionId: string) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  instanciaName?: string;
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

export function ConversasListOptimized({
  conversas,
  selectedSession,
  onSelectSession,
  loading,
  hasMore,
  onLoadMore,
  instanciaName
}: ConversasListOptimizedProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Configurar Intersection Observer para infinite scroll
  useEffect(() => {
    if (!loadingRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log('🔄 Carregando mais conversas via intersection...');
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px' // Carregar quando estiver 100px antes do final
      }
    );

    observer.observe(loadingRef.current);

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  // Função para renderizar uma conversa individual
  const renderConversa = useCallback((conversa: ConversaSessionInfo, index: number) => (
    <Card
      key={`${conversa.session_id}-${index}`}
      className={cn(
        "cursor-pointer transition-all duration-300 bg-gradient-to-r from-gray-900/90 to-gray-950/90 border-gray-700/50 hover:from-gray-800/95 hover:to-gray-900/95 hover:shadow-lg hover:border-gray-600/50 backdrop-blur-sm h-32 min-h-32 max-h-32",
        selectedSession === conversa.session_id && "from-gray-950/95 to-black/90 border-green-600/80 shadow-lg shadow-green-500/30 ring-1 ring-green-500/20"
      )}
      onClick={() => onSelectSession(conversa.session_id)}
    >
      <CardContent className="p-4 h-full">
        <div className="flex items-start gap-3 h-full">
          {/* Avatar do Lead/Cliente Premium */}
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
                {conversa.lead_id && (
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                    Lead
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
  ), [selectedSession, onSelectSession]);

  return (
    <div className="w-96 border-r border-gray-700/50 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col shadow-xl">
      {/* Header */}
      <div className="relative p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-900/90 to-gray-850">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-blue-600/5"></div>
        <div className="relative flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-600/20 rounded-lg border border-green-500/30">
            <MessageSquare className="h-5 w-5 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Conversas
          </h2>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700/50">
            {conversas.length} conversa(s)
          </div>
          {instanciaName && (
            <div className="text-xs text-blue-400 bg-blue-600/10 px-2 py-1 rounded-full border border-blue-500/30">
              {instanciaName}
            </div>
          )}
        </div>
      </div>

      {/* Lista de conversas com infinite scroll */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-3">
          {/* Loading inicial */}
          {loading && conversas.length === 0 && (
            <div className="text-center py-8">
              <div className="relative mx-auto mb-4 w-6 h-6">
                <div className="absolute inset-0 border-2 border-green-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-400 text-sm">Carregando conversas...</div>
            </div>
          )}

          {/* Lista de conversas */}
          {conversas.map((conversa, index) => renderConversa(conversa, index))}

          {/* Indicador de carregamento para infinite scroll */}
          {hasMore && (
            <div 
              ref={loadingRef}
              className="text-center py-4"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                  <span className="text-gray-400 text-sm">Carregando mais...</span>
                </div>
              ) : (
                <div className="text-gray-500 text-xs">
                  Role para carregar mais conversas
                </div>
              )}
            </div>
          )}

          {/* Estado vazio */}
          {conversas.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-full blur-xl"></div>
                <MessageSquare className="relative h-12 w-12 mx-auto opacity-50" />
              </div>
              <div className="text-gray-300 font-medium mb-2">Nenhuma conversa encontrada</div>
              <div className="text-sm text-gray-400">
                Selecione uma instância para ver as conversas
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}