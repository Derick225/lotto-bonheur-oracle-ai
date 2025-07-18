import * as tf from '@tensorflow/tfjs';
import { DrawResult } from './lotteryAPI';

// Configuration des modèles
export interface ModelConfig {
  sequenceLength: number;
  hiddenUnits: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
  validationSplit: number;
  regularization: {
    l1: number;
    l2: number;
    dropout: number;
  };
}

// Interface pour les features engineered
export interface FeatureSet {
  frequencies: number[];
  gaps: number[];
  coOccurrences: number[];
  temporalTrends: number[];
  cyclicalFeatures: number[];
  momentum: number[];
  volatility: number[];
  seasonality: number[];
}

// Interface pour les prédictions avec incertitude
export interface MLPrediction {
  number: number;
  probability: number;
  confidence: number;
  uncertainty: number;
  features: string[];
}

// Interface pour les métriques de performance
export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  logLoss: number;
  calibrationError: number;
  sharpeRatio: number;
}

/**
 * Classe pour l'ingénierie des features
 */
export class FeatureEngineering {
  /**
   * Extrait toutes les features d'un ensemble de résultats
   */
  static extractFeatures(results: DrawResult[], windowSize: number = 50): FeatureSet {
    const recentResults = results.slice(0, windowSize);
    
    return {
      frequencies: this.calculateFrequencies(recentResults),
      gaps: this.calculateGaps(recentResults),
      coOccurrences: this.calculateCoOccurrences(recentResults),
      temporalTrends: this.calculateTemporalTrends(recentResults),
      cyclicalFeatures: this.calculateCyclicalFeatures(recentResults),
      momentum: this.calculateMomentum(recentResults),
      volatility: this.calculateVolatility(recentResults),
      seasonality: this.calculateSeasonality(recentResults)
    };
  }

  /**
   * Calcule les fréquences normalisées pour chaque numéro
   */
  private static calculateFrequencies(results: DrawResult[]): number[] {
    const frequencies = new Array(90).fill(0);
    const totalDraws = results.length;
    
    results.forEach(result => {
      result.gagnants.forEach(num => {
        frequencies[num - 1]++;
      });
    });
    
    // Normaliser par le nombre total de tirages
    return frequencies.map(freq => freq / totalDraws);
  }

  /**
   * Calcule les écarts moyens depuis la dernière apparition
   */
  private static calculateGaps(results: DrawResult[]): number[] {
    const gaps = new Array(90).fill(0);
    const lastSeen = new Array(90).fill(-1);
    
    results.forEach((result, index) => {
      result.gagnants.forEach(num => {
        if (lastSeen[num - 1] !== -1) {
          gaps[num - 1] = index - lastSeen[num - 1];
        }
        lastSeen[num - 1] = index;
      });
    });
    
    // Normaliser les écarts
    const maxGap = Math.max(...gaps);
    return gaps.map(gap => maxGap > 0 ? gap / maxGap : 0);
  }

  /**
   * Calcule les scores de co-occurrence pour chaque numéro
   */
  private static calculateCoOccurrences(results: DrawResult[]): number[] {
    const coOccurrences = new Array(90).fill(0);
    
    results.forEach(result => {
      const numbers = result.gagnants;
      numbers.forEach(num1 => {
        numbers.forEach(num2 => {
          if (num1 !== num2) {
            coOccurrences[num1 - 1]++;
          }
        });
      });
    });
    
    // Normaliser
    const maxCoOcc = Math.max(...coOccurrences);
    return coOccurrences.map(coOcc => maxCoOcc > 0 ? coOcc / maxCoOcc : 0);
  }

  /**
   * Calcule les tendances temporelles (régression linéaire sur les fréquences)
   */
  private static calculateTemporalTrends(results: DrawResult[]): number[] {
    const trends = new Array(90).fill(0);
    const windowSize = Math.min(20, results.length);
    
    for (let num = 1; num <= 90; num++) {
      const recentOccurrences: number[] = [];
      
      for (let i = 0; i < windowSize; i++) {
        const count = results[i]?.gagnants.includes(num) ? 1 : 0;
        recentOccurrences.push(count);
      }
      
      // Calcul de la tendance (pente de régression linéaire)
      const n = recentOccurrences.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = recentOccurrences.reduce((a, b) => a + b, 0);
      const sumXY = recentOccurrences.reduce((sum, y, x) => sum + x * y, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      trends[num - 1] = isNaN(slope) ? 0 : slope;
    }
    
    return trends;
  }

  /**
   * Calcule les features cycliques (jour de la semaine, position dans le mois)
   */
  private static calculateCyclicalFeatures(results: DrawResult[]): number[] {
    const cyclical = new Array(90).fill(0);
    
    results.forEach((result, index) => {
      const date = new Date(result.date);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();
      
      // Encoding cyclique pour le jour de la semaine
      const weekCycle = Math.sin(2 * Math.PI * dayOfWeek / 7);
      const monthCycle = Math.sin(2 * Math.PI * dayOfMonth / 31);
      
      result.gagnants.forEach(num => {
        cyclical[num - 1] += (weekCycle + monthCycle) / 2;
      });
    });
    
    // Normaliser
    const maxCyclical = Math.max(...cyclical.map(Math.abs));
    return cyclical.map(cyc => maxCyclical > 0 ? cyc / maxCyclical : 0);
  }

  /**
   * Calcule le momentum (tendance récente)
   */
  private static calculateMomentum(results: DrawResult[]): number[] {
    const momentum = new Array(90).fill(0);
    const recentWindow = Math.min(10, results.length);
    
    for (let num = 1; num <= 90; num++) {
      let recentCount = 0;
      let weightedSum = 0;
      
      for (let i = 0; i < recentWindow; i++) {
        if (results[i]?.gagnants.includes(num)) {
          const weight = Math.exp(-i * 0.1); // Poids décroissant
          weightedSum += weight;
          recentCount++;
        }
      }
      
      momentum[num - 1] = weightedSum / recentWindow;
    }
    
    return momentum;
  }

  /**
   * Calcule la volatilité (variance des apparitions)
   */
  private static calculateVolatility(results: DrawResult[]): number[] {
    const volatility = new Array(90).fill(0);
    const windowSize = Math.min(30, results.length);
    
    for (let num = 1; num <= 90; num++) {
      const occurrences: number[] = [];
      
      for (let i = 0; i < windowSize; i++) {
        occurrences.push(results[i]?.gagnants.includes(num) ? 1 : 0);
      }
      
      // Calcul de la variance
      const mean = occurrences.reduce((a, b) => a + b, 0) / occurrences.length;
      const variance = occurrences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / occurrences.length;
      
      volatility[num - 1] = Math.sqrt(variance);
    }
    
    return volatility;
  }

  /**
   * Calcule les patterns saisonniers
   */
  private static calculateSeasonality(results: DrawResult[]): number[] {
    const seasonality = new Array(90).fill(0);
    
    results.forEach(result => {
      const date = new Date(result.date);
      const month = date.getMonth();
      const quarter = Math.floor(month / 3);
      
      // Encoding saisonnier
      const seasonalWeight = Math.sin(2 * Math.PI * quarter / 4);
      
      result.gagnants.forEach(num => {
        seasonality[num - 1] += seasonalWeight;
      });
    });
    
    // Normaliser
    const maxSeasonal = Math.max(...seasonality.map(Math.abs));
    return seasonality.map(seas => maxSeasonal > 0 ? seas / maxSeasonal : 0);
  }

  /**
   * Prépare les données pour l'entraînement des modèles
   */
  static prepareTrainingData(results: DrawResult[], sequenceLength: number = 10): {
    features: tf.Tensor;
    labels: tf.Tensor;
    featureNames: string[];
  } {
    const sequences: number[][] = [];
    const labels: number[][] = [];
    
    for (let i = sequenceLength; i < results.length; i++) {
      const sequence = results.slice(i - sequenceLength, i);
      const target = results[i];
      
      // Extraire les features pour la séquence
      const featureSet = this.extractFeatures(sequence, sequenceLength);
      const flatFeatures = [
        ...featureSet.frequencies,
        ...featureSet.gaps,
        ...featureSet.momentum,
        ...featureSet.volatility,
        ...featureSet.temporalTrends
      ];
      
      // Créer le label (one-hot encoding des numéros gagnants)
      const label = new Array(90).fill(0);
      target.gagnants.forEach(num => {
        label[num - 1] = 1;
      });
      
      sequences.push(flatFeatures);
      labels.push(label);
    }
    
    const featureNames = [
      ...Array.from({length: 90}, (_, i) => `freq_${i + 1}`),
      ...Array.from({length: 90}, (_, i) => `gap_${i + 1}`),
      ...Array.from({length: 90}, (_, i) => `momentum_${i + 1}`),
      ...Array.from({length: 90}, (_, i) => `volatility_${i + 1}`),
      ...Array.from({length: 90}, (_, i) => `trend_${i + 1}`)
    ];
    
    return {
      features: tf.tensor2d(sequences),
      labels: tf.tensor2d(labels),
      featureNames
    };
  }
}
