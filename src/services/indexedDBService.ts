import Dexie, { Table } from 'dexie';
import { DrawResult } from './lotteryAPI';

// Interface pour les prédictions
export interface PredictionResult {
  id?: number;
  drawName: string;
  date: string;
  numbers: Array<{ number: number; probability: number }>;
  confidence: number;
  algorithm: 'XGBoost' | 'RNN-LSTM' | 'RandomForest' | 'Hybrid';
  features: string[];
  createdAt: Date;
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

class LotteryDatabase extends Dexie {
  drawResults!: Table<DrawResult>;
  predictions!: Table<PredictionResult>;
  statistics!: Table<CachedStatistics>;
  preferences!: Table<UserPreferences>;

  constructor() {
    super('LotteryAnalysisDB');
    this.version(1).stores({
      drawResults: '++id, draw_name, date, gagnants, machine, day, time',
      predictions: '++id, drawName, date, numbers, confidence, algorithm, features, createdAt',
      statistics: '++id, drawName, frequency, lastAppearance, trends, coOccurrences, updatedAt',
      preferences: 'id, favoriteDraws, notificationsEnabled, theme, language, lastViewedDraw'
    });
  }
}

export const db = new LotteryDatabase();

// Service pour gérer les données hors ligne
export class IndexedDBService {
  // Gestion des résultats de tirages
  static async saveDrawResults(results: DrawResult[]): Promise<void> {
    await db.drawResults.bulkPut(results);
  }

  static async getDrawResults(drawName?: string, limit?: number): Promise<DrawResult[]> {
    let collection = db.drawResults.orderBy('date').reverse();
    
    if (drawName) {
      collection = collection.filter(result => result.draw_name === drawName);
    }
    
    if (limit) {
      collection = collection.limit(limit);
    }
    
    return collection.toArray();
  }

  static async getLatestDrawResult(drawName: string): Promise<DrawResult | undefined> {
    return db.drawResults
      .where('draw_name')
      .equals(drawName)
      .reverse()
      .sortBy('date')
      .then(results => results[0]);
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

  // Gestion des prédictions
  static async savePrediction(prediction: Omit<PredictionResult, 'id'>): Promise<number> {
    const id = await db.predictions.add({
      ...prediction,
      createdAt: new Date()
    });
    return typeof id === 'number' ? id : parseInt(id.toString());
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

  // Nettoyage automatique des anciennes données
  static async cleanOldData(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    await Promise.all([
      db.predictions.where('createdAt').below(cutoffDate).delete(),
      db.statistics.where('updatedAt').below(cutoffDate).delete()
    ]);
  }
}