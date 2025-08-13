import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  UserCheck,
  Clock,
  Building2,
  Star,
  MessageSquare,
  AlertCircle,
  User,
  CheckCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useKanbanLeads } from '@/hooks/useKanbanLeads';
import { AddLeadModal } from '@/components/AddLeadModal';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

// Função para determinar cor do status baseado no stage
const getStageColor = (stage: string) => {
  switch (stage) {
    case 'Fechado': return 'bg-green-100 text-green-800 border-green-300';
    case 'Em Atendimento': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Reunião Agendada': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'Novo Lead': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Perdido': return 'bg-red-100 text-red-800 border-red-300';
    case 'Desistiu': return 'bg-gray-100 text-gray-800 border-gray-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Função para determinar cor da origem
const getSourceColor = (source: string) => {
  switch (source.toLowerCase()) {
    case 'facebook': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'zap imóveis': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'viva real': return 'bg-green-100 text-green-800 border-green-300';
    case 'olx': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'indicação': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'whatsapp': return 'bg-teal-100 text-teal-800 border-teal-300';
    case 'website': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Função para determinar cor do badge do corretor
const getBrokerColor = (role: string) => {
  switch (role.toLowerCase()) {
    case 'admin': return 'bg-red-100 text-red-800 border-red-300';
    case 'gestor': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'corretor': return 'bg-amber-100 text-amber-800 border-amber-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export function ClientsCRMView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('todos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [brokerFilter, setBrokerFilter] = useState<string>('all');
  const [brokers, setBrokers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  
  // Usar o mesmo hook que o Pipeline de Clientes
  const { leads, loading, createLead } = useKanbanLeads();
  
  // Verificar se o usuário pode ver informações de todos os corretores
  const { profile, getCompanyUsers } = useUserProfile();
  const canSeeAllBrokers = profile?.role === 'gestor' || profile?.role === 'admin';

  React.useEffect(() => {
    let cancelled = false;
    const loadBrokers = async () => {
      if (!canSeeAllBrokers) return;
      try {
        const users = await getCompanyUsers();
        if (cancelled) return;
        const onlyBrokers = (users || []).filter((u: any) => (u.role ?? 'corretor') === 'corretor');
        setBrokers(onlyBrokers.map((u: any) => ({ id: u.id, full_name: u.full_name || 'Sem nome' })));
      } catch (e) {
        // silencioso
      }
    };
    loadBrokers();
    return () => { cancelled = true; };
  }, [canSeeAllBrokers, getCompanyUsers]);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (lead.telefone && lead.telefone.includes(searchTerm));
    
    const matchesTab = selectedTab === 'todos' || 
                      (selectedTab === 'ativos' && ['Fechado', 'Em Atendimento', 'Reunião Agendada'].includes(lead.stage)) ||
                      (selectedTab === 'prospects' && ['Novo Lead'].includes(lead.stage)) ||
                      (selectedTab === 'negociacao' && ['Em Atendimento', 'Reunião Agendada'].includes(lead.stage)) ||
                      (selectedTab === 'fechados' && lead.stage === 'Fechado') ||
                      (selectedTab === 'perdidos' && ['Perdido', 'Desistiu'].includes(lead.stage));

    const matchesBroker = !canSeeAllBrokers || brokerFilter === 'all' || lead.id_corretor_responsavel === brokerFilter;

    return matchesSearch && matchesTab && matchesBroker;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTab, brokerFilter]);

  const stats = {
    total: leads.length,
    ativos: leads.filter(l => ['Fechado', 'Em Atendimento', 'Reunião Agendada'].includes(l.stage)).length,
    prospects: leads.filter(l => l.stage === 'Novo Lead').length,
    fechados: leads.filter(l => l.stage === 'Fechado').length,
    totalValue: leads.reduce((sum, l) => sum + (l.valorEstimado || l.valor || 0), 0)
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
  };

  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    setShowViewModal(true);
  };

  const handleEditLead = (lead) => {
    setSelectedLead(lead);
    setShowEditModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedLead(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedLead(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="inline-block"
        >
          <Users className="h-8 w-8 text-blue-400" />
        </motion.div>
        <p className="ml-3 text-gray-400">Carregando clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            CRM de Clientes
          </h1>
          <p className="text-gray-400">
            Gestão completa do relacionamento com clientes e prospects
          </p>
        </div>
        
        <motion.div 
          className="flex gap-3"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {canSeeAllBrokers && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-400" />
              <Select value={brokerFilter} onValueChange={setBrokerFilter}>
                <SelectTrigger className="w-56 bg-gray-900/50 border-blue-600/50 text-blue-400">
                  <SelectValue placeholder="Filtrar por corretor" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 text-gray-200 border-gray-700">
                  <SelectItem value="all">Todos os corretores</SelectItem>
                  {brokers.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </motion.div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        {[
          { title: "Total Clientes", value: stats.total, icon: Users, color: "text-blue-400" },
          { title: "Clientes Ativos", value: stats.ativos, icon: UserCheck, color: "text-green-400" },
          { title: "Prospects", value: stats.prospects, icon: Star, color: "text-yellow-400" },
          { title: "Fechados", value: stats.fechados, icon: CheckCircle, color: "text-emerald-400" }
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/60 hover:bg-gray-800/70 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className="p-3 rounded-full bg-gray-700/50">
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
          />
        </div>
      </motion.div>

      {/* Clients List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800/50 backdrop-blur-sm">
            <TabsTrigger value="todos" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
              Todos ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="ativos" className="data-[state=active]:bg-green-600/20 data-[state=active]:text-green-400">
              Ativos ({stats.ativos})
            </TabsTrigger>
            <TabsTrigger value="prospects" className="data-[state=active]:bg-yellow-600/20 data-[state=active]:text-yellow-400">
              Prospects ({stats.prospects})
            </TabsTrigger>
            <TabsTrigger value="negociacao" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">
              Em Negociação
            </TabsTrigger>
            <TabsTrigger value="fechados" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              Fechados ({stats.fechados})
            </TabsTrigger>
            <TabsTrigger value="perdidos" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-400">
              Perdidos
            </TabsTrigger>
          </TabsList>

          {['todos', 'ativos', 'prospects', 'negociacao', 'fechados', 'perdidos'].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4 mt-6">
              <div className="grid gap-4">
                {paginatedLeads.map((lead, index) => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    whileHover={{ scale: 1.01, y: -2 }}
                  >
                    <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/60 hover:bg-gray-800/70 transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          {/* Client Info */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-semibold">
                                  {lead.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white">{lead.nome}</h3>
                                <div className="flex gap-2 flex-wrap">
                                  <Badge variant="outline" className={getStageColor(lead.stage)}>
                                    {lead.stage}
                                  </Badge>
                                  <Badge variant="outline" className={getSourceColor(lead.origem)}>
                                    {lead.origem}
                                  </Badge>
                                  {/* Mostrar corretor apenas para gestores e admins */}
                                  {canSeeAllBrokers && lead.corretor && (
                                    <Badge variant="outline" className={getBrokerColor(lead.corretor.role)}>
                                      <User className="h-3 w-3 mr-1" />
                                      {lead.corretor.nome}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                              {lead.email && (
                                <div className="flex items-center gap-2 text-gray-300">
                                  <Mail className="h-4 w-4" />
                                  <span>{lead.email}</span>
                                </div>
                              )}
                              {lead.telefone && (
                                <div className="flex items-center gap-2 text-gray-300">
                                  <Phone className="h-4 w-4" />
                                  <span>{lead.telefone}</span>
                                </div>
                              )}
                              {lead.endereco && (
                                <div className="flex items-center gap-2 text-gray-300">
                                  <MapPin className="h-4 w-4" />
                                  <span className="truncate">{lead.endereco}</span>
                                </div>
                              )}
                              {lead.interesse && (
                                <div className="flex items-center gap-2 text-gray-300">
                                  <Building2 className="h-4 w-4" />
                                  <span>{lead.interesse}</span>
                                </div>
                              )}
                              {(lead.valorEstimado || lead.valor) && (
                                <div className="flex items-center gap-2 text-gray-300">
                                  <DollarSign className="h-4 w-4" />
                                  <span>R$ {(lead.valorEstimado || lead.valor || 0).toLocaleString('pt-BR')}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-gray-300">
                                <Calendar className="h-4 w-4" />
                                <span>Cadastro: {new Date(lead.dataContato).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>

                            {(lead.observacoes || lead.cpf || lead.estado_civil) && (
                              <div className="bg-gray-900/50 p-3 rounded-lg space-y-2">
                                {lead.cpf && (
                                  <p className="text-sm text-gray-300">
                                    <strong>CPF:</strong> {lead.cpf}
                                  </p>
                                )}
                                {lead.estado_civil && (
                                  <p className="text-sm text-gray-300">
                                    <strong>Estado Civil:</strong> {lead.estado_civil}
                                  </p>
                                )}
                                {lead.observacoes && (
                                  <p className="text-sm text-gray-400">
                                    <strong>Observações:</strong> {lead.observacoes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {[
                              { 
                                icon: Eye, 
                                color: "bg-blue-700 border-blue-600 text-blue-100 hover:bg-blue-600", 
                                label: "Ver Detalhes",
                                action: () => handleViewLead(lead)
                              },
                              { 
                                icon: Edit, 
                                color: "bg-green-700 border-green-600 text-green-100 hover:bg-green-600", 
                                label: "Editar",
                                action: () => handleEditLead(lead)
                              },
                              { 
                                icon: MessageSquare, 
                                color: "bg-emerald-700 border-emerald-600 text-emerald-100 hover:bg-emerald-600", 
                                label: "WhatsApp",
                                action: () => console.log("WhatsApp feature coming soon...")
                              }
                            ].map((action, actionIndex) => (
                              <motion.div
                                key={actionIndex}
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className={`${action.color} backdrop-blur-sm transition-all duration-200`}
                                  title={action.label}
                                  onClick={action.action}
                                >
                                  <action.icon className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {filteredLeads.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                >
                  <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/60">
                    <CardContent className="p-12 text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">Nenhum cliente encontrado</h3>
                      <p className="text-gray-400 mb-4">
                        {searchTerm ? 'Não encontramos clientes com os critérios de busca.' : 'Você ainda não possui clientes cadastrados.'}
                      </p>
                      <Button 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        onClick={() => setShowAddModal(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Primeiro Cliente
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {filteredLeads.length > 0 && (
                <div className="mt-6 flex items-center justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                          className={safePage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            href="#"
                            isActive={safePage === (i + 1)}
                            className="text-black"
                            onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                          className={safePage === totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>

      {/* Modal Adicionar Cliente */}
      <AddLeadModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
      />

      {/* Modal Editar Cliente */}
      <AddLeadModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        leadToEdit={selectedLead}
      />

      {/* Modal Visualizar Cliente */}
      <Dialog open={showViewModal} onOpenChange={handleCloseViewModal}>
        <DialogContent className="max-w-4xl bg-gray-900/95 border-gray-700/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-semibold">
                  {selectedLead?.nome?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </span>
              </div>
              {selectedLead?.nome}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6 py-4">
              {/* Status e Badges */}
              <div className="flex gap-3 flex-wrap">
                <Badge variant="outline" className={getStageColor(selectedLead.stage)}>
                  {selectedLead.stage}
                </Badge>
                <Badge variant="outline" className={getSourceColor(selectedLead.origem)}>
                  {selectedLead.origem}
                </Badge>
                {/* Mostrar corretor apenas para gestores e admins */}
                {canSeeAllBrokers && selectedLead.corretor && (
                  <Badge variant="outline" className={getBrokerColor(selectedLead.corretor.role)}>
                    <User className="h-3 w-3 mr-1" />
                    {selectedLead.corretor.nome}
                  </Badge>
                )}
              </div>

              {/* Informações em Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dados Pessoais */}
                <Card className="bg-gray-800/50 border-gray-700/60">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-400" />
                      Dados Pessoais
                    </h3>
                    <div className="space-y-3">
                      {selectedLead.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">{selectedLead.email}</span>
                        </div>
                      )}
                      {selectedLead.telefone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">{selectedLead.telefone}</span>
                        </div>
                      )}
                      {selectedLead.cpf && (
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">CPF: {selectedLead.cpf}</span>
                        </div>
                      )}
                      {selectedLead.estado_civil && (
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">Estado Civil: {selectedLead.estado_civil}</span>
                        </div>
                      )}
                      {selectedLead.endereco && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">{selectedLead.endereco}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Informações do Negócio */}
                <Card className="bg-gray-800/50 border-gray-700/60">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-green-400" />
                      Informações do Negócio
                    </h3>
                    <div className="space-y-3">
                      {selectedLead.interesse && (
                        <div className="flex items-center gap-3">
                          <Star className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">Interesse: {selectedLead.interesse}</span>
                        </div>
                      )}
                      {(selectedLead.valorEstimado || selectedLead.valor) && (
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">
                            Valor Estimado: R$ {(selectedLead.valorEstimado || selectedLead.valor || 0).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">
                          Cadastro: {new Date(selectedLead.dataContato).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Observações */}
              {selectedLead.observacoes && (
                <Card className="bg-gray-800/50 border-gray-700/60">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-purple-400" />
                      Observações
                    </h3>
                    <p className="text-gray-300 leading-relaxed">{selectedLead.observacoes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <Button
                  variant="outline"
                  onClick={handleCloseViewModal}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    handleCloseViewModal();
                    handleEditLead(selectedLead);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Cliente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 