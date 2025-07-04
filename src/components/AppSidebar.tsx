import { Building2, Home, BarChart3, Settings, Users, Globe, TrendingUp, FileText, Calendar, Wifi, ChevronDown, ChevronRight, LogOut, UserCheck, Database, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { supabase } from '../integrations/supabase/client';
import { Button } from "./ui/button";
import { User } from '@supabase/supabase-js';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePermissions } from '@/hooks/usePermissions';

const menuItems = [
  {
    title: "Painel",
    url: "#",
    icon: BarChart3,
    view: "dashboard" as const,
    permissionKey: "menu_dashboard",
  },
  {
    title: "Propriedades",
    url: "#",
    icon: Building2,
    view: "properties" as const,
    permissionKey: "menu_properties",
  },
  {
    title: "Contratos",
    url: "#",
    icon: FileText,
    view: "contracts" as const,
    permissionKey: "menu_contracts",
  },
  {
    title: "Agenda",
    url: "#",
    icon: Calendar,
    view: "agenda" as const,
    permissionKey: "menu_agenda",
  },
  {
    title: "Pipeline Clientes",
    url: "#",
    icon: UserCheck,
    view: "clients" as const,
    permissionKey: "menu_clients",
  },
  {
    title: "CRM Clientes",
    url: "#",
    icon: Database,
    view: "clients-crm" as const,
    permissionKey: "menu_clients_crm",
  },
  {
    title: "Relatórios",
    url: "#",
    icon: TrendingUp,
    view: "reports" as const,
    permissionKey: "menu_reports",
  },
  {
    title: "Portais",
    url: "#",
    icon: Globe,
    view: "portals" as const,
    permissionKey: "menu_portals",
  },
  {
    title: "Conexões",
    url: "#",
    icon: Wifi,
    view: "connections" as const,
    permissionKey: "menu_connections",
  },
  {
    title: "Usuários",
    url: "#",
    icon: Users,
    view: "users" as const,
    permissionKey: "menu_users",
  },
  {
    title: "Configurar Permissões",
    url: "#",
    icon: ShieldCheck,
    view: "permissions" as const,
    permissionKey: "menu_permissions",
  },
];

const analyticsItems = [
  {
    title: "Relatórios",
    url: "#",
    icon: TrendingUp,
    view: "reports" as const,
  },
  {
    title: "Portais",
    url: "#",
    icon: Globe,
    view: "portals" as const,
  },
];

const secondaryItems = [
  {
    title: "Configurações",
    url: "#",
    icon: Settings,
  },
];

interface AppSidebarProps {
  currentView: string;
  onViewChange: (view: "dashboard" | "properties" | "contracts" | "agenda" | "reports" | "portals" | "clients" | "clients-crm" | "connections" | "users" | "permissions") => void;
}

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const { profile, isAdmin } = useUserProfile();
  const { hasPermission } = usePermissions();

  useEffect(() => {
    // Buscar usuário atual
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isExpanded = (title: string) => expandedItems.includes(title);

  // Pegar primeira letra do email para o avatar
  const avatarLetter = user?.email?.charAt(0).toUpperCase() || 'U';

  // Filtrar menus baseado nas permissões
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.permissionKey) return true; // Se não tem permissão definida, mostrar para todos
    if (!profile) return false; // Se não tem perfil, não mostrar menus
    return hasPermission(item.permissionKey);
  });

  return (
    <Sidebar className="border-r border-gray-800 bg-gray-900 text-white">
      <SidebarHeader className="p-6 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg">
            <Home className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-white">
              ImobiPro
            </span>
            <span className="text-xs text-gray-400">Gestão Imobiliária</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-3 bg-gray-900">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-xs uppercase tracking-wider px-3 py-2">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={currentView === item.view}
                    className={`
                      text-gray-300 hover:text-white hover:bg-gray-800/70 transition-all duration-200
                      ${currentView === item.view 
                        ? 'bg-gradient-to-r from-blue-600/20 to-blue-700/20 text-white border-l-2 border-blue-500' 
                        : ''
                      }
                    `}
                  >
                    <button 
                      onClick={() => onViewChange(item.view)}
                      className="flex items-center gap-3 w-full px-3 py-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-xs uppercase tracking-wider px-3 py-2">
            Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={currentView === item.view}
                    className={`
                      text-gray-300 hover:text-white hover:bg-gray-800/70 transition-all duration-200
                      ${currentView === item.view 
                        ? 'bg-gradient-to-r from-blue-600/20 to-blue-700/20 text-white border-l-2 border-blue-500' 
                        : ''
                      }
                    `}
                  >
                    <button 
                      onClick={() => onViewChange(item.view)}
                      className="flex items-center gap-3 w-full px-3 py-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-xs uppercase tracking-wider px-3 py-2">
            Outros
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className="text-gray-300 hover:text-white hover:bg-gray-800/70 transition-all duration-200"
                  >
                    <a href={item.url} className="flex items-center gap-3 px-3 py-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/70 hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <span className="text-sm font-medium text-white">{avatarLetter}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.user_metadata.name || 'Admin'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email || 'admin@imobipro.com'}</p>
            </div>
          </div>
          <Button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}