
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp, Eye, Globe, Users, MapPin, ListChecks } from "lucide-react";
import { PropertyWithImages } from "@/hooks/useProperties";
import { useClients } from "@/hooks/useClients";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UpcomingAppointments } from "@/components/UpcomingAppointments";
import { LayoutPreview } from "@/components/LayoutPreview";
import { RecentActivitiesCard } from "@/components/RecentActivitiesCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LabelList } from 'recharts';

interface DashboardContentProps {
  properties: PropertyWithImages[];
  loading: boolean;
  onNavigateToAgenda?: () => void;
}

export function DashboardContent({ properties, loading, onNavigateToAgenda }: DashboardContentProps) {
  const { clients, loading: clientsLoading } = useClients();
  // KPIs
  const [totalProperties, setTotalProperties] = useState(0);
  const [availableProperties, setAvailableProperties] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [vgvCurrent, setVgvCurrent] = useState(0);
  const [previousData, setPreviousData] = useState({
    properties: 0,
    available: 0,
    clients: 0,
    vgv: 0,
  });
  const [loadingKpis, setLoadingKpis] = useState(true);
  // Lista de propriedades recentes (para o card lateral)
  const [imoveis, setImoveis] = useState<any[]>([]);
  const [loadingImoveis, setLoadingImoveis] = useState(true);
  const [typeEntries, setTypeEntries] = useState<[string, number][]>([]);
  const [stageEntries, setStageEntries] = useState<[string, number][]>([]);

  // Buscar últimas propriedades recentes
  const fetchImoveis = async () => {
    try {
      setLoadingImoveis(true);
      const { data, error } = await supabase
        .from('imoveisvivareal')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      setImoveis(data || []);
    } catch (err) {
      console.error('Erro ao carregar imoveisvivareal:', err);
      setImoveis([]);
    } finally {
      setLoadingImoveis(false);
    }
  };

  // Buscar distribuição por tipo (sem limitar a 5 itens)
  const fetchTypeDistribution = async () => {
    try {
      const { data, error } = await supabase
        .from('imoveisvivareal')
        .select('tipo_imovel');
      if (error) throw error;
      const counts = (data || []).reduce((acc: Record<string, number>, row: any) => {
        const key = normalizeTypeLabel(row?.tipo_imovel || '');
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      setTypeEntries(entries);
    } catch (err) {
      console.error('Erro ao carregar distribuição por tipo:', err);
      setTypeEntries([]);
    }
  };

  // Buscar distribuição por status (stage) dos leads
  const fetchLeadStages = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('stage');
      if (error) throw error;
      const counts = (data || []).reduce((acc: Record<string, number>, row: any) => {
        const key = (row?.stage || 'Não informado') as string;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      setStageEntries(entries);
    } catch (err) {
      console.error('Erro ao carregar distribuição por stage:', err);
      setStageEntries([]);
    }
  };

  // Carregar KPIs do cabeçalho (totais e variação vs mês anterior)
  const fetchKpis = async () => {
    try {
      setLoadingKpis(true);
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const firstDayThisMonthISO = firstDayThisMonth.toISOString();
      const firstDayNextMonthISO = firstDayNextMonth.toISOString();

      // Totais atuais
      const totalResPromise = supabase
        .from('imoveisvivareal')
        .select('id', { count: 'exact', head: true }) as unknown as Promise<{ count: number | null }>;
      const dispResPromise = supabase
        .from('imoveisvivareal')
        .select('id', { count: 'exact', head: true })
        .eq('disponibilidade', 'disponivel') as unknown as Promise<{ count: number | null }>;
      const leadsResPromise = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true }) as unknown as Promise<{ count: number | null }>;

      // VGV do mês atual (soma de contratos de Venda assinados no mês)
      const vgvCurrentPromise = supabase
        .from('contracts')
        .select('valor, data_assinatura, tipo')
        .eq('tipo', 'Venda')
        .gte('data_assinatura', firstDayThisMonthISO)
        .lt('data_assinatura', firstDayNextMonthISO);

      // Totais até o final do mês anterior (baseline para % de variação)
      const prevTotalsPropsPromise = supabase
        .from('imoveisvivareal')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', firstDayThisMonthISO) as unknown as Promise<{ count: number | null }>;
      const prevTotalsAvailPromise = supabase
        .from('imoveisvivareal')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', firstDayThisMonthISO)
        .eq('disponibilidade', 'disponivel') as unknown as Promise<{ count: number | null }>;
      const prevTotalsLeadsPromise = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', firstDayThisMonthISO) as unknown as Promise<{ count: number | null }>;

      // VGV do mês anterior
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const firstDayThisMonthISO_2 = firstDayThisMonthISO;
      const vgvPrevPromise = supabase
        .from('contracts')
        .select('valor, data_assinatura, tipo')
        .eq('tipo', 'Venda')
        .gte('data_assinatura', firstDayLastMonth)
        .lt('data_assinatura', firstDayThisMonthISO_2);

      const [totalRes, dispRes, leadsRes, vgvNowRes, prevPropsRes, prevAvailRes, prevLeadsRes, vgvPrevRes] = await Promise.all([
        totalResPromise,
        dispResPromise,
        leadsResPromise,
        vgvCurrentPromise,
        prevTotalsPropsPromise,
        prevTotalsAvailPromise,
        prevTotalsLeadsPromise,
        vgvPrevPromise,
      ]);

      const totalProps = (totalRes.count || 0);
      const availProps = (dispRes.count || 0);
      const leadsTotal = (leadsRes.count || 0);
      const vgvNow = Array.isArray(vgvNowRes.data) ? vgvNowRes.data.reduce((s: number, r: any) => s + Number(r.valor || 0), 0) : 0;
      const vgvPrev = Array.isArray(vgvPrevRes.data) ? vgvPrevRes.data.reduce((s: number, r: any) => s + Number(r.valor || 0), 0) : 0;

      setTotalProperties(totalProps);
      setAvailableProperties(availProps);
      setTotalLeads(leadsTotal);
      setVgvCurrent(vgvNow);
      setPreviousData({
        properties: (prevPropsRes.count || 0),
        available: (prevAvailRes.count || 0),
        clients: (prevLeadsRes.count || 0),
        vgv: vgvPrev,
      });
    } catch (error) {
      console.error('💥 Erro ao carregar KPIs:', error);
    } finally {
      setLoadingKpis(false);
    }
  };

  useEffect(() => {
    fetchImoveis();
    fetchTypeDistribution();
    fetchKpis();
    fetchLeadStages();
    // Realtime
    const channel = supabase
      .channel(`dashboard_kpis_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'imoveisvivareal' }, () => { fetchImoveis(); fetchKpis(); fetchTypeDistribution(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => { fetchKpis(); fetchLeadStages(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => { fetchKpis(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loadingImoveis || loadingKpis) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-lg text-gray-400">Carregando dados...</div>
        </div>
      </div>
    );
  }

  // Dados reais dos clientes por origem (mantido)
  const clientsBySource = clients.reduce((acc, client) => {
    acc[client.source] = (acc[client.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const clientsPieData = Object.entries(clientsBySource).map(([name, value]) => ({ name, value }));
  const stagesPieData = stageEntries.map(([name, value]) => ({ name, value }));
  const PIE_COLORS = [
    '#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#f472b6',
    '#22d3ee', '#f43f5e', '#10b981', '#eab308', '#3b82f6'
  ];

  // Função para calcular percentual de mudança
  const calculatePercentageChange = (current: number, previous: number): { change: string, type: "positive" | "negative" | "neutral" } => {
    if (previous === 0) {
      if (current > 0) return { change: "+100%", type: "positive" };
      return { change: "0%", type: "neutral" };
    }
    
    const percentChange = ((current - previous) / previous) * 100;
    const formattedChange = Math.abs(percentChange).toFixed(1);
    
    if (percentChange > 0) {
      return { change: `+${formattedChange}%`, type: "positive" };
    } else if (percentChange < 0) {
      return { change: `-${formattedChange}%`, type: "negative" };
    }
    return { change: "0%", type: "neutral" };
  };

  // Calcular mudanças percentuais
  const propertiesChange = calculatePercentageChange(totalProperties, previousData.properties);
  const availableChange = calculatePercentageChange(availableProperties, previousData.available);
  const clientsChange = calculatePercentageChange(totalLeads, previousData.clients);
  const vgvChange = calculatePercentageChange(vgvCurrent, previousData.vgv);

  const formatCurrencyCompact = (value: number): string => {
    if (value >= 1_000_000_000) return `R$ ${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  const stats = [
    {
      title: "VGV (Venda)",
      value: formatCurrencyCompact(vgvCurrent),
      icon: TrendingUp,
      change: vgvChange.change,
      changeType: vgvChange.type,
    },
    {
      title: "Total de Imóveis",
      value: totalProperties.toString(),
      icon: Building2,
      change: propertiesChange.change,
      changeType: propertiesChange.type,
    },
    {
      title: "Disponíveis",
      value: availableProperties.toString(),
      icon: Eye,
      change: availableChange.change, 
      changeType: availableChange.type,
    },
    {
      title: "Total de Leads",
      value: totalLeads.toString(),
      icon: Users,
      change: clientsChange.change,
      changeType: clientsChange.type,
    },
  ];

  // Normalização de tipos e ícones
  function normalizeTypeLabel(labelRaw: string): string {
    const l = (labelRaw || '').toLowerCase();
    if (l.includes('apart') || l.includes('condo') || l.includes('condom')) return 'Apartamento/Condomínio';
    if (l.includes('cobertura')) return 'Cobertura';
    if (l.includes('duplex') || l.includes('triplex') || l.includes('flat') || l.includes('studio') || l.includes('kit') || l.includes('loft')) return 'Studio/Loft';
    if (l.includes('home') || l.includes('casa') || l.includes('sobrado')) return 'Casa';
    if (l.includes('landlot') || l.includes('land') || l.includes('terreno') || l.includes('lote')) return 'Terreno/Lote';
    if (l.includes('agric') || l.includes('rural') || l.includes('chácara') || l.includes('chacara') || l.includes('sítio') || l.includes('sitio') || l.includes('fazenda')) return 'Rural/Agrícola';
    if (l.includes('comerc') || l.includes('loja') || l.includes('sala') || l.includes('office')) return 'Comercial/Office';
    if (l.includes('industrial') || l.includes('galp')) return 'Industrial/Galpão';
    if (l.includes('hotel') || l.includes('pousada')) return 'Hotel/Pousada';
    if (l.includes('garagem') || l.includes('garage') || l.includes('vaga')) return 'Garagem/Vaga';
    if (l.includes('prédio') || l.includes('predio') || l.includes('edifício') || l.includes('edificio') || l.includes('building') || l.includes('tbuilding')) return 'Prédio/Edifício';
    if (!l.trim().length) return 'Não informado';
    return 'Outros';
  }

  const getTypeIconForNormalized = (normalized: string): string => {
    switch (normalized) {
      case 'Apartamento/Condomínio': return '🏢';
      case 'Cobertura': return '🌇';
      case 'Studio/Loft': return '🏙️';
      case 'Casa': return '🏠';
      case 'Terreno/Lote': return '🏞️';
      case 'Rural/Agrícola': return '🌾';
      case 'Comercial/Office': return '🏪';
      case 'Industrial/Galpão': return '🏭';
      case 'Hotel/Pousada': return '🏨';
      case 'Garagem/Vaga': return '🚗';
      case 'Prédio/Edifício': return '🏢';
      case 'Não informado': return '❔';
      default: return '🏷️';
    }
  };

  // typeEntries agora vem de fetchTypeDistribution (sem limite de 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Visão geral do seu portfólio imobiliário</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <p className={`text-xs mt-1 ${
                stat.changeType === "positive" ? "text-green-400" : 
                stat.changeType === "negative" ? "text-red-400" : "text-gray-400"
              }`}>
                {stat.change} em relação ao mês anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Propriedades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {imoveis.slice(0, 5).map((imovel: any) => (
                <div key={imovel.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{imovel.tipo_imovel || 'Imóvel'}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {imovel.cidade || '—'}{imovel.bairro ? `, ${imovel.bairro}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      R$ {((Number(imovel.preco) || 0) / 1000).toFixed(0)}k
                    </p>
                    <p className="text-xs px-2 py-1 rounded-full text-blue-400 bg-blue-400/10">VivaReal</p>
                  </div>
                </div>
              ))}
              {imoveis.length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  Nenhuma propriedade cadastrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-2">
              <div className="flex items-center justify-center gap-2">
                <Users className="h-5 w-5 text-gray-300" />
                <span className="text-white font-semibold tracking-wide uppercase">ORIGEM DOS CLIENTES</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <ListChecks className="h-5 w-5 text-gray-300" />
                <span className="text-white font-semibold tracking-wide uppercase">STATUS DOS CLIENTES</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Origem */}
              <div className="space-y-4">
                <div className="space-y-2 h-40 overflow-auto">
                  {Object.entries(clientsBySource).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{source}</span>
                      <span className="text-sm font-medium text-white">{count}</span>
                    </div>
                  ))}
                  {Object.keys(clientsBySource).length === 0 && (
                    <div className="text-center py-4 text-gray-400">Nenhum cliente cadastrado</div>
                  )}
                </div>
                {clientsPieData.length > 0 && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip wrapperStyle={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#e5e7eb' }} />
                        <Legend />
                        <Pie data={clientsPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                          {clientsPieData.map((entry, index) => (
                            <Cell key={`cell-origin-${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                          <LabelList dataKey="value" position="outside" className="fill-gray-300" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Status (stage) */}
              <div className="space-y-4 md:border-l md:border-gray-700 md:pl-6">
                <div className="space-y-2 h-40 overflow-auto">
                  {stageEntries.map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{stage}</span>
                      <span className="text-sm font-medium text-white">{count}</span>
                    </div>
                  ))}
                  {stageEntries.length === 0 && (
                    <div className="text-center py-4 text-gray-400">Sem dados de status</div>
                  )}
                </div>
                {stagesPieData.length > 0 && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip wrapperStyle={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#e5e7eb' }} />
                        <Legend />
                        <Pie data={stagesPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                          {stagesPieData.map((entry, index) => (
                            <Cell key={`cell-stage-${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                          <LabelList dataKey="value" position="outside" className="fill-gray-300" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300 flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  Total de Leads
                </span>
                <span className="text-white font-medium">{totalLeads}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widget de Próximos Compromissos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingAppointments onViewAll={onNavigateToAgenda} />

        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {typeEntries.map(([label, count]) => (
                <div key={label} className="p-4 rounded-lg bg-gray-700/30 text-center">
                  <div className="text-2xl mb-2">{getTypeIconForNormalized(label)}</div>
                  <div className="text-lg font-semibold text-white">{count}</div>
                  <div className="text-sm text-gray-300 break-words">{label}</div>
                </div>
              ))}
              {typeEntries.length === 0 && (
                <div className="col-span-2 md:col-span-4 text-center text-gray-400">Sem dados de tipo</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Novo card: Atividades Recentes */}
      <div className="grid grid-cols-1 gap-6">
        <RecentActivitiesCard />
      </div>
    </div>
  );
}
