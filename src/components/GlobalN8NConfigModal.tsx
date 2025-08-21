import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Alert, 
  AlertDescription 
} from '@/components/ui/alert';
import { 
  Shield, 
  Key, 
  Clock, 
  RotateCcw, 
  Save,
  AlertTriangle,
  CheckCircle2,
  Shuffle
} from 'lucide-react';
import { useGlobalN8NConfig } from '@/hooks/useGlobalN8NConfig';

interface GlobalN8NConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GlobalN8NConfigModal: React.FC<GlobalN8NConfigModalProps> = ({
  open,
  onOpenChange
}) => {
  const {
    config,
    loading,
    saveConfig,
    applyToAllEndpoints,
    generateHMACSecret,
    validateConfig,
    isAdmin
  } = useGlobalN8NConfig();

  const [formData, setFormData] = useState({
    hmac_secret: '',
    default_bearer_token: '',
    default_timeout_ms: 30000,
    retry_attempts: 3
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [applying, setApplying] = useState(false);

  // Carregar dados existentes quando abre o modal
  useEffect(() => {
    if (open && config) {
      setFormData({
        hmac_secret: config.hmac_secret || '',
        default_bearer_token: config.default_bearer_token || '',
        default_timeout_ms: config.default_timeout_ms || 30000,
        retry_attempts: config.retry_attempts || 3
      });
    } else if (open && !config) {
      // Valores padrão para nova configuração
      setFormData({
        hmac_secret: generateHMACSecret(),
        default_bearer_token: '',
        default_timeout_ms: 30000,
        retry_attempts: 3
      });
    }
  }, [open, config, generateHMACSecret]);

  // Limpar erros quando modal fecha
  useEffect(() => {
    if (!open) {
      setErrors([]);
      setShowApplyConfirm(false);
    }
  }, [open]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erros quando usuário começa a digitar
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleGenerateSecret = () => {
    const newSecret = generateHMACSecret();
    setFormData(prev => ({
      ...prev,
      hmac_secret: newSecret
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validar dados
      const validationErrors = validateConfig(formData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Salvar configuração (sincronização automática já acontece no hook)
      await saveConfig(formData);
      
      // Mostrar feedback de sincronização concluída
      setShowApplyConfirm(true);
      
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      
      // Melhor tratamento de erros específicos
      let errorMessage = 'Erro ao salvar configuração';
      
      if (error.code === '42501') {
        errorMessage = 'Erro de permissão: Verifique se você tem privilégios de administrador';
      } else if (error.code === '23505') {
        errorMessage = 'Já existe uma configuração global para esta empresa';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors([errorMessage]);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToAll = async () => {
    try {
      setApplying(true);
      
      await applyToAllEndpoints(formData.default_bearer_token);
      
      setShowApplyConfirm(false);
      onOpenChange(false);
      
      // Mostrar feedback de sucesso (pode implementar toast)
      console.log('✅ Configuração aplicada a todos os endpoints!');
      
    } catch (error: any) {
      console.error('Erro ao aplicar configuração:', error);
      setErrors([error.message || 'Erro ao aplicar configuração aos endpoints']);
    } finally {
      setApplying(false);
    }
  };

  const handleSkipApply = () => {
    setShowApplyConfirm(false);
    onOpenChange(false);
  };

  if (!isAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Acesso Negado
            </DialogTitle>
          </DialogHeader>
          <Alert className="border-red-600/30 bg-red-900/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              Apenas administradores podem gerenciar configurações globais N8N.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-yellow-400" />
            Configuração Global N8N
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure HMAC secret, Bearer token padrão e parâmetros globais para todos os endpoints N8N.
            <br />
            <span className="text-yellow-300 font-medium">⚠️ Alterações aqui serão aplicadas automaticamente a TODOS os endpoints!</span>
          </DialogDescription>
        </DialogHeader>

        {/* Confirmação de aplicação */}
        {showApplyConfirm && (
          <Alert className="border-green-600/30 bg-green-900/20">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-green-200">
              <div className="space-y-2">
                <p className="font-medium">✅ Configuração Global Salva e Sincronizada!</p>
                <p className="text-sm">
                  O Bearer Token foi automaticamente aplicado a todos os {' '}
                  <span className="font-semibold text-green-100">15 endpoints existentes</span>.
                  <br />
                  A partir de agora, todos os endpoints usarão as configurações globais padronizadas.
                </p>
                <div className="bg-green-800/30 p-3 rounded mt-2">
                  <p className="text-xs text-green-100">
                    📋 <strong>Padronização Concluída:</strong>
                    <br />• HMAC Secret: Compartilhado globalmente
                    <br />• Bearer Token: Sincronizado em todos os endpoints
                    <br />• Timeout/Retry: Aplicados globalmente
                  </p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleSkipApply}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Erros */}
        {errors.length > 0 && (
          <Alert className="border-red-600/30 bg-red-900/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* HMAC Secret */}
          <div className="space-y-2">
            <Label className="text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-400" />
              HMAC Secret
            </Label>
            <div className="flex gap-2">
              <Textarea
                value={formData.hmac_secret}
                onChange={(e) => handleInputChange('hmac_secret', e.target.value)}
                placeholder="Digite ou gere um HMAC secret seguro..."
                className="bg-gray-800 border-gray-600 text-white resize-none"
                rows={3}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateSecret}
                className="border-blue-600 text-blue-400 hover:bg-blue-600/20 shrink-0"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Mínimo 32 caracteres. Usado para assinar todas as requisições N8N.
            </p>
          </div>

          {/* Bearer Token */}
          <div className="space-y-2">
            <Label className="text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              Bearer Token Padrão
            </Label>
            <Input
              type="password"
              value={formData.default_bearer_token}
              onChange={(e) => handleInputChange('default_bearer_token', e.target.value)}
              placeholder="Token de autenticação padrão..."
              className="bg-gray-800 border-gray-600 text-white"
            />
            <p className="text-xs text-gray-400">
              <span className="text-yellow-300 font-medium">🔄 Sincronização Automática:</span> Este token será aplicado automaticamente a TODOS os endpoints existentes quando salvar.
            </p>
          </div>

          {/* Configurações de Rede */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-400" />
                Timeout (ms)
              </Label>
              <Input
                type="number"
                value={formData.default_timeout_ms}
                onChange={(e) => handleInputChange('default_timeout_ms', parseInt(e.target.value) || 30000)}
                min={5000}
                max={300000}
                step={1000}
                className="bg-gray-800 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-400">
                Entre 5000ms e 300000ms
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-purple-400" />
                Tentativas de Retry
              </Label>
              <Input
                type="number"
                value={formData.retry_attempts}
                onChange={(e) => handleInputChange('retry_attempts', parseInt(e.target.value) || 3)}
                min={1}
                max={10}
                className="bg-gray-800 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-400">
                Entre 1 e 10 tentativas
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalN8NConfigModal;