import { useState, useEffect, useCallback } from 'react';
import { 
  drawResultsService, 
  DrawResult, 
  DrawResultsFilter, 
  DrawResultsResponse,
  ImportResult,
  ExportOptions 
} from '../services/drawResultsService';
import { useToast } from './use-toast';

export interface UseDrawResultsOptions {
  autoLoad?: boolean;
  initialFilters?: DrawResultsFilter;
}

export interface UseDrawResultsReturn {
  // État
  drawResults: DrawResult[];
  loading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  totalPages: number;
  
  // Actions CRUD
  loadDrawResults: (filters?: DrawResultsFilter) => Promise<void>;
  createDrawResult: (data: Partial<DrawResult>) => Promise<DrawResult | null>;
  updateDrawResult: (id: string, data: Partial<DrawResult>) => Promise<DrawResult | null>;
  deleteDrawResult: (id: string) => Promise<boolean>;
  deleteMultipleDrawResults: (ids: string[]) => Promise<boolean>;
  
  // Recherche et filtrage
  searchDrawResults: (query: string) => Promise<void>;
  setFilters: (filters: DrawResultsFilter) => void;
  resetFilters: () => void;
  
  // Import/Export
  importDrawResults: (data: any[], filename: string, options?: any) => Promise<ImportResult | null>;
  exportDrawResults: (options: ExportOptions) => Promise<void>;
  
  // Utilitaires
  refreshData: () => Promise<void>;
  getDrawResultById: (id: string) => Promise<DrawResult | null>;
  
  // État des filtres
  filters: DrawResultsFilter;
  hasActiveFilters: boolean;
}

/**
 * Hook personnalisé pour la gestion des résultats de tirage
 */
export const useDrawResults = (options: UseDrawResultsOptions = {}): UseDrawResultsReturn => {
  const { autoLoad = true, initialFilters = {} } = options;
  const { toast } = useToast();

  // État principal
  const [drawResults, setDrawResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFiltersState] = useState<DrawResultsFilter>(initialFilters);

  // Chargement des données
  const loadDrawResults = useCallback(async (newFilters?: DrawResultsFilter) => {
    setLoading(true);
    setError(null);

    try {
      const filtersToUse = newFilters || filters;
      const response: DrawResultsResponse = await drawResultsService.getDrawResults(filtersToUse);
      
      setDrawResults(response.data);
      setTotal(response.total);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
      
      if (newFilters) {
        setFiltersState(filtersToUse);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des tirages';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  // Création d'un tirage
  const createDrawResult = useCallback(async (data: Partial<DrawResult>): Promise<DrawResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const newDrawResult = await drawResultsService.createDrawResult(data);
      
      toast({
        title: 'Succès',
        description: 'Tirage créé avec succès'
      });

      // Recharger les données
      await loadDrawResults();
      
      return newDrawResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création du tirage';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadDrawResults, toast]);

  // Mise à jour d'un tirage
  const updateDrawResult = useCallback(async (id: string, data: Partial<DrawResult>): Promise<DrawResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const updatedDrawResult = await drawResultsService.updateDrawResult(id, data);
      
      toast({
        title: 'Succès',
        description: 'Tirage mis à jour avec succès'
      });

      // Mettre à jour localement
      setDrawResults(prev => 
        prev.map(draw => draw.id === id ? updatedDrawResult : draw)
      );
      
      return updatedDrawResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour du tirage';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Suppression d'un tirage
  const deleteDrawResult = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await drawResultsService.deleteDrawResult(id);
      
      toast({
        title: 'Succès',
        description: 'Tirage supprimé avec succès'
      });

      // Supprimer localement
      setDrawResults(prev => prev.filter(draw => draw.id !== id));
      setTotal(prev => prev - 1);

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression du tirage';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Suppression multiple
  const deleteMultipleDrawResults = useCallback(async (ids: string[]): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await drawResultsService.deleteMultipleDrawResults(ids);
      
      toast({
        title: 'Succès',
        description: `${ids.length} tirage(s) supprimé(s) avec succès`
      });

      // Supprimer localement
      setDrawResults(prev => prev.filter(draw => !ids.includes(draw.id!)));
      setTotal(prev => prev - ids.length);

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression des tirages';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Recherche
  const searchDrawResults = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const results = await drawResultsService.searchDrawResults(query);
      setDrawResults(results);
      setTotal(results.length);
      setCurrentPage(1);
      setTotalPages(1);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la recherche';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Gestion des filtres
  const setFilters = useCallback((newFilters: DrawResultsFilter) => {
    setFiltersState(newFilters);
    loadDrawResults(newFilters);
  }, [loadDrawResults]);

  const resetFilters = useCallback(() => {
    const emptyFilters: DrawResultsFilter = {};
    setFiltersState(emptyFilters);
    loadDrawResults(emptyFilters);
  }, [loadDrawResults]);

  // Import
  const importDrawResults = useCallback(async (
    data: any[], 
    filename: string, 
    options?: any
  ): Promise<ImportResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await drawResultsService.importDrawResults(data, filename, options);
      
      toast({
        title: 'Import terminé',
        description: `${result.successCount} tirage(s) importé(s), ${result.errorCount} erreur(s)`,
        variant: result.errorCount === 0 ? 'default' : 'destructive'
      });

      // Recharger les données si des tirages ont été importés
      if (result.successCount > 0) {
        await loadDrawResults();
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'import';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadDrawResults, toast]);

  // Export
  const exportDrawResults = useCallback(async (options: ExportOptions) => {
    setLoading(true);
    setError(null);

    try {
      const blob = await drawResultsService.exportDrawResults(options);
      
      // Télécharger le fichier
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tirages_${new Date().toISOString().split('T')[0]}.${options.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Succès',
        description: 'Export terminé avec succès'
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'export';
      setError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Actualisation
  const refreshData = useCallback(async () => {
    await loadDrawResults();
  }, [loadDrawResults]);

  // Récupération par ID
  const getDrawResultById = useCallback(async (id: string): Promise<DrawResult | null> => {
    try {
      return await drawResultsService.getDrawResultById(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la récupération du tirage';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Chargement automatique
  useEffect(() => {
    if (autoLoad) {
      loadDrawResults();
    }
  }, [autoLoad, loadDrawResults]);

  // Vérification des filtres actifs
  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof DrawResultsFilter];
    return value !== undefined && value !== null && value !== '';
  });

  return {
    // État
    drawResults,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    
    // Actions CRUD
    loadDrawResults,
    createDrawResult,
    updateDrawResult,
    deleteDrawResult,
    deleteMultipleDrawResults,
    
    // Recherche et filtrage
    searchDrawResults,
    setFilters,
    resetFilters,
    
    // Import/Export
    importDrawResults,
    exportDrawResults,
    
    // Utilitaires
    refreshData,
    getDrawResultById,
    
    // État des filtres
    filters,
    hasActiveFilters
  };
};
