import { useState, useEffect, useCallback } from 'react';
import { SyncService, SyncStatus, SyncResult } from '@/services/syncService';
import { DrawResult } from '@/services/lotteryAPI';

interface UseSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
  onSyncComplete?: (result: SyncResult) => void;
  onError?: (error: Error) => void;
}

interface UseSyncReturn {
  status: SyncStatus | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncResult: SyncResult | null;
  sync: () => Promise<void>;
  forceSync: () => Promise<void>;
  getDrawResults: (drawName: string, limit?: number) => Promise<DrawResult[]>;
  refreshStatus: () => Promise<void>;
}

/**
 * Hook personnalisé pour gérer la synchronisation des données
 */
export function useSync(options: UseSyncOptions = {}): UseSyncReturn {
  const {
    autoSync = true,
    syncInterval = 10 * 60 * 1000, // 10 minutes par défaut
    onSyncComplete,
    onError
  } = options;

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  /**
   * Actualise le statut de synchronisation
   */
  const refreshStatus = useCallback(async () => {
    try {
      const currentStatus = await SyncService.getSyncStatus();
      setStatus(currentStatus);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [onError]);

  /**
   * Effectue une synchronisation incrémentale
   */
  const sync = useCallback(async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      setError(null);

      const result = await SyncService.performIncrementalSync();
      setLastSyncResult(result);

      if (result.success) {
        await refreshStatus();
        if (onSyncComplete) {
          onSyncComplete(result);
        }
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de synchronisation';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshStatus, onSyncComplete, onError]);

  /**
   * Force une synchronisation complète
   */
  const forceSync = useCallback(async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      setError(null);

      const result = await SyncService.forcSync();
      setLastSyncResult(result);

      if (result.success) {
        await refreshStatus();
        if (onSyncComplete) {
          onSyncComplete(result);
        }
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de synchronisation forcée';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshStatus, onSyncComplete, onError]);

  /**
   * Récupère les résultats pour un tirage avec fallback automatique
   */
  const getDrawResults = useCallback(async (drawName: string, limit: number = 50): Promise<DrawResult[]> => {
    try {
      return await SyncService.getDrawResults(drawName, limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de récupération';
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
      return [];
    }
  }, [onError]);

  /**
   * Initialisation et synchronisation automatique
   */
  useEffect(() => {
    let mounted = true;
    let syncTimer: NodeJS.Timeout;

    const initialize = async () => {
      try {
        setIsLoading(true);
        
        // Initialiser le service de synchronisation
        await SyncService.initialize();
        
        if (mounted) {
          await refreshStatus();
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Erreur d\'initialisation';
          setError(errorMessage);
          setIsLoading(false);
          if (onError) {
            onError(err instanceof Error ? err : new Error(errorMessage));
          }
        }
      }
    };

    const startAutoSync = () => {
      if (autoSync && syncInterval > 0) {
        syncTimer = setInterval(async () => {
          if (mounted && !isSyncing && navigator.onLine) {
            await sync();
          }
        }, syncInterval);
      }
    };

    initialize().then(() => {
      if (mounted) {
        startAutoSync();
      }
    });

    return () => {
      mounted = false;
      if (syncTimer) {
        clearInterval(syncTimer);
      }
    };
  }, [autoSync, syncInterval, sync, refreshStatus, onError, isSyncing]);

  /**
   * Écouter les changements de statut en ligne/hors ligne
   */
  useEffect(() => {
    const handleOnline = () => {
      refreshStatus();
      if (autoSync && !isSyncing) {
        sync();
      }
    };

    const handleOffline = () => {
      refreshStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync, isSyncing, sync, refreshStatus]);

  return {
    status,
    isLoading,
    isSyncing,
    error,
    lastSyncResult,
    sync,
    forceSync,
    getDrawResults,
    refreshStatus
  };
}

/**
 * Hook simplifié pour récupérer les données d'un tirage
 */
export function useDrawResults(drawName: string, limit: number = 50) {
  const [results, setResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getDrawResults, status } = useSync({
    onError: (err) => setError(err.message)
  });

  useEffect(() => {
    let mounted = true;

    const fetchResults = async () => {
      if (!drawName) return;

      try {
        setLoading(true);
        setError(null);
        
        const data = await getDrawResults(drawName, limit);
        
        if (mounted) {
          setResults(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      mounted = false;
    };
  }, [drawName, limit, getDrawResults]);

  return {
    results,
    loading,
    error,
    isOnline: status?.isOnline ?? navigator.onLine,
    totalRecords: status?.totalRecords ?? 0
  };
}
