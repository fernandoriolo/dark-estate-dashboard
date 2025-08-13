import { useState, useEffect, useRef } from "react";
import { AppointmentCalendar } from "@/components/AppointmentCalendar";
import { AddEventModal } from "@/components/AddEventModal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { logAudit } from "@/lib/audit/logger";
import { useClients } from "@/hooks/useClients";

interface AgendaEvent {
  id: number;
  date: Date;
  client: string;
  property: string;
  address: string;
  type: string;
  status: string;
  corretor?: string; // Campo opcional para identificar o corretor
}

const mockEvents: AgendaEvent[] = [
  {
    id: 1,
    date: new Date(2025, 5, 20, 10, 0),
    client: "João Silva",
    property: "Apartamento Centro",
    address: "Rua das Flores, 123",
    type: "Visita",
    status: "confirmada",
    corretor: "Isis"
  },
  {
    id: 2,
    date: new Date(2025, 5, 20, 14, 30),
    client: "Maria Santos",
    property: "Casa Jardim América",
    address: "Av. Principal, 456",
    type: "Avaliação",
    status: "agendada",
    corretor: "Arthur"
  },
  {
    id: 3,
    date: new Date(2025, 5, 21, 9, 0),
    client: "Pedro Costa",
    property: "Sala Comercial",
    address: "Rua Comercial, 789",
    type: "Apresentação",
    status: "confirmada",
    corretor: "Isis"
  },
  {
    id: 4,
    date: new Date(2025, 5, 23, 16, 0),
    client: "Ana Oliveira",
    property: "Cobertura Vila Nova",
    address: "Rua das Palmeiras, 321",
    type: "Visita",
    status: "agendada",
    corretor: "Arthur"
  }
];

export function AgendaView() {
  const [events, setEvents] = useState<AgendaEvent[]>(mockEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Controlar mês atual
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState<string>("Todos"); // Nova agenda selecionada
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Buscar propriedades e clientes existentes
  const { properties } = useProperties();
  const { clients } = useClients();

  const fetchAgendaEvents = async (date: Date, isAutoUpdate = false) => {
    try {
      console.log('🔄 INICIANDO CHAMADA DO WEBHOOK PARA MÊS COMPLETO');
      console.log('📅 Mês de referência:', date.toLocaleDateString('pt-BR'));
      console.log('🔄 Tipo de atualização:', isAutoUpdate ? 'Automática (5s)' : 'Manual');
      
      // Só mostra loading para atualizações manuais
      if (!isAutoUpdate) {
        setLoading(true);
      }
      setError(null);

      // Calcular primeiro e último dia do mês
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Primeiro dia do mês às 00:01 (horário local)
      const dataInicial = new Date(year, month, 1, 0, 1, 0, 0);
      
      // Último dia do mês às 23:59 (horário local)
      const ultimoDiaDoMes = new Date(year, month + 1, 0).getDate();
      const dataFinal = new Date(year, month, ultimoDiaDoMes, 23, 59, 59, 999);
      
      // Converter para strings ISO mas mantendo o horário local
      const dataInicialFormatada = new Date(dataInicial.getTime() - (dataInicial.getTimezoneOffset() * 60000)).toISOString();
      const dataFinalFormatada = new Date(dataFinal.getTime() - (dataFinal.getTimezoneOffset() * 60000)).toISOString();

      const requestBody = {
        data_inicial: dataInicialFormatada,
        data_final: dataFinalFormatada,
        mes: month + 1, // Mês 1-12
        ano: year,
        data_inicial_formatada: dataInicial.toLocaleDateString('pt-BR') + ' 00:01',
        data_final_formatada: dataFinal.toLocaleDateString('pt-BR') + ' 23:59',
        periodo: `${dataInicial.toLocaleDateString('pt-BR')} até ${dataFinal.toLocaleDateString('pt-BR')}`,
        agenda: selectedAgenda // Adicionar agenda selecionada
      };

      console.log('📤 ENVIANDO REQUISIÇÃO PARA WEBHOOK (MÊS COMPLETO)');
      console.log('🌐 URL:', 'https://webhooklabz.n8nlabz.com.br/webhook/ver-agenda');
      console.log('📝 Method: POST');
      console.log('📅 Período:', requestBody.periodo);
      console.log('🕐 Data inicial:', requestBody.data_inicial);
      console.log('🕑 Data final:', requestBody.data_final);
      console.log('📋 Body completo:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/ver-agenda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 RESPOSTA RECEBIDA');
      console.log('✅ Status:', response.status);
      console.log('✅ Status Text:', response.statusText);

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ DADOS DA AGENDA RECEBIDOS:');
      console.log('📊 Resposta completa:', JSON.stringify(data, null, 2));

      // Processar os dados recebidos do Google Calendar
      let processedEvents: AgendaEvent[] = [];
      
      // Primeira filtragem: remover objetos vazios ou inválidos
      const cleanData = Array.isArray(data) ? data.filter(event => {
        // Verificar se é um objeto vazio {}
        if (!event || typeof event !== 'object') {
          console.log('🧹 Removido: objeto nulo ou não é objeto');
          return false;
        }
        
        // Verificar se tem propriedades
        const keys = Object.keys(event);
        if (keys.length === 0) {
          console.log('🧹 Removido: objeto vazio {}');
          return false;
        }
        
        // Verificar se tem dados essenciais do Google Calendar
        if (!event.summary && !event.start && !event.id) {
          console.log('🧹 Removido: evento sem dados essenciais do Google Calendar');
          return false;
        }
        
        return true;
      }) : [];
      
      if (Array.isArray(cleanData) && cleanData.length > 0) {
        console.log(`📋 Processando ${cleanData.length} eventos válidos do Google Calendar...`);
        processedEvents = cleanData.map((event: any, index: number) => {
          console.log('🔍 Processando evento bruto:', JSON.stringify(event, null, 2));
          
          // 1. Extrair horário (usar start.dateTime)
          const startDateTime = event.start?.dateTime || event.start?.date;
          const eventDate = startDateTime ? new Date(startDateTime) : new Date();
          
          // 2. Extrair summary e description
          const summary = event.summary || 'Evento sem título';
          const description = event.description || 'Descrição não disponível';
          
          // 3. Extrair cliente da description
          // Formato esperado: "...com o cliente [NOME]"
          const clientMatch = description.match(/com (?:o cliente |a cliente )?([^(\n\r]+?)(?:\s*\(|$)/i);
          const clientName = clientMatch ? clientMatch[1].trim() : 'Cliente não informado';
          
          // 4. Extrair tipo do evento da description
          let eventType = 'Reunião';
          const descLower = description.toLowerCase();
          if (descLower.includes('visita')) eventType = 'Visita';
          else if (descLower.includes('avaliação') || descLower.includes('avaliacao')) eventType = 'Avaliação';
          else if (descLower.includes('apresentação') || descLower.includes('apresentacao')) eventType = 'Apresentação';
          else if (descLower.includes('vistoria')) eventType = 'Vistoria';
          
          // 5. Extrair status dos attendees (responseStatus)
          let attendeeStatus = 'agendada';
          if (event.attendees && event.attendees.length > 0) {
            const responseStatus = event.attendees[0].responseStatus;
            switch (responseStatus) {
              case 'needsAction':
                attendeeStatus = 'Aguardando confirmação';
                break;
              case 'accepted':
                attendeeStatus = 'Confirmado';
                break;
              case 'declined':
                attendeeStatus = 'Recusado';
                break;
              case 'tentative':
                attendeeStatus = 'Talvez';
                break;
              default:
                attendeeStatus = 'Agendada';
            }
          }
          
          // 6. Extrair localização
          const location = event.location || 'Local não informado';
          
          // 7. Extrair corretor do evento (prioridade para displayName)
          let corretor = 'Não informado';
          
          // 1ª prioridade: Verificar displayName no creator
          if (event.creator?.displayName) {
            const displayName = event.creator.displayName.toLowerCase();
            if (displayName.includes('isis')) corretor = 'Isis';
            else if (displayName.includes('arthur')) corretor = 'Arthur';
            else corretor = event.creator.displayName; // Usar o nome como está se não for Isis/Arthur
          }
          
          // 2ª prioridade: Verificar displayName no organizer
          if (corretor === 'Não informado' && event.organizer?.displayName) {
            const displayName = event.organizer.displayName.toLowerCase();
            if (displayName.includes('isis')) corretor = 'Isis';
            else if (displayName.includes('arthur')) corretor = 'Arthur';
            else corretor = event.organizer.displayName; // Usar o nome como está se não for Isis/Arthur
          }
          
          // 3ª prioridade: Tentar extrair do email do creator/organizer
          if (corretor === 'Não informado' && event.creator?.email) {
            const email = event.creator.email.toLowerCase();
            if (email.includes('isis')) corretor = 'Isis';
            else if (email.includes('arthur')) corretor = 'Arthur';
          }
          
          // 4ª prioridade: Tentar extrair do email do organizer
          if (corretor === 'Não informado' && event.organizer?.email) {
            const email = event.organizer.email.toLowerCase();
            if (email.includes('isis')) corretor = 'Isis';
            else if (email.includes('arthur')) corretor = 'Arthur';
          }
          
          // 5ª prioridade: Tentar na description
          if (corretor === 'Não informado') {
            const descLower = description.toLowerCase();
            if (descLower.includes('isis')) corretor = 'Isis';
            else if (descLower.includes('arthur')) corretor = 'Arthur';
          }
          
          // 6ª prioridade: Se ainda não identificou e não está filtrando por agenda específica, 
          // usar a agenda selecionada como fallback
          if (corretor === 'Não informado' && selectedAgenda !== 'Todos') {
            corretor = selectedAgenda;
          }
          
          const processedEvent = {
            id: event.id || `event_${index + 1}`,
            date: eventDate,
            client: clientName,
            property: summary, // Usar o summary ao invés da description
            address: location,
            type: eventType,
            status: attendeeStatus,
            corretor: corretor
          };
          
          console.log('✅ Evento processado:', {
            horario: eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            cliente: clientName,
            summary: summary,
            description: description,
            status: attendeeStatus,
            location: location,
            corretor: corretor,
            creator_displayName: event.creator?.displayName,
            creator_email: event.creator?.email,
            organizer_displayName: event.organizer?.displayName,
            organizer_email: event.organizer?.email,
            processedEvent
          });
          
          return processedEvent;
        });
      } else if (data.events && Array.isArray(data.events)) {
        console.log('📋 Processando eventos dentro de data.events...');
        processedEvents = data.events.map((event: any, index: number) => {
          const summary = event.summary || 'Evento sem título';
          const startDateTime = event.start?.dateTime || event.start?.date;
          const eventDate = startDateTime ? new Date(startDateTime) : new Date();
          
          // Extrair corretor (prioridade para displayName)
          let corretor = 'Não informado';
          if (event.creator?.displayName) {
            const displayName = event.creator.displayName.toLowerCase();
            if (displayName.includes('isis')) corretor = 'Isis';
            else if (displayName.includes('arthur')) corretor = 'Arthur';
            else corretor = event.creator.displayName;
          } else if (event.creator?.email) {
            const email = event.creator.email.toLowerCase();
            if (email.includes('isis')) corretor = 'Isis';
            else if (email.includes('arthur')) corretor = 'Arthur';
          }
          
          return {
            id: event.id || `event_${index + 1}`,
            date: eventDate,
            client: event.creator?.email?.split('@')[0] || 'Cliente não informado',
            property: summary,
            address: 'Endereço será confirmado',
            type: 'Visita',
            status: event.status === 'confirmed' ? 'confirmada' : 'agendada',
            corretor: corretor
          };
        });
      } else {
        console.log('⚠️ Formato de resposta não reconhecido, usando dados mock');
      }

      // Validação final: filtrar eventos com dados válidos
      const validEvents = processedEvents.filter(event => {
        // Verificar se tem dados essenciais
        if (!event.id || !event.date || !event.client || !event.property) {
          console.log('🧹 Removido evento inválido:', event);
          return false;
        }
        
        // Verificar se os campos não são strings vazias
        if (typeof event.client === 'string' && event.client.trim() === '') {
          console.log('🧹 Removido evento com cliente vazio:', event);
          return false;
        }
        
        if (typeof event.property === 'string' && event.property.trim() === '') {
          console.log('🧹 Removido evento com propriedade vazia:', event);
          return false;
        }
        
        // Verificar se a data é válida
        if (!(event.date instanceof Date) || isNaN(event.date.getTime())) {
          console.log('🧹 Removido evento com data inválida:', event);
          return false;
        }
        
        return true;
      });

      if (validEvents.length > 0) {
        console.log(`🔄 ATUALIZANDO AGENDA com ${validEvents.length} eventos válidos do Google Calendar`);
        console.log(`🧹 Removidos ${processedEvents.length - validEvents.length} eventos inválidos`);
        setEvents(validEvents);
        setIsConnected(true);
        setLastUpdate(new Date());
        console.log('✅ SUCESSO - Eventos válidos do Google Calendar carregados na agenda!');
      } else {
        console.log('📭 Nenhum evento válido encontrado - limpando agenda');
        setEvents([]); // Limpar agenda se não há eventos válidos
        setIsConnected(true);
        setLastUpdate(new Date());
      }

    } catch (error) {
      console.log('⚠️ Webhook indisponível, mantendo dados de exemplo:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setIsConnected(false);
      // Manter os dados mock que já estão carregados
    } finally {
      setLoading(false);
    }
  };

  // UseEffect para carregamento inicial da agenda
  useEffect(() => {
    console.log('🚀 USE_EFFECT EXECUTADO! Carregando eventos do mês');
    console.log('📅 Mês/Ano:', `${currentMonth.getMonth() + 1}/${currentMonth.getFullYear()}`);
    console.log('👤 Agenda selecionada:', selectedAgenda);
    console.log('🕐 Timestamp:', new Date().toISOString());
    
    // Chamar o webhook para buscar todos os eventos do mês
    fetchAgendaEvents(currentMonth);
  }, [currentMonth, selectedAgenda]); // Executa quando currentMonth ou selectedAgenda mudar

  // UseEffect para atualização automática a cada 5 segundos enquanto estiver na agenda
  useEffect(() => {
    console.log('🔄 INICIANDO ATUALIZAÇÃO AUTOMÁTICA DA AGENDA (a cada 5 segundos)');
    
    // Limpar intervalo anterior se existir
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Configurar novo intervalo para atualizar a cada 5 segundos
    intervalRef.current = setInterval(() => {
      console.log('⏰ ATUALIZAÇÃO AUTOMÁTICA: Executando webhook da agenda...');
      console.log('📅 Mês atual:', `${currentMonth.getMonth() + 1}/${currentMonth.getFullYear()}`);
      
      // Chamar o webhook para o mês atual como atualização automática (sem loading)
      fetchAgendaEvents(currentMonth, true);
    }, 5000); // 5 segundos

    // Cleanup quando o componente for desmontado ou currentMonth mudar
    return () => {
      console.log('🛑 PARANDO ATUALIZAÇÃO AUTOMÁTICA DA AGENDA');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
      }, [currentMonth, selectedAgenda]); // Restart interval quando o mês ou agenda mudar

  const handleDateChange = (date: Date) => {
    console.log('📅 Data selecionada no calendário:', date.toLocaleDateString('pt-BR'));
    setSelectedDate(date);
    
    // Verificar se a data selecionada é de um mês diferente do atual
    const selectedMonth = date.getMonth();
    const selectedYear = date.getFullYear();
    const currentDisplayMonth = currentMonth.getMonth();
    const currentDisplayYear = currentMonth.getFullYear();
    
    if (selectedMonth !== currentDisplayMonth || selectedYear !== currentDisplayYear) {
      console.log('🔄 Data de mês diferente detectada - buscando eventos do novo mês');
      const newMonthDate = new Date(selectedYear, selectedMonth, 1);
      setCurrentMonth(newMonthDate);
      // Isto irá disparar o useEffect para buscar eventos do novo mês
    }
  };

  const handleMonthChange = (newMonth: Date) => {
    console.log('📅 Mudança de mês detectada:', newMonth.toLocaleDateString('pt-BR'));
    setCurrentMonth(new Date(newMonth.getFullYear(), newMonth.getMonth(), 1));
    // Isto irá disparar o useEffect para buscar eventos do novo mês
  };

  const handleAddEvent = async (eventData: {
    propertyId: string;
    clientId: string;
    email: string;
    date: Date;
    time: string;
    type: string;
    corretor: string;
  }) => {
    try {
      console.log('📝 Criando novo evento:', eventData);
      
      // Encontrar dados do imóvel e cliente selecionados
      const property = properties.find(p => p.id === eventData.propertyId);
      const client = clients.find(c => c.id === eventData.clientId);
      
      if (!property || !client) {
        throw new Error('Imóvel ou cliente não encontrado');
      }

      // Calcular data/hora de fim (1 hora depois do início)
      const endDateTime = new Date(eventData.date.getTime() + 60 * 60 * 1000);

      // Processar seleção do corretor
      let corretorAssignado = eventData.corretor;
      
      // Se selecionou "aleatorio", escolher automaticamente entre Isis e Arthur
      if (eventData.corretor === 'aleatorio') {
        const corretores = ['Isis', 'Arthur'];
        corretorAssignado = corretores[Math.floor(Math.random() * corretores.length)];
        console.log(`🎲 Corretor atribuído automaticamente: ${corretorAssignado}`);
      } else {
        console.log(`👤 Corretor selecionado manualmente: ${corretorAssignado}`);
      }

      // Preparar payload para o webhook
      const webhookPayload = {
        summary: `${eventData.type} ao ${property.title}`,
        description: `${eventData.type} agendada para o imóvel ${property.title} (${property.address}) com o cliente ${client.name}. Corretor responsável: ${corretorAssignado}`,
        start: {
          dateTime: eventData.date.toISOString(),
          timeZone: 'America/Sao_Paulo'
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Sao_Paulo'
        },
        attendees: [
          { 
            email: eventData.email,
            displayName: client.name
          }
        ],
        location: property.address,
        // Dados adicionais para contexto
        imovel: {
          id: property.id,
          titulo: property.title,
          endereco: property.address,
          preco: property.price
        },
        cliente: {
          id: client.id,
          nome: client.name,
          email: eventData.email,
          telefone: client.phone
        },
        corretor: {
          nome: corretorAssignado,
          selecionado_como: eventData.corretor, // "aleatorio", "Isis", ou "Arthur"
          atribuido_automaticamente: eventData.corretor === 'aleatorio'
        },
        tipo_evento: eventData.type,
        data_evento: eventData.date.toISOString(),
        hora_evento: eventData.time
      };

      console.log('📤 ENVIANDO EVENTO PARA WEBHOOK');
      console.log('🌐 URL:', 'https://webhooklabz.n8nlabz.com.br/webhook/criar_evento');
      console.log('📝 Method: POST');
      console.log('📋 Payload:', JSON.stringify(webhookPayload, null, 2));

      // Chamar o webhook para criar o evento
      const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/criar_evento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      console.log('📡 RESPOSTA DO WEBHOOK');
      console.log('✅ Status:', response.status);
      console.log('✅ Status Text:', response.statusText);

      if (!response.ok) {
        throw new Error(`Erro ao criar evento: ${response.status} - ${response.statusText}`);
      }

      const responseData = await response.json();
      try { await logAudit({ action: 'agenda.event_created', resource: 'agenda_event', resourceId: undefined, meta: { summary: webhookPayload.summary, date: webhookPayload.start.dateTime } }); } catch {}
      console.log('✅ EVENTO CRIADO COM SUCESSO NO GOOGLE CALENDAR');
      console.log('📊 Resposta:', JSON.stringify(responseData, null, 2));

      // Criar o evento localmente após sucesso do webhook
      const newEvent: AgendaEvent = {
        id: responseData.id || Date.now(), // Usar ID do Google Calendar se disponível
        date: eventData.date,
        client: client.name,
        property: property.title,
        address: property.address,
        type: eventData.type,
        status: 'confirmada', // Confirmada porque foi criada no Google Calendar
        corretor: corretorAssignado // Usar o corretor efetivamente atribuído
      };

      // Adicionar o evento localmente
      setEvents(prevEvents => [...prevEvents, newEvent]);

      console.log('✅ Evento adicionado à agenda local:', newEvent);

    } catch (error) {
      console.error('❌ Erro ao criar evento:', error);
      
      // Se o webhook falhar, ainda assim criar localmente como backup
      const property = properties.find(p => p.id === eventData.propertyId);
      const client = clients.find(c => c.id === eventData.clientId);
      
      if (property && client) {
        // Processar corretor para backup também
        let corretorBackup = eventData.corretor;
        if (eventData.corretor === 'aleatorio') {
          const corretores = ['Isis', 'Arthur'];
          corretorBackup = corretores[Math.floor(Math.random() * corretores.length)];
        }

        const backupEvent: AgendaEvent = {
          id: Date.now(),
          date: eventData.date,
          client: client.name,
          property: property.title,
          address: property.address,
          type: eventData.type,
          status: 'agendada', // Status diferente para indicar que não foi sincronizado
          corretor: corretorBackup // Usar o corretor processado
        };
        
        setEvents(prevEvents => [...prevEvents, backupEvent]);
        console.log('⚠️ Evento criado localmente como backup:', backupEvent);
      }
      
      throw error;
    }
  };

  // Sempre mostrar a agenda, mesmo com erro ou carregando

  // Função para calcular estatísticas
  const getEventStats = () => {
    const today = new Date();
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayEvents = events.filter(e => e.date.toDateString() === today.toDateString());
    const weekEvents = events.filter(e => e.date >= thisWeek);
    const monthEvents = events.filter(e => e.date >= thisMonth);
    const confirmedEvents = events.filter(e => e.status === 'confirmada' || e.status === 'Confirmado');

    return {
      today: todayEvents.length,
      thisWeek: weekEvents.length,
      thisMonth: monthEvents.length,
      confirmed: confirmedEvents.length,
      total: events.length
    };
  };

  const stats = getEventStats();

  return (
    <div className="space-y-8">
      {/* Header Modernizado */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 border border-blue-500/20">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">
                Agenda Inteligente
              </h1>
              {loading && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              )}
            </div>
            
            <p className="text-gray-300 mb-4">
              Gerencie seus agendamentos e compromissos de forma inteligente
            </p>

            {/* Status da conexão */}
            <div className="flex items-center gap-4 text-sm">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                isConnected ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400' : 'bg-orange-400'
                } animate-pulse`}></div>
                {isConnected ? 'Online' : 'Offline'}
              </div>
              
              {lastUpdate && (
                <span className="text-gray-400">
                  Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
          </div>
          
          <Button 
            onClick={() => setIsAddEventModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Dashboard de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <p className="text-blue-300 text-sm font-medium">Hoje</p>
              <p className="text-2xl font-bold text-white">{stats.today}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="text-green-300 text-sm font-medium">Esta Semana</p>
              <p className="text-2xl font-bold text-white">{stats.thisWeek}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <span className="text-2xl">🗓️</span>
            </div>
            <div>
              <p className="text-purple-300 text-sm font-medium">Este Mês</p>
              <p className="text-2xl font-bold text-white">{stats.thisMonth}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <p className="text-emerald-300 text-sm font-medium">Confirmados</p>
              <p className="text-2xl font-bold text-white">{stats.confirmed}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/20 p-2 rounded-lg">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <p className="text-orange-300 text-sm font-medium">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros Modernizados */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <span className="text-2xl">🎛️</span>
            Filtros da Agenda
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAgendaEvents(currentMonth)}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
          >
            🔄 Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Seletor de Corretor */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Corretor</label>
            <Select value={selectedAgenda} onValueChange={setSelectedAgenda}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 transition-colors">
                <SelectValue placeholder="Selecione o corretor" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="Todos" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span>Todos os corretores</span>
                  </div>
                </SelectItem>
                <SelectItem value="Isis" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👩‍💼</span>
                    <span>Isis</span>
                  </div>
                </SelectItem>
                <SelectItem value="Arthur" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨‍💼</span>
                    <span>Arthur</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Indicador visual */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Status</label>
            <div className="flex items-center gap-2 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                selectedAgenda === 'Todos' ? 'bg-blue-500' :
                selectedAgenda === 'Isis' ? 'bg-pink-500' :
                selectedAgenda === 'Arthur' ? 'bg-indigo-500' : 'bg-gray-500'
              }`}></div>
              <span className="text-sm text-gray-300">
                {selectedAgenda === 'Todos' 
                  ? `Visualizando todos (${events.length} eventos)` 
                  : `Agenda da ${selectedAgenda} (${events.filter(e => e.corretor === selectedAgenda).length} eventos)`
                }
              </span>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Ações Rápidas</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 flex-1"
              >
                🌅 Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow);
                }}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 flex-1"
              >
                🌄 Amanhã
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendário Principal */}
      <AppointmentCalendar 
        appointments={events} 
        onDateChange={handleDateChange}
        onMonthChange={handleMonthChange}
        selectedDate={selectedDate}
        currentMonth={currentMonth}
        selectedAgenda={selectedAgenda}
      />

      {/* Modal de Adicionar Evento */}
      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        properties={properties || []}
        clients={clients || []}
        onSubmit={handleAddEvent}
      />
    </div>
  );
} 