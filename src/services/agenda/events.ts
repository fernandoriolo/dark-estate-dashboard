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

export async function fetchUpcomingFromAgenda(daysAhead: number = 7, limit: number = 5, selectedAgenda: string = "Todos"): Promise<AgendaEvent[]> {
	const now = new Date();
	const monthEvents = await fetchAgendaMonth(now, selectedAgenda);
	const limitDate = new Date(now.getTime());
	limitDate.setDate(now.getDate() + daysAhead);

	return monthEvents
		.filter(e => e.date >= now && e.date <= limitDate)
		.sort((a, b) => a.date.getTime() - b.date.getTime())
		.slice(0, limit);
}



