/**
 * Interfaces para nova arquitetura de chats baseada em imobipro_messages
 * Criado em paralelo às interfaces existentes para migração segura
 */

// ==========================================
// INTERFACES PARA DADOS DO BANCO
// ==========================================

/**
 * Estrutura da tabela imobipro_messages
 */
export interface ImobiproMessageRow {
  id: number;
  session_id: string;
  message: ImobiproMessageContent;
  data: string; // timestamp
  instancia: string;
}

/**
 * Conteúdo JSONB da coluna message
 */
export interface ImobiproMessageContent {
  type: 'human' | 'ai';
  content: string;
  tool_calls?: any[];
  additional_kwargs?: Record<string, any>;
  response_metadata?: Record<string, any>;
  invalid_tool_calls?: any[];
}

/**
 * Dados de uma instância/corretor para 1ª coluna
 */
export interface InstanciaCorretorInfo {
  instancia: string; // nome da instância (ex: 'sdr', 'Instância Tiago Corretor')
  corretor_id: string | null; // user_profiles.id ou null para SDR
  corretor_nome: string | null; // user_profiles.full_name ou null para SDR
  instance_display_name: string; // nome para exibir (instance_name ou instancia)
  total_conversas: number; // COUNT(DISTINCT session_id)
  is_sdr: boolean; // true se instancia = 'sdr'
  status?: string; // whatsapp_instances.status
  is_active?: boolean; // whatsapp_instances.is_active
}

/**
 * Dados de uma conversa/sessão para 2ª coluna
 */
export interface ConversaSessionInfo {
  session_id: string; // identificador único da conversa
  instancia: string; // nome da instância
  cliente_nome: string | null; // extraído da primeira mensagem humana
  primeiro_contato: string | null; // primeira mensagem completa do cliente
  ultima_mensagem: string | null; // conteúdo da última mensagem
  ultima_mensagem_time: string; // timestamp da última mensagem
  total_mensagens: number; // total de mensagens na conversa
  primeira_mensagem_time: string; // timestamp da primeira mensagem
  has_unread?: boolean; // pode ser implementado futuramente
}

/**
 * Dados de uma mensagem individual para 3ª coluna
 */
export interface MensagemInfo {
  id: number;
  session_id: string;
  type: 'human' | 'ai';
  content: string;
  timestamp: string;
  instancia: string;
  is_from_client: boolean; // true para 'human', false para 'ai'
  has_tool_calls: boolean; // true se message.tool_calls existe e não está vazio
  metadata?: Record<string, any>; // campos adicionais do JSONB
}

// ==========================================
// INTERFACES PARA COMPONENTES REACT
// ==========================================

/**
 * Props para componente da 1ª coluna (Lista de Instâncias/Corretores)
 */
export interface InstanciasListProps {
  instancias: InstanciaCorretorInfo[];
  selectedInstancia: string | null;
  onSelectInstancia: (instancia: string) => void;
  loading: boolean;
  error: string | null;
}

/**
 * Props para componente da 2ª coluna (Lista de Conversas)
 */
export interface ConversasListProps {
  conversas: ConversaSessionInfo[];
  selectedSession: string | null;
  onSelectSession: (sessionId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  loading: boolean;
  error: string | null;
}

/**
 * Props para componente da 3ª coluna (Mensagens da Conversa)
 */
export interface MensagensAreaProps {
  mensagens: MensagemInfo[];
  selectedSession: string | null;
  conversaInfo: ConversaSessionInfo | null;
  onSendMessage: (content: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  canSendMessage: boolean; // baseado no role do usuário
}

// ==========================================
// INTERFACES PARA HOOK DE DADOS
// ==========================================

/**
 * Estado do hook useImobiproChats
 */
export interface ImobiproChatsState {
  // Estados de loading
  loading: boolean;
  instanciasLoading: boolean;
  conversasLoading: boolean;
  mensagensLoading: boolean;
  
  // Estados de erro
  error: string | null;
  
  // Dados
  instancias: InstanciaCorretorInfo[];
  conversas: ConversaSessionInfo[];
  mensagens: MensagemInfo[];
  
  // Seleções
  selectedInstancia: string | null;
  selectedSession: string | null;
  
  // Busca
  searchTerm: string;
}

/**
 * Ações do hook useImobiproChats
 */
export interface ImobiproChatsActions {
  // Seleções
  setSelectedInstancia: (instancia: string | null) => void;
  setSelectedSession: (sessionId: string | null) => void;
  setSearchTerm: (term: string) => void;
  
  // Carregamento de dados
  loadInstancias: () => Promise<void>;
  loadConversas: (instancia: string) => Promise<void>;
  loadMensagens: (sessionId: string) => Promise<void>;
  
  // Envio de mensagem
  sendMessage: (sessionId: string, content: string) => Promise<boolean>;
  
  // Refresh
  refreshData: () => Promise<void>;
  
  // Cleanup
  cleanup: () => void;
}

/**
 * Retorno completo do hook useImobiproChats
 */
export interface UseImobiproChatsReturn extends ImobiproChatsState, ImobiproChatsActions {}

// ==========================================
// INTERFACES PARA QUERIES SQL
// ==========================================

/**
 * Parâmetros para buscar instâncias
 */
export interface BuscarInstanciasParams {
  userRole: 'admin' | 'gestor' | 'corretor';
  userId?: string;
  companyId?: string;
}

/**
 * Parâmetros para buscar conversas
 */
export interface BuscarConversasParams {
  instancia: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

/**
 * Parâmetros para buscar mensagens
 */
export interface BuscarMensagensParams {
  sessionId: string;
  limit?: number;
  offset?: number;
}

/**
 * Parâmetros para enviar mensagem
 */
export interface EnviarMensagemParams {
  sessionId: string;
  content: string;
  instancia: string;
  userId: string;
  type: 'ai'; // sempre 'ai' quando enviado pelo corretor
}

// ==========================================
// UTILITÁRIOS E VALIDAÇÕES
// ==========================================

/**
 * Função para extrair nome do cliente da primeira mensagem
 */
export type ExtractClientNameFunction = (primeiroContato: string) => string | null;

/**
 * Função para validar session_id
 */
export type ValidateSessionIdFunction = (sessionId: string) => boolean;

/**
 * Função para formatar mensagem para exibição
 */
export type FormatMessageFunction = (message: ImobiproMessageContent) => string;

/**
 * Configurações de real-time subscriptions
 */
export interface ImobiproSubscriptionConfig {
  enableInstanciasSubscription: boolean;
  enableConversasSubscription: boolean;
  enableMensagensSubscription: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
}