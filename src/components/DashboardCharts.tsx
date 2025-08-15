import React from "react";
import { ChartContainer } from '@mui/x-charts/ChartContainer';
import { ChartsLegend, ChartsAxis, ChartsTooltip, ChartsGrid, ChartsAxisHighlight } from '@mui/x-charts';
import { BarPlot } from '@mui/x-charts/BarChart';
import { LinePlot, AreaPlot } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyCompact, monthLabel } from '@/lib/charts/formatters';
import { chartPalette, pieChartColors } from '@/lib/charts/palette';
import { gridStyle, tooltipSlotProps, vgvTooltipSlotProps, currencyValueFormatter, numberValueFormatter } from '@/lib/charts/config';
import { supabase } from '@/integrations/supabase/client';
import { fetchDistribuicaoPorTipo, fetchFunilLeads, fetchHeatmapAtividades, fetchLeadsPorCanalTop8, fetchLeadsPorTempo, fetchTaxaOcupacao, fetchVgvByPeriod, VgvPeriod } from '@/services/metrics';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export const DashboardCharts: React.FC = () => {
	const [vgv, setVgv] = React.useState<{ month: string; vgv: number; qtd: number }[]>([]);
	const [canal, setCanal] = React.useState<{ name: string; value: number }[]>([]);
	const [tipos, setTipos] = React.useState<{ name: string; value: number }[]>([]);
	const [funil, setFunil] = React.useState<{ name: string; value: number }[]>([]);
	const [heat, setHeat] = React.useState<number[][]>([]);
	const [leadsTempo, setLeadsTempo] = React.useState<{ month: string; count: number }[]>([]);
	const [gauge, setGauge] = React.useState<{
		ocupacao: number;
		total: number;
		disponiveis: number;
		reforma?: number;
		indisponiveis?: number;
		breakdown?: { status: string; total: number; percent: number }[]
	} | null>(null);

	// Estados para filtros e opções VGV
	const [vgvPeriod, setVgvPeriod] = React.useState<VgvPeriod>('mensal');
	const [vgvChartType, setVgvChartType] = React.useState<'area' | 'line' | 'bar' | 'combined'>('combined');

	// Effect para atualizar VGV quando período muda
	React.useEffect(() => {
		fetchVgvByPeriod(vgvPeriod).then(setVgv).catch(() => setVgv([]));
	}, [vgvPeriod]);

	React.useEffect(() => {
		const refetchAll = () => {
			Promise.all([
				fetchVgvByPeriod(vgvPeriod).then(setVgv).catch(() => setVgv([])),
				fetchLeadsPorCanalTop8().then(setCanal).catch(() => setCanal([])),
				fetchDistribuicaoPorTipo().then(setTipos).catch(() => setTipos([])),
				fetchFunilLeads().then(setFunil).catch(() => setFunil([])),
				fetchHeatmapAtividades().then(setHeat).catch(() => setHeat([])),
				fetchLeadsPorTempo().then(setLeadsTempo).catch(() => setLeadsTempo([])),
				fetchTaxaOcupacao().then(setGauge).catch(() => setGauge({ ocupacao: 0, total: 0, disponiveis: 0 } as any)),
			]);
		};
		refetchAll();
		const channel = supabase
			.channel(`dashboard_charts_${Date.now()}`)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, refetchAll)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, refetchAll)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'imoveisvivareal' }, refetchAll)
			.subscribe();
		return () => { supabase.removeChannel(channel); };
	}, [vgvPeriod]);

	const months = React.useMemo(() => vgv.map(v => {
		if (vgvPeriod === 'diario' || vgvPeriod === 'semanal') return v.month;
		return monthLabel(v.month);
	}), [vgv, vgvPeriod]);
	
	// Dados de fallback para o gráfico temporal se não houver dados
	const tempoData = React.useMemo(() => {
		if (leadsTempo.length > 0) return leadsTempo;
		// Fallback com últimos 6 meses e dados zerados
		const fallback = [];
		for (let i = 5; i >= 0; i--) {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			fallback.push({
				month: monthLabel(key),
				count: 0
			});
		}
		return fallback;
	}, [leadsTempo]);

	const vgvSeriesConfig = React.useMemo(() => {
		const vgvData = vgv.map(v => v.vgv);
		const qtdData = vgv.map(v => v.qtd);

		// Definição de gradientes
		const vgvGradient = `url(#vgv-gradient)`;
		const barGradient = `url(#bar-gradient)`;

		switch (vgvChartType) {
			case 'line':
				return {
					vgvSeries: [{ 
						type: 'line' as const, 
						id: 'vgv', 
						label: 'VGV', 
						data: vgvData, 
						color: chartPalette.primaryAlt, 
						showMark: true, 
						curve: 'monotoneX' as any, 
						lineWidth: 3 as any 
					}],
					convSeries: [] as any[]
				};
			case 'area':
				return {
					vgvSeries: [{ 
						type: 'line' as const, 
						id: 'vgv', 
						label: 'VGV', 
						data: vgvData, 
						color: vgvGradient, 
						area: true as any, 
						showMark: false as any, 
						curve: 'monotoneX' as any, 
						lineWidth: 2 as any 
					}],
					convSeries: [] as any[]
				};
			case 'bar':
				return {
					vgvSeries: [{ 
						type: 'bar' as const, 
						id: 'vgv', 
						label: 'VGV', 
						data: vgvData, 
						color: barGradient, 
						borderRadius: 6 as any 
					}],
					convSeries: [] as any[]
				};
			default: // combined
				return {
					vgvSeries: [{ 
						type: 'line' as const, 
						id: 'vgv', 
						label: 'VGV', 
						data: vgvData, 
						color: vgvGradient, 
						area: true as any, 
						showMark: false as any, 
						curve: 'monotoneX' as any, 
						lineWidth: 2 as any 
					}],
					convSeries: [{ 
						type: 'bar' as const, 
						id: 'conv', 
						label: 'Imóveis', 
						data: qtdData, 
						color: barGradient, 
						borderRadius: 4 as any 
					}]
				};
		}
	}, [vgv, vgvChartType]);

	const xAxisMonths = React.useMemo(() => [{ scaleType: 'band' as const, data: months, position: 'bottom' as const, valueFormatter: (v: string) => v }], [months]);
	const yAxisCurrency = React.useMemo(() => [{ 
		scaleType: 'linear' as const, 
		position: 'left' as const, 
		valueFormatter: (value: number) => {
			// Formato ultra compacto para evitar cortes
			if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(0)}B`;
			if (value >= 1_000_000) {
				const millions = value / 1_000_000;
				// Se for número redondo, não mostrar decimal
				return millions % 1 === 0 
					? `${millions.toFixed(0)}M`
					: `${millions.toFixed(1)}M`;
			}
			if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
			return value === 0 ? '0' : `${value.toFixed(0)}`;
		},
		tickLabelStyle: { 
			fill: chartPalette.textSecondary, 
			fontSize: 10, // Reduzido para 10px
			fontWeight: 500, // Reduzido para 500
			fontFamily: 'Inter, system-ui, sans-serif'
		},
		tickNumber: 5,
		nice: true
	}], []);



	// Matriz heatmap (7 x 24): 0=Seg ... 6=Dom (já normalizado em fetch)
	const heatMax = React.useMemo(() => {
		let m = 0;
		for (const row of heat) for (const v of row) m = Math.max(m, v || 0);
		return m || 1;
	}, [heat]);

	return (
		<div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-8">
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-white">VGV e Imóveis</CardTitle>
						<div className="flex items-center gap-2">
							{/* Filtro de período */}
							<ToggleGroup 
								type="single" 
								value={vgvPeriod} 
								onValueChange={(value) => value && setVgvPeriod(value as VgvPeriod)}
								className="h-8"
							>
								<ToggleGroupItem value="todo" className="h-8 text-xs px-2 text-white data-[state=on]:bg-blue-600 data-[state=on]:text-white">Todo</ToggleGroupItem>
								<ToggleGroupItem value="anual" className="h-8 text-xs px-2 text-white data-[state=on]:bg-blue-600 data-[state=on]:text-white">Anual</ToggleGroupItem>
								<ToggleGroupItem value="mensal" className="h-8 text-xs px-2 text-white data-[state=on]:bg-blue-600 data-[state=on]:text-white">Mensal</ToggleGroupItem>
								<ToggleGroupItem value="semanal" className="h-8 text-xs px-2 text-white data-[state=on]:bg-blue-600 data-[state=on]:text-white">Semanal</ToggleGroupItem>
								<ToggleGroupItem value="diario" className="h-8 text-xs px-2 text-white data-[state=on]:bg-blue-600 data-[state=on]:text-white">Diário</ToggleGroupItem>
							</ToggleGroup>
							
							{/* Tipo de gráfico */}
							<ToggleGroup 
								type="single" 
								value={vgvChartType} 
								onValueChange={(value) => value && setVgvChartType(value as any)}
								className="h-8"
							>
								<ToggleGroupItem value="combined" className="h-8 text-xs px-2 text-white data-[state=on]:bg-emerald-600 data-[state=on]:text-white">Combo</ToggleGroupItem>
								<ToggleGroupItem value="area" className="h-8 text-xs px-2 text-white data-[state=on]:bg-emerald-600 data-[state=on]:text-white">Área</ToggleGroupItem>
								<ToggleGroupItem value="line" className="h-8 text-xs px-2 text-white data-[state=on]:bg-emerald-600 data-[state=on]:text-white">Linha</ToggleGroupItem>
								<ToggleGroupItem value="bar" className="h-8 text-xs px-2 text-white data-[state=on]:bg-emerald-600 data-[state=on]:text-white">Barra</ToggleGroupItem>
							</ToggleGroup>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="h-80 flex justify-center items-center" style={{ overflow: 'visible' }}>
						<ChartContainer
							xAxis={xAxisMonths}
							yAxis={[{ 
								...yAxisCurrency[0],
								width: 60  // Reduzido para dar mais espaço ao gráfico
							}]}
							series={[...vgvSeriesConfig.vgvSeries, ...(vgvSeriesConfig.convSeries.length > 0 ? [{ ...vgvSeriesConfig.convSeries[0], axisId: 'y2' as any }] : [])]}
							width={undefined as any}
							height={320}
							margin={{ 
								left: 80,   // Reduzido para centralizar melhor
								right: 40,  // Aumentado para equilibrar
								top: 20,    // Reduzido
								bottom: 50  // Aumentado para rótulos do eixo X
							}}
							style={{ width: '100%', maxWidth: '100%' }}
						>
							{/* Gradientes SVG */}
							<defs>
								<linearGradient id="vgv-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
									<stop offset="0%" stopColor={chartPalette.primaryAlt} stopOpacity={0.8} />
									<stop offset="50%" stopColor={chartPalette.primaryAlt} stopOpacity={0.4} />
									<stop offset="100%" stopColor={chartPalette.primaryAlt} stopOpacity={0.1} />
								</linearGradient>
								<linearGradient id="bar-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
									<stop offset="0%" stopColor={chartPalette.accent} stopOpacity={1} />
									<stop offset="100%" stopColor={chartPalette.accent} stopOpacity={0.7} />
								</linearGradient>
							</defs>
							
							<ChartsGrid vertical style={gridStyle} />
							{(vgvChartType === 'area' || vgvChartType === 'combined') && <AreaPlot />}
							{(vgvChartType === 'line' || vgvChartType === 'combined') && <LinePlot />}
							{(vgvChartType === 'bar' || vgvChartType === 'combined') && <BarPlot />}
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
					<div className="h-72">
						<PieChart
							series={[{ 
								data: (gauge?.breakdown || []).map((item, i) => ({ 
									id: item.status, 
									label: `${item.status} (${item.total})`,  // Incluir número na legenda
									value: item.total,
									color: pieChartColors[i % pieChartColors.length]  // Usar paleta diferenciada
								})),
								innerRadius: 60,
								outerRadius: 100,
								paddingAngle: 3,  // Aumentar espaçamento entre fatias
								cornerRadius: 8   // Bordas mais arredondadas
							}]}
							margin={{ top: 40, bottom: 40, left: 80, right: 80 }}  // Margem para acomodar legenda
						/>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-8">
				<CardHeader>
					<CardTitle className="text-white font-semibold">Conversão de Leads</CardTitle>
				</CardHeader>
				<CardContent>
										<div className="grid grid-cols-2 gap-4 h-72">
						{/* Gráfico de barras por canal */}
						<div className="flex flex-col">
							<h4 className="text-sm font-medium text-gray-300 mb-2">Por Canal</h4>
							<div className="flex-1" style={{ overflow: 'visible' }}>
								<ChartContainer
									xAxis={[{ 
										scaleType: 'linear', 
										position: 'bottom', 
										valueFormatter: (v: number) => `${Number(v||0).toLocaleString('pt-BR')}`,
										tickLabelStyle: { fill: chartPalette.textSecondary, fontSize: '0.7rem' }
									}]}
									yAxis={[{ 
										scaleType: 'band', 
										position: 'left', 
										data: canal.map(c => c.name),
										tickLabelStyle: { 
											fill: chartPalette.textPrimary, 
											fontSize: '0.75rem', 
											fontWeight: 500,
											fontFamily: 'Inter, system-ui, sans-serif'
										},
										width: 70
									}]}
									series={canal.map((c, i) => ({ 
										type: 'bar' as const, 
										id: `canal-${i}`, 
										data: Array(canal.length).fill(0).map((_, idx) => idx === i ? c.value : 0),
										label: c.name,
										color: pieChartColors[i % pieChartColors.length],
										layout: 'horizontal' as const,
										stack: 'canal'
									}))}
									height={240}
									margin={{
										left: 60,   // Reduzido para alinhar à esquerda
										right: 10,  
										top: 10,
										bottom: 30
									}}
								>
									<ChartsGrid vertical style={gridStyle} />
									<BarPlot />
									<ChartsAxis />
									<ChartsTooltip />
								</ChartContainer>
							</div>
						</div>

						{/* Gráfico temporal de leads */}
						<div className="flex flex-col">
							<h4 className="text-sm font-medium text-gray-300 mb-2">Por Tempo (6 meses)</h4>
							<div className="flex-1" style={{ overflow: 'visible' }}>
								<ChartContainer
									xAxis={[{ 
										scaleType: 'band', 
										position: 'bottom', 
										data: tempoData.map(l => l.month),
										tickLabelStyle: { 
											fill: chartPalette.textSecondary, 
											fontSize: '0.7rem',
											fontFamily: 'Inter, system-ui, sans-serif'
										}
									}]}
									yAxis={[{ 
										scaleType: 'linear', 
										position: 'left',
										valueFormatter: (v: number) => `${Number(v||0)}`,
										tickLabelStyle: { fill: chartPalette.textSecondary, fontSize: '0.7rem' },
										min: 0
							}]}
							series={[{ 
										type: 'line', 
										id: 'tempo', 
										data: tempoData.map(l => l.count),
										color: chartPalette.accent,
										showMark: true,
										curve: 'monotoneX' as any,
										area: true as any
									}]}
									height={240}
									margin={{
										left: 35,   // Reduzido para alinhar à esquerda
										right: 10,  
										top: 10,
										bottom: 30
									}}
								>
									{/* Gradiente para área */}
							<defs>
										<linearGradient id="tempo-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
											<stop offset="0%" stopColor={chartPalette.accent} stopOpacity={0.6} />
											<stop offset="100%" stopColor={chartPalette.accent} stopOpacity={0.1} />
								</linearGradient>
							</defs>
							
							<ChartsGrid vertical style={gridStyle} />
									<LinePlot />
									<AreaPlot />
							<ChartsAxis />
									<ChartsTooltip />
						</ChartContainer>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-4">
				<CardHeader>
					<CardTitle className="text-white font-semibold">Distribuição por tipo</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<PieChart
							series={[{ 
								data: tipos.map((t, i) => ({ 
									id: t.name, 
									label: `${t.name} (${t.value})`,  // Incluir número na legenda
									value: t.value,
									color: pieChartColors[i % pieChartColors.length]  // Usar paleta diferenciada
								})),
								innerRadius: 60,
								outerRadius: 100,
								paddingAngle: 3,  // Aumentar espaçamento entre fatias
								cornerRadius: 8   // Bordas mais arredondadas
							}]}
							margin={{ top: 40, bottom: 40, left: 80, right: 80 }}  // Margem para acomodar legenda
						/>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-6">
				<CardHeader>
					<CardTitle className="text-white font-semibold">Funil de estágios</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						<ChartContainer
							xAxis={[{ 
								scaleType: 'band', 
								position: 'bottom', 
								data: funil.map(f => f.name),
								tickLabelStyle: { fill: chartPalette.textPrimary, fontSize: '0.875rem', fontWeight: 500 }
							}]}
							yAxis={[{ 
								scaleType: 'linear', 
								position: 'left',
								valueFormatter: numberValueFormatter,
								tickLabelStyle: { fill: chartPalette.textSecondary, fontSize: '0.75rem' }
							}]}
							series={[{ 
								type: 'bar', 
								id: 'funil', 
								data: funil.map(f => f.value),
								color: `url(#funil-gradient)`,

							}]}
							height={280}
						>
							{/* Gradiente para funil */}
							<defs>
								<linearGradient id="funil-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
									<stop offset="0%" stopColor={chartPalette.tertiary} stopOpacity={1} />
									<stop offset="100%" stopColor={chartPalette.tertiary} stopOpacity={0.7} />
								</linearGradient>
							</defs>
							
							<ChartsGrid vertical style={gridStyle} />
							<BarPlot />
							<ChartsAxis />
							<ChartsTooltip />
						</ChartContainer>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-6">
				<CardHeader>
					<CardTitle className="text-white font-semibold">Atividade por hora × dia</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-72">
						{/* Labels dos dias */}
						<div className="grid grid-cols-7 gap-1 mb-2">
							{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, i) => (
								<div key={i} className="text-center text-xs font-medium text-gray-300 py-1">
									{day}
								</div>
							))}
						</div>
						
						{/* Heatmap grid */}
						<div className="grid grid-cols-7 gap-1 flex-1">
							{heat.map((row, y) => (
								<div key={y} className="flex flex-col gap-1">
									{row.map((v, x) => {
										const intensity = (v || 0) / heatMax;
										const bg = intensity > 0.7 
											? `rgba(52, 211, 153, ${Math.max(0.3, intensity)})` // Verde para alta atividade
											: intensity > 0.4 
											? `rgba(245, 158, 11, ${Math.max(0.3, intensity)})` // Amarelo para média
											: `rgba(59, 130, 246, ${Math.max(0.08, intensity)})`; // Azul para baixa
										return (
											<div 
												key={x} 
												title={`${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][y]} ${x}h: ${v || 0} atividades`} 
												className="h-3 w-full rounded-sm transition-all duration-200 hover:scale-110 hover:shadow-sm cursor-pointer" 
												style={{ background: bg, border: intensity > 0.5 ? '1px solid rgba(255,255,255,0.1)' : 'none' }} 
											/>
										);
									})}
								</div>
							))}
						</div>
						
						{/* Legenda */}
						<div className="mt-3 flex items-center justify-between text-xs text-gray-400">
							<span>Baixa atividade</span>
							<div className="flex items-center gap-1">
								<div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(59, 130, 246, 0.3)' }} />
								<div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(245, 158, 11, 0.6)' }} />
								<div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(52, 211, 153, 0.8)' }} />
							</div>
							<span>Alta atividade</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
