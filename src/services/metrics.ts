import { supabase } from "@/integrations/supabase/client";
import { monthKey, monthLabel } from "@/lib/charts/formatters";
import { normalizePropertyType } from "@/lib/charts/normalizers";

export type VgvPeriod = 'todo' | 'anual' | 'mensal' | 'semanal' | 'diario';

export async function fetchVgvMensalUltimos12Meses() {
	return fetchVgvByPeriod('mensal');
}

export async function fetchVgvByPeriod(period: VgvPeriod = 'mensal') {
	const now = new Date();
	let start: Date;
	let groupBy: string;
	let dateFormat: (d: Date) => string;
	let periods: number;

	switch (period) {
		case 'todo':
			start = new Date(2020, 0, 1); // Início histórico
			groupBy = 'year';
			dateFormat = (d: Date) => d.getFullYear().toString();
			periods = now.getFullYear() - 2020 + 1;
			break;
		case 'anual':
			start = new Date(now.getFullYear() - 4, 0, 1); // 5 anos
			groupBy = 'year';
			dateFormat = (d: Date) => d.getFullYear().toString();
			periods = 5;
			break;
		case 'semanal':
			start = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // 12 semanas
			groupBy = 'week';
			dateFormat = (d: Date) => {
				const week = Math.floor((d.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
				return `S${week + 1}`;
			};
			periods = 12;
			break;
		case 'diario':
			start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 dias
			groupBy = 'day';
			dateFormat = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
			periods = 30;
			break;
		default: // mensal
			start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
			groupBy = 'month';
			dateFormat = (d: Date) => monthKey(d);
			periods = 12;
	}

	const { data, error } = await supabase
		.from('vw_segura_metricas_vgv_mensal')
		.select('mes, soma_vgv, total_contratos')
		.gte('mes', start.toISOString())
		.order('mes', { ascending: true });

	if (error) throw error;

	const byPeriod = new Map<string, { vgv: number; qtd: number }>();
	
	// Inicializar períodos
	for (let i = 0; i < periods; i++) {
		let d: Date;
		if (groupBy === 'month') {
			d = new Date(start.getFullYear(), start.getMonth() + i, 1);
		} else if (groupBy === 'year') {
			d = new Date(start.getFullYear() + i, 0, 1);
		} else if (groupBy === 'week') {
			d = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
		} else { // day
			d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
		}
		byPeriod.set(dateFormat(d), { vgv: 0, qtd: 0 });
	}

	// Processar dados
	(data || []).forEach((r: any) => {
		const d = new Date(r.mes as any);
		const k = dateFormat(d);
		const cur = byPeriod.get(k);
		if (!cur) return;
		cur.vgv += Number(r.soma_vgv || 0);
		cur.qtd += Number(r.total_contratos || 0);
	});

	return Array.from(byPeriod.entries()).map(([k, v]) => ({ month: k, ...v }));
}

export async function fetchLeadsPorCanalTop8() {
	const { data, error } = await supabase
		.from('vw_chart_leads_por_canal')
		.select('canal_bucket, total');
	if (error) throw error;
	return (data || [])
		.map((r: any) => ({ name: r.canal_bucket as string, value: Number(r.total || 0) }))
		.sort((a, b) => b.value - a.value);
}

export async function fetchDistribuicaoPorTipo() {
	const { data, error } = await supabase
		.from('vw_chart_distribuicao_tipo_imovel')
		.select('tipo_imovel, total');
	if (error) throw error;
	const counts: Record<string, number> = {};
	(data || []).forEach((r: any) => {
		const key = normalizePropertyType(r?.tipo_imovel || '');
		counts[key] = (counts[key] || 0) + Number(r.total || 0);
	});
	return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
}

export async function fetchFunilLeads() {
	const { data, error } = await supabase
		.from('vw_chart_funil_leads')
		.select('estagio, total');
	if (error) throw error;
	
	// Ordenar pelo fluxo lógico do funil de vendas
	const stageOrder = ['Novo Lead', 'Visita Agendada', 'Em Negociação', 'Fechamento'];
	const stageMap = new Map(data.map((r: any) => [r.estagio, Number(r.total || 0)]));
	
	return stageOrder.map(stage => ({
		name: stage,
		value: stageMap.get(stage) || 0
	})).filter(item => item.value > 0);
}

export async function fetchLeadsPorCorretor() {
	const { data, error } = await supabase
		.from('vw_chart_leads_por_corretor')
		.select('corretor_nome, total_leads')
		.order('total_leads', { ascending: false });
	if (error) throw error;
	return (data || []).map((r: any) => ({ 
		name: r.corretor_nome || 'Sem corretor', 
		value: Number(r.total_leads || 0) 
	}));
}

export async function fetchLeadsSemCorretor(): Promise<number> {
	try {
		const { count, error } = await supabase
			.from('leads')
			.select('*', { count: 'exact', head: true })
			.is('id_corretor_responsavel', null);

		if (error) {
			console.error('Erro ao buscar leads sem corretor:', error);
			return 0;
		}

		return count || 0;
	} catch (error) {
		console.error('Erro na consulta de leads sem corretor:', error);
		return 0;
	}
}

export async function fetchLeadsCorretorEstagio() {
	const { data, error } = await supabase
		.from('vw_chart_leads_corretor_estagio')
		.select('corretor_nome, estagio, total');
	if (error) throw error;
	
	// Agrupar dados por corretor
	const brokerMap = new Map<string, Record<string, number>>();
	
	(data || []).forEach((row: any) => {
		const broker = row.corretor_nome || 'Sem corretor';
		const stage = row.estagio || 'Não informado';
		const count = Number(row.total || 0);
		
		if (!brokerMap.has(broker)) {
			brokerMap.set(broker, {});
		}
		brokerMap.get(broker)![stage] = count;
	});
	
	return brokerMap;
}

export async function fetchHeatmapAtividades() {
	const { data, error } = await supabase
		.from('vw_chart_mapa_calor_atividade')
		.select('dia_semana, hora, total');
	if (error) throw error;
	const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
	(data || []).forEach((r: any) => {
		const dow: number = Number(r.dia_semana);
		const hour: number = Number(r.hora);
		// Postgres: 0=Dom ... 6=Sáb; UI: 0=Seg ... 6=Dom
		const day = dow === 0 ? 6 : dow - 1;
		if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
			grid[day][hour] = Number(r.total || 0);
		}
	});
	return grid; // [day][hour]
}

/**
 * Busca dados de conversas dos corretores para o heatmap
 * Baseado em timestamps reais das mensagens WhatsApp (from_me = true)
 * Relacionamento: whatsapp_messages -> whatsapp_instances -> user_profiles
 * @returns Matriz 7x24 (dias da semana x horas) com total de mensagens enviadas pelos corretores
 */
export async function fetchHeatmapConversas() {
	// TEMPORÁRIO: Usando view base para desenvolvimento (sem RLS)
	// TODO: Voltar para vw_segura_heatmap_conversas_corretores quando autenticação estiver funcionando
	const { data, error } = await supabase
		.from('vw_metricas_heatmap_conversas_corretores')
		.select('dia_semana, hora, total_mensagens');
	
	if (error) {
		console.error('Erro ao buscar dados de conversas:', error);
		throw error;
	}
	
	// Debug removido - implementação em produção
	
	// Matriz 7x24: [dia][hora] onde dia 0=Segunda, 6=Domingo
	const grid: number[][] = Array.from({ length: 7 }, () => 
		Array.from({ length: 24 }, () => 0)
	);
	
	// Agrupar dados por dia/hora (view base pode ter múltiplos usuários)
	const grouped = new Map<string, number>();
	
	(data || []).forEach((r: any) => {
		const dow: number = Number(r.dia_semana);
		const hour: number = Number(r.hora);
		const key = `${dow}-${hour}`;
		
		const current = grouped.get(key) || 0;
		grouped.set(key, current + Number(r.total_mensagens || 0));
	});
	
	// Preencher a matriz com os dados agrupados
	grouped.forEach((total, key) => {
		const [dowStr, hourStr] = key.split('-');
		const dow = Number(dowStr);
		const hour = Number(hourStr);
		
		// Converter: Postgres 0=Dom...6=Sáb → UI 0=Seg...6=Dom
		const day = dow === 0 ? 6 : dow - 1;
		
		if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
			grid[day][hour] = total;
		}
	});
	
	// Implementação completa - logs removidos
	
	return grid; // [day][hour] - mensagens dos corretores (timestamp real)
}

/**
 * Busca lista de corretores (role='corretor') que têm conversas no WhatsApp
 * Para popular o filtro do heatmap
 */
export async function fetchCorretoresComConversas() {
	// Primeiro, buscar apenas usuários com role 'corretor'
	const { data: brokers, error: brokersError } = await supabase
		.from('user_profiles')
		.select('id, full_name, email')
		.eq('role', 'corretor')
		.order('full_name');
	
	if (brokersError) {
		console.error('Erro ao buscar corretores:', brokersError);
		throw brokersError;
	}
	
	if (!brokers || brokers.length === 0) return [];
	
	// Verificar quais corretores têm conversas
	const brokerIds = brokers.map(b => b.id);
	
	const { data: conversas, error: conversasError } = await supabase
		.from('vw_metricas_heatmap_conversas_corretores')
		.select('user_id')
		.in('user_id', brokerIds);
	
	if (conversasError) {
		console.error('Erro ao verificar conversas dos corretores:', conversasError);
		throw conversasError;
	}
	
	// Filtrar apenas corretores que têm conversas
	const brokersWithConversations = [...new Set((conversas || []).map(c => c.user_id))];
	
	return brokers
		.filter(broker => brokersWithConversations.includes(broker.id))
		.map(p => ({
			id: p.id,
			name: p.full_name || p.email || 'Corretor sem nome'
		}));
}

/**
 * Busca dados de conversas filtrados por corretor específico
 */
export async function fetchHeatmapConversasPorCorretor(brokerId?: string) {
	if (!brokerId) {
		// Se não há filtro, usar função original
		return fetchHeatmapConversas();
	}
	
	const { data, error } = await supabase
		.from('vw_metricas_heatmap_conversas_corretores')
		.select('dia_semana, hora, total_mensagens')
		.eq('user_id', brokerId);
	
	if (error) {
		console.error('Erro ao buscar dados de conversas por corretor:', error);
		throw error;
	}
	
	// Filtro por corretor implementado
	
	// Matriz 7x24: [dia][hora] onde dia 0=Segunda, 6=Domingo
	const grid: number[][] = Array.from({ length: 7 }, () => 
		Array.from({ length: 24 }, () => 0)
	);
	
	// Processar dados diretamente (já filtrados por corretor)
	(data || []).forEach((r: any) => {
		const dow: number = Number(r.dia_semana);
		const hour: number = Number(r.hora);
		
		// Converter: Postgres 0=Dom...6=Sáb → UI 0=Seg...6=Dom
		const day = dow === 0 ? 6 : dow - 1;
		
		if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
			grid[day][hour] = Number(r.total_mensagens || 0);
		}
	});
	
	// Processamento do filtro por corretor concluído
	
	return grid;
}

export async function fetchLeadsPorTempo() {
	// Usar a view criada para análise temporal - mais eficiente
	const { data, error } = await supabase
		.from('vw_chart_leads_temporal')
		.select('mes_key, total_leads')
		.order('mes_key', { ascending: true });
	
	if (error) throw error;
	
	// Sempre garantir 6 meses de dados (últimos 6 meses)
	const monthlyData = new Map<string, number>();
	
	// Inicializar últimos 6 meses com zero
	for (let i = 5; i >= 0; i--) {
		const date = new Date();
		date.setMonth(date.getMonth() - i);
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		monthlyData.set(key, 0);
	}
	
	// Sobrescrever com dados reais onde existirem
	if (data && data.length > 0) {
		data.forEach((row: any) => {
			const key = row.mes_key;
			const current = monthlyData.get(key) || 0;
			monthlyData.set(key, current + Number(row.total_leads || 0));
		});
	}
	
	// Retornar sempre na ordem cronológica (últimos 6 meses)
	return Array.from(monthlyData.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, count]) => ({
			month: monthLabel(month),
			count
		}));
}

export async function fetchTaxaOcupacao() {
	const { data: distData, error } = await supabase
		.from('vw_segura_metricas_ocupacao_disponibilidade')
		.select('disponibilidade, total, percentual');
	if (error) throw error;
	const totalCount = (distData || []).reduce((s: number, r: any) => s + Number(r.total || 0), 0);
	const disponiveisCount = (distData || []).find((r: any) => (r.disponibilidade || '').toLowerCase() === 'disponivel')?.total || 0;
	const reformaCount = (distData || []).find((r: any) => (r.disponibilidade || '').toLowerCase() === 'reforma')?.total || 0;
	const indisponiveisCount = (distData || []).find((r: any) => (r.disponibilidade || '').toLowerCase() === 'indisponivel')?.total || 0;
	const ocupacao = totalCount > 0 ? ((Number(totalCount) - Number(disponiveisCount)) / Number(totalCount)) * 100 : 0;
	return {
		ocupacao,
		total: Number(totalCount || 0),
		disponiveis: Number(disponiveisCount || 0),
		reforma: Number(reformaCount || 0),
		indisponiveis: Number(indisponiveisCount || 0),
		breakdown: (distData || []).map((r: any) => ({
			status: (r.disponibilidade || '').toString(),
			total: Number(r.total || 0),
			percent: Number((r.percentual || 0) * 100)
		}))
	};
}
