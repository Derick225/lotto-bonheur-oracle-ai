import { DrawResult } from './supabaseClient';

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

// Données simulées avec le bon format
const mockResults: DrawResult[] = [
  {
    id: '1',
    draw_date: '2024-01-15',
    numbers: [12, 23, 34, 45, 49],
    bonus_numbers: [7],
    lottery_type: 'loto',
    jackpot_amount: 15000000,
    winners_count: 3,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    draw_date: '2024-01-14',
    numbers: [8, 19, 27, 38, 42],
    bonus_numbers: [5],
    lottery_type: 'loto',
    jackpot_amount: 12000000,
    winners_count: 1,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    draw_date: '2024-01-13',
    numbers: [3, 14, 25, 36, 47],
    bonus_numbers: [9],
    lottery_type: 'euromillions',
    jackpot_amount: 180000000,
    winners_count: 0,
    created_at: new Date().toISOString()
  }
];

/**
 * Service de fallback pour les résultats de tirage
 * Utilise des données simulées
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
      const { 
        page = 1, 
        limit = 20,
        sortOrder = 'desc'
      } = filters;

      // Tri simple
      const sortedResults = [...mockResults].sort((a, b) => {
        const dateA = new Date(a.draw_date);
        const dateB = new Date(b.draw_date);
        return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      });

      // Pagination simple
      const offset = (page - 1) * limit;
      const paginatedResults = sortedResults.slice(offset, offset + limit);

      return {
        data: paginatedResults,
        total: mockResults.length,
        page,
        limit,
        totalPages: Math.ceil(mockResults.length / limit)
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
      const newResult = {
        ...data,
        id: (mockResults.length + 1).toString(),
        created_at: new Date().toISOString()
      } as DrawResult;
      
      mockResults.push(newResult);
      return newResult;
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      return null;
    }
  }

  async updateDrawResult(id: string, data: Partial<DrawResult>): Promise<DrawResult | null> {
    try {
      const index = mockResults.findIndex(r => r.id === id);
      if (index !== -1) {
        mockResults[index] = { ...mockResults[index], ...data };
        return mockResults[index];
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      return null;
    }
  }

  async deleteDrawResult(id: string): Promise<void> {
    try {
      const index = mockResults.findIndex(r => r.id === id);
      if (index !== -1) {
        mockResults.splice(index, 1);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      throw error;
    }
  }

  async deleteMultipleDrawResults(ids: string[]): Promise<void> {
    try {
      for (const id of ids) {
        await this.deleteDrawResult(id);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression multiple:', error);
      throw error;
    }
  }

  async getDrawResultById(id: string): Promise<DrawResult | null> {
    try {
      return mockResults.find(r => r.id === id) || null;
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
      // Statistiques simples
      const totalDraws = mockResults.length;
      
      // Types de loterie
      const typeCounts: { [key: string]: number } = {};
      mockResults.forEach(result => {
        const type = result.lottery_type || 'Inconnu';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      
      const lotteryTypes = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));
      
      // Tirages récents (7 derniers jours)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentDraws = mockResults.filter(result => new Date(result.draw_date) >= weekAgo).length;
      
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
      // Recherche simple
      return mockResults.filter(result => 
        result.lottery_type?.toLowerCase().includes(query.toLowerCase()) ||
        result.draw_date?.includes(query) ||
        result.numbers?.some(num => num.toString().includes(query))
      );
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      return [];
    }
  }

  // Méthodes supplémentaires pour compatibilité
  async getAllResults(): Promise<DrawResult[]> {
    return mockResults;
  }

  async getResultById(id: string): Promise<DrawResult | undefined> {
    return mockResults.find(r => r.id === id);
  }

  async getResultsByType(type: string): Promise<DrawResult[]> {
    return mockResults.filter(r => r.lottery_type === type);
  }

  async addResult(result: Omit<DrawResult, 'id'>): Promise<void> {
    const newResult = {
      ...result,
      id: (mockResults.length + 1).toString(),
      created_at: new Date().toISOString()
    };
    mockResults.push(newResult);
  }

  async updateResult(id: string, updates: Partial<DrawResult>): Promise<void> {
    const index = mockResults.findIndex(r => r.id === id);
    if (index !== -1) {
      mockResults[index] = { ...mockResults[index], ...updates };
    }
  }

  async deleteResult(id: string): Promise<void> {
    const index = mockResults.findIndex(r => r.id === id);
    if (index !== -1) {
      mockResults.splice(index, 1);
    }
  }

  async getResultsCount(): Promise<number> {
    return mockResults.length;
  }

  async getRecentResults(limit: number = 10): Promise<DrawResult[]> {
    return mockResults.slice(0, limit);
  }
}

// Export de l'instance
export const drawResultsService = DrawResultsServiceFallback.getInstance();