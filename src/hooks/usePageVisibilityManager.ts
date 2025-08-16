import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook melhorado para gerenciar visibilidade da página
 * Previne loops de renderização e problemas de recarregamento
 */
export const usePageVisibilityManager = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [justBecameVisible, setJustBecameVisible] = useState(false);
  const wasHiddenRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Função para limpar timeouts pendentes
  const clearPendingTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Handler otimizado para mudanças de visibilidade
  const handleVisibilityChange = useCallback(() => {
    const nowVisible = !document.hidden;
    
    console.log('🔧 PageVisibility: Mudança detectada - nowVisible:', nowVisible, 'wasHidden:', wasHiddenRef.current);
    
    // Limpar timeouts pendentes para evitar conflitos
    clearPendingTimeouts();
    
    // Se estava oculta e agora está visível
    if (wasHiddenRef.current && nowVisible) {
      console.log('🔧 PageVisibility: Página voltou a ficar visível após estar oculta');
      setJustBecameVisible(true);
      
      // Reset o flag após um delay para permitir re-inicializações necessárias
      timeoutRef.current = setTimeout(() => {
        console.log('🔧 PageVisibility: Resetando flag justBecameVisible');
        setJustBecameVisible(false);
      }, 1000);
    }
    
    wasHiddenRef.current = !nowVisible;
    setIsVisible(nowVisible);
  }, [clearPendingTimeouts]);

  // Handler para beforeunload (mais conservador)
  const handleBeforeUnload = useCallback(() => {
    console.log('🔧 PageVisibility: beforeunload detectado');
    // Apenas limpar timeouts, não fazer nada mais
    clearPendingTimeouts();
  }, [clearPendingTimeouts]);

  useEffect(() => {
    if (isInitializedRef.current) {
      console.log('🔧 PageVisibility: Hook já inicializado, ignorando');
      return;
    }

    console.log('🔧 PageVisibility: Inicializando hook de visibilidade');
    isInitializedRef.current = true;

    // Estado inicial
    const initialVisible = !document.hidden;
    setIsVisible(initialVisible);
    wasHiddenRef.current = !initialVisible;

    // Adicionar listeners
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload, { passive: true });

    // Cleanup
    return () => {
      console.log('🔧 PageVisibility: Limpando listeners de visibilidade');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearPendingTimeouts();
      isInitializedRef.current = false;
    };
  }, [handleVisibilityChange, handleBeforeUnload, clearPendingTimeouts]);

  return { 
    isVisible, 
    justBecameVisible,
    wasHidden: wasHiddenRef.current 
  };
};