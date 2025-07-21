import { 
  supabaseManager, 
  DrawResult, 
  DrawResultHistory, 
  ImportSession,
  validateDrawResult,
  formatDrawResultForDB 
} from './supabaseClient';

export type { DrawResult, DrawResultHistory, ImportSession };
import { AuditService } from './auditService';

export interface DrawResultsFilter {
  dateFrom?: string;
  dateTo?: string;
  lotteryType?: string;
  numbers?: number[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'draw_date' | 'created_at' | 'lottery_type';
  sortOrder?: 'asc' | 'desc';
}

export interface DrawResultsResponse {
  data: DrawResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

/**
 * Service de gestion des résultats de tirage avec intégration Supabase
 */
export class DrawResultsService {
  private static instance: DrawResultsService;

  private constructor() {}

  static getInstance(): DrawResultsService {
    if (!DrawResultsService.instance) {
      DrawResultsService.instance = new DrawResultsService();
    }
    return DrawResultsService.instance;
  }

  /**
   * Récupère les résultats de tirage avec filtres et pagination
   */
  async getDrawResults(filters: DrawResultsFilter = {}): Promise<DrawResultsResponse> {
    try {
      const {
        dateFrom,
        dateTo,
        lotteryType,
        numbers,
        search,
        page = 1,
        limit = 20,
        sortBy = 'draw_date',
        sortOrder = 'desc'
      } = filters;

      const offset = (page - 1) * limit;

      const result = await supabaseManager.safeQuery(async (client) => {
        let query = client
          .from('draw_results')
          .select('*', { count: 'exact' });

        // Filtres de date
        if (dateFrom) {
          query = query.gte('draw_date', dateFrom);
        }
        if (dateTo) {
          query = query.lte('draw_date', dateTo);
        }

        // Filtre par type de loterie
        if (lotteryType) {
          query = query.eq('lottery_type', lotteryType);
        }

        // Recherche textuelle
        if (search) {
          query = query.or(`lottery_type.ilike.%${search}%,draw_date.ilike.%${search}%`);
        }

        // Filtre par numéros (contient au moins un des numéros)
        if (numbers && numbers.length > 0) {
          query = query.overlaps('numbers', numbers);
        }

        // Tri
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        // Pagination
        query = query.range(offset, offset + limit - 1);

        return await query;
      });

      if (result.error) {
        throw new Error(`Erreur lors de la récupération des tirages: ${result.error.message}`);
      }

      const total = result.count ?? result.data?.length ?? 0;
      const totalPages = Math.ceil(total / limit);

      AuditService.logInfo('draw_results', `Récupération de ${result.data?.length || 0} tirages`);

      return {
        data: result.data || [],
        total,
        page,
        limit,
        totalPages
      };

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Récupère un tirage par ID
   */
  async getDrawResultById(id: string): Promise<DrawResult | null> {
    try {
      const result = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results')
          .select('*')
          .eq('id', id)
          .single();
      });

      if (result.error && result.error.code !== 'PGRST116') {
        throw new Error(`Erreur lors de la récupération du tirage: ${result.error.message}`);
      }

      return result.data;

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau tirage
   */
  async createDrawResult(data: Partial<DrawResult>): Promise<DrawResult> {
    try {
      // Validation des données
      const validation = validateDrawResult(data);
      if (!validation.valid) {
        throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
      }

      // Vérifier les doublons
      await this.checkForDuplicates(data.draw_date!, data.lottery_type!);

      // Formater les données
      const formattedData = formatDrawResultForDB({
        ...data,
        created_at: new Date().toISOString(),
        created_by: await this.getCurrentUserId()
      });

      const result = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results')
          .insert([formattedData])
          .select()
          .single();
      });

      if (result.error) {
        throw new Error(`Erreur lors de la création du tirage: ${result.error.message}`);
      }

      AuditService.logInfo('draw_results', `Tirage créé: ${result.data?.id}`);
      return result.data!;

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Met à jour un tirage existant
   */
  async updateDrawResult(id: string, data: Partial<DrawResult>): Promise<DrawResult> {
    try {
      // Validation des données
      const validation = validateDrawResult(data);
      if (!validation.valid) {
        throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
      }

      // Vérifier les doublons (sauf pour le tirage actuel)
      if (data.draw_date || data.lottery_type) {
        await this.checkForDuplicates(
          data.draw_date!, 
          data.lottery_type!, 
          id
        );
      }

      // Formater les données
      const formattedData = formatDrawResultForDB({
        ...data,
        updated_by: await this.getCurrentUserId()
      });

      const result = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results')
          .update(formattedData)
          .eq('id', id)
          .select()
          .single();
      });

      if (result.error) {
        throw new Error(`Erreur lors de la mise à jour du tirage: ${result.error.message}`);
      }

      AuditService.logInfo('draw_results', `Tirage mis à jour: ${id}`);
      return result.data!;

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Supprime un tirage
   */
  async deleteDrawResult(id: string): Promise<void> {
    try {
      const result = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results')
          .delete()
          .eq('id', id);
      });

      if (result.error) {
        throw new Error(`Erreur lors de la suppression du tirage: ${result.error.message}`);
      }

      AuditService.logInfo('draw_results', `Tirage supprimé: ${id}`);

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Supprime plusieurs tirages
   */
  async deleteMultipleDrawResults(ids: string[]): Promise<void> {
    try {
      const result = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results')
          .delete()
          .in('id', ids);
      });

      if (result.error) {
        throw new Error(`Erreur lors de la suppression des tirages: ${result.error.message}`);
      }

      AuditService.logInfo('draw_results', `${ids.length} tirages supprimés`);

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des modifications d'un tirage
   */
  async getDrawResultHistory(drawResultId: string): Promise<DrawResultHistory[]> {
    try {
      const result = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results_history')
          .select('*')
          .eq('draw_result_id', drawResultId)
          .order('changed_at', { ascending: false });
      });

      if (result.error) {
        throw new Error(`Erreur lors de la récupération de l'historique: ${result.error.message}`);
      }

      return result.data || [];

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Vérifie les doublons
   */
  private async checkForDuplicates(
    drawDate: string, 
    lotteryType: string, 
    excludeId?: string
  ): Promise<void> {
    const result = await supabaseManager.safeQuery(async (client) => {
      let query = client
        .from('draw_results')
        .select('id')
        .eq('draw_date', drawDate)
        .eq('lottery_type', lotteryType);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      return await query;
    });

    if (result.data && result.data.length > 0) {
      throw new Error(`Un tirage existe déjà pour cette date et ce type de loterie`);
    }
  }

  /**
   * Obtient l'ID de l'utilisateur actuel
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabaseManager.getClient().auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Obtient les statistiques des tirages
   */
  async getStatistics(): Promise<{
    totalDraws: number;
    lotteryTypes: Array<{ type: string; count: number }>;
    recentDraws: number;
    averageJackpot: number;
  }> {
    try {
      // Total des tirages
      const totalResult = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results')
          .select('*', { count: 'exact', head: true });
      });

      // Tirages par type
      const typesResult = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results')
          .select('lottery_type')
          .order('lottery_type');
      });

      // Tirages récents (7 derniers jours)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7);
      
      const recentResult = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results')
          .select('*', { count: 'exact', head: true })
          .gte('draw_date', recentDate.toISOString().split('T')[0]);
      });

      // Jackpot moyen
      const jackpotResult = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results')
          .select('jackpot_amount')
          .not('jackpot_amount', 'is', null);
      });

      // Traitement des résultats
      const totalDraws = totalResult.count ?? totalResult.data?.length ?? 0;
      const recentDraws = recentResult.count ?? recentResult.data?.length ?? 0;

      const lotteryTypes = typesResult.data ? 
        Object.entries(
          typesResult.data.reduce((acc: any, item: any) => {
            acc[item.lottery_type] = (acc[item.lottery_type] || 0) + 1;
            return acc;
          }, {})
        ).map(([type, count]) => ({ type, count: count as number })) : [];

      const jackpots = jackpotResult.data?.map(item => item.jackpot_amount).filter(Boolean) || [];
      const averageJackpot = jackpots.length > 0 ? 
        jackpots.reduce((sum, amount) => sum + amount, 0) / jackpots.length : 0;

      return {
        totalDraws,
        lotteryTypes,
        recentDraws,
        averageJackpot
      };

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Recherche avancée dans les tirages
   */
  async searchDrawResults(query: string, options: {
    searchInNumbers?: boolean;
    searchInDates?: boolean;
    searchInTypes?: boolean;
    limit?: number;
  } = {}): Promise<DrawResult[]> {
    try {
      const {
        searchInNumbers = true,
        searchInDates = true,
        searchInTypes = true,
        limit = 50
      } = options;

      const result = await supabaseManager.safeQuery(async (client) => {
        let dbQuery = client.from('draw_results').select('*');

        const conditions: string[] = [];

        if (searchInTypes) {
          conditions.push(`lottery_type.ilike.%${query}%`);
        }

        if (searchInDates) {
          conditions.push(`draw_date.ilike.%${query}%`);
        }

        if (searchInNumbers && !isNaN(Number(query))) {
          // Recherche dans les numéros
          const number = parseInt(query);
          conditions.push(`numbers.cs.{${number}}`);
        }

        if (conditions.length > 0) {
          dbQuery = dbQuery.or(conditions.join(','));
        }

        return await dbQuery
          .order('draw_date', { ascending: false })
          .limit(limit);
      });

      if (result.error) {
        throw new Error(`Erreur lors de la recherche: ${result.error.message}`);
      }

      return result.data || [];

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Obtient les types de loterie disponibles
   */
  async getLotteryTypes(): Promise<string[]> {
    try {
      const result = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('draw_results')
          .select('lottery_type')
          .order('lottery_type');
      });

      if (result.error) {
        throw new Error(`Erreur lors de la récupération des types: ${result.error.message}`);
      }

      const types = [...new Set(result.data?.map(item => item.lottery_type) || [])];
      return types;

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Valide les données d'import
   */
  validateImportData(data: any[]): Array<({
    row: number;
    data: any;
    errors: string[];
    valid: boolean;
  })> {
    return data.map((item, index) => {
      const validation = validateDrawResult(item);
      return {
        row: index + 1,
        data: item,
        errors: validation.errors,
        valid: validation.valid
      };
    });
  }

  /**
   * Importe des tirages par lots
   */
  async importDrawResults(
    data: any[],
    filename: string,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
    } = {}
  ): Promise<ImportResult> {
    try {
      const { skipDuplicates = true, updateExisting = false } = options;

      // Créer une session d'import
      const sessionResult = await supabaseManager.safeQuery(async (client) => {
        return await client
          .from('import_sessions')
          .insert([{
            filename,
            total_rows: data.length,
            created_by: await this.getCurrentUserId()
          }])
          .select()
          .single();
      });

      if (sessionResult.error) {
        throw new Error(`Erreur lors de la création de la session d'import: ${sessionResult.error.message}`);
      }

      const sessionId = sessionResult.data!.id;
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ row: number; data: any; errors: string[] }> = [];

      // Valider toutes les données
      const validationResults = this.validateImportData(data);

      // Traiter chaque ligne
      for (const result of validationResults) {
        try {
          if (!result.valid) {
            errors.push({
              row: result.row,
              data: result.data,
              errors: result.errors
            });
            errorCount++;
            continue;
          }

          // Vérifier les doublons
          const existing = await this.findExistingDraw(
            result.data.draw_date,
            result.data.lottery_type
          );

          if (existing) {
            if (skipDuplicates) {
              continue; // Ignorer les doublons
            } else if (updateExisting) {
              await this.updateDrawResult(existing.id!, result.data);
              successCount++;
            } else {
              errors.push({
                row: result.row,
                data: result.data,
                errors: ['Tirage déjà existant']
              });
              errorCount++;
            }
          } else {
            await this.createDrawResult(result.data);
            successCount++;
          }

        } catch (error) {
          errors.push({
            row: result.row,
            data: result.data,
            errors: [error instanceof Error ? error.message : 'Erreur inconnue']
          });
          errorCount++;
        }

        // Mettre à jour la progression
        await this.updateImportSession(sessionId, {
          processed_rows: result.row,
          success_count: successCount,
          error_count: errorCount
        });
      }

      // Finaliser la session
      await this.updateImportSession(sessionId, {
        status: errorCount === 0 ? 'completed' : 'completed',
        errors: errors.length > 0 ? errors : null
      });

      AuditService.logInfo('draw_results', `Import terminé: ${successCount} succès, ${errorCount} erreurs`);

      return {
        sessionId,
        totalRows: data.length,
        successCount,
        errorCount,
        errors
      };

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Trouve un tirage existant
   */
  private async findExistingDraw(drawDate: string, lotteryType: string): Promise<DrawResult | null> {
    const result = await supabaseManager.safeQuery(async (client) => {
      return await client
        .from('draw_results')
        .select('*')
        .eq('draw_date', drawDate)
        .eq('lottery_type', lotteryType)
        .single();
    });

    return result.data;
  }

  /**
   * Met à jour une session d'import
   */
  private async updateImportSession(sessionId: string, updates: Partial<ImportSession>): Promise<void> {
    await supabaseManager.safeQuery(async (client) => {
      return await client
        .from('import_sessions')
        .update(updates)
        .eq('id', sessionId);
    });
  }

  /**
   * Exporte les tirages
   */
  async exportDrawResults(options: ExportOptions): Promise<Blob> {
    try {
      const { format, filters, includeHistory = false } = options;

      // Récupérer les données
      const response = await this.getDrawResults({
        ...filters,
        limit: 10000 // Limite élevée pour l'export
      });

      let exportData = response.data;

      // Inclure l'historique si demandé
      if (includeHistory) {
        for (const draw of exportData) {
          const history = await this.getDrawResultHistory(draw.id!);
          (draw as any).history = history;
        }
      }

      // Générer le fichier selon le format
      switch (format) {
        case 'json':
          return new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
          });

        case 'csv':
          return this.generateCSV(exportData);

        case 'excel':
          return this.generateExcel(exportData);

        default:
          throw new Error(`Format d'export non supporté: ${format}`);
      }

    } catch (error) {
      AuditService.logError('draw_results', error);
      throw error;
    }
  }

  /**
   * Génère un fichier CSV
   */
  private generateCSV(data: DrawResult[]): Blob {
    const headers = [
      'ID',
      'Date du tirage',
      'Numéros',
      'Numéros bonus',
      'Type de loterie',
      'Montant jackpot',
      'Nombre de gagnants',
      'Créé le',
      'Modifié le'
    ];

    const rows = data.map(draw => [
      draw.id,
      draw.draw_date,
      draw.numbers.join('-'),
      draw.bonus_numbers?.join('-') || '',
      draw.lottery_type,
      draw.jackpot_amount || '',
      draw.winners_count || '',
      draw.created_at,
      draw.updated_at
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Génère un fichier Excel (simplifié en CSV pour l'instant)
   */
  private generateExcel(data: DrawResult[]): Blob {
    // Pour une vraie implémentation Excel, utiliser une bibliothèque comme xlsx
    return this.generateCSV(data);
  }
}

// Instance singleton
// Export de l'instance singleton du service
export const drawResultsService = DrawResultsService.getInstance();
