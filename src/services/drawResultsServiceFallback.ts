import { DrawResult } from './lotteryAPI';

export interface DrawResultsFilter {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  lotteryType?: string;
  numbers?: number[];
  search?: string;
  sortBy?: 'draw_date' | 'created_at' | 'lottery_type';
}

export interface ImportResult {
  sessionId: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    data: any;
    errors: string[];
  }>;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  filters?: DrawResultsFilter;
  includeHistory?: boolean;
}

export type { DrawResult };

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

  async createDrawResult(data: Partial<DrawResult>): Promise<DrawResult | null> {
    try {
      const { IndexedDBService } = await import('./indexedDBService');
      const newResult = await IndexedDBService.addDrawResult(data as any);
      return newResult;
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      return null;
    }
  }

  async updateDrawResult(id: string, data: Partial<DrawResult>): Promise<DrawResult | null> {
    try {
      const { IndexedDBService } = await import('./indexedDBService');
      const updatedResult = await IndexedDBService.updateDrawResult(id, data);
      return updatedResult;
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      return null;
    }
  }

  async deleteDrawResult(id: string): Promise<void> {
    try {
      const { IndexedDBService } = await import('./indexedDBService');
      await IndexedDBService.deleteDrawResult(id);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      throw error;
    }
  }

  async deleteMultipleDrawResults(ids: string[]): Promise<void> {
    try {
      const { IndexedDBService } = await import('./indexedDBService');
      for (const id of ids) {
        await IndexedDBService.deleteDrawResult(id);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression multiple:', error);
      throw error;
    }
  }

  async getDrawResultById(id: string): Promise<DrawResult | null> {
    try {
      const { IndexedDBService } = await import('./indexedDBService');
      const results = await IndexedDBService.getDrawResults();
      return results.find(r => r.id === id) || null;
    } catch (error) {
      console.error('Erreur lors de la récupération par ID:', error);
      return null;
    }
  }

  async importDrawResults(data: any[], filename: string, options?: any): Promise<ImportResult> {
    // Import simulation
    return {
      sessionId: 'temp-' + Date.now(),
      totalRows: data.length,
      successCount: data.length,
      errorCount: 0,
      errors: []
    };
  }

  async exportDrawResults(options: ExportOptions): Promise<Blob> {
    // Export simulation
    const results = await this.getDrawResults(options.filters);
    const data = JSON.stringify(results.data, null, 2);
    return new Blob([data], { type: 'application/json' });
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