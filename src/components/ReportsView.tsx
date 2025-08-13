import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, Download } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function ReportsView() {
  const { properties, loading: propertiesLoading } = useProperties();
  const { clients, loading: clientsLoading } = useClients();
  const { toast } = useToast();

  const isLoading = propertiesLoading || clientsLoading;

  const handlePropertiesExport = () => {
    try {
      console.log('Iniciando geração do relatório de propriedades...');
      console.log('Propriedades disponíveis:', properties);
      
      if (!properties || properties.length === 0) {
        toast({
          title: "Aviso",
          description: "Não há propriedades para gerar o relatório.",
          variant: "destructive",
        });
        return;
      }

      const doc = new jsPDF();
      const today = new Date().toLocaleDateString('pt-BR');
      
      // Configurar título
      doc.setFontSize(20);
      doc.text('Relatório de Propriedades', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Gerado em: ${today}`, 20, 35);
      
      // Resumo geral
      doc.setFontSize(14);
      doc.text('Resumo Geral', 20, 55);
      
      const availableProperties = properties.filter(p => p && p.status === 'available') || [];
      const soldProperties = properties.filter(p => p && p.status === 'sold') || [];
      const rentedProperties = properties.filter(p => p && p.status === 'rented') || [];
      
      doc.setFontSize(10);
      doc.text(`Total de Propriedades: ${properties.length}`, 20, 70);
      doc.text(`Disponíveis: ${availableProperties.length}`, 20, 80);
      doc.text(`Vendidas: ${soldProperties.length}`, 20, 90);
      doc.text(`Alugadas: ${rentedProperties.length}`, 20, 100);
      
      // Tabela por status
      doc.setFontSize(14);
      doc.text('Distribuição por Status', 20, 120);
      
      const statusData = [
        ['Disponível', availableProperties.length.toString(), properties.length > 0 ? `${((availableProperties.length / properties.length) * 100).toFixed(1)}%` : '0%'],
        ['Vendida', soldProperties.length.toString(), properties.length > 0 ? `${((soldProperties.length / properties.length) * 100).toFixed(1)}%` : '0%'],
        ['Alugada', rentedProperties.length.toString(), properties.length > 0 ? `${((rentedProperties.length / properties.length) * 100).toFixed(1)}%` : '0%']
      ];
      
      console.log('Dados da tabela de status:', statusData);
      
      autoTable(doc, {
        head: [['Status', 'Quantidade', '% do Total']],
        body: statusData,
        startY: 130,
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [75, 85, 99],
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });
      
      // Tabela por tipo
      let yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 200;
      doc.setFontSize(14);
      doc.text('Distribuição por Tipo', 20, yPosition);
      
      const houseCount = properties.filter(p => p && p.type === 'house').length || 0;
      const apartmentCount = properties.filter(p => p && p.type === 'apartment').length || 0;
      const commercialCount = properties.filter(p => p && p.type === 'commercial').length || 0;
      const landCount = properties.filter(p => p && p.type === 'land').length || 0;
      
      const typeData = [
        ['Casas', houseCount.toString(), properties.length > 0 ? `${((houseCount / properties.length) * 100).toFixed(1)}%` : '0%'],
        ['Apartamentos', apartmentCount.toString(), properties.length > 0 ? `${((apartmentCount / properties.length) * 100).toFixed(1)}%` : '0%'],
        ['Comercial', commercialCount.toString(), properties.length > 0 ? `${((commercialCount / properties.length) * 100).toFixed(1)}%` : '0%'],
        ['Terrenos', landCount.toString(), properties.length > 0 ? `${((landCount / properties.length) * 100).toFixed(1)}%` : '0%']
      ];
      
      console.log('Dados da tabela de tipos:', typeData);
      
      autoTable(doc, {
        head: [['Tipo', 'Quantidade', '% do Total']],
        body: typeData,
        startY: yPosition + 10,
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });
      
      // Rodapé
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.text('Relatório gerado pelo Sistema ImobiPro', 20, pageHeight - 20);
      doc.text(`© ${new Date().getFullYear()} - Todos os direitos reservados`, 20, pageHeight - 10);
      
      console.log('Salvando PDF...');
      doc.save(`relatorio-propriedades-${today.replace(/\//g, '-')}.pdf`);
      
      toast({
        title: "Relatório gerado!",
        description: "O relatório de propriedades foi baixado em PDF com sucesso.",
      });
      
    } catch (error) {
      console.error('Erro detalhado ao gerar relatório:', error);
      console.error('Stack trace:', error.stack);
      toast({
        title: "Erro na exportação",
        description: `Erro: ${error.message || 'Erro desconhecido ao gerar relatório'}`,
        variant: "destructive",
      });
    }
  };

  const handleMarketAnalysisExport = () => {
    try {
      console.log('Iniciando geração da análise de mercado...');
      
      if (!properties || properties.length === 0) {
        toast({
          title: "Aviso",
          description: "Não há dados suficientes para gerar a análise de mercado.",
          variant: "destructive",
        });
        return;
      }

      const doc = new jsPDF();
      const today = new Date().toLocaleDateString('pt-BR');
      
      // Configurar título
      doc.setFontSize(20);
      doc.text('Análise de Mercado', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Gerado em: ${today}`, 20, 35);
      
      // Resumo geral
      doc.setFontSize(14);
      doc.text('Resumo de Leads', 20, 55);
      
      const totalLeads = clients ? clients.length : 0;
      const activeSources = clients && clients.length > 0 ? new Set(clients.map(c => c.source)).size : 0;
      
      doc.setFontSize(10);
      doc.text(`Total de Leads: ${totalLeads}`, 20, 70);
      doc.text(`Fontes Ativas: ${activeSources}`, 20, 80);
      doc.text(`Total de Propriedades: ${properties.length}`, 20, 90);
      
      // Origem dos leads
      if (clients && clients.length > 0) {
        doc.setFontSize(14);
        doc.text('Origem dos Leads', 20, 110);
        
        const leadsBySource = clients.reduce((acc, client) => {
          if (client && client.source) {
            acc[client.source] = (acc[client.source] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const leadsData = Object.entries(leadsBySource).map(([source, count]) => [
          source || 'Não informado',
          count.toString(),
          clients.length > 0 ? `${((count / clients.length) * 100).toFixed(1)}%` : '0%'
        ]);
        
        autoTable(doc, {
          head: [['Origem', 'Quantidade', '% do Total']],
          body: leadsData,
          startY: 120,
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [75, 85, 99],
            textColor: 255,
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
        });
      }
      
      // Análise de propriedades por faixa de preço
      let yPosition = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 140;
      doc.setFontSize(14);
      doc.text('Propriedades por Faixa de Preço', 20, yPosition);
      
      const range1 = properties.filter(p => p && p.price && p.price <= 200000).length || 0;
      const range2 = properties.filter(p => p && p.price && p.price > 200000 && p.price <= 500000).length || 0;
      const range3 = properties.filter(p => p && p.price && p.price > 500000 && p.price <= 1000000).length || 0;
      const range4 = properties.filter(p => p && p.price && p.price > 1000000).length || 0;
      
      const priceData = [
        ['Até R$ 200.000', range1.toString(), properties.length > 0 ? `${((range1 / properties.length) * 100).toFixed(1)}%` : '0%'],
        ['R$ 200.001 - R$ 500.000', range2.toString(), properties.length > 0 ? `${((range2 / properties.length) * 100).toFixed(1)}%` : '0%'],
        ['R$ 500.001 - R$ 1.000.000', range3.toString(), properties.length > 0 ? `${((range3 / properties.length) * 100).toFixed(1)}%` : '0%'],
        ['Acima de R$ 1.000.000', range4.toString(), properties.length > 0 ? `${((range4 / properties.length) * 100).toFixed(1)}%` : '0%']
      ];
      
      autoTable(doc, {
        head: [['Faixa de Preço', 'Quantidade', '% do Total']],
        body: priceData,
        startY: yPosition + 10,
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });
      
      // Rodapé
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.text('Relatório gerado pelo Sistema ImobiPro', 20, pageHeight - 20);
      doc.text(`© ${new Date().getFullYear()} - Todos os direitos reservados`, 20, pageHeight - 10);
      
      doc.save(`analise-mercado-${today.replace(/\//g, '-')}.pdf`);
      
      toast({
        title: "Relatório gerado!",
        description: "A análise de mercado foi baixada em PDF com sucesso.",
      });
      
    } catch (error) {
      console.error('Erro detalhado ao gerar análise de mercado:', error);
      toast({
        title: "Erro na exportação",
        description: `Erro: ${error.message || 'Erro desconhecido ao gerar análise de mercado'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Relatórios</h1>
        <p className="text-gray-400">Visualize e exporte relatórios detalhados em PDF</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Propriedades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">Relatório completo de todas as propriedades</p>
            <div className="space-y-2 text-sm text-gray-300 mb-4">
              <div>Total de propriedades: {properties.length}</div>
              <div>Disponíveis: {properties.filter(p => p.status === 'available').length}</div>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handlePropertiesExport}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              {isLoading ? "Carregando..." : "Exportar PDF"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Análise de Mercado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">Análise de tendências e origem de clientes</p>
            <div className="space-y-2 text-sm text-gray-300 mb-4">
              <div>Total de leads: {clients.length}</div>
              <div>Fontes ativas: {new Set(clients.map(c => c.source)).size}</div>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleMarketAnalysisExport}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              {isLoading ? "Carregando..." : "Exportar PDF"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
