import { useEffect, useMemo, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardContent } from "@/components/DashboardContent";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyList } from "@/components/PropertyList";
import { ReportsView } from "@/components/ReportsView";
import { ClientsView } from "@/components/ClientsView";
import { ClientsCRMView } from "@/components/ClientsCRMView";

import { AgendaView } from "@/components/AgendaView";
import PlantaoView from "@/components/PlantaoView";
import { ConnectionsViewSimplified } from "@/components/ConnectionsViewSimplified";
import { ContractsView } from "@/components/ContractsView";
import { UserManagementView } from "@/components/UserManagementView";
import { PermissionsManagementView } from "@/components/PermissionsManagementView";
import { IsolationDebug } from "@/components/IsolationDebug";
import { InquilinatoView } from "@/components/InquilinatoView";
import { DisparadorView } from "@/components/DisparadorView";
import { ChatsView } from "@/components/ChatsView";
import { UserProfileView } from "@/components/UserProfileView";

import { useImoveisVivaReal } from "@/hooks/useImoveisVivaReal";
import { usePermissions } from "@/hooks/usePermissions";

const Index = () => {
  const [currentView, setCurrentView] = useState<
    | "dashboard"
    | "properties"
    | "contracts"
    | "agenda"
    | "plantao"
    | "reports"
    | "clients"
    | "clients-crm"
    | "connections"
    | "users"
    | "permissions"
    | "inquilinato"
    | "disparador"
    | "chats"
    | "profile"
  >("dashboard");
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const { imoveis, loading, refetch } = useImoveisVivaReal();
  const { hasPermission } = usePermissions();

  // Views em ordem de prioridade para fallback de navegação quando dashboard não é permitido
  const fallbackViews = useMemo(
    () => [
      "properties",
      "clients",
      "clients-crm",
      "agenda",
      "reports",
      "connections",
      "users",
      "permissions",
      "inquilinato",
      "disparador",
    ] as const,
    []
  );

  // Se o usuário não tem acesso ao dashboard, escolher a primeira view permitida como default
  useEffect(() => {
    // Evita rodar antes das permissões estarem disponíveis
    const canSeeDashboard = hasPermission?.("menu_dashboard");
    if (currentView === "dashboard" && canSeeDashboard === false) {
      const next = fallbackViews.find((v) => {
        const keyMap: Record<string, string> = {
          dashboard: "menu_dashboard",
          properties: "menu_properties",
          contracts: "menu_contracts",
          agenda: "menu_agenda",
          reports: "menu_reports",
          clients: "menu_clients",
          "clients-crm": "menu_clients_crm",
          connections: "menu_connections",
          users: "menu_users",
          permissions: "menu_permissions",
          inquilinato: "menu_inquilinato",
          disparador: "menu_disparador",
        };
        const key = keyMap[v as string];
        return key ? hasPermission?.(key) : true;
      });
      if (next) setCurrentView(next as typeof currentView);
    }
  }, [currentView, hasPermission, fallbackViews]);

  // Navegação disparada pelo Header (evento global simples)
  useEffect(() => {
    const handler = (e: any) => {
      const target = e?.detail as typeof currentView;
      if (target) setCurrentView(target);
    };
    window.addEventListener('app:navigate', handler as any);
    return () => window.removeEventListener('app:navigate', handler as any);
  }, []);

  const handlePropertySubmit = () => {
    refetch();
    setIsPropertyModalOpen(false);
  };

  const renderContent = () => {
    // Debug mode - acesse com ?debug=isolation na URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'isolation') {
      return <IsolationDebug />;
    }

    switch (currentView) {
      case "dashboard":
        return <DashboardContent 
          properties={[]} 
          loading={loading} 
          onNavigateToAgenda={() => setCurrentView("agenda")}
        />;
      case "properties":
        // PropertyList ainda usa o modelo antigo; por ora, passa vazio
        return <PropertyList properties={[]} loading={loading} onAddNew={() => setIsPropertyModalOpen(true)} refetch={refetch} />;
      case "contracts":
        return <ContractsView />;
      case "agenda":
        return <AgendaView />;
      case "plantao":
        return <PlantaoView />;
      case "reports":
        return <ReportsView />;
      case "clients":
        return <ClientsView />;
      case "clients-crm":
        return <ClientsCRMView />;
      case "connections":
        return <ConnectionsViewSimplified />;
      case "chats":
        return <ChatsView />;
      case "users":
        return <UserManagementView />;
      case "permissions":
        return <PermissionsManagementView />;
      case "inquilinato":
        return <InquilinatoView />;
      case "disparador":
        return <DisparadorView />;
      case "profile":
        return <UserProfileView />;
      default:
        return <DashboardContent properties={[]} loading={loading} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar 
            currentView={currentView} 
            onViewChange={setCurrentView}
          />
          <div className="flex-1 flex flex-col">
            <DashboardHeader />
            <main className="flex-1 p-6 bg-gradient-to-br from-gray-950/50 to-gray-900/50">
              {renderContent()}
            </main>
          </div>
        </div>
      </SidebarProvider>
      
      {/* Modal de Adicionar Propriedade */}
      <PropertyForm 
        isOpen={isPropertyModalOpen}
        onSubmit={handlePropertySubmit} 
        onCancel={() => setIsPropertyModalOpen(false)} 
      />
    </div>
  );
};

export default Index;
