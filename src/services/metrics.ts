import { supabase } from "@/integrations/supabase/client";
import { monthKey } from "@/lib/charts/formatters";
import { normalizePropertyType } from "@/lib/charts/normalizers";

export async function fetchVgvMensalUltimos12Meses() {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
	const { data, error } = await supabase
		.from('vw_segura_metricas_vgv_mensal')
		.select('mes, soma_vgv, total_contratos')
		.gte('mes', start.toISOString())
		.order('mes', { ascending: true });
	if (error) throw error;
	const byMonth = new Map<string, { vgv: number; qtd: number }>();
	for (let i = 0; i < 12; i++) {
		const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
		byMonth.set(monthKey(d), { vgv: 0, qtd: 0 });
	}
	(data || []).forEach((r: any) => {
		const d = new Date(r.mes as any);
		const k = monthKey(d);
		const cur = byMonth.get(k);
		if (!cur) return;
		cur.vgv += Number(r.soma_vgv || 0);
		cur.qtd += Number(r.total_contratos || 0);
	});
	return Array.from(byMonth.entries()).map(([k, v]) => ({ month: k, ...v }));
}

export async function fetchLeadsPorCanalTop8() {
	const { data, error } = await supabase
		.from('vw_segura_metricas_leads_por_canal')
		.select('canal_bucket, total');
	if (error) throw error;
	return (data || [])
		.map((r: any) => ({ name: r.canal_bucket as string, value: Number(r.total || 0) }))
		.sort((a, b) => b.value - a.value);
}

export async function fetchDistribuicaoPorTipo() {
	const { data, error } = await supabase
		.from('vw_segura_metricas_distribuicao_tipo_imovel')
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
		.from('vw_segura_metricas_funil_leads')
		.select('estagio, total');
	if (error) throw error;
	return (data || []).map((r: any) => ({ name: (r?.estagio || 'Não informado') as string, value: Number(r.total || 0) }));
}

export async function fetchHeatmapAtividades() {
	const { data, error } = await supabase
		.from('vw_segura_metricas_mapa_calor_atividade')
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

export async function fetchTaxaOcupacao() {
	const { data, error } = await supabase
		.from('vw_segura_metricas_taxa_ocupacao')
		.select('taxa_ocupacao')
		.maybeSingle();
	if (error) throw error;
	const total = await supabase.from('imoveisvivareal').select('id', { count: 'exact', head: true }) as unknown as { count: number | null };
	const disponiveis = await supabase.from('imoveisvivareal').select('id', { count: 'exact', head: true }).eq('disponibilidade', 'disponivel') as unknown as { count: number | null };
	const t = total.count || 0; const d = disponiveis.count || 0;
	const taxa = Number((data as any)?.taxa_ocupacao || 0);
	const ocupacao = Math.max(0, Math.min(100, taxa * 100));
	return { ocupacao, total: t, disponiveis: d };
}
