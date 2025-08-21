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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Alert, 
  AlertDescription 
} from '@/components/ui/alert';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { 
  Zap, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Play,
  Settings,
  Database,
  Send,
  Code,
  AlertTriangle,
  FileText,
  Sparkles
} from 'lucide-react';
import { useGlobalN8NConfig } from '@/hooks/useGlobalN8NConfig';
import { useN8NEndpoints } from '@/hooks/useN8NEndpoints';

interface EndpointTesterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EndpointTester: React.FC<EndpointTesterProps> = ({
  open,
  onOpenChange
}) => {
  const { config: globalConfig, isAdmin } = useGlobalN8NConfig();
  const { endpoints, loading: endpointsLoading } = useN8NEndpoints();
  
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [testPayload, setTestPayload] = useState('{}');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedEndpoint('');
      setTestPayload('{}');
      setTestResult(null);
      setErrors([]);
    }
  }, [open]);

  // Função para gerar HMAC-SHA256
  const generateHmac = async (payload: string, secret: string): Promise<string> => {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return `hmac-sha256=${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
  };

  // Validar JSON do payload
  const validatePayload = (payloadString: string) => {
    try {
      JSON.parse(payloadString);
      return null;
    } catch (error: any) {
      return error.message;
    }
  };

  // Executar teste do endpoint
  const handleTestEndpoint = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setErrors([]);

      // Validações
      if (!selectedEndpoint) {
        setErrors(['Selecione um endpoint para testar']);
        return;
      }

      const endpoint = endpoints.find(e => e.id === selectedEndpoint);
      if (!endpoint) {
        setErrors(['Endpoint selecionado não encontrado']);
        return;
      }

      if (!globalConfig) {
        setErrors(['Configuração global N8N não encontrada. Configure primeiro no modal "Configuração Global"']);
        return;
      }

      // Validar payload JSON
      const payloadError = validatePayload(testPayload);
      if (payloadError) {
        setErrors([`Payload JSON inválido: ${payloadError}`]);
        return;
      }

      console.log('🧪 Iniciando teste do endpoint:', endpoint.endpoint_key);

      // Criar evento padronizado
      const eventPayload = {
        version: "1.0",
        event: `evt.test.${endpoint.endpoint_key}`,
        idempotencyKey: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        actor: {
          userId: "test-user",
          companyId: "test-company",
          role: "admin"
        },
        data: JSON.parse(testPayload)
      };

      const payloadString = JSON.stringify(eventPayload);
      console.log('📦 Payload do evento:', eventPayload);

      // Gerar HMAC usando configuração global
      const hmacSignature = await generateHmac(payloadString, globalConfig.hmac_secret);
      console.log('🔐 HMAC gerado:', hmacSignature);

      // Headers com configuração global
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${endpoint.bearer_token || globalConfig.default_bearer_token}`,
        'X-Signature': hmacSignature,
        'X-Event-Type': eventPayload.event,
        'X-Idempotency-Key': eventPayload.idempotencyKey,
        'X-Timestamp': Date.now().toString(),
        'User-Agent': 'IMOBIPRO-N8N-Tester/1.0'
      };

      console.log('📡 Headers enviados:', headers);
      console.log('🎯 Endpoint URL:', endpoint.url);

      // Fazer a requisição
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        mode: 'cors',
        body: payloadString
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        endpoint: {
          key: endpoint.endpoint_key,
          url: endpoint.url,
          bearer_token: endpoint.bearer_token || globalConfig.default_bearer_token
        },
        request: {
          url: response.url,
          method: 'POST',
          headers,
          payload: eventPayload
        },
        timing: {
          timestamp: new Date().toISOString(),
          hmac_used: globalConfig.hmac_secret.substring(0, 8) + '...',
          bearer_used: (endpoint.bearer_token || globalConfig.default_bearer_token).substring(0, 8) + '...'
        }
      };

      console.log('📥 Resultado do teste:', result);
      setTestResult(result);

    } catch (error: any) {
      console.error('❌ Erro no teste:', error);
      setTestResult({
        success: false,
        error: error.message,
        stack: error.stack
      });
    } finally {
      setTesting(false);
    }
  };

  // Gerar dados variados para cada execução
  const generateRandomData = () => {
    const nomes = ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Carlos Souza', 'Luciana Lima', 'Rafael Alves', 'Fernanda Rocha'];
    const emails = ['joao.silva@email.com', 'maria.santos@teste.com', 'pedro.costa@exemplo.com', 'ana.oliveira@demo.com'];
    const telefones = ['+5511987654321', '+5511912345678', '+5511998765432', '+5511955443322'];
    const cidades = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Brasília'];
    const tipos = ['Apartamento', 'Casa', 'Comercial', 'Terreno', 'Cobertura'];
    const status = ['pending', 'active', 'completed', 'cancelled', 'confirmed'];
    const sources = ['website', 'facebook', 'google', 'indicacao', 'telefone'];
    
    return {
      nome: nomes[Math.floor(Math.random() * nomes.length)],
      email: emails[Math.floor(Math.random() * emails.length)],
      telefone: telefones[Math.floor(Math.random() * telefones.length)],
      cidade: cidades[Math.floor(Math.random() * cidades.length)],
      tipo: tipos[Math.floor(Math.random() * tipos.length)],
      status: status[Math.floor(Math.random() * status.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      randomId: Math.floor(Math.random() * 9999) + 1000,
      randomValue: Math.floor(Math.random() * 500000) + 100000,
      timestamp: Date.now()
    };
  };

  // Predefinir payloads para diferentes tipos de endpoint
  const getDefaultPayload = (endpointKey: string) => {
    const random = generateRandomData();
    const futureDate = new Date(Date.now() + (Math.floor(Math.random() * 30) + 1) * 24*60*60*1000);
    const pastDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24*60*60*1000);
    
    const payloads: Record<string, any> = {
      'agenda.list': { 
        startDate: pastDate.toISOString().split('T')[0],
        endDate: futureDate.toISOString().split('T')[0],
        userId: `user_${random.randomId}`,
        category: ['reuniao', 'visita', 'contrato', 'ligacao'][Math.floor(Math.random() * 4)],
        status: random.status
      },
      'agenda.create': { 
        title: `${['Reunião', 'Visita', 'Apresentação', 'Ligação'][Math.floor(Math.random() * 4)]} - ${random.nome}`,
        description: `${['Primeira reunião', 'Acompanhamento', 'Fechamento', 'Apresentação de imóvel'][Math.floor(Math.random() * 4)]} com ${random.nome}`,
        date: futureDate.toISOString(),
        duration: [30, 60, 90, 120][Math.floor(Math.random() * 4)],
        location: `${random.cidade} - ${['Centro', 'Zona Sul', 'Zona Norte', 'Zona Oeste'][Math.floor(Math.random() * 4)]}`,
        attendees: [random.email, 'corretor@imobiliaria.com'],
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      },
      'agenda.update': {
        eventId: `evt_${random.timestamp}`,
        title: `Reunião Atualizada - ${random.nome}`,
        status: random.status,
        notes: `Atualizado em ${new Date().toLocaleString('pt-BR')}`
      },
      'whatsapp.instances': {
        limit: [5, 10, 20, 50][Math.floor(Math.random() * 4)],
        offset: Math.floor(Math.random() * 10),
        filter: {
          status: random.status,
          company: `company_${random.randomId}`
        }
      },
      'whatsapp.create': { 
        instanceName: `${random.cidade.toLowerCase().replace(' ', '')}_${random.timestamp}`,
        phoneNumber: random.telefone,
        webhook: `https://webhook.n8nlabz.com.br/whatsapp/${random.randomId}`,
        settings: {
          autoReply: Math.random() > 0.5,
          businessHours: Math.random() > 0.5,
          welcomeMessage: `Olá! Bem-vindo à Imobiliária ${random.cidade}`,
          department: ['vendas', 'locacao', 'administrativo'][Math.floor(Math.random() * 3)]
        }
      },
      'whatsapp.send': {
        instanceId: `inst_${random.randomId}`,
        to: random.telefone,
        message: `Olá ${random.nome}! Temos novidades sobre o ${random.tipo} que você procura em ${random.cidade}. Gostaria de agendar uma visita?`,
        type: 'text',
        metadata: {
          campaign: `${random.cidade}_${random.tipo}`,
          source: random.source
        }
      },
      'vivareal.upload': { 
        fileName: `imoveis_${random.cidade.toLowerCase()}_${new Date().toISOString().split('T')[0]}_${random.randomId}.xml`,
        fileData: btoa(`<properties><property id="${random.randomId}"><title>${random.tipo} em ${random.cidade}</title><price>${random.randomValue}</price></property></properties>`),
        fileSize: Math.floor(Math.random() * 5000) + 1000,
        format: 'xml',
        metadata: {
          region: random.cidade,
          propertyCount: Math.floor(Math.random() * 50) + 1,
          uploadType: 'bulk'
        }
      },
      'vivareal.status': {
        uploadId: `upload_${random.timestamp}`,
        checkDetails: true,
        includeErrors: true
      },
      'leads.create': {
        name: random.nome,
        email: random.email,
        phone: random.telefone,
        source: random.source,
        interest: `${random.tipo} em ${random.cidade}`,
        budget: {
          min: random.randomValue * 0.8,
          max: random.randomValue * 1.2,
          currency: 'BRL'
        },
        preferences: {
          bedrooms: Math.floor(Math.random() * 4) + 1,
          bathrooms: Math.floor(Math.random() * 3) + 1,
          area: Math.floor(Math.random() * 200) + 50,
          parking: Math.random() > 0.5
        },
        urgency: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      },
      'leads.update': {
        leadId: `lead_${random.randomId}`,
        status: random.status,
        score: Math.floor(Math.random() * 100),
        notes: `Cliente ${random.nome} - ${['muito interessado', 'moderadamente interessado', 'precisa acompanhamento', 'pronto para fechar'][Math.floor(Math.random() * 4)]}`,
        nextAction: {
          type: ['call', 'email', 'whatsapp', 'visit'][Math.floor(Math.random() * 4)],
          scheduledFor: futureDate.toISOString()
        }
      },
      'properties.sync': {
        propertyIds: Array.from({length: Math.floor(Math.random() * 5) + 1}, () => `prop_${Math.floor(Math.random() * 9999)}`),
        platforms: ['vivareal', 'zapimoveis', 'olx'].slice(0, Math.floor(Math.random() * 3) + 1),
        action: ['create', 'update', 'delete'][Math.floor(Math.random() * 3)],
        syncOptions: {
          images: true,
          pricing: true,
          availability: true
        }
      },
      'contracts.notification': {
        contractId: `contract_${random.randomId}`,
        status: ['draft', 'pending', 'signed', 'completed'][Math.floor(Math.random() * 4)],
        parties: [random.email, 'vendedor@imobiliaria.com', 'comprador@cliente.com'],
        notifyEmail: true,
        notifyWhatsApp: Math.random() > 0.5,
        contractType: ['venda', 'locacao', 'permuta'][Math.floor(Math.random() * 3)],
        value: random.randomValue
      },
      'reports.generate': {
        type: ['daily_sales', 'weekly_leads', 'monthly_revenue', 'quarterly_analysis'][Math.floor(Math.random() * 4)],
        period: {
          start: pastDate.toISOString(),
          end: new Date().toISOString()
        },
        format: ['pdf', 'excel', 'csv'][Math.floor(Math.random() * 3)],
        recipients: [`gestor@imobiliaria.com`, `relatorios@${random.cidade.toLowerCase()}.com`],
        filters: {
          region: random.cidade,
          propertyType: random.tipo,
          minValue: random.randomValue * 0.5
        }
      },
      'webhook.test': {
        message: `Teste de webhook - ${random.nome}`,
        timestamp: new Date().toISOString(),
        testId: crypto.randomUUID(),
        payload: {
          user: random.nome,
          city: random.cidade,
          value: random.randomValue,
          type: random.tipo
        },
        metadata: {
          version: '1.0',
          source: 'endpoint-tester',
          environment: 'test'
        }
      }
    };

    // Se não encontrar um payload específico, criar um genérico baseado na categoria
    if (!payloads[endpointKey]) {
      const category = endpointKey.split('.')[0];
      const action = endpointKey.split('.')[1] || 'action';
      
      const genericPayload = {
        action: action,
        category: category,
        timestamp: new Date().toISOString(),
        testData: {
          id: random.randomId,
          message: `Teste de ${category} - ${action} para ${random.nome}`,
          source: 'endpoint-tester',
          location: random.cidade,
          value: random.randomValue
        },
        metadata: {
          generated: true,
          version: '1.0',
          userId: `user_${random.randomId}`
        }
      };
      
      return JSON.stringify(genericPayload, null, 2);
    }

    return JSON.stringify(payloads[endpointKey], null, 2);
  };

  // Gerar payload de teste baseado no endpoint selecionado
  const generateTestPayload = () => {
    if (!selectedEndpoint) {
      setErrors(['Selecione um endpoint primeiro']);
      return;
    }

    const endpoint = endpoints.find(e => e.id === selectedEndpoint);
    if (!endpoint) {
      setErrors(['Endpoint selecionado não encontrado']);
      return;
    }

    const newPayload = getDefaultPayload(endpoint.endpoint_key);
    setTestPayload(newPayload);
    setErrors([]);
  };

  // Atualizar payload quando endpoint muda
  const handleEndpointChange = (endpointId: string) => {
    setSelectedEndpoint(endpointId);
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (endpoint) {
      setTestPayload(getDefaultPayload(endpoint.endpoint_key));
    }
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
              Apenas administradores podem testar endpoints N8N.
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

  const selectedEndpointData = endpoints.find(e => e.id === selectedEndpoint);

  // Debug: verificar se endpoints estão carregando
  console.log('🔍 EndpointTester Debug:', {
    endpointsLoading,
    endpointsCount: endpoints.length,
    endpoints: endpoints.map(e => ({ id: e.id, key: e.endpoint_key, active: e.is_active })),
    selectedEndpoint,
    isAdmin,
    globalConfig: !!globalConfig
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Zap className="h-5 w-5 text-orange-400" />
            Testador de Endpoints N8N
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Teste qualquer endpoint configurado usando as configurações globais de HMAC e Bearer Token.
          </DialogDescription>
        </DialogHeader>

        {/* Status das Configurações */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Configuração Global</span>
              </div>
              <div className={`text-xs mt-1 ${globalConfig ? 'text-green-400' : 'text-red-400'}`}>
                {globalConfig ? '✅ Configurada' : '❌ Não configurada'}
              </div>
              {globalConfig && (
                <div className="text-xs text-gray-500 mt-1">
                  HMAC: {globalConfig.hmac_secret.substring(0, 8)}...
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-white">Endpoints</span>
              </div>
              <div className={`text-xs mt-1 ${endpoints.length > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {endpointsLoading ? 'Carregando...' : 
                 endpoints.length > 0 ? `✅ ${endpoints.length} disponíveis` : '❌ Nenhum encontrado'}
              </div>
              {!endpointsLoading && endpoints.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {endpoints.filter(e => e.is_active).length} ativos
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white">Status</span>
              </div>
              <div className={`text-xs mt-1 ${globalConfig && endpoints.length > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                {globalConfig && endpoints.length > 0 ? '✅ Pronto para teste' : 
                 !globalConfig ? '⚠️ Configure HMAC primeiro' :
                 '⚠️ Nenhum endpoint disponível'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Erros */}
        {errors.length > 0 && (
          <Alert className="border-red-600/30 bg-red-900/20 mb-4">
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
          {/* Seleção do Endpoint */}
          <div className="space-y-2">
            <Label className="text-white">Endpoint para Testar</Label>
            <div className="space-y-2">
              {/* Debug info */}
              <div className="text-xs text-gray-500">
                {endpointsLoading ? 'Carregando endpoints...' : `${endpoints.length} endpoints encontrados`}
              </div>
              
              {endpoints.length === 0 ? (
                <div className="bg-gray-800 border border-gray-600 rounded-md p-4 text-center">
                  <div className="text-gray-400 text-sm mb-3">
                    {endpointsLoading ? '⏳ Carregando endpoints...' : '⚠️ Nenhum endpoint encontrado'}
                  </div>
                  {!endpointsLoading && (
                    <>
                      <div className="text-xs text-gray-500 mb-3">
                        Configure endpoints no N8N Manager primeiro ou verifique suas permissões.
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Criar um endpoint de teste temporário
                          const testEndpoint = {
                            id: 'test-endpoint',
                            endpoint_key: 'test.hmac',
                            url: 'https://webhook.n8nlabz.com.br/webhook/testehmac',
                            category: 'test',
                            is_active: true,
                            bearer_token: '',
                            company_id: '',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            created_by: '',
                            display_name: 'Teste HMAC',
                            description: 'Endpoint de teste para validar HMAC'
                          };
                          setSelectedEndpoint('test-endpoint');
                          // Adicionar o endpoint temporário à lista
                          (endpoints as any).push(testEndpoint);
                        }}
                        className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Usar Endpoint de Teste
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <Select value={selectedEndpoint} onValueChange={handleEndpointChange}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Selecione um endpoint..." />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-gray-800 border-gray-700 max-h-60 overflow-y-auto z-50"
                    position="popper"
                    side="bottom"
                    sideOffset={4}
                  >
                    {endpoints.map((endpoint) => (
                      <SelectItem 
                        key={endpoint.id} 
                        value={endpoint.id} 
                        className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{endpoint.endpoint_key}</span>
                          <span className={`ml-2 text-xs ${endpoint.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                            {endpoint.is_active ? '●' : '○'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {selectedEndpointData && (
              <div className="text-xs text-gray-400 space-y-1 bg-gray-800/50 p-3 rounded border border-gray-700">
                <div><strong>URL:</strong> <span className="font-mono text-blue-300">{selectedEndpointData.url}</span></div>
                <div><strong>Categoria:</strong> {selectedEndpointData.category}</div>
                <div><strong>Status:</strong> 
                  <span className={selectedEndpointData.is_active ? 'text-green-400' : 'text-red-400'}>
                    {selectedEndpointData.is_active ? ' Ativo' : ' Inativo'}
                  </span>
                </div>
                <div><strong>Bearer Token:</strong> 
                  <span className="font-mono text-yellow-300">
                    {selectedEndpointData.bearer_token ? 
                      selectedEndpointData.bearer_token.substring(0, 8) + '...' : 
                      'Usando padrão global'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Configuração do Payload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-white">Payload de Teste (JSON)</Label>
              <Button
                onClick={generateTestPayload}
                disabled={!selectedEndpoint}
                variant="outline"
                size="sm"
                className="border-green-600 text-green-400 hover:bg-green-600/20"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Payload
              </Button>
            </div>
            <Textarea
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              placeholder='{"key": "value"}'
              className="bg-gray-800 border-gray-600 text-white font-mono"
              rows={8}
            />
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-400">
                O payload será enviado dentro da estrutura padrão de eventos N8N com HMAC e Bearer token. 
                Use o botão <span className="text-green-400 font-medium">"Gerar Payload"</span> para criar automaticamente um payload de teste baseado no endpoint selecionado.
              </p>
            </div>
          </div>

          {/* Informações da Configuração Atual */}
          {globalConfig && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h4 className="text-white font-medium mb-2">Configuração que será usada:</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400">HMAC Secret:</span>
                  <div className="text-gray-300 font-mono">
                    {globalConfig.hmac_secret ? globalConfig.hmac_secret.substring(0, 16) + '...' : 'Não configurado'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Bearer Token:</span>
                  <div className="text-gray-300 font-mono">
                    {(selectedEndpointData?.bearer_token || globalConfig.default_bearer_token) ? 
                      (selectedEndpointData?.bearer_token || globalConfig.default_bearer_token).substring(0, 16) + '...' : 
                      'Não configurado'
                    }
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedEndpointData?.bearer_token ? 'Token específico do endpoint' : 'Token padrão global'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Timeout:</span>
                  <div className="text-gray-300">{globalConfig.default_timeout_ms || 30000}ms</div>
                </div>
                <div>
                  <span className="text-gray-400">Retry:</span>
                  <div className="text-gray-300">{globalConfig.retry_attempts || 3} tentativas</div>
                </div>
              </div>
            </div>
          )}

          {/* Resultado do Teste */}
          {testResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                Resultado do Teste
              </h3>
              
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 space-y-4">
                {/* Status geral */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-400 text-sm">Status HTTP</Label>
                    <div className={`text-sm font-mono ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                      {testResult.status} {testResult.statusText}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-gray-400 text-sm">Endpoint</Label>
                    <div className="text-sm text-gray-300 font-mono">
                      {testResult.endpoint?.key}
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-400 text-sm">Timestamp</Label>
                    <div className="text-sm text-gray-300">
                      {testResult.timing?.timestamp ? new Date(testResult.timing.timestamp).toLocaleString('pt-BR') : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Payload enviado */}
                <div>
                  <Label className="text-gray-400 text-sm">Payload Enviado</Label>
                  <pre className="text-xs bg-gray-900/50 p-3 rounded border border-gray-600 overflow-x-auto text-blue-300">
                    {JSON.stringify(testResult.request?.payload, null, 2)}
                  </pre>
                </div>

                {/* Headers enviados */}
                <div>
                  <Label className="text-gray-400 text-sm">Headers Enviados</Label>
                  <pre className="text-xs bg-gray-900/50 p-3 rounded border border-gray-600 overflow-x-auto text-yellow-300">
                    {JSON.stringify(testResult.request?.headers, null, 2)}
                  </pre>
                </div>

                {/* Resposta */}
                <div>
                  <Label className="text-gray-400 text-sm">Resposta do Servidor</Label>
                  <pre className="text-xs bg-gray-900/50 p-3 rounded border border-gray-600 overflow-x-auto text-gray-300">
                    {JSON.stringify(testResult.data || testResult.error, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setTestResult(null)}
            disabled={!testResult}
            className="border-gray-600 text-gray-300"
          >
            <Code className="mr-2 h-4 w-4" />
            Limpar Resultado
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-600"
            >
              Fechar
            </Button>
            <Button
              onClick={handleTestEndpoint}
              disabled={testing || !selectedEndpoint || !globalConfig}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {testing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Executar Teste
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EndpointTester;