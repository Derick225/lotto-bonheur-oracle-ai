import { LotteryAPIService, DrawResult, APIResponse } from './lotteryAPI';
import { IndexedDBService } from './indexedDBService';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  totalRecords: number;
  pendingSync: boolean;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  newRecords: number;
  totalRecords: number;
  message: string;
  duration: number;
}

/**
 * Service de synchronisation entre l'API et IndexedDB
 * Gère la récupération, la mise en cache et la synchronisation des données
 */
export class SyncService {
  private static syncInProgress = false;
  private static lastSyncTime: Date | null = null;
  private static readonly SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes

  /**
   * Initialise la synchronisation automatique
   */
  static async initialize(): Promise<void> {
    try {
      // Vérifier si des données existent déjà
      const existingCount = await this.getTotalRecords();
      
      if (existingCount === 0) {
        console.log('Aucune donnée locale trouvée, synchronisation initiale...');
        await this.performInitialSync();
      } else {
        console.log(`${existingCount} enregistrements trouvés localement`);
        // Synchronisation légère pour les nouvelles données
        await this.performIncrementalSync();
      }

      // Démarrer la synchronisation automatique
      this.startAutoSync();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
    }
  }

  /**
   * Synchronisation initiale complète
   */
  static async performInitialSync(): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      if (this.syncInProgress) {
        throw new Error('Synchronisation déjà en cours');
      }

      this.syncInProgress = true;
      console.log('Début de la synchronisation initiale...');

      // Synchroniser l'historique complet depuis janvier 2024
      const historicalResult = await IndexedDBService.syncHistoricalData();
      
      if (!historicalResult.success) {
        throw new Error(historicalResult.message || 'Échec de la synchronisation historique');
      }

      this.lastSyncTime = new Date();
      const duration = Date.now() - startTime;

      return {
        success: true,
        newRecords: historicalResult.totalCount,
        totalRecords: historicalResult.totalCount,
        message: `Synchronisation initiale réussie: ${historicalResult.totalCount} enregistrements`,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      return {
        success: false,
        newRecords: 0,
        totalRecords: await this.getTotalRecords(),
        message: `Échec de la synchronisation initiale: ${errorMessage}`,
        duration
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Synchronisation incrémentale (nouvelles données uniquement)
   */
  static async performIncrementalSync(): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      if (this.syncInProgress) {
        throw new Error('Synchronisation déjà en cours');
      }

      this.syncInProgress = true;
      console.log('Début de la synchronisation incrémentale...');

      // Synchroniser les données récentes
      const syncResult = await IndexedDBService.syncWithAPI();
      
      if (!syncResult.success) {
        throw new Error(syncResult.message || 'Échec de la synchronisation');
      }

      this.lastSyncTime = new Date();
      const duration = Date.now() - startTime;
      const totalRecords = await this.getTotalRecords();

      return {
        success: true,
        newRecords: syncResult.newCount,
        totalRecords,
        message: `Synchronisation réussie: ${syncResult.newCount} nouveaux enregistrements`,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      return {
        success: false,
        newRecords: 0,
        totalRecords: await this.getTotalRecords(),
        message: `Échec de la synchronisation: ${errorMessage}`,
        duration
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Démarre la synchronisation automatique
   */
  private static startAutoSync(): void {
    setInterval(async () => {
      if (!this.syncInProgress && navigator.onLine) {
        try {
          await this.performIncrementalSync();
        } catch (error) {
          console.error('Erreur lors de la synchronisation automatique:', error);
        }
      }
    }, this.SYNC_INTERVAL);
  }

  /**
   * Récupère le statut de synchronisation
   */
  static async getSyncStatus(): Promise<SyncStatus> {
    return {
      isOnline: navigator.onLine,
      lastSync: this.lastSyncTime,
      totalRecords: await this.getTotalRecords(),
      pendingSync: this.syncInProgress
    };
  }

  /**
   * Force une synchronisation manuelle
   */
  static async forcSync(): Promise<SyncResult> {
    return this.performIncrementalSync();
  }

  /**
   * Récupère les données avec fallback automatique
   */
  static async getDrawResults(drawName: string, limit: number = 50): Promise<DrawResult[]> {
    try {
      // Essayer d'abord les données locales
      const localResults = await IndexedDBService.getDrawResults(drawName, limit);
      
      if (localResults.length > 0) {
        return localResults;
      }

      // Si pas de données locales et en ligne, essayer l'API
      if (navigator.onLine) {
        console.log('Aucune donnée locale, récupération depuis l\'API...');
        const apiResults = await LotteryAPIService.getDrawResults(drawName, limit);
        
        // Sauvegarder pour la prochaine fois
        if (apiResults.length > 0) {
          await IndexedDBService.saveDrawResults(apiResults);
        }
        
        return apiResults;
      }

      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      
      // Fallback vers les données locales en cas d'erreur
      try {
        return await IndexedDBService.getDrawResults(drawName, limit);
      } catch (localError) {
        console.error('Erreur lors du fallback local:', localError);
        return [];
      }
    }
  }

  /**
   * Récupère le nombre total d'enregistrements
   */
  private static async getTotalRecords(): Promise<number> {
    try {
      const { db } = await import('./indexedDBService');
      return await db.drawResults.count();
    } catch (error) {
      console.error('Erreur lors du comptage des enregistrements:', error);
      return 0;
    }
  }

  /**
   * Nettoie les anciennes données (garde les 6 derniers mois)
   */
  static async cleanupOldData(): Promise<void> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const cutoffDate = sixMonthsAgo.toISOString().split('T')[0];

      const { db } = await import('./indexedDBService');
      const deletedCount = await db.drawResults
        .where('date')
        .below(cutoffDate)
        .delete();

      console.log(`Nettoyage terminé: ${deletedCount} anciens enregistrements supprimés`);
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  }
}
