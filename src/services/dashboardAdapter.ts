/**
 * Adapter que mapeia dados do novo services/metrics.ts 
 * para o formato esperado pelos componentes MUI X-Charts
 */
import {
  getLeadsByChannel,
  getLeadsByPeriod,
  getLeadsFunnel,
  getLeadsByBroker,
  getPropertyTypeDist,
  getAvailabilityRate,
  getConvoHeatmap,
  getMostSearchedProperties,
  getAvailableBrokers,
  getLastMonths,
  getCurrentMonth,
  getCurrentYear,
  type ChartPoint,
  type TimeBucket,
  type BrokerStats,
  type HeatmapData,
  type AvailabilityStats,
  type TimeGranularity,
  type DateRange
} from './metrics';
import { monthLabel } from '@/lib/charts/formatters';

// Types esperados pelo componente atual
export type VgvPeriod = 'todo' | 'anual' | 'mensal' | 'semanal' | 'diario';
export type TimeRange = 'total' | 'year' | 'month' | 'week' | 'day';

// Mapeamento de períodos VGV para configurações do novo serviço
function getVgvDateRange(period: VgvPeriod): DateRange & { granularity: TimeGranularity } {
  const now = new Date();
  
  switch (period) {
    case 'todo':
      // Últimos 3 anos
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(now.getFullYear() - 3);
      return {
        from: threeYearsAgo,
        to: now,
        granularity: 'year'
      };
    
    case 'anual':
      // Últimos 5 anos
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(now.getFullYear() - 5);
      return {
        from: fiveYearsAgo,
        to: now,
        granularity: 'year'
      };
    
    case 'mensal':
      // Últimos 12 meses
      return {
        ...getLastMonths(12),
        granularity: 'month'
      };
    
    case 'semanal':
      // Últimas 12 semanas
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(now.getDate() - (12 * 7));
      return {
        from: twelveWeeksAgo,
        to: now,
        granularity: 'week'
      };
    
    case 'diario':
      // Últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return {
        from: thirtyDaysAgo,
        to: now,
        granularity: 'day'
      };
  }
}

// Mapeamento de TimeRange para configurações do novo serviço
function getTimeRangeConfig(timeRange: TimeRange): DateRange & { granularity: TimeGranularity } {
  switch (timeRange) {
    case 'total':
      return {
        ...getLastMonths(24), // 2 anos
        granularity: 'month'
      };
    
    case 'year':
      return {
        ...getCurrentYear(),
        granularity: 'month'
      };
    
    case 'month':
      return {
        ...getCurrentMonth(),
        granularity: 'day'
      };
    
    case 'week':
      // Últimas 12 semanas
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(new Date().getDate() - (12 * 7));
      return {
        from: twelveWeeksAgo,
        to: new Date(),
        granularity: 'week'
      };
    
    case 'day':
      // Últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(new Date().getDate() - 30);
      return {
        from: thirtyDaysAgo,
        to: new Date(),
        granularity: 'day'
      };
  }
}

/**
 * Adapter para VGV - simula dados de contratos (será implementado futuramente)
 */
export async function fetchVgvByPeriod(period: VgvPeriod): Promise<{ month: string; vgv: number; qtd: number }[]> {
  try {
    const config = getVgvDateRange(period);
    const data = await getLeadsByPeriod(config);
    
    // Por enquanto simula VGV baseado nos leads
    // TODO: Implementar consulta real de contratos quando tabela estiver disponível
    return data.map(item => {
      const fakeVgv = item.value * 150000; // R$ 150k por lead (simulação)
      const qtd = Math.max(1, Math.floor(item.value / 3)); // 1 imóvel a cada 3 leads
      
      return {
        month: item.period,
        vgv: fakeVgv,
        qtd
      };
    });
    
  } catch (error) {
    console.error('Erro ao buscar VGV:', error);
    return [];
  }
}

/**
 * Adapter para leads por canal (já compatível)
 */
export async function fetchLeadsPorCanalTop8(): Promise<{ name: string; value: number }[]> {
  try {
    const data = await getLeadsByChannel(getLastMonths(12));
    return data;
  } catch (error) {
    console.error('Erro ao buscar leads por canal:', error);
    return [];
  }
}

/**
 * Adapter para distribuição por tipo (já compatível)
 */
export async function fetchDistribuicaoPorTipo(): Promise<{ name: string; value: number }[]> {
  try {
    const data = await getPropertyTypeDist(getLastMonths(12));
    return data;
  } catch (error) {
    console.error('Erro ao buscar distribuição por tipo:', error);
    return [];
  }
}

/**
 * Adapter para funil de leads (já compatível)
 */
export async function fetchFunilLeads(): Promise<{ name: string; value: number }[]> {
  try {
    const data = await getLeadsFunnel(getLastMonths(12));
    return data;
  } catch (error) {
    console.error('Erro ao buscar funil de leads:', error);
    return [];
  }
}

/**
 * Adapter para leads por corretor
 */
export async function fetchLeadsPorCorretor(): Promise<{ name: string; value: number }[]> {
  try {
    const data = await getLeadsByBroker(getLastMonths(12));
    return data.map(broker => ({
      name: broker.name,
      value: broker.totalLeads
    }));
  } catch (error) {
    console.error('Erro ao buscar leads por corretor:', error);
    return [];
  }
}

/**
 * Adapter para leads sem corretor
 */
export async function fetchLeadsSemCorretor(): Promise<number> {
  try {
    const data = await getLeadsByBroker(getLastMonths(12));
    const unassigned = data.find(broker => broker.id === 'unassigned');
    return unassigned?.totalLeads || 0;
  } catch (error) {
    console.error('Erro ao buscar leads sem corretor:', error);
    return 0;
  }
}

/**
 * Adapter para leads por tempo
 */
export async function fetchLeadsPorTempo(timeRange: TimeRange): Promise<{ month: string; count: number }[]> {
  try {
    const config = getTimeRangeConfig(timeRange);
    const data = await getLeadsByPeriod(config);
    
    return data.map(item => ({
      month: config.granularity === 'month' ? monthLabel(item.period) : item.period,
      count: item.value
    }));
  } catch (error) {
    console.error('Erro ao buscar leads por tempo:', error);
    return [];
  }
}

/**
 * Adapter para heatmap de conversas
 */
export async function fetchHeatmapConversasPorCorretor(brokerId?: string): Promise<number[][]> {
  try {
    const data = await getConvoHeatmap(getLastMonths(1), brokerId);
    return data.grid;
  } catch (error) {
    console.error('Erro ao buscar heatmap de conversas:', error);
    // Retorna matriz vazia 7x24
    return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  }
}

/**
 * Adapter para corretores com conversas
 */
export async function fetchCorretoresComConversas(): Promise<{ id: string; name: string }[]> {
  try {
    return await getAvailableBrokers();
  } catch (error) {
    console.error('Erro ao buscar corretores com conversas:', error);
    return [];
  }
}

/**
 * Adapter para taxa de ocupação
 */
export async function fetchTaxaOcupacao(): Promise<{
  ocupacao: number;
  total: number;
  disponiveis: number;
  reforma?: number;
  indisponiveis?: number;
  breakdown?: { status: string; total: number; percent: number }[]
}> {
  try {
    const data = await getAvailabilityRate();
    
    return {
      ocupacao: data.occupancyRate,
      total: data.total,
      disponiveis: data.available,
      reforma: data.reform,
      indisponiveis: data.unavailable,
      breakdown: data.breakdown.map(item => ({
        status: item.status,
        total: item.count,
        percent: item.percentage
      }))
    };
  } catch (error) {
    console.error('Erro ao buscar taxa de ocupação:', error);
    return {
      ocupacao: 0,
      total: 0,
      disponiveis: 0,
      reforma: 0,
      indisponiveis: 0,
      breakdown: []
    };
  }
}

/**
 * Adapter para imóveis mais procurados
 */
export async function fetchImoveisMaisProcurados(): Promise<{ id: string; name: string; value: number }[]> {
  try {
    const data = await getMostSearchedProperties(getLastMonths(12));
    return data.map(item => ({
      id: item.name.replace('Imóvel ', ''), // Remove prefixo "Imóvel "
      name: item.name,
      value: item.value
    }));
  } catch (error) {
    console.error('Erro ao buscar imóveis mais procurados:', error);
    return [];
  }
}

/**
 * Adapter para leads por corretor e estágio (função legada mantida para compatibilidade)
 */
export async function fetchLeadsCorretorEstagio(): Promise<Map<string, Record<string, number>>> {
  try {
    // Esta função era usada para dados mais detalhados de estágios por corretor
    // Por simplicidade, retorna Map vazio - pode ser implementada futuramente se necessário
    return new Map();
  } catch (error) {
    console.error('Erro ao buscar leads por corretor e estágio:', error);
    return new Map();
  }
}

/**
 * Função helper para gerar fallback de dados temporais vazios
 */
export function generateTemporalFallback(months: number = 6): { month: string; count: number }[] {
  const fallback = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    fallback.push({
      month: monthLabel(key),
      count: 0
    });
  }
  return fallback;
}

// Função legada mantida para compatibilidade - apenas placeholder
export async function fetchHeatmapConversas(): Promise<number[][]> {
  return fetchHeatmapConversasPorCorretor();
}
