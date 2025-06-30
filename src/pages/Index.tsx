import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardContent } from "@/components/DashboardContent";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyList } from "@/components/PropertyList";
import { ReportsView } from "@/components/ReportsView";
import { PortalsView } from "@/components/PortalsView";
import { ClientsView } from "@/components/ClientsView";
import { ClientsCRMView } from "@/components/ClientsCRMView";

import { AgendaView } from "@/components/AgendaView";
import { ConnectionsViewSimplified } from "@/components/ConnectionsViewSimplified";
import { ContractsView } from "@/components/ContractsView";
import { UserManagementView } from "@/components/UserManagementView";
import { PermissionsManagementView } from "@/components/PermissionsManagementView";
import { IsolationDebug } from "@/components/IsolationDebug";

import { useProperties } from "@/hooks/useProperties";

const Index = () => {
  const [currentView, setCurrentView] = useState<"dashboard" | "properties" | "contracts" | "agenda" | "reports" | "portals" | "clients" | "clients-crm" | "connections" | "users" | "permissions">("dashboard");
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const { properties, loading, refetch } = useProperties();

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
          properties={properties} 
          loading={loading} 
          onNavigateToAgenda={() => setCurrentView("agenda")}
        />;
      case "properties":
        return <PropertyList properties={properties} loading={loading} onAddNew={() => setIsPropertyModalOpen(true)} refetch={refetch} />;
      case "contracts":
        return <ContractsView />;
      case "agenda":
        return <AgendaView />;
      case "reports":
        return <ReportsView />;
      case "portals":
        return <PortalsView />;
      case "clients":
        return <ClientsView />;
      case "clients-crm":
        return <ClientsCRMView />;
      case "connections":
        return <ConnectionsViewSimplified />;
      case "users":
        return <UserManagementView />;
      case "permissions":
        return <PermissionsManagementView />;
      default:
        return <DashboardContent properties={properties} loading={loading} />;
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
