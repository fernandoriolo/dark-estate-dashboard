import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Search, Settings, LogOut, User as UserIcon, Image as ImageIcon, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useContext, createContext } from "react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input as TextInput } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

export function DashboardHeader() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useUserProfile();
  const avatarLetter = (profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U').toUpperCase();

  const [openProfile, setOpenProfile] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const saveProfile = async () => {
    await updateProfile({ full_name: fullName, phone, avatar_url: avatarUrl });
    setOpenProfile(false);
  };

  const changeEmail = async () => {
    if (!newEmail) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (!error) setOpenEmail(false);
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 6) return;
    if (newPassword !== confirmPassword) return;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setOpenPassword(false);
  };
  return (
    <header className="border-b border-gray-800/50 bg-gray-900/95 backdrop-blur-sm px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Pesquisar propriedades, contratos, clientes..."
              className="w-80 pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-400 focus:border-blue-500 focus:bg-gray-800/70 transition-all"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center">
              <span className="text-white text-[10px]">3</span>
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center ring-2 ring-blue-500/20">
                <span className="text-sm font-medium text-white">{avatarLetter}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 text-gray-200">
              <DropdownMenuItem onClick={() => {
                navigate('/profile');
              }}>
                <UserIcon className="h-4 w-4 mr-2" /> Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenEmail(true)}>
                <Mail className="h-4 w-4 mr-2" /> Alterar Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenPassword(true)}>
                <KeyRound className="h-4 w-4 mr-2" /> Alterar Senha
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); }}>
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modal Meu Perfil */}
      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Meu Perfil</DialogTitle>
            <DialogDescription className="text-gray-400">Atualize suas informações pessoais.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome completo" className="bg-gray-800/50 border-gray-600 text-white" />
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" className="bg-gray-800/50 border-gray-600 text-white" />
            <div className="flex gap-2">
              <ImageIcon className="h-4 w-4 mt-2 text-gray-400" />
              <TextInput value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="URL da foto de perfil (opcional)" className="bg-gray-800/50 border-gray-600 text-white flex-1" />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveProfile} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Email */}
      <Dialog open={openEmail} onOpenChange={setOpenEmail}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Alterar Email</DialogTitle>
            <DialogDescription className="text-gray-400">Defina um novo email para sua conta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <TextInput type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="novo@email.com" className="bg-gray-800/50 border-gray-600 text-white" />
            <div className="flex justify-end">
              <Button onClick={changeEmail} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Senha */}
      <Dialog open={openPassword} onOpenChange={setOpenPassword}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Alterar Senha</DialogTitle>
            <DialogDescription className="text-gray-400">Defina uma nova senha para sua conta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <TextInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha (mínimo 6 caracteres)" className="bg-gray-800/50 border-gray-600 text-white" />
            <TextInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar nova senha" className="bg-gray-800/50 border-gray-600 text-white" />
            <div className="flex justify-end">
              <Button onClick={changePassword} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
