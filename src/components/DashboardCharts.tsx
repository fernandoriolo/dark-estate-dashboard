import React from "react";
import { ChartContainer } from '@mui/x-charts/ChartContainer';
import { ChartsLegend, ChartsAxis, ChartsTooltip, ChartsGrid, ChartsAxisHighlight } from '@mui/x-charts';
import { BarPlot } from '@mui/x-charts/BarChart';
import { LinePlot, AreaPlot } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { Gauge } from '@mui/x-charts/Gauge';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyCompact, monthLabel } from '@/lib/charts/formatters';
import { chartPalette, availabilityColors, pieChartColors } from '@/lib/charts/palette';
import { gridStyle, tooltipSlotProps, vgvTooltipSlotProps, currencyValueFormatter, numberValueFormatter } from '@/lib/charts/config';
import { supabase } from '@/integrations/supabase/client';
import { fetchDistribuicaoPorTipo, fetchFunilLeads, fetchHeatmapAtividades, fetchLeadsPorCanalTop8, fetchTaxaOcupacao, fetchVgvByPeriod, VgvPeriod } from '@/services/metrics';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export const DashboardCharts: React.FC = () => {
	const [vgv, setVgv] = React.useState<{ month: string; vgv: number; qtd: number }[]>([]);
	const [canal, setCanal] = React.useState<{ name: string; value: number }[]>([]);
	const [tipos, setTipos] = React.useState<{ name: string; value: number }[]>([]);
	const [funil, setFunil] = React.useState<{ name: string; value: number }[]>([]);
	const [heat, setHeat] = React.useState<number[][]>([]);
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

	function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
		const rad = (angleDeg - 90) * Math.PI / 180;
		return { x: cx + (r * Math.cos(rad)), y: cy + (r * Math.sin(rad)) };
	}

	function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
		const start = polarToCartesian(cx, cy, r, endAngle);
		const end = polarToCartesian(cx, cy, r, startAngle);
		const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
		return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
	}

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
					<div className="h-72 flex flex-col">
						{/* Gráfico centralizado verticalmente com o gráfico VGV */}
						<div className="flex-1 flex items-center justify-center" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
							{(() => {
								const breakdown = gauge?.breakdown || [];
								const disponivel = breakdown.find(b => b.status?.toLowerCase() === 'disponivel') || { percent: 0 };
								const indisponivel = breakdown.find(b => b.status?.toLowerCase() === 'indisponivel') || { percent: 0 };
								const reforma = breakdown.find(b => b.status?.toLowerCase() === 'reforma') || { percent: 0 };
								
								const cx = 150, cy = 110, rOuter = 85, rInner = 60;
								const start = -140, end = 140;
								const totalAngle = end - start;
								
								// Calcular ângulos para cada seção
								const currentAngle = start;
								const dispAngle = currentAngle + (totalAngle * (disponivel.percent / 100));
								const indispAngle = dispAngle + (totalAngle * (indisponivel.percent / 100));
								const refAngle = indispAngle + (totalAngle * (reforma.percent / 100));
								
								return (
									<svg width={300} height={220} viewBox="0 0 300 220" aria-labelledby="taxa_ocupacao_label" className="overflow-visible">
										<defs>
											{/* Gradientes profissionais */}
											<linearGradient id="disponivel-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
												<stop offset="0%" stopColor={chartPalette.accent} stopOpacity={1} />
												<stop offset="100%" stopColor={chartPalette.accentAlt} stopOpacity={0.9} />
											</linearGradient>
											<linearGradient id="indisponivel-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
												<stop offset="0%" stopColor={chartPalette.danger} stopOpacity={1} />
												<stop offset="100%" stopColor="#dc2626" stopOpacity={0.9} />
											</linearGradient>
											<linearGradient id="reforma-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
												<stop offset="0%" stopColor={chartPalette.warn} stopOpacity={1} />
												<stop offset="100%" stopColor="#d97706" stopOpacity={0.9} />
											</linearGradient>
											
											<mask id="gauge-cut">
												<rect x="0" y="0" width="300" height="220" fill="#fff" />
												<circle cx={cx} cy={cy} r={rInner} fill="#000" />
											</mask>
											
											{/* Sombra do gauge */}
											<filter id="gauge-shadow">
												<feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.25)" />
											</filter>
										</defs>
										
										<g mask="url(#gauge-cut)" filter="url(#gauge-shadow)">
											{/* Trilha de fundo com gradiente sutil */}
											<path d={describeArc(cx, cy, rOuter, start, end)} stroke={chartPalette.grid} strokeWidth={20} fill="none" strokeLinecap="round" opacity={0.3} />
											
											{/* Seção disponível */}
											{disponivel.percent > 0 && (
												<path 
													d={describeArc(cx, cy, rOuter, currentAngle, dispAngle)} 
													stroke="url(#disponivel-gradient)" 
													strokeWidth={20} 
													fill="none" 
													strokeLinecap="round"
													className="transition-all duration-300 hover:stroke-width-[24]"
												/>
											)}
											
											{/* Seção indisponível */}
											{indisponivel.percent > 0 && (
												<path 
													d={describeArc(cx, cy, rOuter, dispAngle, indispAngle)} 
													stroke="url(#indisponivel-gradient)" 
													strokeWidth={20} 
													fill="none" 
													strokeLinecap="round"
													className="transition-all duration-300 hover:stroke-width-[24]"
												/>
											)}
											
											{/* Seção reforma */}
											{reforma.percent > 0 && (
												<path 
													d={describeArc(cx, cy, rOuter, indispAngle, refAngle)} 
													stroke="url(#reforma-gradient)" 
													strokeWidth={20} 
													fill="none" 
													strokeLinecap="round"
													className="transition-all duration-300 hover:stroke-width-[24]"
												/>
											)}
										</g>
										
										{/* Texto central aprimorado */}
										<text x={cx} y={cy - 10} textAnchor="middle" fill={chartPalette.textPrimary} style={{ fontWeight: 700, fontSize: 18 }}>
											{`${disponivel.percent.toFixed(0)}%`}
										</text>
										<text x={cx} y={cy + 8} textAnchor="middle" fill={chartPalette.textSecondary} style={{ fontWeight: 500, fontSize: 12 }}>
											Disponíveis
										</text>
										
										{/* Indicadores dos valores totais */}
										<text x={cx} y={cy + 28} textAnchor="middle" fill={chartPalette.textSecondary} style={{ fontWeight: 400, fontSize: 11 }}>
											{gauge?.total || 0} imóveis total
										</text>
									</svg>
								);
							})()}
						</div>
					</div>
					{/* Badges de status alinhados com o eixo x do VGV */}
					{gauge?.breakdown && (
						<div className="px-4 pb-2">
							<div className="flex items-center justify-center gap-6 text-xs text-gray-300">
								{gauge.breakdown.map((b) => (
									<div key={b.status} className="flex items-center gap-1.5">
										<span className="inline-block h-3 w-3 rounded-full" style={{ background: (availabilityColors as any)[(b.status || '').toLowerCase()] || chartPalette.muted }} />
										<span className="capitalize">{b.status}</span>
										<span className="text-gray-400">{b.total} ({b.percent.toFixed(0)}%)</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* removido mini-gráfico de barras por solicitação */}
				</CardContent>
			</Card>

			<Card className="bg-gray-800/50 border-gray-700/50 xl:col-span-6">
				<CardHeader>
					<CardTitle className="text-white font-semibold">Leads por canal</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-72 flex justify-center items-center" style={{ overflow: 'visible' }}>
						<ChartContainer
							xAxis={[{ 
								scaleType: 'linear', 
								position: 'bottom', 
								valueFormatter: (v: number) => `${Number(v||0).toLocaleString('pt-BR')}`,
								tickLabelStyle: { fill: chartPalette.textSecondary, fontSize: '0.75rem' }
							}]}
							yAxis={[{ 
								scaleType: 'band', 
								position: 'left', 
								data: canal.map(c => c.name),
								tickLabelStyle: { 
									fill: chartPalette.textPrimary, 
									fontSize: '0.875rem', 
									fontWeight: 500,
									fontFamily: 'Inter, system-ui, sans-serif'
								},
								width: 100  // Aumentar largura para acomodar labels completos
							}]}
							series={[{ 
								type: 'bar', 
								id: 'canal', 
								data: canal.map(c => c.value), 
								layout: 'horizontal',
								color: `url(#canal-gradient)`
							}]}
							height={280}
							margin={{
								left: 120,  // Aumentar margem esquerda para os labels
								right: 30,
								top: 20,
								bottom: 40
							}}
						>
							{/* Gradiente para canal */}
							<defs>
								<linearGradient id="canal-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stopColor={chartPalette.secondary} stopOpacity={0.8} />
									<stop offset="100%" stopColor={chartPalette.secondary} stopOpacity={1} />
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
