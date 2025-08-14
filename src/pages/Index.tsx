import { useEffect, useMemo, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardContent } from "@/components/DashboardContent";
import { ReportsView } from "@/components/ReportsView";
import { ClientsView } from "@/components/ClientsView";
import { ClientsCRMView } from "@/components/ClientsCRMView";
import { PermissionsManagementView } from "@/components/PermissionsManagementView";
import { InquilinatoView } from "@/components/InquilinatoView";
import { DisparadorView } from "@/components/DisparadorView";
import { ChatsView } from "@/components/ChatsView";
import { UserProfileView } from "@/components/UserProfileView";
import PlantaoView from "@/components/PlantaoView";
import { ConnectionsViewSimplified } from "@/components/ConnectionsViewSimplified";
import { PropertyList } from "@/components/PropertyList";
import { ContractsView } from "@/components/ContractsView";
import { AgendaView } from "@/components/AgendaView";
import { UserManagementView } from "@/components/UserManagementView";

import { useImoveisVivaReal } from "@/hooks/useImoveisVivaReal";
import { usePermissions } from "@/hooks/usePermissions";

type View =
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
  | "profile";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const { loading } = useImoveisVivaReal();
  const { hasPermission } = usePermissions();

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

  useEffect(() => {
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
      if (next) setCurrentView(next as View);
    }
  }, [currentView, hasPermission, fallbackViews]);

  useEffect(() => {
    const handler = (e: any) => {
      const target = e?.detail as View;
      if (target) setCurrentView(target);
    };
    window.addEventListener("app:navigate", handler as any);
    return () => window.removeEventListener("app:navigate", handler as any);
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <DashboardContent
            properties={[]}
            loading={loading}
            onNavigateToAgenda={() => setCurrentView("agenda")}
          />
        );
      case "reports":
        return <ReportsView />;
      case "properties":
        return <PropertyList properties={[]} loading={loading} onAddNew={() => {}} />;
      case "contracts":
        return <ContractsView />;
      case "agenda":
        return <AgendaView />;
      case "users":
        return <UserManagementView />;
      case "clients":
        return <ClientsView />;
      case "clients-crm":
        return <ClientsCRMView />;
      case "permissions":
        return <PermissionsManagementView />;
      case "inquilinato":
        return <InquilinatoView />;
      case "disparador":
        return <DisparadorView />;
      case "plantao":
        return <PlantaoView />;
      case "connections":
        return <ConnectionsViewSimplified />;
      case "chats":
        return <ChatsView />;
      case "profile":
        return <UserProfileView />;
      default:
        return <DashboardContent properties={[]} loading={loading} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-950">
        <AppSidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex-1">
          <DashboardHeader />
          <main className="p-6">{renderContent()}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
