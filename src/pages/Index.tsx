import { lazy, Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";
import AddImovelModal from "@/components/AddImovelModal";
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
import { useUserProfile } from "@/hooks/useUserProfile";

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
  const { profile, loading: profileLoading } = useUserProfile();
  
  // Função para obter a página inicial baseada na role
  const getDefaultViewForRole = (role?: string): View => {
    switch (role) {
      case 'admin':
      case 'gestor':
        return 'dashboard';
      case 'corretor':
        return 'properties';
      default:
        return 'dashboard';
    }
  };
  
  // Usar refs para evitar re-renderizações desnecessárias
  const isInitialMount = useRef(true);
  const lastNavigatedPath = useRef<string>("");
  const isNavigatingProgrammatically = useRef(false);
  
  const [currentView, setCurrentView] = useState<View>(() => {
    try {
      const path = window.location.pathname.replace(/^\//, "");
      const normalized = (path || "") as View;
      const validViews: View[] = [
        "dashboard","properties","contracts","agenda","plantao","reports","clients","clients-crm","connections","users","permissions","inquilinato","disparador","chats","profile"
      ];
      
      // Se há um caminho válido na URL, usar ele
      if (normalized && validViews.includes(normalized)) return normalized;
      
      // Caso contrário, usar valor padrão temporário até o profile carregar
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get("view") as View | null;
      const fromStorage = (localStorage.getItem("current-view") as View | null) || null;
      return (fromQuery as View) || (fromStorage as View) || "dashboard";
    } catch { return "dashboard"; }
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

  // Redirecionamento inicial baseado na role do usuário
  useEffect(() => {
    if (!profileLoading && profile && isInitialMount.current) {
      const currentPath = window.location.pathname.replace(/^\//, "");
      
      // Só redirecionar se estiver na raiz ou explicitamente sem path
      // NÃO redirecionar se o usuário navegou manualmente para uma página específica
      if (!currentPath || currentPath === '') {
        const defaultView = getDefaultViewForRole(profile.role);
        setCurrentView(defaultView);
      }
      
      isInitialMount.current = false;
    }
  }, [profile, profileLoading, getDefaultViewForRole]);

  // Sincroniza currentView com URL - CORRIGIDO para evitar loops
  useEffect(() => {
    // Salvar no localStorage (sem causar navegação)
    try {
      localStorage.setItem("current-view", currentView);
    } catch {}
    
    // Apenas navegar se realmente necessário
    const targetPath = `/${currentView}`;
    
    console.log(`useEffect: currentView=${currentView}, location.pathname=${location.pathname}, targetPath=${targetPath}`);
    
    // Verificar se já estamos no caminho correto
    if (location.pathname === targetPath && lastNavigatedPath.current === targetPath) {
      // Já estamos no lugar certo, não fazer nada
      return;
    }
    
    // Verificar se realmente precisamos navegar
    if (location.pathname !== targetPath) {
      console.log(`Navegando de ${location.pathname} para ${targetPath} (currentView: ${currentView})`);
      
      // Evitar navegação durante a montagem inicial se já estivermos no lugar certo
      if (isInitialMount.current) {
        isInitialMount.current = false;
        lastNavigatedPath.current = location.pathname;
        // Se na montagem inicial o pathname já corresponde, não navegar
        if (location.pathname === targetPath) {
          return;
        }
      }
      
      // Atualizar o ref antes de navegar para evitar loops
      lastNavigatedPath.current = targetPath;
      isNavigatingProgrammatically.current = true;
      
      // Usar replace para não adicionar ao histórico desnecessariamente
      navigate(targetPath, { replace: true });
      
      // Reset flag após navegação
      setTimeout(() => {
        isNavigatingProgrammatically.current = false;
      }, 50);
      return;
    }
    
    // Limpar query params legados apenas se necessário
    const params = new URLSearchParams(location.search);
    if (params.has("view")) {
      params.delete("view");
      const newSearch = params.toString();
      // Apenas navegar se realmente houver mudança
      if (location.search !== (newSearch ? `?${newSearch}` : '')) {
        navigate({ pathname: targetPath, search: newSearch }, { replace: true });
      }
    }
  }, [currentView, navigate, location.pathname, location.search]);



  // Prefetch em idle dos módulos mais acessados (sem bloquear a thread principal)
  useEffect(() => {
    const run = () => {
      // Respeita economia de dados
      const conn: any = (navigator as any)?.connection;
      if (conn?.saveData) return;
      const prefetch = (fn: () => Promise<any>, delayMs: number) => {
        const t = setTimeout(() => { fn().catch(() => {}); }, delayMs);
        timeouts.push(t);
      };
      const timeouts: any[] = [];
      // Escalonar prefetch para evitar burst de rede
      prefetch(() => import("@/components/AgendaView"), 1200);
      prefetch(() => import("@/components/ContractsView"), 1600);
      prefetch(() => import("@/components/ClientsView"), 2000);
      prefetch(() => import("@/components/ClientsCRMView"), 2400);
      prefetch(() => import("@/components/ReportsView"), 2800);
      return () => { timeouts.forEach(clearTimeout); };
    };
    if (typeof (window as any).requestIdleCallback === "function") {
      const id = (window as any).requestIdleCallback(run, { timeout: 3000 });
      return () => { if (typeof (window as any).cancelIdleCallback === "function") (window as any).cancelIdleCallback(id); };
    } else {
      const t = setTimeout(run, 1000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const target = e?.detail as View;
      console.log(`Evento app:navigate recebido: ${target}`);
      if (target) {
        console.log(`Mudando currentView para: ${target}`);
        setCurrentView(target);
      }
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
        return <PropertyList properties={[]} loading={loading} onAddNew={() => {
          const ev = new CustomEvent('app:open-add-imovel');
          window.dispatchEvent(ev);
        }} />;
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

  React.useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('app:open-add-imovel', handler);
    return () => window.removeEventListener('app:open-add-imovel', handler);
  }, []);

  return (
    <AddImovelModal isOpen={open} onClose={() => setOpen(false)} />
  );
};