// Script temporário para verificar estrutura da tabela oncall_events
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zldxpndslomjccbilowh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZHhwbmRzbG9tamdjaWJpbG93aCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0NTM5MjA5LCJleHAiOjIwNTAxMTUyMDl9.L8H1_YZVrAVInWiJoYL5c2VvEo32u-Zcnj3zUPbmYS0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  try {
    // Verificar se a tabela existe
    const { data, error } = await supabase
      .from('oncall_events')
      .select('*')
      .limit(1);
    
    console.log('Tabela oncall_events existe:', !error);
    console.log('Erro:', error);
    console.log('Dados encontrados:', data);
    
    // Tentar inserir um registro de teste para ver a estrutura
    const { data: insertData, error: insertError } = await supabase
      .from('oncall_events')
      .insert({
        summary: 'Teste de estrutura',
        description: 'Verificando estrutura da tabela',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        event_type: 'test'
      })
      .select();
    
    console.log('Tentativa de inserção:', insertData, insertError);
    
  } catch (err) {
    console.error('Erro ao verificar tabela:', err);
  }
}

checkTable();