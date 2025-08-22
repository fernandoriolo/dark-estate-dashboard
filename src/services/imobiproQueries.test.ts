/**
 * Arquivo de teste para validar queries da nova arquitetura imobipro_messages
 * Para ser executado isoladamente no navegador (console)
 */

import { 
  buscarInstanciasCorretores,
  buscarConversasPorInstancia,
  buscarMensagensDaSessao
} from './imobiproQueries';

// ==========================================
// TESTES DAS QUERIES
// ==========================================

/**
 * Testa busca de instâncias/corretores
 */
export async function testarBuscarInstancias() {
  console.log('🧪 TESTE 1: Buscar Instâncias/Corretores');
  
  try {
    const resultado = await buscarInstanciasCorretores({
      userRole: 'admin', // Testar como admin para ver todas
    });
    
    console.log('✅ Resultado:', resultado);
    console.log('📊 Total encontrado:', resultado.length);
    
    if (resultado.length > 0) {
      console.log('📋 Primeira instância:', resultado[0]);
    }
    
    return resultado;
  } catch (error) {
    console.error('❌ ERRO no teste 1:', error);
    throw error;
  }
}

/**
 * Testa busca de conversas por instância
 */
export async function testarBuscarConversas(instancia: string = 'sdr') {
  console.log(`🧪 TESTE 2: Buscar Conversas da Instância "${instancia}"`);
  
  try {
    const resultado = await buscarConversasPorInstancia({
      instancia,
      limit: 10 // Limitar para teste
    });
    
    console.log('✅ Resultado:', resultado);
    console.log('📊 Total encontrado:', resultado.length);
    
    if (resultado.length > 0) {
      console.log('📋 Primeira conversa:', resultado[0]);
      return resultado[0].session_id; // Retornar para próximo teste
    }
    
    return null;
  } catch (error) {
    console.error('❌ ERRO no teste 2:', error);
    throw error;
  }
}

/**
 * Testa busca de mensagens de uma sessão
 */
export async function testarBuscarMensagens(sessionId: string) {
  console.log(`🧪 TESTE 3: Buscar Mensagens da Sessão "${sessionId}"`);
  
  try {
    const resultado = await buscarMensagensDaSessao({
      sessionId,
      limit: 20 // Limitar para teste
    });
    
    console.log('✅ Resultado:', resultado);
    console.log('📊 Total encontrado:', resultado.length);
    
    if (resultado.length > 0) {
      console.log('📋 Primeira mensagem:', resultado[0]);
      console.log('📋 Última mensagem:', resultado[resultado.length - 1]);
      
      // Verificar se tem mensagens de cliente e AI
      const mensagensCliente = resultado.filter(m => m.is_from_client);
      const mensagensAI = resultado.filter(m => !m.is_from_client);
      
      console.log('👤 Mensagens do cliente:', mensagensCliente.length);
      console.log('🤖 Mensagens da AI:', mensagensAI.length);
    }
    
    return resultado;
  } catch (error) {
    console.error('❌ ERRO no teste 3:', error);
    throw error;
  }
}

/**
 * Executa todos os testes em sequência
 */
export async function executarTodosOsTestes() {
  console.log('🚀 INICIANDO BATERIA DE TESTES DAS QUERIES IMOBIPRO');
  console.log('================================================');
  
  try {
    // Teste 1: Buscar instâncias
    const instancias = await testarBuscarInstancias();
    console.log('\n');
    
    if (instancias.length === 0) {
      console.warn('⚠️ Nenhuma instância encontrada. Parando testes.');
      return;
    }
    
    // Teste 2: Buscar conversas da primeira instância
    const primeiraInstancia = instancias[0];
    const sessionId = await testarBuscarConversas(primeiraInstancia.instancia);
    console.log('\n');
    
    if (!sessionId) {
      console.warn('⚠️ Nenhuma conversa encontrada. Pulando teste de mensagens.');
    } else {
      // Teste 3: Buscar mensagens da primeira conversa
      await testarBuscarMensagens(sessionId);
      console.log('\n');
    }
    
    console.log('🎉 TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
    console.log('================================================');
    
    return {
      success: true,
      instancias: instancias.length,
      conversas: sessionId ? 'encontradas' : 'não encontradas',
      mensagens: sessionId ? 'testadas' : 'puladas'
    };
    
  } catch (error) {
    console.error('💥 FALHA NA BATERIA DE TESTES:', error);
    console.log('================================================');
    throw error;
  }
}

// ==========================================
// TESTES ESPECÍFICOS PARA DEBUGGING
// ==========================================

/**
 * Testa busca com filtro de texto
 */
export async function testarBuscaComFiltro() {
  console.log('🧪 TESTE EXTRA: Busca com Filtro de Texto');
  
  try {
    const resultado = await buscarConversasPorInstancia({
      instancia: 'sdr',
      searchTerm: 'fernando', // Procurar por "fernando" nas mensagens
      limit: 5
    });
    
    console.log('✅ Resultado filtrado:', resultado);
    return resultado;
  } catch (error) {
    console.error('❌ ERRO no teste de filtro:', error);
    throw error;
  }
}

/**
 * Testa comportamento com instância inexistente
 */
export async function testarInstanciaInexistente() {
  console.log('🧪 TESTE EXTRA: Instância Inexistente');
  
  try {
    const resultado = await buscarConversasPorInstancia({
      instancia: 'instancia-que-nao-existe',
      limit: 5
    });
    
    console.log('✅ Resultado (deve ser vazio):', resultado);
    console.log('📊 Total:', resultado.length, '(esperado: 0)');
    return resultado;
  } catch (error) {
    console.error('❌ ERRO no teste de instância inexistente:', error);
    throw error;
  }
}

// ==========================================
// INSTRUÇÕES DE USO
// ==========================================

console.log(`
🧪 COMO USAR ESTES TESTES:

No console do navegador, execute:

1. Teste completo:
   await executarTodosOsTestes()

2. Testes individuais:
   await testarBuscarInstancias()
   await testarBuscarConversas('sdr')
   await testarBuscarMensagens('e6f54ccd-75e4-47e1-bc38-3e01bf9de44f')

3. Testes extras:
   await testarBuscaComFiltro()
   await testarInstanciaInexistente()

Certifique-se de que:
- Está logado no sistema
- Tem permissões para acessar imobipro_messages
- Há dados na tabela para testar
`);