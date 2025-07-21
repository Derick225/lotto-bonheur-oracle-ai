import { DrawResult } from './lotteryAPI';

export interface DrawResultsResponse {
  data: DrawResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Service de fallback pour les résultats de tirage
 * Utilise IndexedDB comme source de données principale
 */
export class DrawResultsServiceFallback {
  private static instance: DrawResultsServiceFallback;

  private constructor() {}

  static getInstance(): DrawResultsServiceFallback {
    if (!DrawResultsServiceFallback.instance) {
      DrawResultsServiceFallback.instance = new DrawResultsServiceFallback();
    }
    return DrawResultsServiceFallback.instance;
  }

  async getDrawResults(filters: any = {}): Promise<DrawResultsResponse> {
    try {
      const { IndexedDBService } = await import('./indexedDBService');
      const results = await IndexedDBService.getDrawResults();
      
      const { 
        page = 1, 
        limit = 20,
        sortOrder = 'desc'
      } = filters;

      // Tri simple
      const sortedResults = [...results].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      });

      // Pagination simple
      const offset = (page - 1) * limit;
      const paginatedResults = sortedResults.slice(offset, offset + limit);

      return {
        data: paginatedResults,
        total: results.length,
        page,
        limit,
        totalPages: Math.ceil(results.length / limit)
      };
    } catch (error) {
      console.error('Erreur dans le service fallback:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      };
    }
  }

  async getStatistics(): Promise<{
    totalDraws: number;
    lotteryTypes: Array<{ type: string; count: number }>;
    recentDraws: number;
    averageJackpot: number;
  }> {
    try {
      const { IndexedDBService } = await import('./indexedDBService');
      const results = await IndexedDBService.getDrawResults();
      
      // Statistiques simples
      const totalDraws = results.length;
      
      // Types de loterie
      const typeCounts: { [key: string]: number } = {};
      results.forEach(result => {
        const type = result.draw_name || 'Inconnu';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      
      const lotteryTypes = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));
      
      // Tirages récents (7 derniers jours)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentDraws = results.filter(result => new Date(result.date) >= weekAgo).length;
      
      return {
        totalDraws,
        lotteryTypes,
        recentDraws,
        averageJackpot: 0 // Non implémenté dans cette version
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return {
        totalDraws: 0,
        lotteryTypes: [],
        recentDraws: 0,
        averageJackpot: 0
      };
    }
  }

  async searchDrawResults(query: string): Promise<DrawResult[]> {
    try {
      const { IndexedDBService } = await import('./indexedDBService');
      const results = await IndexedDBService.getDrawResults();
      
      // Recherche simple
      return results.filter(result => 
        result.draw_name?.toLowerCase().includes(query.toLowerCase()) ||
        result.date?.includes(query) ||
        result.gagnants?.some(num => num.toString().includes(query))
      );
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      return [];
    }
  }
}

// Export de l'instance
export const drawResultsService = DrawResultsServiceFallback.getInstance();