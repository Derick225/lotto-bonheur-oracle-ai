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

// Interface pour les métriques de performance avancées
export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  logLoss: number;
  calibrationError: number;
  sharpeRatio: number;
  // Nouvelles métriques spécialisées pour la loterie
  hitRate: number; // Pourcentage de numéros prédits qui sortent effectivement
  coverageRate: number; // Pourcentage de numéros sortants qui étaient prédits
  expectedValue: number; // Valeur espérée des prédictions
  consistencyScore: number; // Cohérence des prédictions dans le temps
  diversityScore: number; // Diversité des prédictions (évite la sur-concentration)
  temporalStability: number; // Stabilité des prédictions dans le temps
  uncertaintyCalibration: number; // Qualité de la calibration de l'incertitude
}

/**
 * Classe pour l'ingénierie des features
 */
export class FeatureEngineering {
  /**
   * Extrait toutes les features enrichies d'un ensemble de résultats
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
   * Calcule des features de corrélation entre numéros
   */
  static calculateCorrelationFeatures(results: DrawResult[]): number[] {
    const correlations = new Array(90).fill(0);
    const coOccurrenceMatrix = new Array(90).fill(null).map(() => new Array(90).fill(0));

    // Construire la matrice de co-occurrence
    results.forEach(result => {
      for (let i = 0; i < result.gagnants.length; i++) {
        for (let j = i + 1; j < result.gagnants.length; j++) {
          const num1 = result.gagnants[i] - 1;
          const num2 = result.gagnants[j] - 1;
          coOccurrenceMatrix[num1][num2]++;
          coOccurrenceMatrix[num2][num1]++;
        }
      }
    });

    // Calculer les corrélations moyennes pour chaque numéro
    for (let i = 0; i < 90; i++) {
      let totalCorrelation = 0;
      let count = 0;

      for (let j = 0; j < 90; j++) {
        if (i !== j) {
          totalCorrelation += coOccurrenceMatrix[i][j];
          count++;
        }
      }

      correlations[i] = count > 0 ? totalCorrelation / count : 0;
    }

    // Normaliser
    const maxCorr = Math.max(...correlations);
    return correlations.map(corr => maxCorr > 0 ? corr / maxCorr : 0);
  }

  /**
   * Calcule des features de distribution (parité, somme, écart-type)
   */
  static calculateDistributionFeatures(results: DrawResult[]): number[] {
    const features = new Array(90).fill(0);

    results.forEach((result, index) => {
      const timeWeight = Math.exp(-index * 0.02);

      // Analyser la distribution des numéros dans ce tirage
      const numbers = result.gagnants.sort((a, b) => a - b);
      const sum = numbers.reduce((a, b) => a + b, 0);
      const mean = sum / numbers.length;
      const variance = numbers.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / numbers.length;
      const stdDev = Math.sqrt(variance);

      // Parité (pairs vs impairs)
      const evenCount = numbers.filter(n => n % 2 === 0).length;
      const parityRatio = evenCount / numbers.length;

      // Distribution par tranches
      const ranges = [
        [1, 18], [19, 36], [37, 54], [55, 72], [73, 90]
      ];
      const rangeDistribution = ranges.map(([min, max]) =>
        numbers.filter(n => n >= min && n <= max).length / numbers.length
      );

      // Appliquer ces features à chaque numéro du tirage
      numbers.forEach(num => {
        const idx = num - 1;
        features[idx] += (
          (sum / 450) * 0.3 +           // Somme normalisée
          (stdDev / 30) * 0.2 +         // Écart-type normalisé
          parityRatio * 0.2 +           // Ratio de parité
          rangeDistribution[Math.floor((num - 1) / 18)] * 0.3  // Distribution par tranche
        ) * timeWeight;
      });
    });

    // Normaliser
    const maxFeature = Math.max(...features.map(Math.abs));
    return features.map(feat => maxFeature > 0 ? feat / maxFeature : 0);
  }

  /**
   * Calcule des features de séquences et patterns
   */
  static calculateSequenceFeatures(results: DrawResult[]): number[] {
    const features = new Array(90).fill(0);

    for (let i = 1; i < results.length; i++) {
      const current = results[i].gagnants;
      const previous = results[i - 1].gagnants;
      const timeWeight = Math.exp(-i * 0.03);

      // Analyser les patterns de répétition
      const repeated = current.filter(num => previous.includes(num));
      const consecutive = this.findConsecutiveNumbers(current);
      const gaps = this.calculateNumberGaps(current);

      current.forEach(num => {
        const idx = num - 1;

        // Score basé sur les patterns
        let patternScore = 0;

        // Bonus pour les répétitions du tirage précédent
        if (repeated.includes(num)) {
          patternScore += 0.3;
        }

        // Bonus pour les numéros consécutifs
        if (consecutive.includes(num)) {
          patternScore += 0.2;
        }

        // Score basé sur les écarts
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const gapVariance = gaps.reduce((acc, gap) => acc + Math.pow(gap - avgGap, 2), 0) / gaps.length;
        patternScore += (1 - Math.min(1, gapVariance / 100)) * 0.5;

        features[idx] += patternScore * timeWeight;
      });
    }

    // Normaliser
    const maxFeature = Math.max(...features.map(Math.abs));
    return features.map(feat => maxFeature > 0 ? feat / maxFeature : 0);
  }

  /**
   * Trouve les numéros consécutifs dans un tirage
   */
  private static findConsecutiveNumbers(numbers: number[]): number[] {
    const sorted = [...numbers].sort((a, b) => a - b);
    const consecutive: number[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] === 1) {
        consecutive.push(sorted[i], sorted[i + 1]);
      }
    }

    return [...new Set(consecutive)];
  }

  /**
   * Calcule les écarts entre numéros dans un tirage
   */
  private static calculateNumberGaps(numbers: number[]): number[] {
    const sorted = [...numbers].sort((a, b) => a - b);
    const gaps: number[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      gaps.push(sorted[i + 1] - sorted[i]);
    }

    return gaps;
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
   * Calcule les features cycliques avancées (jour, semaine, mois, saison)
   */
  private static calculateCyclicalFeatures(results: DrawResult[]): number[] {
    const cyclical = new Array(90).fill(0);

    results.forEach((result, index) => {
      const date = new Date(result.date);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();
      const month = date.getMonth();
      const weekOfYear = this.getWeekOfYear(date);

      // Encodings cycliques multiples
      const weekCycle = Math.sin(2 * Math.PI * dayOfWeek / 7);
      const monthCycle = Math.sin(2 * Math.PI * dayOfMonth / 31);
      const seasonCycle = Math.sin(2 * Math.PI * month / 12);
      const yearCycle = Math.sin(2 * Math.PI * weekOfYear / 52);

      // Poids temporel (plus récent = plus important)
      const timeWeight = Math.exp(-index * 0.05);

      result.gagnants.forEach(num => {
        const combinedCycle = (weekCycle + monthCycle + seasonCycle + yearCycle) / 4;
        cyclical[num - 1] += combinedCycle * timeWeight;
      });
    });

    // Normaliser
    const maxCyclical = Math.max(...cyclical.map(Math.abs));
    return cyclical.map(cyc => maxCyclical > 0 ? cyc / maxCyclical : 0);
  }

  /**
   * Calcule la semaine de l'année
   */
  private static getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek);
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
      
      // Extraire toutes les features enrichies pour la séquence
      const featureSet = this.extractFeatures(sequence, sequenceLength);
      const flatFeatures = [
        ...featureSet.frequencies,
        ...featureSet.gaps,
        ...featureSet.momentum,
        ...featureSet.volatility,
        ...featureSet.temporalTrends,
        ...featureSet.cyclicalFeatures,
        ...featureSet.coOccurrences,
        ...featureSet.seasonality
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
      ...Array.from({length: 90}, (_, i) => `trend_${i + 1}`),
      ...Array.from({length: 90}, (_, i) => `cyclical_${i + 1}`),
      ...Array.from({length: 90}, (_, i) => `cooccur_${i + 1}`),
      ...Array.from({length: 90}, (_, i) => `seasonal_${i + 1}`)
    ];
    
    return {
      features: tf.tensor2d(sequences),
      labels: tf.tensor2d(labels),
      featureNames
    };
  }

  /**
   * Effectue une validation croisée temporelle
   */
  static performTimeSeriesCrossValidation(
    results: DrawResult[],
    nFolds: number = 5,
    testSize: number = 0.2
  ): Array<{ train: DrawResult[]; test: DrawResult[] }> {
    const folds: Array<{ train: DrawResult[]; test: DrawResult[] }> = [];
    const totalSize = results.length;
    const foldSize = Math.floor(totalSize / nFolds);

    for (let i = 0; i < nFolds; i++) {
      const testStart = i * foldSize;
      const testEnd = Math.min(testStart + Math.floor(foldSize * testSize), totalSize);
      const trainEnd = testStart;

      if (trainEnd < 30) continue; // Minimum de données d'entraînement

      const train = results.slice(0, trainEnd);
      const test = results.slice(testStart, testEnd);

      if (test.length > 0) {
        folds.push({ train, test });
      }
    }

    return folds;
  }

  /**
   * Calcule des métriques avancées spécialisées pour la loterie
   */
  static calculateAdvancedMetrics(
    predictions: MLPrediction[],
    actualResults: DrawResult[],
    timeWindow: number = 10
  ): Partial<ModelMetrics> {
    const recentResults = actualResults.slice(0, timeWindow);
    const topPredictions = predictions.slice(0, 5); // Top 5 prédictions

    // Hit Rate: pourcentage de prédictions qui sortent effectivement
    let hits = 0;
    let totalPredictions = 0;

    recentResults.forEach(result => {
      topPredictions.forEach(pred => {
        totalPredictions++;
        if (result.gagnants.includes(pred.number)) {
          hits++;
        }
      });
    });

    const hitRate = totalPredictions > 0 ? hits / totalPredictions : 0;

    // Coverage Rate: pourcentage de numéros sortants qui étaient prédits
    let covered = 0;
    let totalWinning = 0;

    recentResults.forEach(result => {
      result.gagnants.forEach(winningNum => {
        totalWinning++;
        if (topPredictions.some(pred => pred.number === winningNum)) {
          covered++;
        }
      });
    });

    const coverageRate = totalWinning > 0 ? covered / totalWinning : 0;

    // Diversity Score: évite la sur-concentration sur certains numéros
    const numberCounts = new Map<number, number>();
    topPredictions.forEach(pred => {
      numberCounts.set(pred.number, (numberCounts.get(pred.number) || 0) + 1);
    });

    const uniqueNumbers = numberCounts.size;
    const maxCount = Math.max(...Array.from(numberCounts.values()));
    const diversityScore = uniqueNumbers / Math.max(1, maxCount);

    // Expected Value: valeur espérée basée sur les probabilités
    const expectedValue = topPredictions.reduce((sum, pred) =>
      sum + pred.probability * pred.confidence, 0
    ) / topPredictions.length;

    // Consistency Score: cohérence des prédictions dans le temps
    const consistencyScore = this.calculateConsistencyScore(predictions, recentResults);

    return {
      hitRate,
      coverageRate,
      diversityScore,
      expectedValue,
      consistencyScore,
      temporalStability: this.calculateTemporalStability(predictions),
      uncertaintyCalibration: this.calculateUncertaintyCalibration(predictions, recentResults)
    };
  }

  /**
   * Calcule le score de cohérence des prédictions
   */
  private static calculateConsistencyScore(
    predictions: MLPrediction[],
    results: DrawResult[]
  ): number {
    if (predictions.length < 2) return 0;

    // Mesurer la variance des probabilités pour les mêmes numéros
    const numberProbabilities = new Map<number, number[]>();

    predictions.forEach(pred => {
      if (!numberProbabilities.has(pred.number)) {
        numberProbabilities.set(pred.number, []);
      }
      numberProbabilities.get(pred.number)!.push(pred.probability);
    });

    let totalVariance = 0;
    let count = 0;

    numberProbabilities.forEach(probs => {
      if (probs.length > 1) {
        const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
        const variance = probs.reduce((sum, prob) => sum + Math.pow(prob - mean, 2), 0) / probs.length;
        totalVariance += variance;
        count++;
      }
    });

    return count > 0 ? 1 - (totalVariance / count) : 1;
  }

  /**
   * Calcule la stabilité temporelle des prédictions
   */
  private static calculateTemporalStability(predictions: MLPrediction[]): number {
    if (predictions.length < 5) return 0;

    // Analyser la stabilité des top prédictions dans le temps
    const topNumbers = predictions.slice(0, 5).map(p => p.number);
    const stabilityWindow = Math.min(10, predictions.length);

    let stabilityScore = 0;
    for (let i = 0; i < stabilityWindow - 1; i++) {
      const current = predictions.slice(i * 5, (i + 1) * 5).map(p => p.number);
      const next = predictions.slice((i + 1) * 5, (i + 2) * 5).map(p => p.number);

      const overlap = current.filter(num => next.includes(num)).length;
      stabilityScore += overlap / 5;
    }

    return stabilityScore / (stabilityWindow - 1);
  }

  /**
   * Calcule la calibration de l'incertitude
   */
  private static calculateUncertaintyCalibration(
    predictions: MLPrediction[],
    results: DrawResult[]
  ): number {
    if (predictions.length === 0 || results.length === 0) return 0;

    // Grouper les prédictions par niveau d'incertitude
    const uncertaintyBins = [0.1, 0.3, 0.5, 0.7, 0.9];
    let calibrationError = 0;

    uncertaintyBins.forEach(threshold => {
      const binnedPredictions = predictions.filter(p => p.uncertainty <= threshold);
      if (binnedPredictions.length === 0) return;

      // Calculer la précision réelle pour ce bin
      let correctPredictions = 0;
      binnedPredictions.forEach(pred => {
        const isCorrect = results.some(result =>
          result.gagnants.includes(pred.number)
        );
        if (isCorrect) correctPredictions++;
      });

      const actualAccuracy = correctPredictions / binnedPredictions.length;
      const expectedAccuracy = 1 - threshold; // Plus l'incertitude est faible, plus on s'attend à une bonne précision

      calibrationError += Math.abs(actualAccuracy - expectedAccuracy);
    });

    return 1 - (calibrationError / uncertaintyBins.length);
  }
}
