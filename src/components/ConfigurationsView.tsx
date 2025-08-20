import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Palette, 
  Globe, 
  Upload, 
  RotateCcw,
  Camera,
  X,
  Check,
  Loader2,
  Type,
  Maximize2,
  Edit3,
  Bold
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useTheme } from '@/contexts/ThemeContext';
import { usePreview } from '@/contexts/PreviewContext';
import { toast } from 'sonner';

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'Sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro', category: 'Sans-serif' },
  { value: 'Nunito', label: 'Nunito', category: 'Sans-serif' },
  { value: 'Fira Sans', label: 'Fira Sans', category: 'Sans-serif' },
  { value: 'Work Sans', label: 'Work Sans', category: 'Sans-serif' },
  { value: 'Oswald', label: 'Oswald', category: 'Display' },
  { value: 'Raleway', label: 'Raleway', category: 'Display' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'Serif' },
  { value: 'PT Serif', label: 'PT Serif', category: 'Serif' },
  { value: 'Crimson Text', label: 'Crimson Text', category: 'Serif' },
  { value: 'Bebas Neue', label: 'Bebas Neue', category: 'Display' },
  { value: 'Anton', label: 'Anton', category: 'Display' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono', category: 'Monospace' },
  { value: 'Fira Code', label: 'Fira Code', category: 'Monospace' },
];

export function ConfigurationsView() {
  const { 
    settings, 
    loading, 
    updating, 
    hasLogo,
    updateSetting, 
    uploadLogo, 
    removeLogo,
    resetToDefaults 
  } = useCompanySettings();
  
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    previewName,
    setPreviewName,
    previewSubtitle,
    setPreviewSubtitle,
    previewNameFont,
    setPreviewNameFont,
    previewNameSize,
    setPreviewNameSize,
    previewNameColor,
    setPreviewNameColor,
    previewNameBold,
    setPreviewNameBold,
    previewSubtitleFont,
    setPreviewSubtitleFont,
    previewSubtitleSize,
    setPreviewSubtitleSize,
    previewSubtitleColor,
    setPreviewSubtitleColor,
    previewSubtitleBold,
    setPreviewSubtitleBold,
    previewLogoSize,
    setPreviewLogoSize,
    isPreviewMode,
    setIsPreviewMode,
  } = usePreview();
  
  const [dragOver, setDragOver] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  React.useEffect(() => {
    if (settings) {
      setPreviewName(settings.display_name);
      setPreviewSubtitle(settings.display_subtitle);
      setPreviewNameFont(settings.company_name_font_family);
      setPreviewNameSize(settings.company_name_font_size);
      setPreviewNameColor(settings.company_name_color);
      setPreviewNameBold(settings.company_name_bold);
      setPreviewSubtitleFont(settings.company_subtitle_font_family);
      setPreviewSubtitleSize(settings.company_subtitle_font_size);
      setPreviewSubtitleColor(settings.company_subtitle_color);
      setPreviewSubtitleBold(settings.company_subtitle_bold);
      setPreviewLogoSize(settings.logo_size);
      setHasUnsavedChanges(false);
    }
    
    // Ativar modo preview ao entrar na tela de configurações
    setIsPreviewMode(true);
    
    // Desativar modo preview ao sair da tela
    return () => {
      setIsPreviewMode(false);
    };
  }, [settings, setPreviewName, setPreviewSubtitle, setPreviewNameFont, setPreviewNameSize, setPreviewNameColor, setPreviewNameBold, setPreviewSubtitleFont, setPreviewSubtitleSize, setPreviewSubtitleColor, setPreviewSubtitleBold, setPreviewLogoSize, setIsPreviewMode]);

  React.useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragEnterPage = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragLeavePage = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDropPage = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragenter', handleDragEnterPage);
    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('dragleave', handleDragLeavePage);
    document.addEventListener('drop', handleDropPage);

    return () => {
      document.removeEventListener('dragenter', handleDragEnterPage);
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('dragleave', handleDragLeavePage);
      document.removeEventListener('drop', handleDropPage);
    };
  }, []);

  const handleNameChange = async () => {
    if (previewName !== settings?.display_name) {
      await updateSetting('display_name', previewName);
    }
  };

  const handleSubtitleChange = async () => {
    if (previewSubtitle !== settings?.display_subtitle) {
      await updateSetting('display_subtitle', previewSubtitle);
    }
  };

  const handleNameFontChange = (value: string) => {
    setPreviewNameFont(value);
    setHasUnsavedChanges(true);
  };

  const handleNameSizeChange = (value: number[]) => {
    const size = value[0];
    setPreviewNameSize(size);
    setHasUnsavedChanges(true);
  };

  const handleNameColorChange = (value: string) => {
    setPreviewNameColor(value);
    setHasUnsavedChanges(true);
  };

  const handleNameBoldChange = (value: boolean) => {
    setPreviewNameBold(value);
    setHasUnsavedChanges(true);
  };

  const handleSubtitleFontChange = (value: string) => {
    setPreviewSubtitleFont(value);
    setHasUnsavedChanges(true);
  };

  const handleSubtitleSizeChange = (value: number[]) => {
    const size = value[0];
    setPreviewSubtitleSize(size);
    setHasUnsavedChanges(true);
  };

  const handleSubtitleColorChange = (value: string) => {
    setPreviewSubtitleColor(value);
    setHasUnsavedChanges(true);
  };

  const handleSubtitleBoldChange = (value: boolean) => {
    setPreviewSubtitleBold(value);
    setHasUnsavedChanges(true);
  };

  const handleLogoSizeChange = (value: number[]) => {
    const size = value[0];
    setPreviewLogoSize(size);
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) return;

    try {
      await Promise.all([
        updateSetting('company_name_font_family', previewNameFont),
        updateSetting('company_name_font_size', previewNameSize),
        updateSetting('company_name_color', previewNameColor),
        updateSetting('company_name_bold', previewNameBold),
        updateSetting('company_subtitle_font_family', previewSubtitleFont),
        updateSetting('company_subtitle_font_size', previewSubtitleSize),
        updateSetting('company_subtitle_color', previewSubtitleColor),
        updateSetting('company_subtitle_bold', previewSubtitleBold),
        updateSetting('logo_size', previewLogoSize),
      ]);

      setHasUnsavedChanges(false);
      toast.success('Alterações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar alterações');
    }
  };

  const handleFileSelect = async (file: File) => {
    await uploadLogo(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    if (updating === 'logo_url') return;
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    } else {
      toast.error('Por favor, selecione um arquivo de imagem');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOver(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary text-theme-primary p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-color" />
              <p className="text-theme-secondary">Carregando configurações...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-theme-primary text-theme-primary p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-theme-primary mb-2">
              Configurações
            </h1>
            <p className="text-theme-secondary">
              Personalize a aparência e configurações da sua empresa
            </p>
          </div>
          
          <Button 
            onClick={resetToDefaults}
            variant="outline"
            disabled={updating === 'reset'}
            className="border-theme-primary text-theme-secondary hover:bg-theme-tertiary"
          >
            {updating === 'reset' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Restaurar Padrões
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Principal - Configurações */}
          <div className="lg:col-span-2 space-y-6">
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-theme-card border-theme-primary">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-color">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-theme-primary">Empresa</CardTitle>
                      <CardDescription className="text-theme-secondary">
                        Personalize a identidade da sua empresa
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-theme-primary font-medium">Logo da Empresa</Label>
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer ${
                        dragOver
                          ? 'border-primary-color bg-blue-500/10 scale-[1.02] shadow-lg border-blue-400'
                          : 'border-theme-secondary hover:border-primary-color hover:bg-gray-800/50'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onClick={() => !updating && !hasLogo && fileInputRef.current?.click()}
                    >
                      {updating === 'logo_url' ? (
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-color" />
                          <p className="text-theme-secondary">Fazendo upload...</p>
                        </div>
                      ) : hasLogo ? (
                        <div className="text-center">
                          <img 
                            src={settings?.logo_url} 
                            alt="Logo da empresa"
                            className="h-16 w-16 object-contain mx-auto mb-3 rounded"
                          />
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              className="border-theme-primary text-theme-secondary"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Alterar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={removeLogo}
                              className="border-red-500 text-red-500 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className={`h-8 w-8 mx-auto mb-3 transition-colors ${
                            dragOver ? 'text-blue-400' : 'text-theme-secondary'
                          }`} />
                          <p className={`font-medium mb-1 transition-colors ${
                            dragOver ? 'text-blue-400' : 'text-theme-primary'
                          }`}>
                            {dragOver ? 'Solte a imagem aqui!' : 'Clique ou arraste uma imagem'}
                          </p>
                          <p className="text-theme-secondary text-sm">
                            PNG, JPG ou SVG até 2MB
                          </p>
                          {!dragOver && (
                            <Button
                              className="mt-3 bg-primary-color hover:bg-primary-color-hover"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Selecionar Arquivo
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                      />
                    </div>
                  </div>

                  <Separator className="bg-theme-secondary" />

                  <div className="space-y-2">
                    <Label htmlFor="company-name" className="text-theme-primary font-medium">
                      Nome da Empresa
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="company-name"
                        value={previewName}
                        onChange={(e) => setPreviewName(e.target.value)}
                        onBlur={handleNameChange}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameChange()}
                        disabled={updating === 'display_name'}
                        className="bg-theme-tertiary border-theme-primary text-theme-primary"
                        placeholder="Nome da sua empresa"
                      />
                      {updating === 'display_name' && (
                        <Button size="icon" disabled>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-subtitle" className="text-theme-primary font-medium">
                      Subtítulo
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="company-subtitle"
                        value={previewSubtitle}
                        onChange={(e) => setPreviewSubtitle(e.target.value)}
                        onBlur={handleSubtitleChange}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubtitleChange()}
                        disabled={updating === 'display_subtitle'}
                        className="bg-theme-tertiary border-theme-primary text-theme-primary"
                        placeholder="Descrição da sua empresa"
                      />
                      {updating === 'display_subtitle' && (
                        <Button size="icon" disabled>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>


            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-theme-card border-theme-primary">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-theme-primary">Regional</CardTitle>
                      <CardDescription className="text-theme-secondary">
                        Configurações de idioma e localização
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-theme-primary font-medium">Idioma</Label>
                    <Select
                      value={settings?.language}
                      onValueChange={(value) => updateSetting('language', value)}
                      disabled={updating === 'language'}
                    >
                      <SelectTrigger className="bg-theme-tertiary border-theme-primary text-theme-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-theme-card border-theme-primary">
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español (España)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-theme-primary font-medium">Fuso Horário</Label>
                    <Select
                      value={settings?.timezone}
                      onValueChange={(value) => updateSetting('timezone', value)}
                      disabled={updating === 'timezone'}
                    >
                      <SelectTrigger className="bg-theme-tertiary border-theme-primary text-theme-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-theme-card border-theme-primary">
                        <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                        <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                        <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Coluna Lateral - Preview Moderno e Fixo */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                  <CardHeader className="relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                        <CardTitle className="text-white font-semibold">Preview & Edição</CardTitle>
                      </div>
                      <div className="px-2 py-1 bg-blue-500/20 rounded-full">
                        <span className="text-xs text-blue-300 font-medium">TEMPO REAL</span>
                      </div>
                    </div>
                    <CardDescription className="text-slate-400">
                      Visualize e edite em tempo real
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="relative space-y-6">
                    {/* Preview da Sidebar com Controles */}
                    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-600/50 shadow-inner space-y-4">
                      {/* Logo Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Maximize2 className="h-4 w-4 text-blue-400" />
                          <span className="text-sm text-slate-300 font-medium">Logo</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {settings?.logo_url ? (
                            <img 
                              src={settings.logo_url} 
                              alt="Logo preview"
                              style={{ 
                                height: `${previewLogoSize}px`, 
                                width: `${previewLogoSize}px` 
                              }}
                              className="rounded-lg object-contain shadow-md"
                            />
                          ) : (
                            <div 
                              style={{ 
                                height: `${previewLogoSize}px`, 
                                width: `${previewLogoSize}px`,
                                background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
                              }}
                              className="rounded-lg flex items-center justify-center text-white shadow-md"
                            >
                              <Building2 className="h-5 w-5" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-400">Tamanho</Label>
                              <Slider
                                value={[previewLogoSize]}
                                onValueChange={handleLogoSizeChange}
                                min={32}
                                max={80}
                                step={4}
                                className="flex-1"
                                disabled={updating === 'logo_size'}
                              />
                              <span className="text-xs text-slate-400">{previewLogoSize}px</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-600/30 my-4"></div>

                      {/* Nome Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Edit3 className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-slate-300 font-medium">Nome da Empresa</span>
                        </div>
                        
                        {/* Nome Preview e Input */}
                        <Input
                          value={previewName}
                          onChange={(e) => setPreviewName(e.target.value)}
                          onBlur={handleNameChange}
                          placeholder="Nome da empresa"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                          style={{ 
                            fontFamily: previewNameFont,
                            fontSize: `${Math.min(previewNameSize, 16)}px`,
                            color: previewNameColor,
                            fontWeight: previewNameBold ? 'bold' : 'normal'
                          }}
                        />
                        
                        {/* Controles do Nome */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Fonte</Label>
                            <Select
                              value={previewNameFont}
                              onValueChange={handleNameFontChange}
                            >
                              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white text-xs h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600">
                                {FONT_OPTIONS.slice(0, 10).map((font) => (
                                  <SelectItem key={font.value} value={font.value} className="text-xs">
                                    {font.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Tamanho</Label>
                            <Slider
                              value={[previewNameSize]}
                              onValueChange={handleNameSizeChange}
                              min={14}
                              max={32}
                              step={1}
                              className="mt-2"
                            />
                            <span className="text-xs text-slate-400">{previewNameSize}px</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Cor</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={previewNameColor}
                                onChange={(e) => handleNameColorChange(e.target.value)}
                                className="w-8 h-8 rounded border border-slate-600 cursor-pointer"
                              />
                              <Input
                                value={previewNameColor}
                                onChange={(e) => handleNameColorChange(e.target.value)}
                                className="bg-slate-700/50 border-slate-600 text-white text-xs h-8 font-mono"
                                placeholder="#FFFFFF"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Negrito</Label>
                            <div className="flex items-center h-8">
                              <Switch
                                checked={previewNameBold}
                                onCheckedChange={handleNameBoldChange}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-600/30 my-4"></div>

                      {/* Subtítulo Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Edit3 className="h-4 w-4 text-orange-400" />
                          <span className="text-sm text-slate-300 font-medium">Subtítulo</span>
                        </div>
                        
                        {/* Subtítulo Preview e Input */}
                        <Input
                          value={previewSubtitle}
                          onChange={(e) => setPreviewSubtitle(e.target.value)}
                          onBlur={handleSubtitleChange}
                          placeholder="Subtítulo da empresa"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                          style={{ 
                            fontFamily: previewSubtitleFont,
                            fontSize: `${Math.min(previewSubtitleSize, 14)}px`,
                            color: previewSubtitleColor,
                            fontWeight: previewSubtitleBold ? 'bold' : 'normal'
                          }}
                        />
                        
                        {/* Controles do Subtítulo */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Fonte</Label>
                            <Select
                              value={previewSubtitleFont}
                              onValueChange={handleSubtitleFontChange}
                            >
                              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white text-xs h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600">
                                {FONT_OPTIONS.slice(0, 10).map((font) => (
                                  <SelectItem key={font.value} value={font.value} className="text-xs">
                                    {font.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Tamanho</Label>
                            <Slider
                              value={[previewSubtitleSize]}
                              onValueChange={handleSubtitleSizeChange}
                              min={10}
                              max={20}
                              step={1}
                              className="mt-2"
                            />
                            <span className="text-xs text-slate-400">{previewSubtitleSize}px</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Cor</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={previewSubtitleColor}
                                onChange={(e) => handleSubtitleColorChange(e.target.value)}
                                className="w-8 h-8 rounded border border-slate-600 cursor-pointer"
                              />
                              <Input
                                value={previewSubtitleColor}
                                onChange={(e) => handleSubtitleColorChange(e.target.value)}
                                className="bg-slate-700/50 border-slate-600 text-white text-xs h-8 font-mono"
                                placeholder="#9CA3AF"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Negrito</Label>
                            <div className="flex items-center h-8">
                              <Switch
                                checked={previewSubtitleBold}
                                onCheckedChange={handleSubtitleBoldChange}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botão Salvar */}
                    {hasUnsavedChanges && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="pt-4 border-t border-slate-600/50"
                      >
                        <Button
                          onClick={handleSaveChanges}
                          disabled={updating !== null}
                          className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg shadow-green-500/25 transition-all duration-300"
                          size="lg"
                        >
                          {updating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Salvar Alterações
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Botão Salvar Mobile */}
        <div className="lg:hidden mt-6">{hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="max-w-md mx-auto"
          >
            <Button
              onClick={handleSaveChanges}
              disabled={updating !== null}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </motion.div>
        )}
        </div>

      </div>
    </div>
  );
}