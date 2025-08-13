import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { 
  KanbanLead, 
  LeadStage,
  databaseLeadToKanbanLead,
  kanbanLeadToDatabaseLead 
} from '@/types/kanban';
import { logAudit } from '@/lib/audit/logger';

type DatabaseLead = Tables<'leads'>;

export function useKanbanLeads() {
  const [leads, setLeads] = useState<KanbanLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('corretor');
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  // Verificar role do usuário
  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'corretor';

      // Buscar no auth.users ao invés de user_profiles
      const role = 'corretor'; // Por enquanto definir como corretor
      setUserRole(role);
      return role;
    } catch (error) {
      console.error('Erro ao verificar role do usuário:', error);
      return 'corretor';
    }
  }, []);

  // Buscar todos os leads do banco de dados
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se o usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar role do usuário
      const currentRole = await checkUserRole();

      console.log('🎭 Usuário logado:', user.email);
      console.log('🎭 Role do usuário:', currentRole);

      // Para gestores e admins, buscar todos os leads
      // Para corretores, as políticas RLS já filtram automaticamente
      let query = supabase
        .from('leads')
        .select(`*, corretor:user_profiles!leads_id_corretor_responsavel_fkey(id, full_name, role)`) 
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('🔍 Leads encontrados:', data?.length || 0);
      console.log('🔍 Dados dos leads:', data);

      // Converter dados do banco para formato do kanban com tratamento seguro
      const kanbanLeads = (data || []).map(dbLead => {
        try {
          const k = databaseLeadToKanbanLead({
            ...dbLead,
            stage: (dbLead.stage || 'Novo Lead') as LeadStage,
            interest: dbLead.interest || null,
            estimated_value: dbLead.estimated_value || null,
            notes: dbLead.notes || null,
            updated_at: dbLead.updated_at || null
          });
          return k;
        } catch (conversionError) {
          console.error('Erro ao converter lead:', dbLead, conversionError);
          // Retorna um lead padrão em caso de erro
          return databaseLeadToKanbanLead({
            id: dbLead.id || 'unknown',
            name: dbLead.name || 'Nome não informado',
            email: null,
            phone: null,
            source: 'Não informado',
            stage: 'Novo Lead',
            interest: null,
            estimated_value: null,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: null
          });
        }
      });
      
      // Enriquecer tipo do imóvel (tipo_imovel) a partir do catálogo, quando houver listing_id
      const listingIds = Array.from(new Set((kanbanLeads
        .map(l => l.imovel_interesse)
        .filter(Boolean) as string[])));
      let tipoMap: Record<string, string> = {};
      if (listingIds.length > 0) {
        const { data: imv } = await supabase
          .from('imoveisvivareal')
          .select('listing_id, tipo_imovel')
          .in('listing_id', listingIds);
        (imv || []).forEach((row: any) => {
          if (row.listing_id) tipoMap[String(row.listing_id)] = row.tipo_imovel || '';
        });
      }
      const enriched = kanbanLeads.map(l => ({
        ...l,
        imovel_tipo: l.imovel_interesse ? (tipoMap[l.imovel_interesse] || undefined) : undefined
      }));

      setLeads(enriched);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar leads';
      setError(errorMessage);
      console.error('Erro ao buscar leads:', err);
      // Em caso de erro, definir array vazio ao invés de deixar undefined
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [checkUserRole]);

  // Atualizar estágio de um lead
  const updateLeadStage = useCallback(async (leadId: string, newStage: LeadStage) => {
    try {
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('leads')
        .update({ 
          stage: newStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      // Atualizar estado local imediatamente
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, stage: newStage }
            : lead
        )
      );

      return true;
    } catch (err) {
      console.error('Erro ao atualizar estágio do lead:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar lead');
      return false;
    }
  }, []);

  // Criar novo lead (permite atribuição opcional a um corretor específico)
  const createLead = useCallback(async (
    leadData: Omit<KanbanLead, 'id' | 'dataContato'>,
    options?: { assignedUserId?: string }
  ) => {
    try {
      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Preparar dados incluindo os novos campos
      const insertData: any = {
        name: leadData.nome,
        email: leadData.email || null,
        phone: leadData.telefone || null,
        cpf: leadData.cpf || null,
        endereco: leadData.endereco || null,
        estado_civil: leadData.estado_civil || null,
        source: leadData.origem,
        stage: leadData.stage as LeadStage,
        interest: leadData.interesse || null,
        estimated_value: leadData.valorEstimado || leadData.valor || null,
        notes: leadData.observacoes || null,
        imovel_interesse: leadData.imovel_interesse || null,
        // user_id: criador; id_corretor_responsavel: corretor responsável
        user_id: user.id,
        id_corretor_responsavel: options?.assignedUserId || null
      };

      // Adicionar property_id se existir na estrutura da tabela
      if (leadData.property_id) {
        insertData.property_id = leadData.property_id;
      }

      // Adicionar message se existir na estrutura da tabela
      if (leadData.message) {
        insertData.message = leadData.message;
      }

      const { data, error } = await supabase
        .from('leads')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Adicionar ao estado local
      const newKanbanLead = databaseLeadToKanbanLead({
        ...data,
        stage: (data.stage || 'Novo Lead') as LeadStage,
        interest: data.interest || null,
        estimated_value: data.estimated_value || null,
        notes: data.notes || null,
        updated_at: data.updated_at || null
      });
      setLeads(prevLeads => [newKanbanLead, ...prevLeads]);
      logAudit({ action: 'lead.created', resource: 'lead', resourceId: newKanbanLead.id, meta: { nome: newKanbanLead.nome, origem: newKanbanLead.origem } });

      return newKanbanLead;
    } catch (err) {
      console.error('Erro ao criar lead:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar lead');
      return null;
    }
  }, []);

  // Atualizar lead completo
  const updateLead = useCallback(async (leadId: string, updates: Partial<KanbanLead>) => {
    try {
      // Preparar dados básicos que existem na tabela atual
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.nome) updateData.name = updates.nome;
      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.telefone !== undefined) updateData.phone = updates.telefone || null;
      if (updates.cpf !== undefined) updateData.cpf = updates.cpf || null;
      if (updates.endereco !== undefined) updateData.endereco = updates.endereco || null;
      if (updates.estado_civil !== undefined) updateData.estado_civil = updates.estado_civil || null;
      if (updates.origem) updateData.source = updates.origem;
      if (updates.stage) updateData.stage = updates.stage as LeadStage;
      if (updates.interesse !== undefined) updateData.interest = updates.interesse || null;
      if (updates.valorEstimado !== undefined || updates.valor !== undefined) {
        updateData.estimated_value = updates.valorEstimado || updates.valor || null;
      }
      if (updates.observacoes !== undefined) updateData.notes = updates.observacoes || null;
      if (updates.property_id !== undefined) updateData.property_id = updates.property_id || null;
      if (updates.imovel_interesse !== undefined) updateData.imovel_interesse = updates.imovel_interesse || null;
      if (updates.message !== undefined) updateData.message = updates.message || null;
      if ((updates as any).id_corretor_responsavel !== undefined) updateData.id_corretor_responsavel = (updates as any).id_corretor_responsavel;
      if ((updates as any).assigned_user_id !== undefined) updateData.id_corretor_responsavel = (updates as any).assigned_user_id || null;
      if ((updates as any).id_corretor_responsavel !== undefined) updateData.id_corretor_responsavel = (updates as any).id_corretor_responsavel || null;

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      // Atualizar estado local
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, ...updates }
            : lead
        )
      );
      logAudit({ action: 'lead.updated', resource: 'lead', resourceId: leadId, meta: updates });

      return true;
    } catch (err) {
      console.error('Erro ao atualizar lead:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar lead');
      return false;
    }
  }, []);

  // Deletar lead
  const deleteLead = useCallback(async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      // Remover do estado local
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));

      return true;
    } catch (err) {
      console.error('Erro ao deletar lead:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar lead');
      return false;
    }
  }, []);

  // Buscar leads por estágio
  const getLeadsByStage = useCallback((stage: string) => {
    return leads.filter(lead => lead.stage === stage);
  }, [leads]);

  // Carregar dados na inicialização
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Configurar escuta em tempo real (separado para evitar re-subscriptions)
  useEffect(() => {
    // Verificar se já temos subscription ativa
    if (isSubscribedRef.current) {
      console.log('🔄 Subscription de leads já ativa, pulando...');
      return;
    }

    // Configurar subscription para mudanças em tempo real
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const channelName = `leads_changes_${timestamp}_${random}`;
    
    try {
      const subscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leads'
          },
          async (payload) => {
            console.log('🔔 Mudança detectada na tabela leads:', payload);
            
            // Verificar se o usuário atual está autenticado
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Verificar role do usuário atual
            const currentRole = userRole || await checkUserRole();
            
            switch (payload.eventType) {
              case 'INSERT': {
                const newLead = databaseLeadToKanbanLead({
                  ...payload.new as DatabaseLead,
                  stage: (payload.new.stage || 'Novo Lead') as LeadStage,
                  interest: payload.new.interest || null,
                  estimated_value: payload.new.estimated_value || null,
                  notes: payload.new.notes || null,
                  updated_at: payload.new.updated_at || null
                });
                setLeads(prevLeads => {
                  // Verificar se o lead já existe para evitar duplicatas
                  const exists = prevLeads.some(lead => lead.id === newLead.id);
                  if (!exists) {
                    console.log('✅ Adicionando novo lead:', newLead.nome);
                    return [newLead, ...prevLeads];
                  }
                  return prevLeads;
                });
                break;
              }
              case 'UPDATE': {
                const updatedLead = databaseLeadToKanbanLead({
                  ...payload.new as DatabaseLead,
                  stage: (payload.new.stage || 'Novo Lead') as LeadStage,
                  interest: payload.new.interest || null,
                  estimated_value: payload.new.estimated_value || null,
                  notes: payload.new.notes || null,
                  updated_at: payload.new.updated_at || null
                });
                setLeads(prevLeads => 
                  prevLeads.map(lead => 
                    lead.id === updatedLead.id ? updatedLead : lead
                  )
                );
                break;
              }
              case 'DELETE': {
                setLeads(prevLeads => 
                  prevLeads.filter(lead => lead.id !== payload.old.id)
                );
                break;
              }
            }
          }
        );

      // Salvar referência
      subscriptionRef.current = subscription;

      subscription.subscribe((status: string) => {
        console.log(`🔗 Status subscription leads: ${status}`);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        }
      });
    } catch (error) {
      console.error('❌ Erro ao configurar subscription de leads:', error);
    }

    // Cleanup
    return () => {
      console.log('🧹 Removendo subscription de leads...');
      try {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }
        isSubscribedRef.current = false;
      } catch (error) {
        console.error('❌ Erro ao limpar subscription de leads:', error);
      }
    };
  }, [userRole, checkUserRole]);

  return {
    leads,
    loading,
    error,
    userRole, // Expor o role do usuário
    fetchLeads,
    updateLeadStage,
    createLead,
    updateLead,
    deleteLead,
    getLeadsByStage,
    // Estatísticas calculadas
    totalLeads: leads.length,
    totalValue: leads.reduce((sum, lead) => sum + (lead.valor || 0), 0),
    stageStats: leads.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}
