import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDndMonitor,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Building2,
  FileCheck,
  Clock,
  CheckCircle,
  Star,
  Sparkles,
  Zap,
  Shield,
  Key,
  Home,
  Building,
  MapPin,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  Target,
  Handshake,
  FileText,
  TrendingUp,
  GripVertical,
  Loader2
} from "lucide-react";
import { useKanbanLeads } from '@/hooks/useKanbanLeads';
import { KanbanLead, LeadStage } from '@/types/kanban';
import { AddLeadModal } from '@/components/AddLeadModal';

// Componente simplificado para partículas (otimizado)
const FloatingParticle = ({ delay = 0 }) => (
  <motion.div
    className="absolute w-1 h-1 bg-blue-400/20 rounded-full"
    initial={{ 
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
      y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20,
      opacity: 0
    }}
    animate={{
      y: -50,
      opacity: [0, 0.5, 0],
    }}
    transition={{
      duration: 15,
      delay,
      repeat: Infinity,
      ease: "linear"
    }}
  />
);

// Componente para luzes pulsantes
const PulsingLights = () => (
  <div className="absolute inset-0 overflow-hidden">
    {Array.from({ length: 8 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${20 + Math.random() * 40}px`,
          height: `${20 + Math.random() * 40}px`,
        }}
        animate={{
          opacity: [0, 0.3, 0],
          scale: [0.5, 1.5, 0.5],
          background: [
            "radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)"
          ]
        }}
        transition={{
          duration: 4 + Math.random() * 4,
          delay: i * 0.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

// Componente para efeito de vidro quebrado
const GlassShards = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 12 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${30 + Math.random() * 60}px`,
          height: `${30 + Math.random() * 60}px`,
          clipPath: "polygon(30% 0%, 0% 50%, 30% 100%, 100% 70%, 70% 30%)",
          transform: `rotate(${Math.random() * 360}deg)`
        }}
        animate={{
          opacity: [0, 0.4, 0],
          rotate: [0, 180, 360],
          scale: [0.8, 1.2, 0.8]
        }}
        transition={{
          duration: 8 + Math.random() * 6,
          delay: i * 0.7,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

// Componente para os ícones flutuantes
const FloatingIcon = ({ Icon, delay = 0, x = 0, y = 0, color = "blue" }) => {
  const colorVariants = {
    blue: "text-blue-300/10",
    purple: "text-purple-300/10",
    emerald: "text-emerald-300/10",
    yellow: "text-yellow-300/10",
    pink: "text-pink-300/10"
  };

  return (
    <motion.div
      className={`absolute ${colorVariants[color]}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0, rotate: -180 }}
      animate={{ 
        opacity: [0, 0.4, 0],
        scale: [0, 1.2, 0],
        rotate: [0, 360, 720],
        y: [-30, 30, -30],
        x: [-10, 10, -10]
      }}
      transition={{
        duration: 10 + Math.random() * 5,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <Icon size={35 + Math.random() * 20} />
    </motion.div>
  );
};

// Componente para o grid arquitetônico
const ArchitecturalGrid = () => (
  <div className="absolute inset-0 overflow-hidden">
    <svg className="absolute inset-0 w-full h-full">
      <defs>
        <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
          <motion.path
            d="M 80 0 L 0 0 0 80"
            fill="none"
            stroke="rgba(59, 130, 246, 0.08)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0],
              opacity: [0, 0.3, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "loop" }}
          />
          <motion.circle
            cx="40"
            cy="40"
            r="2"
            fill="rgba(147, 51, 234, 0.1)"
            animate={{
              r: [1, 4, 1],
              opacity: [0.1, 0.4, 0.1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </pattern>
        
        <pattern id="hexGrid" width="100" height="87" patternUnits="userSpaceOnUse">
          <motion.polygon
            points="50,0 93.3,25 93.3,62 50,87 6.7,62 6.7,25"
            fill="none"
            stroke="rgba(16, 185, 129, 0.06)"
            strokeWidth="1"
            animate={{
              opacity: [0, 0.2, 0],
              strokeWidth: [0.5, 2, 0.5]
            }}
            transition={{ duration: 6, repeat: Infinity }}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <rect width="100%" height="100%" fill="url(#hexGrid)" opacity="0.5" />
    </svg>
  </div>
);

const kanbanStages = [
  { 
    id: "novo-lead", 
    title: "Novo Lead", 
    iconColor: "text-blue-400", 
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
    icon: User
  },
  { 
    id: "qualificado", 
    title: "Qualificado", 
    iconColor: "text-emerald-400", 
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
    icon: Target
  },
  { 
    id: "visita-agendada", 
    title: "Visita Agendada", 
    iconColor: "text-purple-400", 
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/10",
    icon: Calendar
  },
  { 
    id: "em-negociacao", 
    title: "Em Negociação", 
    iconColor: "text-indigo-400", 
    borderColor: "border-indigo-500/30",
    bgColor: "bg-indigo-500/10",
    icon: Handshake
  },
  { 
    id: "documentacao", 
    title: "Documentação", 
    iconColor: "text-violet-400", 
    borderColor: "border-violet-500/30",
    bgColor: "bg-violet-500/10",
    icon: FileText
  },
  { 
    id: "contrato", 
    title: "Contrato", 
    iconColor: "text-yellow-400", 
    borderColor: "border-yellow-500/30",
    bgColor: "bg-yellow-500/10",
    icon: FileCheck
  },
  { 
    id: "fechamento", 
    title: "Fechamento", 
    iconColor: "text-green-400", 
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/10",
    icon: TrendingUp
  }
];

const getOrigemColor = (origem: string) => {
  switch (origem) {
    case 'Facebook':
      return 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50';
    case 'Zap Imóveis':
      return 'bg-violet-500/20 text-violet-300 border-violet-400/50';
    case 'Viva Real':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50';
    case 'OLX':
      return 'bg-purple-500/20 text-purple-300 border-purple-400/50';
    case 'Indicação':
      return 'bg-pink-500/20 text-pink-300 border-pink-400/50';
    case 'Whatsapp':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50';
    case 'Website':
      return 'bg-blue-500/20 text-blue-300 border-blue-400/50';
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-400/50';
  }
};

// Componente do card do lead com drag & drop
interface LeadCardProps {
  lead: KanbanLead;
  isDragging?: boolean;
}

const LeadCard = ({ lead, isDragging = false }: LeadCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ 
    id: lead.id.toString(),
    data: {
      type: 'lead',
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableIsDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`group ${isDragging ? 'z-50 rotate-3' : ''}`}
    >
      <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700/60 hover:bg-gray-800 transition-all duration-200 cursor-pointer">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header com nome e origem */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div 
                  {...listeners}
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover:bg-gray-700/50 rounded"
                >
                  <GripVertical className="h-3 w-3 text-gray-400" />
                </div>
                <h4 className="font-semibold text-white text-sm truncate">{lead.nome}</h4>
              </div>
              <Badge variant="outline" className={`${getOrigemColor(lead.origem)} text-xs`}>
                {lead.origem}
              </Badge>
            </div>
            
            {/* Informações principais */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-300 text-xs">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.interesse}</span>
              </div>
              <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                <DollarSign className="h-3 w-3 flex-shrink-0" />
                <span>R$ {lead.valor.toLocaleString('pt-BR')}</span>
              </div>
              {lead.dataContato && (
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>{new Date(lead.dataContato).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>

            {/* Observações */}
            {lead.observacoes && lead.observacoes.trim() && (
              <div className="text-xs text-gray-400 bg-gray-900/50 p-2 rounded border-l-2 border-blue-500/30">
                <MessageSquare className="h-3 w-3 inline mr-1" />
                <span className="line-clamp-2">{lead.observacoes}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Mail className="h-3 w-3" />
                <Phone className="h-3 w-3" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
                  <Eye className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Componente da coluna do kanban simplificado
interface KanbanColumnProps {
  stage: typeof kanbanStages[0];
  leads: KanbanLead[];
  leadCount: number;
}

const KanbanColumn = ({ stage, leads, leadCount }: KanbanColumnProps) => {
  const StageIcon = stage.icon;
  
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: stage.id,
    data: {
      type: 'column',
      stage: stage.title,
    },
  });
  
  return (
    <div 
      ref={setNodeRef}
      className="flex flex-col h-full w-[280px] flex-shrink-0 kanban-column"
      style={{ contain: 'layout style' }}
    >
      {/* Header da coluna */}
      <Card className={`${stage.bgColor} ${stage.borderColor} backdrop-blur-sm border mb-3 flex-shrink-0 ${isOver ? 'ring-2 ring-blue-400/50' : ''}`}>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <StageIcon className={`h-4 w-4 ${stage.iconColor}`} />
              {stage.title}
            </CardTitle>
            <Badge variant="outline" className={`${stage.iconColor} border-current text-xs`}>
              {leadCount}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de leads com scroll interno completamente isolado */}
      <div className={`flex-1 min-h-0 relative ${isOver ? 'bg-blue-500/5 rounded-lg' : ''}`}>
        <div 
          className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-gray-800/30 scrollbar-thumb-gray-600/50 hover:scrollbar-thumb-gray-500/70 kanban-scroll"
          style={{ contain: 'strict' }}
        >
          <SortableContext items={leads.map(lead => lead.id.toString())} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 p-2">
              <AnimatePresence>
                {leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </AnimatePresence>
              
              {leads.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-center py-8 text-gray-500 border-2 border-dashed border-gray-700/50 rounded-lg transition-colors ${isOver ? 'border-blue-400/50 bg-blue-500/5' : ''}`}
                >
                  <StageIcon className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Arraste leads aqui</p>
                </motion.div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
};

export function ClientsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [particles, setParticles] = useState<number[]>([]);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<KanbanLead | null>(null);

  // Usar o hook do kanban em vez de dados mock
  const { 
    leads, 
    loading, 
    error, 
    updateLeadStage, 
    totalLeads, 
    totalValue, 
    stageStats 
  } = useKanbanLeads();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Gerar partículas (versão otimizada)
  useEffect(() => {
    const particleArray = Array.from({ length: 8 }, (_, i) => i);
    setParticles(particleArray);
  }, []);

  const filteredLeads = leads.filter(lead => {
    if (!lead) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (lead.nome || '').toLowerCase().includes(searchLower) ||
      (lead.email || '').toLowerCase().includes(searchLower) ||
      (lead.interesse || '').toLowerCase().includes(searchLower)
    );
  });

  const getLeadsByStage = (stageTitle: string) => {
    return filteredLeads.filter(lead => lead.stage === stageTitle);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overData = over.data.current;

    // Encontrar o lead sendo movido
    const activeLead = leads.find(lead => lead.id === activeId);
    if (!activeLead) {
      setActiveId(null);
      return;
    }

    let newStage = activeLead.stage;

    // Se foi dropado em uma coluna
    if (overData?.type === 'column') {
      newStage = overData.stage;
    } 
    // Se foi dropado em outro lead
    else if (overData?.type === 'lead') {
      newStage = overData.lead.stage;
    }
    // Se foi dropado em um estágio específico
    else {
      const stage = kanbanStages.find(s => s.id === over.id);
      if (stage) {
        newStage = stage.title;
      }
    }

    // Atualizar o estágio do lead se mudou
    if (newStage !== activeLead.stage) {
      const success = await updateLeadStage(activeId, newStage as LeadStage);
      if (!success) {
        console.error('Falha ao atualizar estágio do lead');
      }
    }

    setActiveId(null);
  };

  const activeLead = activeId ? leads.find(lead => lead.id === activeId) : null;

  // Mostrar loading enquanto carrega
  if (loading) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950/90 via-purple-950/80 to-slate-950 relative flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Carregando leads...</p>
        </div>
      </div>
    );
  }

  // Mostrar erro se houver
  if (error) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950/90 via-purple-950/80 to-slate-950 relative flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Erro ao carregar leads: {error}</p>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950/90 via-purple-950/80 to-slate-950 relative flex flex-col">
      {/* Partículas de fundo otimizadas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, index) => (
          <FloatingParticle key={particle} delay={index * 2} />
        ))}
      </div>

      {/* Overlay gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

      {/* Layout principal - Container principal com flex column e sem overflow */}
      <div className="relative z-10 flex flex-col h-full w-full">
        {/* Header Section - Flexível mas não ocupa todo o espaço */}
        <div className="bg-gradient-to-r from-slate-950/95 via-blue-950/95 to-purple-950/95 backdrop-blur-sm border-b border-gray-700/30 flex-shrink-0">
          <div className="px-6 py-4 space-y-4">
            {/* Header */}
            <motion.div 
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div>
                <motion.h1 
                  className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mb-2"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                  }}
                  transition={{ duration: 5, repeat: Infinity }}
                  style={{ backgroundSize: "200% 200%" }}
                >
                  Pipeline de Vendas
                </motion.h1>
                <p className="text-gray-400">Gerencie seus leads através do funil de vendas</p>
              </div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                  onClick={() => {
                    setLeadToEdit(null);
                    setIsAddLeadModalOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lead
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {[
                { title: "Total Leads", value: totalLeads, icon: Users, iconColor: "text-blue-400" },
                { title: "Em Negociação", value: stageStats['Em Negociação'] || 0, icon: Handshake, iconColor: "text-emerald-400" },
                { title: "Fechamentos", value: stageStats['Fechamento'] || 0, icon: TrendingUp, iconColor: "text-purple-400" },
                { title: "Valor Total", value: `R$ ${(totalValue / 1000).toFixed(0)}k`, icon: DollarSign, iconColor: "text-violet-400" }
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:bg-gray-800/70 transition-all duration-300">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs ${stat.iconColor}`}>{stat.title}</p>
                          <p className="text-lg font-bold text-white">{stat.value}</p>
                        </div>
                        <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
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
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50">
                <CardContent className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por nome, email ou interesse..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Container do Kanban - Ocupa o restante do espaço disponível com contenção total */}
        <div className="flex-1 p-6 min-h-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="h-full w-full"
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Container ISOLADO do Kanban - Contenção completa */}
              <div className="relative bg-gray-900/20 backdrop-blur-sm rounded-lg border border-gray-700/30 h-full w-full kanban-container">
                {/* Máscara para garantir que nada escape do container */}
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <div className="h-full w-full p-4">
                    {/* Área de scroll horizontal TOTALMENTE isolada */}
                    <div 
                      className="h-full w-full overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-track-gray-800/50 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 kanban-scroll"
                      style={{
                        contain: 'layout style paint',
                        isolation: 'isolate'
                      }}
                    >
                      <div 
                        className="flex gap-4 h-full"
                        style={{ 
                          minWidth: `${kanbanStages.length * 300}px`,
                          width: 'max-content'
                        }}
                      >
                        {kanbanStages.map((stage, index) => {
                          const stageLeads = getLeadsByStage(stage.title);
                          
                          return (
                            <motion.div
                              key={stage.id}
                              initial={{ opacity: 0, x: 50 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                              className="flex-shrink-0"
                            >
                              <KanbanColumn 
                                stage={stage} 
                                leads={stageLeads} 
                                leadCount={stageLeads.length}
                              />
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeLead ? <LeadCard lead={activeLead} isDragging={true} /> : null}
              </DragOverlay>
            </DndContext>
          </motion.div>
        </div>
      </div>

      {/* Modal de Adicionar/Editar Lead */}
      <AddLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => {
          setIsAddLeadModalOpen(false);
          setLeadToEdit(null);
        }}
        leadToEdit={leadToEdit}
      />
    </div>
  );
}
