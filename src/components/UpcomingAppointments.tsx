import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, MapPin, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

interface AgendaEvent {
  id: number;
  date: Date;
  client: string;
  property: string;
  address: string;
  type: string;
  status: string;
  corretor?: string;
}

interface UpcomingAppointmentsProps {
  onViewAll?: () => void;
}

export function UpcomingAppointments({ onViewAll }: UpcomingAppointmentsProps) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar eventos da agenda
  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar eventos dos próximos 7 dias
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      // Converter para strings ISO
      const dataInicial = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString();
      const dataFinal = new Date(nextWeek.getTime() - (nextWeek.getTimezoneOffset() * 60000)).toISOString();

      const requestBody = {
        data_inicial: dataInicial,
        data_final: dataFinal,
        periodo: `${today.toLocaleDateString('pt-BR')} até ${nextWeek.toLocaleDateString('pt-BR')}`,
        agenda: "Todos"
      };

      console.log("📅 Buscando próximos compromissos:", requestBody);

      const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/ver-agenda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Próximos compromissos recebidos:", data);

      // Processar eventos (similar ao AgendaView)
      const cleanData = Array.isArray(data) ? data.filter(event => {
        return event && typeof event === 'object' && Object.keys(event).length > 0;
      }) : [];

      let processedEvents: AgendaEvent[] = [];

      if (cleanData.length > 0) {
        processedEvents = cleanData.map((event: any, index: number) => {
          // Extrair dados do evento
          const startDateTime = event.start?.dateTime || event.start?.date;
          const eventDate = startDateTime ? new Date(startDateTime) : new Date();
          
          const summary = event.summary || 'Evento sem título';
          const description = event.description || 'Descrição não disponível';
          
          // Extrair cliente
          const clientMatch = description.match(/com (?:o cliente |a cliente )?([^(\n\r]+?)(?:\s*\(|$)/i);
          const clientName = clientMatch ? clientMatch[1].trim() : 'Cliente não informado';
          
          // Extrair tipo
          let eventType = 'Reunião';
          const descLower = description.toLowerCase();
          if (descLower.includes('visita')) eventType = 'Visita';
          else if (descLower.includes('avaliação') || descLower.includes('avaliacao')) eventType = 'Avaliação';
          else if (descLower.includes('apresentação') || descLower.includes('apresentacao')) eventType = 'Apresentação';
          else if (descLower.includes('vistoria')) eventType = 'Vistoria';
          
          // Status
          let status = 'Aguardando confirmação';
          if (event.attendees && event.attendees.length > 0) {
            const firstAttendee = event.attendees[0];
            switch (firstAttendee.responseStatus) {
              case 'accepted': status = 'Confirmado'; break;
              case 'declined': status = 'Cancelado'; break;
              case 'tentative': status = 'Talvez'; break;
            }
          }

          // Extrair corretor
          const corretorMatch = description.match(/corretor[:\s]*([^(\n\r]+?)(?:\s*\(|$)/i);
          const corretor = corretorMatch ? corretorMatch[1].trim() : undefined;

          return {
            id: event.id ? parseInt(event.id.replace(/\D/g, '')) || (index + 1) : (index + 1),
            date: eventDate,
            client: clientName,
            property: summary.replace(/^(Visita|Avaliação|Apresentação|Vistoria)\s*-?\s*/i, '').trim() || 'Imóvel não especificado',
            address: event.location || 'Local não informado',
            type: eventType,
            status: status,
            corretor: corretor
          };
        });

        // Filtrar eventos futuros e ordenar por data
        const now = new Date();
        processedEvents = processedEvents
          .filter(event => event.date > now)
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(0, 5); // Mostrar apenas os próximos 5
      }

      setEvents(processedEvents);
      
    } catch (error) {
      console.error("❌ Erro ao buscar próximos compromissos:", error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      // Usar dados mock em caso de erro
      setEvents([
        {
          id: 1,
          date: new Date(Date.now() + 2 * 60 * 60 * 1000), // Em 2 horas
          client: "João Silva",
          property: "Apartamento Centro",
          address: "Rua das Flores, 123",
          type: "Visita",
          status: "Confirmado",
          corretor: "Isis"
        },
        {
          id: 2,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Amanhã
          client: "Maria Santos",
          property: "Casa Jardim América", 
          address: "Av. Principal, 456",
          type: "Avaliação",
          status: "Aguardando confirmação",
          corretor: "Arthur"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingEvents();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchUpcomingEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Função para determinar se o compromisso é urgente (próximas 2 horas)
  const isUrgent = (date: Date) => {
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 2 && diffHours > 0;
  };

  // Função para formatar tempo relativo
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `em ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `em ${Math.floor(diffHours)}h`;
    } else if (diffDays < 7) {
      return `em ${Math.floor(diffDays)} dia${diffDays >= 2 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado': return 'text-green-400';
      case 'Aguardando confirmação': return 'text-yellow-400';
      case 'Cancelado': return 'text-red-400';
      case 'Talvez': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confirmado': return <CheckCircle2 className="h-3 w-3" />;
      case 'Aguardando confirmação': return <Clock className="h-3 w-3" />;
      case 'Cancelado': return <AlertCircle className="h-3 w-3" />;
      case 'Talvez': return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-400" />
          Próximos Compromissos
        </CardTitle>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 h-8 px-3"
          >
            Ver todos
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-700/30 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 text-sm mb-2">Erro ao carregar compromissos</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUpcomingEvents}
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              Tentar novamente
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-3 opacity-50" />
            <p className="text-gray-400 text-sm mb-2">Nenhum compromisso próximo</p>
            <p className="text-gray-500 text-xs">Que tal agendar uma nova visita?</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg border transition-all duration-200 hover:border-gray-500/60 ${
                  isUrgent(event.date)
                    ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15'
                    : 'bg-gray-700/30 border-gray-600/40 hover:bg-gray-700/50'
                }`}
              >
                {/* Header com horário e status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${isUrgent(event.date) ? 'text-orange-400' : 'text-blue-400'}`} />
                    <span className={`text-sm font-medium ${isUrgent(event.date) ? 'text-orange-300' : 'text-white'}`}>
                      {event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs text-gray-400">
                      {getRelativeTime(event.date)}
                    </span>
                    {isUrgent(event.date) && (
                      <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-300 rounded-full">
                        Urgente
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${getStatusColor(event.status)}`}>
                    {getStatusIcon(event.status)}
                    <span className="hidden sm:inline">{event.status}</span>
                  </div>
                </div>

                {/* Informações do evento */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span className="text-white text-sm font-medium truncate">{event.client}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      event.type === 'Visita' ? 'bg-blue-500/20 text-blue-300' :
                      event.type === 'Avaliação' ? 'bg-purple-500/20 text-purple-300' :
                      event.type === 'Apresentação' ? 'bg-orange-500/20 text-orange-300' :
                      event.type === 'Vistoria' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {event.type}
                    </div>
                    <span className="text-gray-300 text-sm truncate">{event.property}</span>
                  </div>
                  {event.corretor && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        event.corretor === 'Isis' ? 'bg-pink-500/20 text-pink-300' :
                        event.corretor === 'Arthur' ? 'bg-indigo-500/20 text-indigo-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {event.corretor === 'Isis' ? '👩‍💼' : event.corretor === 'Arthur' ? '👨‍💼' : '👤'} {event.corretor}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 