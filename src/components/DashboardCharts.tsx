import React from "react";
import { ChartContainer } from '@mui/x-charts/ChartContainer';
import { ChartsLegend, ChartsAxis, ChartsTooltip, ChartsGrid, ChartsAxisHighlight } from '@mui/x-charts';
import { BarPlot } from '@mui/x-charts/BarChart';
import { LinePlot, AreaPlot } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { Gauge } from '@mui/x-charts/Gauge';
import { Heatmap } from '@mui/x-charts-pro/Heatmap';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyCompact, monthLabel } from '@/lib/charts/formatters';
import { fetchDistribuicaoPorTipo, fetchFunilLeads, fetchHeatmapAtividades, fetchLeadsPorCanalTop8, fetchTaxaOcupacao, fetchVgvMensalUltimos12Meses } from '@/services/metrics';

export const DashboardCharts: React.FC = () => {
	const [vgv, setVgv] = React.useState<{ month: string; vgv: number; qtd: number }[]>([]);
	const [canal, setCanal] = React.useState<{ name: string; value: number }[]>([]);
	const [tipos, setTipos] = React.useState<{ name: string; value: number }[]>([]);
	const [funil, setFunil] = React.useState<{ name: string; value: number }[]>([]);
	const [heat, setHeat] = React.useState<number[][]>([]);
	const [gauge, setGauge] = React.useState<{ ocupacao: number; total: number; disponiveis: number } | null>(null);

	React.useEffect(() => {
		Promise.all([
			fetchVgvMensalUltimos12Meses().then(setVgv).catch(() => setVgv([])),
			fetchLeadsPorCanalTop8().then(setCanal).catch(() => setCanal([])),
			fetchDistribuicaoPorTipo().then(setTipos).catch(() => setTipos([])),
			fetchFunilLeads().then(setFunil).catch(() => setFunil([])),
			fetchHeatmapAtividades().then(setHeat).catch(() => setHeat([])),
			fetchTaxaOcupacao().then(setGauge).catch(() => setGauge({ ocupacao: 0, total: 0, disponiveis: 0 } as any)),
		]);
	}, []);

	const months = React.useMemo(() => vgv.map(v => monthLabel(v.month)), [vgv]);
	const vgvSeries = React.useMemo(() => [{ type: 'line' as const, id: 'vgv', label: 'VGV', data: vgv.map(v => v.vgv) }], [vgv]);
	const convSeries = React.useMemo(() => [{ type: 'bar' as const, id: 'conv', label: 'Contratos', data: vgv.map(v => v.qtd) }], [vgv]);
	const xAxisMonths = React.useMemo(() => [{ scaleType: 'band' as const, data: months, position: 'bottom' as const, valueFormatter: (v: string) => v }], [months]);
	const yAxisCurrency = React.useMemo(() => [{ scaleType: 'linear' as const, position: 'left' as const, valueFormatter: (v: number) => formatCurrencyCompact(v) }], []);

	return (
		<div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-8">
				<CardHeader>
					<CardTitle className="text-white">VGV mensal (12m) e conversões</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<ChartContainer
							xAxis={xAxisMonths}
							yAxis={yAxisCurrency}
							series={[...vgvSeries, { ...convSeries[0], axisId: 'y2' as any }]}
							width={undefined as any}
							height={280}
						>
							<ChartsGrid vertical />
							<AreaPlot />
							<LinePlot />
							<BarPlot />
							<ChartsAxis />
							<ChartsAxisHighlight x="line" />
							<ChartsLegend direction="horizontal" />
							<ChartsTooltip />
						</ChartContainer>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-4">
				<CardHeader>
					<CardTitle className="text-white">Taxa de ocupação</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-72 flex items-center justify-center">
						<Gauge value={gauge?.ocupacao ?? 0} valueMax={100} aria-labelledby="taxa_ocupacao_label" aria-valuetext={`${(gauge?.ocupacao ?? 0).toFixed(0)}%`} />
					</div>
					<p className="text-xs text-gray-400 text-center">{gauge ? `${gauge.disponiveis}/${gauge.total} disponíveis` : '—'}</p>
				</CardContent>
			</Card>

			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-6">
				<CardHeader>
					<CardTitle className="text-white">Leads por canal</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<ChartContainer
							xAxis={[{ scaleType: 'linear', position: 'bottom', valueFormatter: (v: number) => `${v}` }]}
							yAxis={[{ scaleType: 'band', position: 'left', data: canal.map(c => c.name) }]}
							series={[{ type: 'bar', id: 'canal', data: canal.map(c => c.value), layout: 'horizontal' }]}
							height={280}
						>
							<ChartsGrid vertical />
							<BarPlot />
							<ChartsAxis />
							<ChartsLegend />
							<ChartsTooltip />
						</ChartContainer>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-6">
				<CardHeader>
					<CardTitle className="text-white">Distribuição por tipo</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<PieChart
							series={[{ data: tipos.map(t => ({ id: t.name, label: t.name, value: t.value })) }]}
							slotProps={{ legend: { direction: 'vertical' } }}
						/>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-6">
				<CardHeader>
					<CardTitle className="text-white">Funil de estágios</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<ChartContainer
							xAxis={[{ scaleType: 'band', position: 'bottom', data: funil.map(f => f.name) }]}
							yAxis={[{ scaleType: 'linear', position: 'left' }]}
							series={[{ type: 'bar', id: 'funil', data: funil.map(f => f.value) }]}
							height={280}
						>
							<ChartsGrid vertical />
							<BarPlot />
							<ChartsAxis />
							<ChartsLegend />
							<ChartsTooltip />
						</ChartContainer>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-6">
				<CardHeader>
					<CardTitle className="text-white">Atividade por hora x dia</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<Heatmap
							height={280}
							xAxis={[{ data: Array.from({ length: 24 }, (_, i) => `${i}h`), scaleType: 'band', position: 'bottom' }]}
							yAxis={[{ data: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'], scaleType: 'band', position: 'left' }]}
							series={[{ data: heat.flatMap((row, y) => row.map((v, x) => [x, y, v])) }]}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
