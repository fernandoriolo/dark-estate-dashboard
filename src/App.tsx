import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const navigate = useNavigate();
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
    return <UserOnboarding onComplete={() => { /* evita reload global em dev */ }} />;
  }

  const mustChangePassword = false; // revertido: sem fluxo obrigatório de troca de senha

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
      // revertido: sem marcação no perfil
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
      {/* Persistência de rota atual */}
      {null}
      <Routes>
        <Route path="/" element={<Index />} />
        {/* Rotas reais por módulo */}
        <Route path="/dashboard" element={<Index />} />
        <Route path="/properties" element={<Index />} />
        <Route path="/contracts" element={<Index />} />
        <Route path="/agenda" element={<Index />} />
        <Route path="/plantao" element={<Index />} />
        <Route path="/reports" element={<Index />} />
        <Route path="/clients" element={<Index />} />
        <Route path="/clients-crm" element={<Index />} />
        <Route path="/connections" element={<Index />} />
        <Route path="/users" element={<Index />} />
        <Route path="/permissions" element={<Index />} />
        <Route path="/inquilinato" element={<Index />} />
        <Route path="/disparador" element={<Index />} />
        <Route path="/chats" element={<Index />} />
        <Route path="/profile" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

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
    return <LoginPage onLoginSuccess={() => { /* evita reload global em dev */ }} />;
  }

  return (
    <Router>
      <PersistRoute>
        <AppContent />
      </PersistRoute>
    </Router>
  );
}

export default App;

// Componente para persistir/restaurar a rota atual entre reloads/minimizações
function PersistRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Restaurar na primeira montagem
  useEffect(() => {
    const saved = localStorage.getItem('last-route');
    if (saved && saved !== location.pathname + location.search) {
      navigate(saved, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Salvar sempre que a rota mudar
  useEffect(() => {
    localStorage.setItem('last-route', location.pathname + location.search);
  }, [location.pathname, location.search]);
  // Salvar ao ocultar janela/aba
  useEffect(() => {
    const handler = () => {
      localStorage.setItem('last-route', location.pathname + location.search);
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('beforeunload', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('beforeunload', handler);
    };
  }, [location.pathname, location.search]);
  return <>{children}</>;
}
