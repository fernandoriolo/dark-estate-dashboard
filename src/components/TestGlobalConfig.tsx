import React from 'react';
import { Button } from '@/components/ui/button';
import { useGlobalN8NConfig } from '@/hooks/useGlobalN8NConfig';

const TestGlobalConfig: React.FC = () => {
  const { saveConfig, config, loading, error } = useGlobalN8NConfig();

  const handleTestSave = async () => {
    try {
      const testConfig = {
        hmac_secret: 'test_hmac_secret_very_long_string_for_security_purposes_minimum_32_chars',
        default_bearer_token: 'test_bearer_token_123456',
        default_timeout_ms: 30000,
        retry_attempts: 3
      };

      console.log('🧪 Testando salvamento de configuração global...');
      const result = await saveConfig(testConfig);
      console.log('✅ Teste bem-sucedido:', result);
      alert('✅ Configuração salva com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro no teste:', error);
      alert(`❌ Erro: ${error.message}`);
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded border border-gray-600">
      <h3 className="text-white font-medium mb-4">🧪 Teste de Configuração Global</h3>
      
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-300">
          <strong>Status:</strong> {loading ? 'Carregando...' : 'Pronto'}
        </p>
        
        {error && (
          <p className="text-sm text-red-400">
            <strong>Erro:</strong> {error}
          </p>
        )}
        
        {config && (
          <p className="text-sm text-green-400">
            <strong>Configuração existente:</strong> ID {config.id}
          </p>
        )}
      </div>

      <Button
        onClick={handleTestSave}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {loading ? 'Testando...' : '🧪 Testar Salvamento'}
      </Button>
    </div>
  );
};

export default TestGlobalConfig;