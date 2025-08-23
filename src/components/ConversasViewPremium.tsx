import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Paperclip
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useConversasInstances } from '@/hooks/useConversasInstances';
import { useConversasList } from '@/hooks/useConversasList';
import { useConversaMessages } from '@/hooks/useConversaMessages';
import { useConversasRealtime } from '@/hooks/useConversasRealtime';
import { ConversationActionsMenu } from './ConversationActionsMenu';
import { SummaryModalAnimated } from './SummaryModalAnimated';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';

// Variants de animação exatas
const list = { 
  hidden: {}, 
  visible: { 
    transition: { 
      staggerChildren: 0.05, 
      delayChildren: 0.03 
    } 
  } 
};

const bubble = {
  hidden: { opacity: 0, y: 8, filter: 'blur(2px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0)', transition: { duration: 0.18 } },
  highlight: { boxShadow: '0 0 0 2px rgba(125,211,252,.25)' }
};

// Componente de Skeleton exato
const SkeletonCards = () => (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-16 rounded-2xl bg-zinc-800/50 animate-pulse" />
    ))}
  </div>
);

// Empty State para conversas
const EmptyConversas = () => (
  <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-zinc-700/60 text-zinc-400">
    Selecione uma instância para ver as conversas
  </div>
);

// Empty State para chat
const EmptyChat = () => (
  <div className="grid h-56 place-items-center rounded-2xl border border-dashed border-zinc-700/60 text-zinc-400">
    Selecione uma conversa para ver as mensagens
  </div>
);

// Função para formatar hora
const formatHour = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface ConversasViewPremiumProps {}

export function ConversasViewPremium({}: ConversasViewPremiumProps) {
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const controls = useAnimation();
  
  // Estados
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryModal, setSummaryModal] = useState<{ isOpen: boolean; data: any }>({
    isOpen: false,
    data: null
  });

  // Hooks de dados
  const { instances, loading: loadingInstances, error: errorInstances, refetch: refetchInstances } = useConversasInstances();
  const { conversas, loading: loadingConversas, error: errorConversas, refetch: refetchConversas, updateConversation } = useConversasList(selectedInstance);
  const { messages, loading: loadingMessages, error: errorMessages, refetch: refetchMessages, addMessage } = useConversaMessages(selectedConversation);

  // Realtime com animação de nova mensagem
  useConversasRealtime({
    onInstanceUpdate: refetchInstances,
    onConversationUpdate: (sessionId, data) => {
      updateConversation(sessionId, data);
    },
    onMessageUpdate: (sessionId, message) => {
      if (sessionId === selectedConversation) {
        addMessage(message);
        // Animação pop + glow para nova mensagem
        controls.start('highlight');
        setTimeout(() => controls.start('visible'), 250);
      }
    }
  });

  // Conversas filtradas por busca
  const filteredConversas = conversas.filter(conversa =>
    conversa.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conversa.leadPhone && conversa.leadPhone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Conversa atual
  const currentConversation = conversas.find(conv => conv.sessionId === selectedConversation);

  // Handlers
  const handleGenerateSummary = async (conversation: any) => {
    try {
      setSummaryModal({ isOpen: true, data: { loading: true } });

      const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/resumo_conversa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: conversation.sessionId,
          instancia: conversation.instancia,
          user_email: profile?.email || '',
          role: profile?.role || ''
        }),
      });

      const result = await response.json();
      const item = Array.isArray(result) ? result[0] : result;
      let summaryData;
      
      if (item && item.output) {
        summaryData = typeof item.output === 'string' ? JSON.parse(item.output) : item.output;
      } else {
        summaryData = item || result;
      }

      setSummaryModal({ isOpen: true, data: summaryData });
    } catch (error) {
      setSummaryModal({ isOpen: true, data: { error: true } });
    }
  };

  const handleFollowUp = async (conversation: any) => {
    try {
      await fetch('https://webhooklabz.n8nlabz.com.br/webhook/follow-up-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: conversation.sessionId,
          instancia: conversation.instancia,
          user_email: profile?.email || '',
          role: profile?.role || ''
        }),
      });

      toast({
        title: "Follow up solicitado",
        description: "Follow up solicitado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao solicitar follow up.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // Implementar envio de mensagem
    setMessageInput('');
  };

  const scrollToBottom = () => {
    setHasNewMessages(false);
    setIsAtBottom(true);
    // Implementar scroll
  };

  return (
    <div className="h-full p-3 md:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
        {/* Coluna 1: Instâncias WhatsApp */}
        <div className="lg:col-span-3 space-y-4">
          <div className="h-full bg-zinc-900/60 border border-zinc-700/60 rounded-2xl p-4">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Instâncias</h2>
              </div>
            </div>
            
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="space-y-3">
                {loadingInstances ? (
                  <SkeletonCards />
                ) : instances.length === 0 ? (
                  <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-zinc-700/60 text-zinc-400">
                    Nenhuma instância encontrada
                  </div>
                ) : (
                  instances.map((instance) => (
                    <div
                      key={instance.instancia}
                      className={`
                        group relative rounded-2xl border border-zinc-700/60 bg-zinc-900/60 p-3 shadow-lg transition
                        hover:-translate-y-0.5 hover:shadow-2xl cursor-pointer
                        ${selectedInstance === instance.instancia 
                          ? 'ring-2 ring-sky-500/40' 
                          : ''
                        }
                      `}
                      data-active={selectedInstance === instance.instancia}
                      onClick={() => setSelectedInstance(instance.instancia)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-green-400/30 to-emerald-400/30 text-sm font-medium text-white ring-1 ring-white/10">
                          {instance.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">
                            {instance.displayName}
                          </h3>
                          <span className="relative inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                            <span className="relative h-2 w-2">
                              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60"></span>
                              <span className="absolute inset-0 rounded-full bg-emerald-400"></span>
                            </span>
                            Ativa
                          </span>
                        </div>
                        <span className="ml-auto rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-200">
                          {instance.conversationCount}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Coluna 2: Lista de Conversas */}
        <div className="lg:col-span-4 space-y-4">
          <div className="h-full bg-zinc-900/60 border border-zinc-700/60 rounded-2xl p-4">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">Conversas</h2>
                <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-200">
                  {filteredConversas.length}
                </span>
              </div>
              
              {/* Input de Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-800/60 border-zinc-700/60 text-white placeholder-zinc-400 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50"
                />
              </div>
            </div>
            
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-3">
                {!selectedInstance ? (
                  <EmptyConversas />
                ) : loadingConversas ? (
                  <SkeletonCards />
                ) : filteredConversas.length === 0 ? (
                  <EmptyConversas />
                ) : (
                  filteredConversas.map((conversa) => (
                    <div
                      key={conversa.sessionId}
                      className={`
                        group relative flex gap-3 rounded-2xl border border-zinc-700/60 bg-zinc-900/60 p-3 shadow
                        transition hover:-translate-y-0.5 hover:shadow-2xl cursor-pointer
                        ${selectedConversation === conversa.sessionId
                          ? 'border-sky-500/30 bg-zinc-800/70'
                          : ''
                        }
                      `}
                      data-active={selectedConversation === conversa.sessionId}
                      onClick={() => setSelectedConversation(conversa.sessionId)}
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-400/30 to-sky-400/30 text-sm font-medium text-white ring-1 ring-white/10 group-hover:scale-[1.02] transition">
                        {conversa.displayName.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate">
                            {conversa.displayName === conversa.sessionId 
                              ? 'Aguardando nome do lead...'
                              : conversa.displayName
                            }
                          </h3>
                          <span className="text-[11px] text-zinc-500 ml-2">
                            {formatHour(conversa.lastMessageDate)}
                          </span>
                        </div>
                        
                        <p className="truncate text-xs text-zinc-400 group-hover:text-zinc-300 mb-2">
                          {conversa.lastMessageContent || 'Sem prévia de mensagem'}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {conversa.leadPhone && (
                              <span className="text-xs text-zinc-500">
                                {conversa.leadPhone.replace('@s.whatsapp.net', '')}
                              </span>
                            )}
                            
                            {conversa.leadPhone && conversa.leadStage && (
                              <span className="text-zinc-600">•</span>
                            )}
                            
                            {conversa.leadStage && (
                              <span className="rounded-full border border-white/10 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-300">
                                {conversa.leadStage}
                              </span>
                            )}
                          </div>
                          
                          <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-200">
                            {conversa.messageCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Coluna 3: Chat Aberto */}
        <div className="lg:col-span-5 space-y-4">
          <div className="h-full bg-zinc-900/60 border border-zinc-700/60 rounded-2xl p-4 flex flex-col">
            {!currentConversation ? (
              <EmptyChat />
            ) : (
              <>
                {/* Header Glass */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex items-center justify-between rounded-2xl border border-zinc-700/60 bg-zinc-900/60 p-3 shadow-xl"
                >
                  {/* Esquerda: avatar + nome + linha de apoio */}
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-400/30 to-sky-400/30 text-white ring-1 ring-white/10">
                      {currentConversation.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">
                        {currentConversation.displayName === currentConversation.sessionId 
                          ? "Aguardando nome do lead…" 
                          : currentConversation.displayName
                        }
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-400">
                        {currentConversation.leadPhone && (
                          <span>{currentConversation.leadPhone.replace('@s.whatsapp.net', '')}</span>
                        )}
                        {currentConversation.leadStage && (
                          <span className="rounded-full border border-white/10 bg-zinc-800/60 px-2 py-0.5">
                            {currentConversation.leadStage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Direita: menu ⋯ */}
                  <ConversationActionsMenu 
                    conversation={currentConversation}
                    onGenerateSummary={handleGenerateSummary}
                    onFollowUp={handleFollowUp}
                  />
                </motion.div>

                {/* Lista de mensagens com stagger real */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    {loadingMessages ? (
                      <div className="space-y-3 px-1.5 pb-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-16 rounded-2xl bg-zinc-800/50 animate-pulse" />
                        ))}
                      </div>
                    ) : errorMessages ? (
                      <EmptyChat />
                    ) : messages.length === 0 ? (
                      <EmptyChat />
                    ) : (
                      <AnimatePresence mode="popLayout">
                        <motion.div 
                          variants={list} 
                          initial="hidden" 
                          animate="visible" 
                          className="flex flex-col gap-2.5 px-1.5 pb-3"
                        >
                          {messages.map(m => (
                            <motion.div 
                              key={m.id} 
                              variants={bubble} 
                              layout
                              animate={controls}
                              className={m.message.type === 'ai'
                                ? "self-end max-w-[72ch] rounded-2xl bg-blue-600/90 px-3.5 py-3 text-white shadow"
                                : "max-w-[72ch] rounded-2xl bg-zinc-800/80 px-3.5 py-3 text-zinc-100 shadow"}
                            >
                              <div className="whitespace-pre-wrap break-words">
                                {m.message.content}
                              </div>
                              <div className={m.message.type === 'ai' 
                                ? "mt-1 text-right text-[11px] text-zinc-300" 
                                : "mt-1 text-left text-[11px] text-zinc-400"
                              }>
                                {formatHour(m.data)}
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </ScrollArea>
                </div>

                {/* Composer evidente */}
                <div className="mt-2 rounded-2xl border border-zinc-700/60 bg-zinc-900/60 p-2 shadow-xl">
                  <div className="flex items-end gap-2">
                    <button className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-800/60 text-zinc-400 hover:scale-[1.03] active:scale-95 transition">
                      <Paperclip className="h-4 w-4" />
                    </button>
                    
                    <Textarea
                      placeholder="Digite sua mensagem..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-[44px] max-h-[200px] w-full resize-none rounded-xl border border-zinc-700/60 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                      rows={1}
                    />
                    
                    <button 
                      className="ml-2 grid h-10 w-10 place-items-center rounded-xl bg-sky-600 text-white shadow hover:scale-[1.03] active:scale-95 transition"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Resumo */}
      <SummaryModalAnimated
        isOpen={summaryModal.isOpen}
        onClose={() => setSummaryModal({ isOpen: false, data: null })}
        summaryData={summaryModal.data}
      />
    </div>
  );
}
