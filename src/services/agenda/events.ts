import { z } from "zod";

// Tipagem compartilhada com AgendaView
export interface AgendaEvent {
	id: string | number;
	date: Date;
	client: string;
	property: string;
	address: string;
	type: string;
	status: string;
	corretor?: string;
}

const WebhookResponseSchema = z.any();

function toLocalMonthRange(reference: Date) {
	const year = reference.getFullYear();
	const month = reference.getMonth();
	const start = new Date(year, month, 1, 0, 1, 0, 0);
	const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

	const startIso = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString();
	const endIso = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString();

	return { start, end, startIso, endIso };
}

function parseGoogleDate(event: any): Date | null {
	try {
		if (event?.start?.dateTime) {
			return new Date(event.start.dateTime);
		}
		if (event?.start?.date) {
			return new Date(event.start.date + "T09:00:00");
		}
		return null;
	} catch {
		return null;
	}
}

function normalizeStatus(googleStatus: string | undefined): string {
	switch (googleStatus) {
		case "accepted":
			return "Confirmado";
		case "declined":
			return "Cancelado";
		case "tentative":
			return "Talvez";
		case "needsAction":
		default:
			return "Aguardando confirmação";
	}
}

function inferCorretor(event: any, fallbackAgenda?: string): string {
	let corretor = "Não informado";
	const sum = (event?.summary || "") as string;
	const desc = (event?.description || "") as string;
	const organizer = (event?.organizer?.displayName || "") as string;
	const all = `${sum} ${desc} ${organizer}`.toLowerCase();

	if (all.includes("isis")) corretor = "Isis";
	else if (all.includes("arthur")) corretor = "Arthur";
	else if (fallbackAgenda && fallbackAgenda !== "Todos") corretor = fallbackAgenda;

	return corretor;
}

// Converte um item do Google Calendar no nosso modelo de AgendaEvent
function mapWebhookItemToAgendaEvent(event: any, index: number, selectedAgenda?: string): AgendaEvent | null {
	const date = parseGoogleDate(event);
	if (!date) return null;

	const attendeeStatus: string | undefined = event?.attendees?.[0]?.responseStatus;
	const status = normalizeStatus(attendeeStatus);

	const location = (event?.location as string) || "Local não informado";
	const summary = (event?.summary as string) || "Compromisso";

	// Heurísticas simples para cliente e tipo
	let client = "Cliente não informado";
	let type = "Evento";

	const sumLower = summary.toLowerCase();
	if (sumLower.includes("visita")) type = "Visita";
	else if (sumLower.includes("avalia")) type = "Avaliação";
	else if (sumLower.includes("apresenta")) type = "Apresentação";
	else if (sumLower.includes("vistoria")) type = "Vistoria";

	// Cliente (heurística: depois de " - " ou entre parênteses)
	const dashIdx = summary.indexOf(" - ");
	if (dashIdx >= 0 && dashIdx < summary.length - 3) {
		client = summary.substring(dashIdx + 3).trim() || client;
	}

	const corretor = inferCorretor(event, selectedAgenda);

	return {
		id: event?.id || `event_${index + 1}`,
		date,
		client,
		property: summary,
		address: location,
		type,
		status,
		corretor: corretor === "Não informado" ? undefined : corretor
	};
}

export async function fetchAgendaMonth(reference: Date, selectedAgenda: string = "Todos"): Promise<AgendaEvent[]> {
	const { startIso, endIso } = toLocalMonthRange(reference);

	const body = {
		data_inicial: startIso,
		data_final: endIso,
		mes: reference.getMonth() + 1,
		ano: reference.getFullYear(),
		data_inicial_formatada: "",
		data_final_formatada: "",
		periodo: "",
		agenda: selectedAgenda
	};

	const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/ver-agenda', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
	const json = await response.json();
	const _ = WebhookResponseSchema.parse(json);

	const data = Array.isArray(json) ? json : [];
	const processed: AgendaEvent[] = data
		.map((item, idx) => mapWebhookItemToAgendaEvent(item, idx, selectedAgenda))
		.filter((e): e is AgendaEvent => Boolean(e));

	// validar campos essenciais
	return processed.filter(e => e.id && e.date && e.property);
}

// Função para buscar eventos da tabela oncall_events
async function fetchOncallEvents(startDate: Date, endDate: Date): Promise<AgendaEvent[]> {
	try {
		const { createClient } = await import('@supabase/supabase-js');
		
		// Usar as credenciais do ambiente
		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zldxpndslomjccbilowh.supabase.co';
		const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZHhwbmRzbG9tamdjaWJpbG93aCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0NTM5MjA5LCJleHAiOjIwNTAxMTUyMDl9.L8H1_YZVrAVInWiJoYL5c2VvEo32u-Zcnj3zUPbmYS0';
		
		const supabase = createClient(supabaseUrl, supabaseKey);
		
		// Primeiro, verificar se a tabela existe
		const { data: tableTest, error: tableError } = await supabase
			.from('oncall_events')
			.select('id')
			.limit(1);
			
		if (tableError) {
			console.warn('⚠️ Tabela oncall_events não existe no serviço, pulando busca...');
			return [];
		}

		const { data: events, error } = await supabase
			.from('oncall_events')
			.select(`
				id,
				title,
				description,
				starts_at,
				client_name,
				property_title,
				address,
				type,
				status
			`)
			.gte('starts_at', startDate.toISOString())
			.lte('starts_at', endDate.toISOString())
			.order('starts_at', { ascending: true });
		
		if (error) {
			console.error('❌ Erro ao buscar eventos da oncall_events:', error);
			return [];
		}
		
		const oncallEvents: AgendaEvent[] = events?.map(event => ({
			id: event.id,
			date: new Date(event.starts_at),
			client: event.client_name || 'Cliente não informado',
			property: event.property_title || event.title,
			address: event.address || 'Local não informado',
			type: event.type || 'Evento',
			status: normalizeStatus(event.status),
			corretor: 'Não informado' // Simplificado para evitar erro de JOIN
		})) || [];
		
		return oncallEvents;
	} catch (error) {
		console.error('❌ Erro ao carregar eventos locais:', error);
		return [];
	}
}

export async function fetchUpcomingFromAgenda(daysAhead: number = 7, limit: number = 5, selectedAgenda: string = "Todos"): Promise<AgendaEvent[]> {
	const now = new Date();
	const limitDate = new Date(now.getTime());
	limitDate.setDate(now.getDate() + daysAhead);

	// Buscar eventos do Google Calendar
	const monthEvents = await fetchAgendaMonth(now, selectedAgenda);
	
	// Buscar eventos locais da tabela oncall_events
	const oncallEvents = await fetchOncallEvents(now, limitDate);
	
	// Combinar e remover duplicatas
	const allEvents = [...monthEvents];
	
	oncallEvents.forEach(oncallEvent => {
		const isDuplicate = monthEvents.some(gcalEvent => 
			gcalEvent.id === oncallEvent.id ||
			(gcalEvent.client === oncallEvent.client && 
			 Math.abs(gcalEvent.date.getTime() - oncallEvent.date.getTime()) < 60000) // 1 minuto de tolerância
		);
		
		if (!isDuplicate) {
			allEvents.push(oncallEvent);
		}
	});

	return allEvents
		.filter(e => e.date >= now && e.date <= limitDate)
		.sort((a, b) => a.date.getTime() - b.date.getTime())
		.slice(0, limit);
}



