/**
 * Service d'optimisation des performances
 * Gère le lazy loading, la mémoïsation et les optimisations
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';

// Cache global pour la mémoïsation
const globalCache = new Map<string, any>();

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Hook pour la mémoïsation avancée avec cache persistant
export function usePersistentMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  key: string
): T {
  const cacheKey = `${key}-${JSON.stringify(deps)}`;
  
  return useMemo(() => {
    if (globalCache.has(cacheKey)) {
      return globalCache.get(cacheKey);
    }
    
    const result = factory();
    globalCache.set(cacheKey, result);
    
    // Nettoyer le cache si trop volumineux
    if (globalCache.size > 100) {
      const firstKey = globalCache.keys().next().value;
      globalCache.delete(firstKey);
    }
    
    return result;
  }, deps);
}

// Hook pour le lazy loading des composants
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList = []
): { data: T | null; loading: boolean; error: Error | null } {
  const [state, setState] = React.useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null
  });

  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await loader();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, deps);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return state;
}

// Hook pour l'intersection observer (lazy loading d'images/composants)
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement>, boolean] {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return [ref, isIntersecting];
}

// Hook pour la gestion de la mémoire des tensors TensorFlow
export function useTensorMemory() {
  const tensorsRef = useRef<any[]>([]);

  const addTensor = useCallback((tensor: any) => {
    tensorsRef.current.push(tensor);
  }, []);

  const cleanup = useCallback(() => {
    tensorsRef.current.forEach(tensor => {
      if (tensor && typeof tensor.dispose === 'function') {
        tensor.dispose();
      }
    });
    tensorsRef.current = [];
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { addTensor, cleanup };
}

// Service de gestion des performances
export class PerformanceService {
  private static metrics: { [key: string]: number[] } = {};
  private static observers: PerformanceObserver[] = [];

  /**
   * Démarre le monitoring des performances
   */
  static startMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Observer pour les métriques de navigation
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric('navigation', entry.duration);
        });
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation observer not supported');
      }

      // Observer pour les métriques de ressources
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric('resource', entry.duration);
        });
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported');
      }
    }

    // Monitoring de la mémoire
    this.monitorMemory();
  }

  /**
   * Enregistre une métrique de performance
   */
  static recordMetric(name: string, value: number): void {
    if (!this.metrics[name]) {
      this.metrics[name] = [];
    }
    
    this.metrics[name].push(value);
    
    // Garder seulement les 100 dernières valeurs
    if (this.metrics[name].length > 100) {
      this.metrics[name].shift();
    }
  }

  /**
   * Mesure le temps d'exécution d'une fonction
   */
  static async measureTime<T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration);
      throw error;
    }
  }

  /**
   * Retourne les statistiques de performance
   */
  static getStats(): { [key: string]: { avg: number; min: number; max: number; count: number } } {
    const stats: any = {};
    
    Object.entries(this.metrics).forEach(([name, values]) => {
      if (values.length > 0) {
        stats[name] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });
    
    return stats;
  }

  /**
   * Monitore l'utilisation de la mémoire
   */
  private static monitorMemory(): void {
    if (typeof window === 'undefined' || !(performance as any).memory) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      this.recordMetric('memory_used', memory.usedJSHeapSize);
      this.recordMetric('memory_total', memory.totalJSHeapSize);
      this.recordMetric('memory_limit', memory.jsHeapSizeLimit);
    };

    checkMemory();
    setInterval(checkMemory, 30000); // Toutes les 30 secondes
  }

  /**
   * Optimise les images pour le lazy loading
   */
  static optimizeImage(src: string, width?: number, height?: number): string {
    // Pour une vraie application, on utiliserait un service d'optimisation d'images
    // Ici, on retourne simplement l'URL originale
    return src;
  }

  /**
   * Précharge des ressources critiques
   */
  static preloadResources(urls: string[]): void {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      
      if (url.endsWith('.js')) {
        link.as = 'script';
      } else if (url.endsWith('.css')) {
        link.as = 'style';
      } else if (url.match(/\.(jpg|jpeg|png|webp|svg)$/)) {
        link.as = 'image';
      }
      
      document.head.appendChild(link);
    });
  }

  /**
   * Nettoie les observers de performance
   */
  static cleanup(): void {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
    this.metrics = {};
  }

  /**
   * Optimise les opérations IndexedDB
   */
  static async optimizeIndexedDB(): Promise<void> {
    try {
      // Importer le service IndexedDB
      const { IndexedDBService } = await import('./indexedDBService');
      
      // Nettoyer les anciennes données (plus de 6 mois)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      console.log('🧹 Nettoyage des données anciennes...');
      // Note: Implémentation spécifique selon les besoins
      
    } catch (error) {
      console.warn('Erreur lors de l\'optimisation IndexedDB:', error);
    }
  }

  /**
   * Retourne des recommandations de performance
   */
  static getRecommendations(): string[] {
    const stats = this.getStats();
    const recommendations: string[] = [];

    // Vérifier les temps de navigation
    if (stats.navigation && stats.navigation.avg > 3000) {
      recommendations.push('Temps de chargement élevé - Considérer le lazy loading');
    }

    // Vérifier l'utilisation mémoire
    if (stats.memory_used && stats.memory_limit) {
      const memoryUsage = stats.memory_used.avg / stats.memory_limit.avg;
      if (memoryUsage > 0.8) {
        recommendations.push('Utilisation mémoire élevée - Nettoyer les caches');
      }
    }

    // Vérifier les erreurs
    const errorMetrics = Object.keys(stats).filter(key => key.includes('_error'));
    if (errorMetrics.length > 0) {
      recommendations.push('Erreurs détectées - Vérifier les logs');
    }

    return recommendations;
  }
}

// Hook React pour utiliser le service de performance
export function usePerformanceMonitoring() {
  useEffect(() => {
    PerformanceService.startMonitoring();
    
    return () => {
      PerformanceService.cleanup();
    };
  }, []);

  return {
    recordMetric: PerformanceService.recordMetric,
    measureTime: PerformanceService.measureTime,
    getStats: PerformanceService.getStats,
    getRecommendations: PerformanceService.getRecommendations
  };
}
