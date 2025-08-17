import { lazy, Suspense, useEffect, useState } from "react";
import { useBasicNavigation, View } from "../hooks/useBasicNavigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";
import { AddImovelModal } from "@/components/AddImovelModal";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

// Função helper para lazy loading com tratamento de erro
const createLazyComponent = (importFn: () => Promise<any>, componentName: string) => {
  return lazy(() =>
    importFn()
      .then(m => {
        console.log(`🔧 LazyLoad: ${componentName} carregado com sucesso`);
        return m;
      })
      .catch(error => {
        console.error(`🔧 LazyLoad: Erro ao carregar ${componentName}:`, error);
        // Retornar um componente de fallback em caso de erro
        return {
          default: () => (
            <div className="text-center p-8">
              <div className="text-red-400 mb-2">Erro ao carregar módulo</div>
              <div className="text-gray-400 text-sm">{componentName}</div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Recarregar
              </button>
            </div>
          )
        };
      })
  );
};

// Lazy modules (code splitting) com tratamento de erro robusto
const DashboardContent = createLazyComponent(
  () => import("@/components/DashboardContent").then(m => ({ default: m.DashboardContent })),
  "DashboardContent"
);
const ReportsView = createLazyComponent(
  () => import("@/components/ReportsView").then(m => ({ default: m.ReportsView })),
  "ReportsView"
);
const ClientsView = createLazyComponent(
  () => import("@/components/ClientsView").then(m => ({ default: m.ClientsView })),
  "ClientsView"
);
const ClientsCRMView = createLazyComponent(
  () => import("@/components/ClientsCRMView").then(m => ({ default: m.ClientsCRMView })),
  "ClientsCRMView"
);
const PermissionsManagementView = createLazyComponent(
  () => import("@/components/PermissionsManagementView").then(m => ({ default: m.PermissionsManagementView })),
  "PermissionsManagementView"
);
const InquilinatoView = createLazyComponent(
  () => import("@/components/InquilinatoView").then(m => ({ default: m.InquilinatoView })),
  "InquilinatoView"
);
const DisparadorView = createLazyComponent(
  () => import("@/components/DisparadorView").then(m => ({ default: m.DisparadorView })),
  "DisparadorView"
);
const ChatsView = createLazyComponent(
  () => import("@/components/ChatsView").then(m => ({ default: m.ChatsView })),
  "ChatsView"
);
const UserProfileView = createLazyComponent(
  () => import("@/components/UserProfileView").then(m => ({ default: m.UserProfileView })),
  "UserProfileView"
);
const PlantaoView = createLazyComponent(
  () => import("@/components/PlantaoView"),
  "PlantaoView"
);
const ConnectionsViewSimplified = createLazyComponent(
  () => import("@/components/ConnectionsViewSimplified").then(m => ({ default: m.ConnectionsViewSimplified })),
  "ConnectionsViewSimplified"
);
const PropertyList = createLazyComponent(
  () => import("@/components/PropertyList").then(m => ({ default: m.PropertyList })),
  "PropertyList"
);
const ContractsView = createLazyComponent(
  () => import("@/components/ContractsView").then(m => ({ default: m.ContractsView })),
  "ContractsView"
);
const AgendaView = createLazyComponent(
  () => import("@/components/AgendaView").then(m => ({ default: m.AgendaView })),
  "AgendaView"
);
const UserManagementView = createLazyComponent(
  () => import("@/components/UserManagementView").then(m => ({ default: m.UserManagementView })),
  "UserManagementView"
);

import { useImoveisVivaReal } from "@/hooks/useImoveisVivaReal";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfile } from "@/hooks/useUserProfile";

const Index = () => {
  const { currentView, changeView } = useBasicNavigation();
  
  console.log(`🚀 Index renderizado - currentView: ${currentView}`);

  const renderContent = () => {
    console.log(`🎬 Renderizando conteúdo para: ${currentView}`);
    
    switch (currentView) {
      case "dashboard":
        return (
          <DashboardContent
            properties={[]}
            loading={false}
            onNavigateToAgenda={() => changeView("agenda", "dashboard-button")}
          />
        );
      case "reports":
        return <ReportsView />;
      case "properties":
        return <PropertyList properties={[]} loading={false} onAddNew={() => window.dispatchEvent(new Event("open-add-imovel-modal"))} />;
      case "contracts":
        return <ContractsView />;
      case "agenda":
        return <AgendaView />;
      case "plantao":
        return <PlantaoView />;
      case "clients":
        return <ClientsView />;
      case "clients-crm":
        return <ClientsCRMView />;
      case "chats":
        return <ChatsView />;
      case "connections":
        return <ConnectionsViewSimplified />;
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
        return <DashboardContent properties={[]} loading={false} onNavigateToAgenda={() => changeView("agenda", "default-fallback")} />;
    }
  };

  return (
    <SidebarProvider className="bg-gray-950">
      <div className="flex min-h-screen bg-gray-950 flex-1 min-w-0">
        <AppSidebar 
          currentView={currentView} 
          onViewChange={(view) => changeView(view, "sidebar-click")} 
        />
        <div className="flex-1 min-w-0">
          <DashboardHeader />
          <main className="p-6 overflow-x-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                  <div className="text-gray-300">Carregando módulo...</div>
                </div>
              </div>
            }>
              {renderContent()}
              {/* Monta o modal globalmente para responder ao onAddNew */}
              <AddImovelModalMount />
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;

// Montagem do modal de Adicionar Imóvel escutando evento global disparado pelo PropertyList
const AddImovelModalMount: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-add-imovel-modal", handler);
    return () => window.removeEventListener("open-add-imovel-modal", handler);
  }, []);

  return <AddImovelModal isOpen={open} onClose={() => setOpen(false)} />;
};
