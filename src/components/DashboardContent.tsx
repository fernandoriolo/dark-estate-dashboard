
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  TrendingUp, 
  Eye, 
  Users
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UpcomingAppointments } from "@/components/UpcomingAppointments";
import { RecentActivitiesCard } from "@/components/RecentActivitiesCard";
import { DashboardCharts } from "@/components/DashboardCharts";
import { fetchVgvTotals } from '@/services/dashboardAdapter';
import React from 'react';

export function DashboardContent() {
  const [kpi, setKpi] = useState({
    vgv: 0,
    totalImoveis: 0,
    imoveisDisponiveis: 0,
    totalLeads: 0
  });
  const [loadingKpis, setLoadingKpis] = useState(true);

  const fetchKpis = async () => {
    try {
      setLoadingKpis(true);

      const vgvPromise = fetchVgvTotals();
      const leadsPromise = supabase.from('leads').select('id', { count: 'exact', head: true });
      const imoveisDisponiveisPromise = supabase.from('imoveisvivareal').select('id', { count: 'exact', head: true }).eq('disponibilidade', 'disponivel');

      const [vgvResult, leadsResult, imoveisDisponiveisResult] = await Promise.all([
        vgvPromise,
        leadsPromise,
        imoveisDisponiveisPromise
      ]);
      
      setKpi({
        vgv: vgvResult.totalVgv,
        totalImoveis: vgvResult.totalImoveis,
        totalLeads: leadsResult.count ?? 0,
        imoveisDisponiveis: imoveisDisponiveisResult.count ?? 0
      });

    } catch (error) {
      console.error('💥 Erro ao carregar KPIs:', error);
    } finally {
      setLoadingKpis(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    const channel = supabase
      .channel(`dashboard_kpis_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'imoveisvivareal' }, fetchKpis)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchKpis)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loadingKpis) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-lg text-gray-400">Carregando dados...</div>
        </div>
      </div>
    );
  }

  const formatCurrencyCompact = (value: number): string => {
    if (value >= 1_000_000_000) return `R$ ${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  const stats = [
    {
      title: "VGV",
      value: formatCurrencyCompact(kpi.vgv),
      icon: TrendingUp,
      description: "Valor Geral de Imóveis"
    },
    {
      title: "Total de Imóveis",
      value: kpi.totalImoveis.toString(),
      icon: Building2,
      description: "Imóveis na base de dados"
    },
    {
      title: "Disponíveis",
      value: kpi.imoveisDisponiveis.toString(),
      icon: Eye,
      description: "Imóveis disponíveis para venda"
    },
    {
      title: "Total de Leads",
      value: kpi.totalLeads.toString(),
      icon: Users,
      description: "Leads capturados"
    },
  ];

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
              <p className="text-xs text-gray-400">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* NOVA SESSÃO: Conjunto de gráficos */}
      <div className="mb-6">
        <DashboardCharts />
      </div>

      {/* 2ª sessão: Propriedades Recentes + Próximos Compromissos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivitiesCard />
        <UpcomingAppointments />
      </div>
    </div>
  );
}
