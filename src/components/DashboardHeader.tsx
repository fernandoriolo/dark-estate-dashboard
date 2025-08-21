import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Search, Settings, LogOut, User as UserIcon, Image as ImageIcon, Mail, KeyRound, RefreshCw, UserPlus, Clock, CheckCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { useContext, createContext } from "react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input as TextInput } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

export function DashboardHeader() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useUserProfile();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    refreshNotifications,
    approveConnectionRequest,
    rejectConnectionRequest 
  } = useNotifications();
  const avatarLetter = (profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U').toUpperCase();

  const [openProfile, setOpenProfile] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

  // Sincronizar estados locais com o perfil atualizado
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Handlers para solicitações de conexão
  const handleApproveRequest = async (requestId: string, notificationId: string) => {
    try {
      await approveConnectionRequest(requestId);
      await markAsRead(notificationId);
      alert('Solicitação aprovada! O corretor foi notificado.');
      refreshNotifications(); // Atualizar lista
    } catch (error: any) {
      console.error('Erro ao aprovar solicitação:', error);
      alert(error.message || 'Erro ao aprovar solicitação');
    }
  };

  const handleRejectRequest = async (requestId: string, notificationId: string) => {
    const reason = prompt('Motivo da rejeição (opcional):');
    try {
      await rejectConnectionRequest(requestId, reason || undefined);
      await markAsRead(notificationId);
      alert('Solicitação rejeitada. O corretor foi notificado.');
      refreshNotifications(); // Atualizar lista
    } catch (error: any) {
      console.error('Erro ao rejeitar solicitação:', error);
      alert(error.message || 'Erro ao rejeitar solicitação');
    }
  };

  // Deletar notificação individual
  const handleDeleteNotification = async (notificationId: string, requestId?: string) => {
    if (!confirm('Tem certeza que deseja deletar esta notificação?')) return;

    try {
      // 1. Deletar da tabela notifications
      const { error: notificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (notificationError) throw notificationError;

      // 2. Se houver request_id, deletar também da tabela connection_requests
      if (requestId) {
        const { error: requestError } = await supabase
          .from('connection_requests')
          .delete()
          .eq('id', requestId);

        if (requestError) {
          console.error('Erro ao deletar connection_request:', requestError);
          // Não falhar a operação, apenas logar
        }
      }

      // 3. Atualizar lista local
      refreshNotifications();
      
      console.log('✅ Notificação deletada com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao deletar notificação:', error);
      alert('Erro ao deletar notificação. Tente novamente.');
    }
  };

  // Deletar todas as notificações
  const handleDeleteAllNotifications = async () => {
    if (!confirm('Tem certeza que deseja deletar TODAS as notificações? Esta ação não pode ser desfeita.')) return;

    try {
      if (!profile?.id) return;

      // 1. Buscar todas as notificações do usuário para obter request_ids
      const notificationsToDelete = notifications.filter(n => n.type === 'connection_request');
      const requestIds = notificationsToDelete
        .map(n => n.data?.request_id)
        .filter(id => id);

      // 2. Deletar todas as notificações do usuário
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile.id);

      if (notificationsError) throw notificationsError;

      // 3. Deletar connection_requests correspondentes
      if (requestIds.length > 0) {
        const { error: requestsError } = await supabase
          .from('connection_requests')
          .delete()
          .in('id', requestIds);

        if (requestsError) {
          console.error('Erro ao deletar connection_requests:', requestsError);
          // Não falhar a operação
        }
      }

      // 4. Atualizar lista
      refreshNotifications();
      
      console.log('✅ Todas as notificações deletadas com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao deletar todas as notificações:', error);
      alert('Erro ao deletar notificações. Tente novamente.');
    }
  };

  // Renderizar notificação baseada no tipo
  const renderNotification = (notification: any) => {
    const isConnectionRequest = notification.type === 'connection_request';
    const data = notification.data || {};

    return (
      <div
        key={notification.id}
        className={`p-4 rounded-xl border transition-all duration-200 ${
          notification.is_read
            ? 'bg-gray-800/50 border-gray-700'
            : 'bg-gradient-to-r from-blue-900/30 to-purple-900/20 border-blue-600/50 shadow-lg'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Ícone baseado no tipo */}
          <div className={`p-2 rounded-lg ${
            isConnectionRequest 
              ? 'bg-blue-600/20 text-blue-400' 
              : 'bg-gray-600/20 text-gray-400'
          }`}>
            {isConnectionRequest ? (
              <UserPlus className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header da notificação */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-white text-sm">
                {notification.title}
              </h4>
              <div className="flex items-center gap-2">
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteNotification(notification.id, data.request_id)}
                  className="text-gray-400 hover:text-red-400 hover:bg-red-600/20 p-1 h-6 w-6"
                  title="Deletar notificação"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Conteúdo da notificação */}
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              {notification.message}
            </p>

            {/* Detalhes extras para solicitações de conexão */}
            {isConnectionRequest && data.requester_name && (
              <div className="bg-gray-800/50 rounded-lg p-3 mb-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Detalhes da solicitação:</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Corretor:</span>
                    <span className="text-white">{data.requester_name}</span>
                  </div>
                  {data.requester_email && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white text-xs">{data.requester_email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ações para solicitações de conexão */}
            {isConnectionRequest && data.request_id && !notification.is_read && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApproveRequest(data.request_id, notification.id)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-7"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRejectRequest(data.request_id, notification.id)}
                  className="border-red-600 text-red-400 hover:bg-red-600/20 text-xs px-3 py-1 h-7"
                >
                  Rejeitar
                </Button>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-700">
              <Clock className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-500">
                {new Date(notification.created_at).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  const handleNavigateToProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Navegando para perfil do usuário...');
    navigate('/profile');
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
            onClick={() => navigate('/configurations')}
            title="Configurações"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors relative"
            onClick={() => setOpenNotifications(true)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center">
                <span className="text-white text-[10px]">{unreadCount}</span>
              </span>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center ring-2 ring-blue-500/20 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-medium text-white">{avatarLetter}</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 text-gray-200">
              <DropdownMenuItem asChild>
                <button onClick={handleNavigateToProfile} className="w-full text-left flex items-center">
                  <UserIcon className="h-4 w-4 mr-2" /> Editar Perfil
                </button>
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

      {/* Modal Notificações */}
      <Dialog open={openNotifications} onOpenChange={setOpenNotifications}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Notificações</h2>
                    <p className="text-xs text-gray-400">
                      {notifications.length} total • {unreadCount} não lidas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshNotifications}
                    className="text-gray-400 hover:text-white"
                    title="Atualizar notificações"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteAllNotifications}
                      className="text-gray-400 hover:text-red-400 text-xs"
                      title="Deletar todas as notificações"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Deletar Tudo
                    </Button>
                  )}
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      Marcar todas como lidas
                    </Button>
                  )}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="bg-gray-800/50 rounded-full p-6 mx-auto mb-4 w-fit">
                  <Bell className="h-12 w-12 opacity-30" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhuma notificação</h3>
                <p className="text-sm text-gray-500">Quando houver novidades, elas aparecerão aqui</p>
              </div>
            ) : (
              notifications.map(renderNotification)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
