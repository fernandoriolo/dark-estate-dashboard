import { supabase } from "@/integrations/supabase/client";
import { monthKey } from "@/lib/charts/formatters";
import { normalizePropertyType } from "@/lib/charts/normalizers";

export async function fetchVgvMensalUltimos12Meses() {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const { data, error } = await supabase
		.from('contracts')
		.select('valor, data_assinatura, tipo')
		.eq('tipo', 'Venda')
		.gte('data_assinatura', start.toISOString())
		.lt('data_assinatura', end.toISOString());
	if (error) throw error;
	const byMonth = new Map<string, { vgv: number; qtd: number }>();
	for (let i = 0; i < 12; i++) {
		const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
		byMonth.set(monthKey(d), { vgv: 0, qtd: 0 });
	}
	(data || []).forEach(r => {
		const d = new Date(r.data_assinatura as any);
		const k = monthKey(d);
		const cur = byMonth.get(k)!;
		cur.vgv += Number(r.valor || 0);
		cur.qtd += 1;
	});
	return Array.from(byMonth.entries()).map(([k, v]) => ({ month: k, ...v }));
}

export async function fetchLeadsPorCanalTop8() {
	const { data, error } = await supabase
		.from('leads')
		.select('source');
	if (error) throw error;
	const counts: Record<string, number> = {};
	(data || []).forEach((r: any) => { const s = r?.source || 'Desconhecido'; counts[s] = (counts[s] || 0) + 1; });
	const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
	const top = sorted.slice(0, 8);
	const rest = sorted.slice(8).reduce((acc, [, v]) => acc + v, 0);
	if (rest > 0) top.push(['Outros', rest]);
	return top.map(([name, value]) => ({ name, value }));
}

export async function fetchDistribuicaoPorTipo() {
	const { data, error } = await supabase
		.from('imoveisvivareal')
		.select('tipo_imovel');
	if (error) throw error;
	const counts: Record<string, number> = {};
	(data || []).forEach((r: any) => { const key = normalizePropertyType(r?.tipo_imovel || ''); counts[key] = (counts[key] || 0) + 1; });
	return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
}

export async function fetchFunilLeads() {
	const { data, error } = await supabase
		.from('leads')
		.select('stage');
	if (error) throw error;
	const counts: Record<string, number> = {};
	(data || []).forEach((r: any) => { const s = r?.stage || 'Não informado'; counts[s] = (counts[s] || 0) + 1; });
	return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export async function fetchHeatmapAtividades() {
	// Por padrão, usar leads.created_at
	const { data, error } = await supabase
		.from('leads')
		.select('created_at');
	if (error) throw error;
	const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
	(data || []).forEach((r: any) => {
		const d = new Date(r.created_at);
		const day = (d.getDay() + 6) % 7; // 0=Mon .. 6=Sun
		const hour = d.getHours();
		grid[day][hour] += 1;
	});
	return grid; // [day][hour]
}

export async function fetchTaxaOcupacao() {
	const total = await supabase.from('imoveisvivareal').select('id', { count: 'exact', head: true }) as unknown as { count: number | null };
	const disponiveis = await supabase.from('imoveisvivareal').select('id', { count: 'exact', head: true }).eq('disponibilidade', 'disponivel') as unknown as { count: number | null };
	const t = total.count || 0; const d = disponiveis.count || 0;
	const ocupacao = t > 0 ? ((t - d) / t) * 100 : 0;
	return { ocupacao, total: t, disponiveis: d };
}
