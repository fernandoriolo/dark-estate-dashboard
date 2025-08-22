/**
 * Componente de teste para validar nova arquitetura baseada em imobipro_messages
 * Para ser usado temporariamente durante a migração
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, User, Send, RefreshCw } from 'lucide-react';
import { useImobiproChats } from '@/hooks/useImobiproChats';
import { cn } from '@/lib/utils';

export function ImobiproChatsTest() {
  const [messageInput, setMessageInput] = useState('');

  const {
    // Estado
    loading,
    instanciasLoading,
    conversasLoading,
    mensagensLoading,
    error,
    instancias,
    conversas,
    mensagens,
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

  // Handler para enviar mensagem
  const handleSendMessage = async () => {
    if (!selectedSession || !messageInput.trim()) return;

    const success = await sendMessage(selectedSession, messageInput);
    if (success) {
      setMessageInput('');
    }
  };

  return (
    <div className="h-screen bg-gray-50 p-4">
      {/* Header com controles */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Teste Nova Arquitetura - Imobipro Chats
          </h1>
          <p className="text-sm text-gray-600">
            Validação da arquitetura baseada em imobipro_messages
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={refreshData}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Atualizar
          </Button>
          
          {error && (
            <Badge variant="destructive" className="text-xs">
              Erro: {error}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid h-[calc(100vh-120px)] grid-cols-3 gap-4">
        {/* 1ª COLUNA - INSTÂNCIAS/CORRETORES */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Instâncias/Corretores ({instancias.length})
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0">
            {instanciasLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-y-auto h-full">
                {instancias.map((inst) => (
                  <div
                    key={inst.instancia}
                    onClick={() => setSelectedInstancia(inst.instancia)}
                    className={cn(
                      "p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors",
                      selectedInstancia === inst.instancia && "bg-blue-50 border-blue-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {inst.instance_display_name}
                          </p>
                          {inst.is_sdr && (
                            <Badge variant="secondary" className="text-xs">
                              SDR
                            </Badge>
                          )}
                        </div>
                        
                        {inst.corretor_nome && (
                          <p className="text-xs text-gray-500 truncate">
                            {inst.corretor_nome}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {inst.total_conversas} conversas
                          </Badge>
                          
                          {inst.status && (
                            <Badge 
                              variant={inst.is_active ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {inst.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2ª COLUNA - CONVERSAS */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversas ({conversas.length})
            </CardTitle>
            
            {selectedInstancia && (
              <div className="mt-2">
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0">
            {!selectedInstancia ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                Selecione uma instância
              </div>
            ) : conversasLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-y-auto h-full">
                {conversas.map((conv) => (
                  <div
                    key={conv.session_id}
                    onClick={() => setSelectedSession(conv.session_id)}
                    className={cn(
                      "p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors",
                      selectedSession === conv.session_id && "bg-blue-50 border-blue-200"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conv.cliente_nome || 'Cliente'}
                        </p>
                        
                        {conv.ultimo_mensagem && (
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {conv.ultima_mensagem}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {conv.total_mensagens} msgs
                          </Badge>
                          
                          <span className="text-xs text-gray-500">
                            {new Date(conv.ultima_mensagem_time).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3ª COLUNA - MENSAGENS */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Mensagens ({mensagens.length})
            </CardTitle>
            
            {selectedSession && (
              <p className="text-xs text-gray-500 truncate">
                Sessão: {selectedSession}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
            {!selectedSession ? (
              <div className="flex items-center justify-center flex-1 text-sm text-gray-500">
                Selecione uma conversa
              </div>
            ) : mensagensLoading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {mensagens.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.is_from_client ? "justify-start" : "justify-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3 text-sm",
                          msg.is_from_client
                            ? "bg-gray-100 text-gray-900"
                            : "bg-blue-500 text-white"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={cn(
                              "text-xs",
                              msg.is_from_client ? "text-gray-500" : "text-blue-100"
                            )}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString('pt-BR')}
                          </span>
                          
                          <Badge 
                            variant={msg.is_from_client ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {msg.is_from_client ? "Cliente" : "AI/Corretor"}
                          </Badge>
                          
                          {msg.has_tool_calls && (
                            <Badge variant="warning" className="text-xs">
                              Tool
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input de mensagem */}
                <div className="border-t p-3">
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
                      className="flex-1 text-sm"
                    />
                    
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}