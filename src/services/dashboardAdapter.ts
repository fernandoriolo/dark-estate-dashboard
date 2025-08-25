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
import { normalizePropertyType, mapChannelName, normalizeLeadStage } from '@/lib/charts/normalizers';
import { getVgvImoveisByPeriod } from './metrics';

// Types esperados pelo componente atual
export type VgvPeriod = 'anual' | 'mensal' | 'semanal' | 'diario' | 'todo';
export type TimeRange = 'total' | 'year' | 'month' | 'week' | 'day';

// ============================================================================
// Funções de Data (Helpers)
// ============================================================================
const getCurrentYear = (): { from: Date, to: Date } => {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear(), 11, 31)
  };
};

const getCurrentMonth = (): { from: Date, to: Date } => {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0)
  };
};

const getCurrentWeek = (): { from: Date, to: Date } => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 for Sunday, 6 for Saturday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return {
    from: startOfWeek,
    to: endOfWeek
  };
};

const getToday = (): { from: Date, to: Date } => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 6); // Começa 6 dias atrás para ter um range de 7 dias
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  return { from, to };
};

const getTotal = (): { from: Date, to: Date } => {
  const now = new Date();
  return {
    from: new Date(now.getFullYear() - 2, 0, 1), // 2 anos atrás
    to: now
  };
};

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

function getVgvPeriodConfig(period: VgvPeriod) {
  const now = new Date();
  let from: Date = new Date(now);
  let to: Date = new Date(now);
  let granularity: 'day' | 'week' | 'month' | 'year';

  switch (period) {
    case 'anual':
      // Últimos 3 anos + ano atual = 4 anos próximos à data atual
      from.setFullYear(now.getFullYear() - 3);
      from.setMonth(0, 1); // 1º de janeiro
      to.setFullYear(now.getFullYear());
      to.setMonth(11, 31); // 31 de dezembro do ano atual
      granularity = 'year';
      break;
    case 'mensal':
      // Últimos 12 meses a partir do mês atual
      from.setMonth(now.getMonth() - 11);
      from.setDate(1); // Primeiro dia do mês
      to.setDate(new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate()); // Último dia do mês atual
      granularity = 'month';
      break;
    case 'semanal':
      // Últimas 8 semanas a partir da semana atual
      from.setDate(now.getDate() - (8 * 7));
      granularity = 'week';
      break;
    case 'diario':
      // Últimos 30 dias a partir de hoje
      from.setDate(now.getDate() - 30);
      granularity = 'day';
      break;
    default: // 'todo'
      // Últimos 2 anos completos + ano atual (período mais recente e relevante)
      from.setFullYear(now.getFullYear() - 2);
      from.setMonth(0, 1); // 1º de janeiro de 2 anos atrás
      granularity = 'year';
      break;
  }

  // Normalizar datas para início/fim do dia
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  console.log(`📅 [getVgvPeriodConfig] Período "${period}":`, {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    granularity
  });

  return { from, to, granularity };
}

/**
 * Busca o VGV total e a quantidade total de imóveis.
 */
export async function fetchVgvTotals(): Promise<{ totalVgv: number; totalImoveis: number }> {
  try {
    const from = new Date('2000-01-01').toISOString();
    const to = new Date().toISOString();
    const rows = await getVgvImoveisByPeriod({ from, to, granularity: 'total' });
    const row = rows[0] ?? { vgv: 0, imoveis: 0 };
    return { totalVgv: row.vgv, totalImoveis: row.imoveis };
  } catch (error) {
    console.error('Erro ao buscar VGV total de imóveis:', error);
    return { totalVgv: 0, totalImoveis: 0 };
  }
}

// ============================================================================
// Funções de Leads
// ============================================================================
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
    console.log('🕐 [fetchLeadsPorTempo] Iniciando busca para timeRange:', timeRange);
    const config = getTimeRangeConfig(timeRange);
    console.log('🕐 [fetchLeadsPorTempo] Configuração:', config);
    
    const data = await getLeadsByPeriod(config);
    console.log('🕐 [fetchLeadsPorTempo] Dados recebidos:', data);
    
    const result = data.map(item => ({
      month: config.granularity === 'month' ? monthLabel(item.period) : item.period,
      count: item.value
    }));
    
    console.log('🕐 [fetchLeadsPorTempo] Resultado formatado:', result);
    return result;
  } catch (error) {
    console.error('🕐 [fetchLeadsPorTempo] ERRO ao buscar leads por tempo:', error);
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

/**
 * Fetch VGV e Qtd de Imóveis por período com preenchimento de lacunas
 */
export async function fetchVgvByPeriod(period: VgvPeriod): Promise<{ month: string; vgv: number; qtd: number }[]> {
  try {
    const config = getVgvPeriodConfig(period);
    const sparseData = await getVgvImoveisByPeriod({
      from: config.from.toISOString(),
      to: config.to.toISOString(),
      granularity: config.granularity,
    });

    const dataMap = new Map(
      sparseData
        .filter(item => item.bucket)
        .map(item => {
          const date = new Date(item.bucket!);
          const key = date.toISOString().split('T')[0];
          return [key, { vgv: item.vgv, qtd: item.imoveis }];
        })
    );

    const filledData: { month: string; vgv: number; qtd: number }[] = [];
    const iterator = new Date(config.from);
    iterator.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(config.to);
    endDate.setUTCHours(0, 0, 0, 0);

    let weekCounter = 1;
    const startOfFirstWeek = new Date(config.from);

    while (iterator <= endDate) {
      const key = iterator.toISOString().split('T')[0];
      const dataPoint = dataMap.get(key) || { vgv: 0, qtd: 0 };
      
      let label = key;
      switch (config.granularity) {
        case 'year':
          label = iterator.getUTCFullYear().toString();
          break;
        case 'month':
          label = `${iterator.getUTCFullYear()}-${String(iterator.getUTCMonth() + 1).padStart(2, '0')}`;
          break;
        case 'week':
          // Calcular número da semana baseado no início do período
          const weeksDiff = Math.floor((iterator.getTime() - startOfFirstWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));
          label = `Sem ${weekCounter + weeksDiff}`;
          break;
        case 'day':
          // Formato DD/MM para dias
          label = iterator.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          break;
        default:
          label = key;
      }

      filledData.push({ month: label, ...dataPoint });

      switch (config.granularity) {
        case 'year':
          iterator.setUTCFullYear(iterator.getUTCFullYear() + 1);
          break;
        case 'month':
          iterator.setUTCMonth(iterator.getUTCMonth() + 1);
          break;
        case 'week':
          iterator.setUTCDate(iterator.getUTCDate() + 7);
          break;
        default: // day
          iterator.setUTCDate(iterator.getUTCDate() + 1);
          break;
      }
    }
    
    return filledData;

  } catch (error) {
    console.error('Erro ao buscar VGV por período:', error);
    return [];
  }
}
