import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, Download } from "lucide-react";

function ReportsView() {
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
              <div>Total de propriedades: 0</div>
              <div>Disponíveis: 0</div>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled
            >
              <Download className="h-4 w-4 mr-2" />
              Em desenvolvimento
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
              <div>Total de leads: 0</div>
              <div>Fontes ativas: 0</div>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled
            >
              <Download className="h-4 w-4 mr-2" />
              Em desenvolvimento
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ReportsView;