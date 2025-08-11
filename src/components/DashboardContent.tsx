
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp, Eye, Globe, Users, MapPin } from "lucide-react";
import { PropertyWithImages } from "@/hooks/useProperties";
import { useClients } from "@/hooks/useClients";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UpcomingAppointments } from "@/components/UpcomingAppointments";
import { LayoutPreview } from "@/components/LayoutPreview";

interface DashboardContentProps {
  properties: PropertyWithImages[];
  loading: boolean;
  onNavigateToAgenda?: () => void;
}

export function DashboardContent({ properties, loading, onNavigateToAgenda }: DashboardContentProps) {
  const { clients, loading: clientsLoading } = useClients();
  // Fonte oficial agora: tabela imoveisvivareal
  const [imoveis, setImoveis] = useState<any[]>([]);
  const [loadingImoveis, setLoadingImoveis] = useState(true);
  const [previousMonthData, setPreviousMonthData] = useState({
    properties: 0,
    available: 0,
    averagePrice: 0,
    clients: 0,
    vgv: 0,
  });
  const [loadingPreviousData, setLoadingPreviousData] = useState(true);

  // Buscar imóveis da tabela imoveisvivareal
  const fetchImoveis = async () => {
    try {
      setLoadingImoveis(true);
      const { data, error } = await supabase
        .from('imoveisvivareal')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setImoveis(data || []);
    } catch (err) {
      console.error('Erro ao carregar imoveisvivareal:', err);
      setImoveis([]);
    } finally {
      setLoadingImoveis(false);
    }
  };

  // Função para calcular dados do mês anterior
  const fetchPreviousMonthData = async () => {
    try {
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      console.log('📊 Buscando dados do mês anterior...');
      console.log('📅 Período:', firstDayLastMonth.toISOString(), 'até', lastDayLastMonth.toISOString());

      // Buscar imóveis do mês anterior (imoveisvivareal)
      const { data: prevImoveis, error: imoveisError } = await supabase
        .from('imoveisvivareal')
        .select('*')
        .gte('created_at', firstDayLastMonth.toISOString())
        .lt('created_at', firstDayThisMonth.toISOString());

      if (imoveisError) {
        console.error('❌ Erro ao buscar imóveis do mês anterior:', imoveisError);
      }

      // Buscar clientes do mês anterior
      const { data: prevClients, error: clientsError } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', firstDayLastMonth.toISOString())
        .lt('created_at', firstDayThisMonth.toISOString());

      if (clientsError) {
        console.error('❌ Erro ao buscar clientes do mês anterior:', clientsError);
      }

      const prevPropertiesData = prevImoveis || [];
      const isModalidadeVenda = (modalidade: string | null | undefined) => {
        const m = (modalidade || '').toLowerCase();
        return m === 'for sale' || m === 'for sale/rent' || m.includes('for sale');
      };
      const prevClientsData = prevClients || [];

      // imoveisvivareal não tem status; considerar todos como disponíveis para métricas básicas
      const prevAvailable = prevPropertiesData.length;
      const prevVgvVenda = prevPropertiesData
        .filter((prop: any) => isModalidadeVenda(prop?.modalidade))
        .reduce((sum: number, prop: any) => sum + (Number(prop.preco) || 0), 0);
      const prevAveragePrice = prevPropertiesData.length > 0
        ? prevPropertiesData.reduce((sum: number, prop: any) => sum + (Number(prop.preco) || 0), 0) / prevPropertiesData.length
        : 0;

      setPreviousMonthData({
        properties: prevPropertiesData.length,
        available: prevAvailable,
        averagePrice: prevAveragePrice,
        clients: prevClientsData.length,
        vgv: prevVgvVenda,
      });

      console.log('✅ Dados do mês anterior carregados:', {
        properties: prevPropertiesData.length,
        available: prevAvailable,
        averagePrice: prevAveragePrice,
        clients: prevClientsData.length,
      });

    } catch (error) {
      console.error('💥 Erro ao buscar dados do mês anterior:', error);
    } finally {
      setLoadingPreviousData(false);
    }
  };

  useEffect(() => {
    fetchImoveis();
  }, []);

  useEffect(() => {
    if (!loadingImoveis && !clientsLoading) {
      fetchPreviousMonthData();
    }
  }, [loadingImoveis, clientsLoading]);

  if (loadingImoveis || clientsLoading || loadingPreviousData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-lg text-gray-400">Carregando dados...</div>
        </div>
      </div>
    );
  }

  const totalProperties = imoveis.length;
  // Sem status no esquema imoveisvivareal
  const availableProperties = totalProperties;
  const soldProperties = 0;
  const rentedProperties = 0;
  
  const isModalidadeVenda = (modalidade: string | null | undefined) => {
    const m = (modalidade || '').toLowerCase();
    return m === 'for sale' || m === 'for sale/rent' || m.includes('for sale');
  };

  const totalValueVenda = imoveis
    .filter((imovel: any) => isModalidadeVenda(imovel?.modalidade))
    .reduce((sum: number, imovel: any) => sum + (Number(imovel.preco) || 0), 0);

  // VGV deve considerar apenas imóveis de venda (For Sale ou For Sale/Rent)
  const totalValue = totalValueVenda;

  // Dados reais dos clientes por origem
  const clientsBySource = clients.reduce((acc, client) => {
    acc[client.source] = (acc[client.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalClients = clients.length;

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
  const propertiesChange = calculatePercentageChange(totalProperties, previousMonthData.properties);
  const availableChange = calculatePercentageChange(availableProperties, previousMonthData.available);
  const clientsChange = calculatePercentageChange(totalClients, previousMonthData.clients);
  const vgvChange = calculatePercentageChange(totalValue, previousMonthData.vgv);

  const formatCurrencyCompact = (value: number): string => {
    if (value >= 1_000_000_000) return `R$ ${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  const stats = [
    {
      title: "VGV (Venda)",
      value: formatCurrencyCompact(totalValue),
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
      value: totalClients.toString(),
      icon: Users,
      change: clientsChange.change,
      changeType: clientsChange.type,
    },
  ];

  // Normalização de tipos e ícones
  const normalizeTypeLabel = (labelRaw: string): string => {
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
  };

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

  // Distribuição por tipo normalizada
  const typeCounts = imoveis.reduce((acc: Record<string, number>, imovel: any) => {
    const key = normalizeTypeLabel(imovel.tipo_imovel || '');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm lg:col-span-2">
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
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Origem dos Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                {Object.entries(clientsBySource).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{source}</span>
                    <span className="text-sm font-medium text-white">{count}</span>
                  </div>
                ))}
                {Object.keys(clientsBySource).length === 0 && (
                  <div className="text-center py-4 text-gray-400">
                    Nenhum cliente cadastrado
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    Total de Leads
                  </span>
                  <span className="text-white font-medium">{totalClients}</span>
                </div>
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
    </div>
  );
}
