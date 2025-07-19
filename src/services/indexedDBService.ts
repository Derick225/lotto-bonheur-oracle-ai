import Dexie, { Table } from 'dexie';
import { DrawResult } from './lotteryAPI';

// Interface pour les prédictions améliorée
export interface PredictionResult {
  id?: number;
  drawName: string;
  date: string;
  numbers: Array<{
    number: number;
    probability: number;
    confidence: number;
    uncertainty: number;
    bayesianProbability?: number;
    features: string[];
  }>;
  confidence: number;
  algorithm: 'XGBoost' | 'RNN-LSTM' | 'RandomForest' | 'Hybrid';
  features: string[];
  createdAt: Date;
  metadata?: any;
}

// Interface pour les statistiques
export interface CachedStatistics {
  id?: number;
  drawName: string;
  frequency: { [key: number]: number };
  lastAppearance: { [key: number]: string };
  trends: { increasing: number[]; decreasing: number[] };
  coOccurrences: { [key: string]: number };
  updatedAt: Date;
}

// Interface pour les préférences utilisateur
export interface UserPreferences {
  id: number;
  favoriteDraws: string[];
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'en';
  lastViewedDraw?: string;
}

// Interface pour les résultats d'optimisation
export interface OptimizationResults {
  id?: number;
  timestamp: string;
  xgboost: {
    bestScore: number;
    bestConfig: any;
    convergenceHistory: number[];
  };
  lstm: {
    bestScore: number;
    bestConfig: any;
    convergenceHistory: number[];
  };
}

class LotteryDatabase extends Dexie {
  drawResults!: Table<DrawResult>;
  predictions!: Table<PredictionResult>;
  statistics!: Table<CachedStatistics>;
  preferences!: Table<UserPreferences>;
  optimizations!: Table<OptimizationResults>;

  constructor() {
    super('LotteryAnalysisDB');
    this.version(1).stores({
      drawResults: '++id, draw_name, date, gagnants, machine, day, time',
      predictions: '++id, drawName, date, numbers, confidence, algorithm, features, createdAt',
      statistics: '++id, drawName, frequency, lastAppearance, trends, coOccurrences, updatedAt',
      preferences: 'id, favoriteDraws, notificationsEnabled, theme, language, lastViewedDraw'
    });

    // Version 2 pour ajouter la table optimizations
    this.version(2).stores({
      drawResults: '++id, draw_name, date, gagnants, machine, day, time',
      predictions: '++id, drawName, date, numbers, confidence, algorithm, features, createdAt',
      statistics: '++id, drawName, frequency, lastAppearance, trends, coOccurrences, updatedAt',
      preferences: 'id, favoriteDraws, notificationsEnabled, theme, language, lastViewedDraw',
      optimizations: '++id, timestamp, xgboost, lstm'
    });
  }
}

export const db = new LotteryDatabase();

// Service pour gérer les données hors ligne
export class IndexedDBService {
  // Gestion des résultats de tirages
  static async saveDrawResults(results: DrawResult[]): Promise<void> {
    try {
      // Filtrer les doublons avant l'insertion
      const uniqueResults = await this.filterDuplicates(results);
      if (uniqueResults.length > 0) {
        await db.drawResults.bulkPut(uniqueResults);
        console.log(`Sauvegardé ${uniqueResults.length} nouveaux résultats dans IndexedDB`);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw error;
    }
  }

  static async getDrawResults(drawName?: string, limit?: number): Promise<DrawResult[]> {
    try {
      let collection = db.drawResults.orderBy('date').reverse();

      if (drawName) {
        collection = collection.filter(result => result.draw_name === drawName);
      }

      if (limit) {
        collection = collection.limit(limit);
      }

      return collection.toArray();
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      return [];
    }
  }

  static async getLatestDrawResult(drawName: string): Promise<DrawResult | undefined> {
    try {
      return db.drawResults
        .where('draw_name')
        .equals(drawName)
        .reverse()
        .sortBy('date')
        .then(results => results[0]);
    } catch (error) {
      console.error('Erreur lors de la récupération du dernier résultat:', error);
      return undefined;
    }
  }

  /**
   * Filtre les doublons basés sur draw_name et date
   */
  private static async filterDuplicates(newResults: DrawResult[]): Promise<DrawResult[]> {
    const existingKeys = new Set<string>();

    // Récupérer toutes les clés existantes
    await db.drawResults.each(result => {
      existingKeys.add(`${result.draw_name}-${result.date}`);
    });

    // Filtrer les nouveaux résultats
    return newResults.filter(result => {
      const key = `${result.draw_name}-${result.date}`;
      return !existingKeys.has(key);
    });
  }

  /**
   * Synchronise les données avec l'API
   */
  static async syncWithAPI(): Promise<{ success: boolean; newCount: number; message?: string }> {
    try {
      console.log('Début de la synchronisation avec l\'API...');

      // Importer le service API dynamiquement pour éviter les dépendances circulaires
      const { LotteryAPIService } = await import('./lotteryAPI');

      // Récupérer les données récentes de l'API
      const apiResponse = await LotteryAPIService.fetchResults();

      if (!apiResponse.success) {
        throw new Error(apiResponse.message || 'Échec de la récupération API');
      }

      // Sauvegarder les nouveaux résultats
      const initialCount = await db.drawResults.count();
      await this.saveDrawResults(apiResponse.data);
      const finalCount = await db.drawResults.count();
      const newCount = finalCount - initialCount;

      console.log(`Synchronisation terminée: ${newCount} nouveaux résultats`);

      return {
        success: true,
        newCount,
        message: `${newCount} nouveaux résultats synchronisés`
      };
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      return {
        success: false,
        newCount: 0,
        message: `Erreur de synchronisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Synchronise l'historique complet depuis janvier 2024
   */
  static async syncHistoricalData(): Promise<{ success: boolean; totalCount: number; message?: string }> {
    try {
      console.log('Début de la synchronisation historique...');

      const { LotteryAPIService } = await import('./lotteryAPI');

      // Récupérer l'historique complet
      const historicalResponse = await LotteryAPIService.fetchHistoricalData(2024);

      if (!historicalResponse.success) {
        throw new Error(historicalResponse.message || 'Échec de la récupération historique');
      }

      // Sauvegarder tous les résultats historiques
      await this.saveDrawResults(historicalResponse.data);
      const totalCount = await db.drawResults.count();

      console.log(`Synchronisation historique terminée: ${totalCount} résultats au total`);

      return {
        success: true,
        totalCount,
        message: `Historique synchronisé: ${totalCount} résultats au total`
      };
    } catch (error) {
      console.error('Erreur lors de la synchronisation historique:', error);
      return {
        success: false,
        totalCount: 0,
        message: `Erreur de synchronisation historique: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  // Nouvelles méthodes pour l'interface administrateur
  static async addDrawResult(result: Omit<DrawResult, 'id'>): Promise<number> {
    const id = await db.drawResults.add(result as DrawResult);
    return typeof id === 'number' ? id : parseInt(id.toString());
  }

  static async updateDrawResult(id: number, result: Partial<DrawResult>): Promise<void> {
    await db.drawResults.update(id, result);
  }

  static async deleteDrawResult(id: number): Promise<void> {
    await db.drawResults.delete(id);
  }

  // Gestion des prédictions améliorée
  static async savePrediction(prediction: Omit<PredictionResult, 'id' | 'createdAt'>): Promise<number> {
    try {
      const predictionWithDate = {
        ...prediction,
        createdAt: new Date()
      };

      // Supprimer les anciennes prédictions pour ce tirage (garder seulement les 10 dernières)
      const existingPredictions = await db.predictions
        .where('drawName')
        .equals(prediction.drawName)
        .reverse()
        .sortBy('createdAt');

      if (existingPredictions.length >= 10) {
        const toDelete = existingPredictions.slice(10);
        await db.predictions.bulkDelete(toDelete.map(p => p.id!));
      }

      const id = await db.predictions.add(predictionWithDate);
      console.log(`💾 Prédiction sauvegardée pour ${prediction.drawName}`);
      return typeof id === 'number' ? id : parseInt(id.toString());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la prédiction:', error);
      throw error;
    }
  }

  static async getLatestPrediction(drawName: string): Promise<PredictionResult | undefined> {
    return db.predictions
      .where('drawName')
      .equals(drawName)
      .reverse()
      .sortBy('createdAt')
      .then(results => results[0]);
  }

  static async getPredictionsHistory(drawName: string, limit: number = 10): Promise<PredictionResult[]> {
    return db.predictions
      .where('drawName')
      .equals(drawName)
      .reverse()
      .sortBy('createdAt')
      .then(results => results.slice(0, limit));
  }

  // Gestion des statistiques mises en cache
  static async saveStatistics(stats: Omit<CachedStatistics, 'id'>): Promise<number> {
    // Supprimer les anciennes statistiques pour ce tirage
    await db.statistics.where('drawName').equals(stats.drawName).delete();
    
    const id = await db.statistics.add({
      ...stats,
      updatedAt: new Date()
    });
    return typeof id === 'number' ? id : parseInt(id.toString());
  }

  static async getCachedStatistics(drawName: string): Promise<CachedStatistics | undefined> {
    return db.statistics.where('drawName').equals(drawName).first();
  }

  static async isStatisticsCacheValid(drawName: string, maxAgeHours: number = 24): Promise<boolean> {
    const cached = await this.getCachedStatistics(drawName);
    if (!cached) return false;
    
    const ageMs = Date.now() - cached.updatedAt.getTime();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    
    return ageMs < maxAgeMs;
  }

  // Gestion des préférences utilisateur
  static async saveUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const existing = await db.preferences.get(1);
    if (existing) {
      await db.preferences.update(1, preferences);
    } else {
      await db.preferences.add({ id: 1, ...preferences } as UserPreferences);
    }
  }

  static async getUserPreferences(): Promise<UserPreferences | undefined> {
    return db.preferences.get(1);
  }

  // Utilitaires
  static async clearAllData(): Promise<void> {
    await Promise.all([
      db.drawResults.clear(),
      db.predictions.clear(),
      db.statistics.clear()
    ]);
  }

  static async getStorageStats(): Promise<{
    drawResults: number;
    predictions: number;
    statistics: number;
    totalSize: number;
  }> {
    const [drawResults, predictions, statistics] = await Promise.all([
      db.drawResults.count(),
      db.predictions.count(),
      db.statistics.count()
    ]);

    return {
      drawResults,
      predictions,
      statistics,
      totalSize: drawResults + predictions + statistics
    };
  }

  // Gestion des résultats d'optimisation
  static async saveOptimizationResults(results: OptimizationResults): Promise<void> {
    try {
      await db.optimizations.put(results);
      console.log('💾 Résultats d\'optimisation sauvegardés dans IndexedDB');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des résultats d\'optimisation:', error);
      throw error;
    }
  }

  static async getLatestOptimizationResults(): Promise<OptimizationResults | undefined> {
    try {
      return await db.optimizations.orderBy('timestamp').last();
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats d\'optimisation:', error);
      return undefined;
    }
  }

  static async getAllOptimizationResults(): Promise<OptimizationResults[]> {
    try {
      return await db.optimizations.orderBy('timestamp').reverse().toArray();
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique d\'optimisation:', error);
      return [];
    }
  }

  static async deleteOldOptimizationResults(keepCount: number = 10): Promise<void> {
    try {
      const allResults = await db.optimizations.orderBy('timestamp').reverse().toArray();
      if (allResults.length > keepCount) {
        const toDelete = allResults.slice(keepCount);
        const idsToDelete = toDelete.map(r => r.id!).filter(id => id !== undefined);
        await db.optimizations.bulkDelete(idsToDelete);
        console.log(`🗑️ Supprimé ${idsToDelete.length} anciens résultats d'optimisation`);
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des résultats d\'optimisation:', error);
    }
  }

  // Nettoyage automatique des anciennes données
  static async cleanOldData(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await Promise.all([
      db.predictions.where('createdAt').below(cutoffDate).delete(),
      db.statistics.where('updatedAt').below(cutoffDate).delete(),
      this.deleteOldOptimizationResults(10) // Garder les 10 derniers résultats d'optimisation
    ]);
  }
}