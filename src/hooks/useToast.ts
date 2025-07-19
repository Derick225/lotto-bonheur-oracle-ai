import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UseToastReturn {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

let toastCounter = 0;

/**
 * Hook pour la gestion des notifications toast
 */
export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    const duration = toast.duration || 5000;

    const newToast: Toast = {
      ...toast,
      id
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss après la durée spécifiée
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    dismissToast,
    dismissAll
  };
};

// Instance globale pour utilisation dans les services
let globalToastHandler: UseToastReturn | null = null;

export const setGlobalToastHandler = (handler: UseToastReturn) => {
  globalToastHandler = handler;
};

export const showGlobalToast = (toast: Omit<Toast, 'id'>) => {
  if (globalToastHandler) {
    globalToastHandler.showToast(toast);
  } else {
    console.warn('Toast handler not initialized');
  }
};
