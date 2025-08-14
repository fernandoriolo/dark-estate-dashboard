import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
// Lazy modules (code splitting)
const DashboardContent = lazy(() => import("@/components/DashboardContent").then(m => ({ default: m.DashboardContent })));
const ReportsView = lazy(() => import("@/components/ReportsView").then(m => ({ default: m.ReportsView })));
const ClientsView = lazy(() => import("@/components/ClientsView").then(m => ({ default: m.ClientsView })));
const ClientsCRMView = lazy(() => import("@/components/ClientsCRMView").then(m => ({ default: m.ClientsCRMView })));
const PermissionsManagementView = lazy(() => import("@/components/PermissionsManagementView").then(m => ({ default: m.PermissionsManagementView })));
const InquilinatoView = lazy(() => import("@/components/InquilinatoView").then(m => ({ default: m.InquilinatoView })));
const DisparadorView = lazy(() => import("@/components/DisparadorView").then(m => ({ default: m.DisparadorView })));
const ChatsView = lazy(() => import("@/components/ChatsView").then(m => ({ default: m.ChatsView })));
const UserProfileView = lazy(() => import("@/components/UserProfileView").then(m => ({ default: m.UserProfileView })));
const PlantaoView = lazy(() => import("@/components/PlantaoView"));
const ConnectionsViewSimplified = lazy(() => import("@/components/ConnectionsViewSimplified").then(m => ({ default: m.ConnectionsViewSimplified })));
const PropertyList = lazy(() => import("@/components/PropertyList").then(m => ({ default: m.PropertyList })));
const ContractsView = lazy(() => import("@/components/ContractsView").then(m => ({ default: m.ContractsView })));
const AgendaView = lazy(() => import("@/components/AgendaView").then(m => ({ default: m.AgendaView })));
const UserManagementView = lazy(() => import("@/components/UserManagementView").then(m => ({ default: m.UserManagementView })));

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
  const location = useLocation();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<View>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("view") as View | null;
      const fromStorage = (localStorage.getItem("current-view") as View | null) || null;
      return (fromQuery as View) || (fromStorage as View) || "dashboard";
    } catch {
      return "dashboard";
    }
  });
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

  // Sincroniza currentView com URL (?view=...) e localStorage
  useEffect(() => {
    try {
      localStorage.setItem("current-view", currentView);
    } catch {}
    const params = new URLSearchParams(location.search);
    if (params.get("view") !== currentView) {
      params.set("view", currentView);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [currentView, location.search, navigate]);

  // Persiste ao ocultar janela/aba
  useEffect(() => {
    const handler = () => {
      try { localStorage.setItem("current-view", currentView); } catch {}
    };
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [currentView]);

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
    <SidebarProvider className="bg-gray-950">
      <div className="flex min-h-screen bg-gray-950 flex-1 min-w-0">
        <AppSidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex-1 min-w-0">
          <DashboardHeader />
          <main className="p-6 overflow-x-hidden">
            <Suspense fallback={<div className="text-gray-300">Carregando módulo...</div>}>
              {renderContent()}
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
