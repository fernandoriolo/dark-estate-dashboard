import { useState, useEffect, useRef } from 'react';

/**
 * Hook para detectar quando a página perde/ganha visibilidade
 * Útil para evitar operações custosas quando a aba não está ativa
 */
export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const wasHiddenRef = useRef(false);
  const justBecameVisibleRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const nowVisible = !document.hidden;
      
      // Se estava oculta e agora está visível
      if (wasHiddenRef.current && nowVisible) {
        console.log('🔄 Página voltou a ficar visível após estar oculta');
        setJustBecameVisible(true);
        
        // Reset o flag após um delay para permitir re-inicializações necessárias
        setTimeout(() => {
          setJustBecameVisible(false);
        }, 1000);
      }
      
      wasHiddenRef.current = !nowVisible;
      setIsVisible(nowVisible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Usar state ao invés de ref para justBecameVisible ser reativo
  const [justBecameVisible, setJustBecameVisible] = useState(false);
  
  return { 
    isVisible, 
    justBecameVisible,
    wasHidden: wasHiddenRef.current 
  };
};
