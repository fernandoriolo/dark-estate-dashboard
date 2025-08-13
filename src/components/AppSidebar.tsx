import {
  Building2, Home, BarChart3, Settings, Users, TrendingUp, FileText,
  Calendar, Wifi, LogOut, UserCheck, Database, ShieldCheck, Bot, Send, MessageSquare, KeyRound
} from "lucide-react";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { supabase } from "../integrations/supabase/client";
import { Button } from "./ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePermissions } from "@/hooks/usePermissions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type View =
  | "dashboard" | "properties" | "contracts" | "agenda" | "plantao" | "reports"
  | "clients" | "clients-crm" | "connections" | "users" | "permissions"
  | "inquilinato" | "disparador" | "chats" | "profile";

interface AppSidebarProps {
  currentView: string;
  onViewChange: (view: View) => void;
}

const menuItems = [
  {
    title: "Propriedades",
    url: "#",
    icon: Building2,
    view: "properties" as const,
    permissionKey: "menu_properties",
  },
  {
    title: "Disparador",
    url: "#",
    icon: Send,
    view: "disparador" as const,
    permissionKey: "menu_disparador",
  },
  {
    title: "CRM Clientes",
    url: "#",
    icon: Database,
    view: "clients-crm" as const,
    permissionKey: "menu_clients_crm",
  },
  {
    title: "Chats",
    url: "#",
    icon: MessageSquare,
    view: "chats" as const,
    // sem permissionKey → aparece por padrão
  },
  {
    title: "Lei do Inquilinato",
    url: "#",
    icon: Bot,
    view: "inquilinato" as const,
    permissionKey: "menu_inquilinato",
  },
];

const analyticsItems = [
  {
    title: "Painel",
    url: "#",
    icon: BarChart3,
    view: "dashboard" as const,
    permissionKey: "menu_dashboard",
  },
  {
    title: "Relatórios",
    url: "#",
    icon: TrendingUp,
    view: "reports" as const,
    permissionKey: "menu_reports",
  },
];

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  const { profile } = useUserProfile();
  const { hasPermission } = usePermissions();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.permissionKey) return true;
    if (!profile) return false;
    return hasPermission(item.permissionKey);
  });

  const filteredAnalyticsItems = analyticsItems.filter((item) => {
    if (!item.permissionKey) return true;
    if (!profile) return false;
    return hasPermission(item.permissionKey);
  });

  const handleChangePassword = async () => {
    setChangeError(null);
    if (newPassword.length < 6) {
      setChangeError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError("As senhas não coincidem.");
      return;
    }
    try {
      setChanging(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setChangeError(err?.message ?? "Erro ao alterar a senha.");
    } finally {
      setChanging(false);
    }
  };

  return (
    <Sidebar className="border-r border-gray-800 bg-gray-900 text-white">
      <SidebarHeader className="p-6 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg">
            <Home className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-white">ImobiPro</span>
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
                        ? "bg-gradient-to-r from-blue-600/20 to-blue-700/20 text-white border-l-2 border-blue-500"
                        : ""}
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
              {filteredAnalyticsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentView === item.view}
                    className={`
                      text-gray-300 hover:text-white hover:bg-gray-800/70 transition-all duration-200
                      ${currentView === item.view
                        ? "bg-gradient-to-r from-blue-600/20 to-blue-700/20 text-white border-l-2 border-blue-500"
                        : ""}
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
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="space-y-3">
          <Button
            onClick={() => setShowPasswordModal(true)}
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Alterar senha
          </Button>
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </SidebarFooter>

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Alterar senha</DialogTitle>
            <DialogDescription className="text-gray-400">
              Defina uma nova senha para sua conta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha (mínimo 6 caracteres)"
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nova senha"
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
            />
            {changeError && <div className="text-sm text-red-400">{changeError}</div>}
            <div className="flex justify-end gap-2">
              <Button
                onClick={handleChangePassword}
                disabled={changing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {changing ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
