import { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Plus, 
  Filter, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Eye,
  Edit,
  Home,
  DollarSign,
  Star,
  Sparkles,
  Zap,
  Shield,
  Key,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from "lucide-react";
import { PropertyWithImages } from "@/hooks/useProperties";
import { PropertyDetailsPopup } from "@/components/PropertyDetailsPopup";
import { PropertyEditForm } from "@/components/PropertyEditForm";
import { PropertyImageGallery } from "@/components/PropertyImageGallery";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Componente para as partículas flutuantes
const FloatingParticle = ({ delay = 0, duration = 20, type = 'default' }) => {
  const particleVariants = {
    default: "w-2 h-2 bg-blue-400/20 rounded-full",
    star: "w-1 h-1 bg-yellow-400/30 rounded-full",
    spark: "w-0.5 h-4 bg-purple-400/40 rounded-full",
    glow: "w-3 h-3 bg-emerald-400/25 rounded-full blur-sm"
  };

  return (
    <motion.div
      className={`absolute ${particleVariants[type]}`}
      initial={{ 
        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
        y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20,
        opacity: 0,
        scale: 0
      }}
      animate={{
        y: -50,
        opacity: [0, 1, 0.8, 0],
        scale: [0, 1, 1.2, 0],
        rotate: 360
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
};

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

    {/* Formas geométricas arquitetônicas */}
    <motion.div
      className="absolute top-20 left-10 border border-blue-400/20"
      style={{ width: "120px", height: "120px" }}
      initial={{ opacity: 0, scale: 0, rotate: 0 }}
      animate={{ 
        opacity: [0, 0.4, 0],
        scale: [0, 1.1, 0],
        rotate: [0, 180, 360],
        borderRadius: ["0%", "50%", "0%"]
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    />
    
    <motion.div
      className="absolute bottom-20 right-10 border-2 border-emerald-400/20"
      style={{ width: "80px", height: "140px" }}
      initial={{ opacity: 0, y: 50, skewY: 0 }}
      animate={{ 
        opacity: [0, 0.5, 0],
        y: [50, -20, 50],
        skewY: [-5, 5, -5],
        borderColor: [
          "rgba(16, 185, 129, 0.2)",
          "rgba(59, 130, 246, 0.2)",
          "rgba(147, 51, 234, 0.2)",
          "rgba(16, 185, 129, 0.2)"
        ]
      }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

interface PropertyListProps {
  properties: PropertyWithImages[];
  loading: boolean;
  onAddNew: () => void;
  refetch?: () => void;
}

export function PropertyList({ properties, loading, onAddNew, refetch }: PropertyListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithImages | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithImages | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState<PropertyWithImages | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: string]: number}>({});
  const [imageGalleryProperty, setImageGalleryProperty] = useState<PropertyWithImages | null>(null);
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [particles, setParticles] = useState<number[]>([]);
  const { toast } = useToast();

  // Gerar partículas
  useEffect(() => {
    const particleArray = Array.from({ length: 20 }, (_, i) => i);
    setParticles(particleArray);
  }, []);

  console.log('🏠 PropertyList - Estado atual:', { 
    propertiesCount: properties.length, 
    loading,
    properties: properties.slice(0, 2), // Log apenas as primeiras 2 para debug
    propertiesWithImages: properties.filter(p => p.property_images && p.property_images.length > 0).length
  });

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === "all" || property.status === statusFilter;
    const typeMatch = typeFilter === "all" || property.type === typeFilter;
    return matchesSearch && statusMatch && typeMatch;
  });

  console.log('🔍 Propriedades filtradas:', filteredProperties.length);

  const particleTypes = ['default', 'star', 'spark', 'glow'];

  const getStatusBadge = (status: PropertyWithImages["status"]) => {
    const variants = {
      available: "bg-emerald-500/20 text-emerald-300 border-emerald-400/50",
      sold: "bg-blue-500/20 text-blue-300 border-blue-400/50", 
      rented: "bg-yellow-500/20 text-yellow-300 border-yellow-400/50"
    };
    
    const labels = {
      available: "Disponível",
      sold: "Vendido",
      rented: "Alugado"
    };

    return (
      <Badge variant="outline" className={variants[status || "available"]}>
        {labels[status || "available"]}
      </Badge>
    );
  };

  const getStatusIcon = (status: PropertyWithImages["status"]) => {
    switch (status) {
      case 'available':
        return CheckCircle;
      case 'sold':
        return Building2;
      case 'rented':
        return Key;
      default:
        return Home;
    }
  };

  const getTypeLabel = (type: PropertyWithImages["type"]) => {
    const labels = {
      house: "Casa",
      apartment: "Apartamento", 
      commercial: "Comercial",
      land: "Terreno"
    };
    return labels[type];
  };

  const getTypeColor = (type: PropertyWithImages["type"]) => {
    switch (type) {
      case 'house':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/50';
      case 'apartment':
        return 'bg-violet-500/20 text-violet-300 border-violet-400/50';
      case 'commercial':
        return 'bg-orange-500/20 text-orange-300 border-orange-400/50';
      case 'land':
        return 'bg-green-500/20 text-green-300 border-green-400/50';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-400/50';
    }
  };

  const getPurposeColor = (purpose: "Aluguel" | "Venda") => {
    switch (purpose) {
      case "Aluguel":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-400/50";
      case "Venda":
        return "bg-orange-500/20 text-orange-300 border-orange-400/50";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-400/50";
    }
  };

  const getPurposeIcon = (purpose: "Aluguel" | "Venda") => {
    switch (purpose) {
      case "Aluguel":
        return "🏠";
      case "Venda":
        return "🏢";
      default:
        return "🏠";
    }
  };

  const handleViewDetails = (property: PropertyWithImages) => {
    setSelectedProperty(property);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedProperty(null);
  };

  const handleEditProperty = (property: PropertyWithImages) => {
    setEditingProperty(property);
    setIsEditOpen(true);
  };

  const handleEditSubmit = () => {
    setIsEditOpen(false);
    setEditingProperty(null);
    // Forçar refetch dos dados para garantir atualização
    if (refetch) {
      refetch();
    }
  };

  const handleEditCancel = () => {
    setIsEditOpen(false);
    setEditingProperty(null);
  };

  const handlePreviousImage = (propertyId: string, totalImages: number) => {
    console.log('⬅️ Imagem anterior:', { propertyId, totalImages, currentIndex: currentImageIndex[propertyId] || 0 });
    setCurrentImageIndex(prev => ({
      ...prev,
      [propertyId]: prev[propertyId] > 0 ? prev[propertyId] - 1 : totalImages - 1
    }));
  };

  const handleNextImage = (propertyId: string, totalImages: number) => {
    console.log('➡️ Próxima imagem:', { propertyId, totalImages, currentIndex: currentImageIndex[propertyId] || 0 });
    setCurrentImageIndex(prev => ({
      ...prev,
      [propertyId]: (prev[propertyId] || 0) < totalImages - 1 ? (prev[propertyId] || 0) + 1 : 0
    }));
  };

  const getCurrentImageIndex = (propertyId: string) => {
    return currentImageIndex[propertyId] || 0;
  };

  const handleOpenImageGallery = (property: PropertyWithImages, initialIndex: number = 0) => {
    console.log('🖼️ Abrindo galeria de imagens:', { 
      property: property.title, 
      initialIndex, 
      imagesCount: property.property_images?.length || 0,
      images: property.property_images 
    });
    setImageGalleryProperty(property);
    setGalleryInitialIndex(initialIndex);
    setIsImageGalleryOpen(true);
  };

  const handleCloseImageGallery = () => {
    setIsImageGalleryOpen(false);
    setImageGalleryProperty(null);
    setGalleryInitialIndex(0);
  };

  const handleDeleteProperty = async (property: PropertyWithImages) => {
    try {
      console.log('🗑️ Iniciando deleção da propriedade:', property.id);

      // Primeiro, deletar todas as imagens associadas
      if (property.property_images && property.property_images.length > 0) {
        const { error: imagesError } = await supabase
          .from('property_images')
          .delete()
          .eq('property_id', property.id);

        if (imagesError) {
          console.error('❌ Erro ao deletar imagens:', imagesError);
          throw imagesError;
        }
        console.log('✅ Imagens deletadas com sucesso');
      }

      // Depois, deletar a propriedade
      const { error: propertyError } = await supabase
        .from('properties')
        .delete()
        .eq('id', property.id);

      if (propertyError) {
        console.error('❌ Erro ao deletar propriedade:', propertyError);
        throw propertyError;
      }

      console.log('✅ Propriedade deletada com sucesso');

      toast({
        title: "Sucesso!",
        description: "Propriedade deletada com sucesso.",
      });

      // Forçar refetch dos dados
      if (refetch) {
        refetch();
      }

      setDeletingProperty(null);
    } catch (error) {
      console.error('💥 Erro ao deletar propriedade:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar propriedade. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Se estiver editando, mostrar o formulário de edição
  if (isEditOpen && editingProperty) {
    return (
      <PropertyEditForm
        property={editingProperty}
        onSubmit={handleEditSubmit}
        onCancel={handleEditCancel}
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Background Effects */}
      <ArchitecturalGrid />
      <PulsingLights />
      <GlassShards />
      
      {/* Floating Particles */}
      {particles.map((particle, index) => (
        <FloatingParticle 
          key={particle}
          delay={index * 0.5}
          duration={15 + Math.random() * 10}
          type={particleTypes[index % particleTypes.length]}
        />
      ))}

      {/* Floating Icons */}
      <FloatingIcon Icon={Building2} delay={0} x={10} y={20} color="blue" />
      <FloatingIcon Icon={Home} delay={2} x={85} y={15} color="emerald" />
      <FloatingIcon Icon={Key} delay={4} x={15} y={70} color="purple" />
      <FloatingIcon Icon={Shield} delay={6} x={80} y={75} color="yellow" />
      <FloatingIcon Icon={Star} delay={8} x={50} y={85} color="pink" />
      <FloatingIcon Icon={Sparkles} delay={10} x={75} y={40} color="blue" />

      {/* Main Content */}
      <div className="relative z-10 p-8">
        {/* Header Section */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="relative inline-block">
            <motion.h1 
              className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mb-4"
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "200% 200%" }}
            >
              Imóveis
            </motion.h1>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/60 hover:bg-gray-800/70 transition-all duration-300 shadow-lg hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Total</p>
                  <p className="text-3xl font-bold text-white">{properties.length}</p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <Building2 className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/60 hover:bg-gray-800/70 transition-all duration-300 shadow-lg hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Disponíveis</p>
                  <p className="text-3xl font-bold text-white">
                    {properties.filter(p => p.status === 'available').length}
                  </p>
                </div>
                <div className="bg-emerald-500/20 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/60 hover:bg-gray-800/70 transition-all duration-300 shadow-lg hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Alugadas</p>
                  <p className="text-3xl font-bold text-white">
                    {properties.filter(p => p.status === 'rented').length}
                  </p>
                </div>
                <div className="bg-yellow-500/20 p-3 rounded-full">
                  <Key className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/60 hover:bg-gray-800/70 transition-all duration-300 shadow-lg hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Vendidas</p>
                  <p className="text-3xl font-bold text-white">
                    {properties.filter(p => p.status === 'sold').length}
                  </p>
                </div>
                <div className="bg-purple-500/20 p-3 rounded-full">
                  <Shield className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Controls Section */}
        <motion.div 
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Pesquisar imóveis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-gray-900/50 border-gray-600 text-white">
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-600">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="sold">Vendido</SelectItem>
                    <SelectItem value="rented">Alugado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40 bg-gray-900/50 border-gray-600 text-white">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-600">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="house">Casa</SelectItem>
                  <SelectItem value="apartment">Apartamento</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                  <SelectItem value="land">Terreno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Add Button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={onAddNew} 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Imóvel
              </Button>
            </motion.div>

            {/* Results Count */}
            <div className="text-sm text-gray-400 whitespace-nowrap">
              <span className="text-blue-400 font-semibold">{filteredProperties.length}</span> de{' '}
              <span className="text-emerald-400 font-semibold">{properties.length}</span> imóveis
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Building2 className="h-12 w-12 text-blue-400 mb-4" />
              </motion.div>
              <h3 className="text-xl font-semibold text-white mb-2">Carregando Imóveis</h3>
              <p className="text-gray-400">Buscando as melhores oportunidades...</p>
            </div>
            
            {/* Loading Placeholders */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <motion.div
                  key={index}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="h-48 bg-gradient-to-br from-gray-700 to-gray-800 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-700 rounded animate-pulse" />
                    <div className="h-3 bg-gray-700 rounded w-2/3 animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-700 rounded flex-1 animate-pulse" />
                      <div className="h-8 bg-gray-700 rounded flex-1 animate-pulse" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Properties Grid */}
        {!loading && (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <AnimatePresence>
              {filteredProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -50, scale: 0.9 }}
                  transition={{ 
                    delay: index * 0.1, 
                    duration: 0.6,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="group"
                >
                  <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/60 hover:bg-gray-800/70 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden">
                    <CardHeader className="p-0 relative">
                      <div className="relative h-56 bg-gray-700 rounded-t-xl flex items-center justify-center group overflow-hidden">
                        {property.property_images && property.property_images.length > 0 ? (
                          <>
                            <div 
                              className="w-full h-full cursor-pointer relative"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🖱️ Clique na imagem detectado!', { property: property.title, imageIndex: getCurrentImageIndex(property.id) });
                                handleOpenImageGallery(property, getCurrentImageIndex(property.id));
                              }}
                            >
                              <img 
                                src={property.property_images[getCurrentImageIndex(property.id)].image_url} 
                                alt={property.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                draggable={false}
                              />
                            </div>
                            
                            {/* Image Navigation - only shows if more than 1 image */}
                            {property.property_images.length > 1 && (
                              <>
                                <motion.button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handlePreviousImage(property.id, property.property_images.length);
                                  }}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </motion.button>
                                
                                <motion.button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleNextImage(property.id, property.property_images.length);
                                  }}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </motion.button>
                                
                                {/* Page Indicators */}
                                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
                                  {property.property_images.map((_, imgIndex) => (
                                    <motion.button
                                      key={imgIndex}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setCurrentImageIndex(prev => ({
                                          ...prev,
                                          [property.id]: imgIndex
                                        }));
                                      }}
                                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                        getCurrentImageIndex(property.id) === imgIndex 
                                          ? 'bg-white shadow-lg' 
                                          : 'bg-white/50 hover:bg-white/70'
                                      }`}
                                      whileHover={{ scale: 1.2 }}
                                      whileTap={{ scale: 0.8 }}
                                    />
                                  ))}
                                </div>
                                
                                {/* Image Counter */}
                                <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                                  {getCurrentImageIndex(property.id) + 1}/{property.property_images.length}
                                </div>
                              </>
                            )}

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Building2 className="h-16 w-16 mb-2" />
                            <span className="text-sm">Sem imagem</span>
                          </div>
                        )}

                        {/* Status Badge - Top Left */}
                        <div className="absolute top-3 left-3 z-20">
                          {getStatusBadge(property.status)}
                        </div>



                        {/* Type Badge - Top Right (if no images) */}
                        {(!property.property_images || property.property_images.length === 0) && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="outline" className={getTypeColor(property.type)}>
                              {getTypeLabel(property.type)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      {/* Title and Price */}
                      <div className="flex items-start justify-between mb-4">
                        <motion.div 
                          className="flex-1"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <CardTitle className="text-xl text-white mb-1 line-clamp-1 group-hover:text-blue-300 transition-colors">
                            {property.title}
                          </CardTitle>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" className={getTypeColor(property.type)}>
                              {getTypeLabel(property.type)}
                            </Badge>
                            <Badge variant="outline" className={getPurposeColor(property.property_purpose)}>
                              {getPurposeIcon(property.property_purpose)} {property.property_purpose}
                            </Badge>
                          </div>
                        </motion.div>
                        
                        <motion.div 
                          className="text-right"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <div className="flex items-center text-emerald-400 mb-1">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span className="text-2xl font-bold">
                              {(property.price / 1000).toFixed(0)}k
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">R$ {property.price.toLocaleString('pt-BR')}</span>
                        </motion.div>
                      </div>
                      
                      {/* Address */}
                      <motion.div 
                        className="flex items-center text-gray-400 text-sm mb-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <MapPin className="h-4 w-4 mr-2 text-blue-400" />
                        <span className="line-clamp-1">{property.address}</span>
                      </motion.div>

                      {/* Property Details */}
                      <motion.div 
                        className="flex items-center gap-6 text-sm text-gray-400 mb-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex items-center">
                          <Square className="h-4 w-4 mr-1 text-purple-400" />
                          <span>{property.area}m²</span>
                        </div>
                        {property.bedrooms && (
                          <div className="flex items-center">
                            <Bed className="h-4 w-4 mr-1 text-blue-400" />
                            <span>{property.bedrooms}</span>
                          </div>
                        )}
                        {property.bathrooms && (
                          <div className="flex items-center">
                            <Bath className="h-4 w-4 mr-1 text-emerald-400" />
                            <span>{property.bathrooms}</span>
                          </div>
                        )}
                      </motion.div>

                      {/* Description */}
                      <motion.p 
                        className="text-sm text-gray-400 line-clamp-2 mb-6"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        {property.description || "Sem descrição disponível"}
                      </motion.p>

                      {/* Action Buttons */}
                      <motion.div 
                        className="flex gap-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full bg-blue-700 border-blue-600 text-blue-100 hover:bg-blue-600 hover:text-white transition-all duration-200"
                            onClick={() => handleViewDetails(property)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </motion.div>
                        
                        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600 hover:text-white transition-all duration-200"
                            onClick={() => handleEditProperty(property)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </motion.div>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-red-700 border-red-600 text-red-100 hover:bg-red-600 hover:text-white transition-all duration-200"
                                onClick={() => setDeletingProperty(property)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-800 border-gray-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-300">
                                Tem certeza que deseja deletar o imóvel "{property.title}"? 
                                Esta ação não pode ser desfeita e todas as imagens associadas também serão removidas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleDeleteProperty(property)}
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && filteredProperties.length === 0 && (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              animate={{ 
                y: [-10, 10, -10],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-6"
            >
              <Building2 className="h-20 w-20 text-gray-600 mx-auto" />
            </motion.div>
            
            <h3 className="text-2xl font-bold text-gray-300 mb-3">
              {properties.length === 0 ? 'Nenhum imóvel cadastrado' : 'Nenhum imóvel encontrado'}
            </h3>
            
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {properties.length === 0 
                ? 'Comece adicionando seu primeiro imóvel ao sistema e construa seu portfólio imobiliário.'
                : 'Não há imóveis que correspondam aos filtros selecionados. Tente ajustar os critérios de busca.'
              }
            </p>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={onAddNew} 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                {properties.length === 0 ? 'Adicionar Primeiro Imóvel' : 'Adicionar Imóvel'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <PropertyDetailsPopup
        property={selectedProperty}
        open={isDetailsOpen}
        onClose={handleCloseDetails}
      />

      <PropertyImageGallery
        property={imageGalleryProperty}
        open={isImageGalleryOpen}
        onClose={handleCloseImageGallery}
        initialImageIndex={galleryInitialIndex}
      />
    </div>
  );
}
