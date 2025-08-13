import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { LoginPage } from "./components/LoginPage";
import { UserOnboarding } from "./components/UserOnboarding";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { ContractTemplatesProvider } from "./contexts/ContractTemplatesContext";
import { supabase } from './integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useUserProfile } from './hooks/useUserProfile';

function AppContent() {
  const { profile, loading: profileLoading } = useUserProfile();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-white">Carregando perfil...</div>
      </div>
    );
  }

  // Se não tem perfil, mostrar onboarding
  if (!profile) {
    return <UserOnboarding onComplete={() => window.location.reload()} />;
  }

  const mustChangePassword = !!profile.require_password_change;

  const handleChangePassword = async () => {
    try {
      setChanging(true);
      setChangeError(null);
      if (!newPassword || newPassword.length < 6) {
        setChangeError('A nova senha deve ter pelo menos 6 caracteres');
        setChanging(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setChangeError('A confirmação de senha não confere');
        setChanging(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      // Marcar como alterada
      await supabase
        .from('user_profiles')
        .update({ require_password_change: false, password_changed_at: new Date().toISOString() })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setChangeError(err.message || 'Erro ao alterar senha');
    } finally {
      setChanging(false);
    }
  };

  return (
    <ContractTemplatesProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>

      {/* Modal obrigatório de troca de senha */}
      <Dialog open={mustChangePassword} onOpenChange={() => {}}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Troca de senha necessária</DialogTitle>
            <DialogDescription className="text-gray-400">Defina uma nova senha para continuar usando o sistema.</DialogDescription>
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
                {changing ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ContractTemplatesProvider>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLoginSuccess={() => window.location.reload()} />;
  }

  return <AppContent />;
}

export default App;
