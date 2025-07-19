import { DrawResult } from './lotteryAPI';
import { XGBoostModel } from './xgboostModel';
import { RNNLSTMModel } from './rnnLstmModel';
import { FeatureEngineering, MLPrediction, ModelMetrics } from './mlModels';

/**
 * Configuration pour la validation croisée temporelle
 */
export interface TimeSeriesValidationConfig {
  nFolds: number;
  testSize: number;
  minTrainSize: number;
  stepSize: number;
  purgeGap: number; // Écart entre train et test pour éviter le data leakage
}

/**
 * Résultat de la validation croisée
 */
export interface ValidationResult {
  foldResults: Array<{
    foldIndex: number;
    trainSize: number;
    testSize: number;
    trainPeriod: { start: string; end: string };
    testPeriod: { start: string; end: string };
    metrics: ModelMetrics;
    predictions: MLPrediction[];
    actualResults: DrawResult[];
  }>;
  aggregatedMetrics: ModelMetrics;
  stabilityScore: number;
  convergenceAnalysis: {
    isStable: boolean;
    trendDirection: 'improving' | 'declining' | 'stable';
    volatility: number;
  };
}

/**
 * Service de validation croisée temporelle spécialisé pour les séries temporelles
 */
export class TimeSeriesValidator {
  
  /**
   * Effectue une validation croisée temporelle avancée
   */
  static async performTimeSeriesValidation(
    modelType: 'XGBoost' | 'RNN-LSTM',
    results: DrawResult[],
    config: TimeSeriesValidationConfig = {
      nFolds: 5,
      testSize: 0.15,
      minTrainSize: 50,
      stepSize: 10,
      purgeGap: 5
    }
  ): Promise<ValidationResult> {
    console.log(`🔍 Validation croisée temporelle pour ${modelType}...`);
    
    const folds = this.createTimeSeriesFolds(results, config);
    const foldResults: ValidationResult['foldResults'] = [];
    
    for (let i = 0; i < folds.length; i++) {
      const fold = folds[i];
      console.log(`  Fold ${i + 1}/${folds.length} - Train: ${fold.train.length}, Test: ${fold.test.length}`);
      
      try {
        // Créer et entraîner le modèle pour ce fold
        let model: XGBoostModel | RNNLSTMModel;
        
        if (modelType === 'XGBoost') {
          model = new XGBoostModel({
            sequenceLength: 15,
            hiddenUnits: 128,
            learningRate: 0.001,
            batchSize: 32,
            epochs: 50, // Moins d'époques pour la validation
            validationSplit: 0.2,
            regularization: { l1: 0.01, l2: 0.01, dropout: 0.3 }
          });
        } else {
          model = new RNNLSTMModel({
            sequenceLength: 20,
            hiddenUnits: 256,
            learningRate: 0.0005,
            batchSize: 16,
            epochs: 80,
            validationSplit: 0.2,
            regularization: { l1: 0.001, l2: 0.001, dropout: 0.4 }
          });
        }
        
        // Entraîner le modèle
        const metrics = await model.train(fold.train);
        
        // Faire des prédictions sur le test set
        const predictions = await model.predict(fold.test);
        
        // Calculer les métriques avancées
        const advancedMetrics = FeatureEngineering.calculateAdvancedMetrics(
          predictions,
          fold.test,
          fold.test.length
        );
        
        // Combiner les métriques
        const combinedMetrics: ModelMetrics = {
          ...metrics,
          ...advancedMetrics
        };
        
        foldResults.push({
          foldIndex: i,
          trainSize: fold.train.length,
          testSize: fold.test.length,
          trainPeriod: {
            start: fold.train[fold.train.length - 1]?.date || '',
            end: fold.train[0]?.date || ''
          },
          testPeriod: {
            start: fold.test[fold.test.length - 1]?.date || '',
            end: fold.test[0]?.date || ''
          },
          metrics: combinedMetrics,
          predictions,
          actualResults: fold.test
        });
        
        // Nettoyer le modèle
        model.dispose();
        
      } catch (error) {
        console.error(`Erreur dans le fold ${i + 1}:`, error);
        // Continuer avec les autres folds
      }
    }
    
    // Calculer les métriques agrégées
    const aggregatedMetrics = this.aggregateMetrics(foldResults);
    
    // Analyser la stabilité
    const stabilityScore = this.calculateStabilityScore(foldResults);
    
    // Analyser la convergence
    const convergenceAnalysis = this.analyzeConvergence(foldResults);
    
    console.log(`✅ Validation terminée. Score de stabilité: ${stabilityScore.toFixed(3)}`);
    
    return {
      foldResults,
      aggregatedMetrics,
      stabilityScore,
      convergenceAnalysis
    };
  }
  
  /**
   * Crée les folds pour la validation croisée temporelle
   */
  private static createTimeSeriesFolds(
    results: DrawResult[],
    config: TimeSeriesValidationConfig
  ): Array<{ train: DrawResult[]; test: DrawResult[] }> {
    const folds: Array<{ train: DrawResult[]; test: DrawResult[] }> = [];
    const totalSize = results.length;
    
    // Calculer la taille du test set
    const testSize = Math.floor(totalSize * config.testSize);
    
    // Créer les folds en avançant dans le temps
    for (let i = 0; i < config.nFolds; i++) {
      const testStart = config.minTrainSize + i * config.stepSize;
      const testEnd = testStart + testSize;
      
      if (testEnd > totalSize) break;
      
      // Train set: du début jusqu'à testStart - purgeGap
      const trainEnd = testStart - config.purgeGap;
      if (trainEnd < config.minTrainSize) continue;
      
      const train = results.slice(0, trainEnd);
      const test = results.slice(testStart, testEnd);
      
      if (train.length >= config.minTrainSize && test.length > 0) {
        folds.push({ train, test });
      }
    }
    
    return folds;
  }
  
  /**
   * Agrège les métriques de tous les folds
   */
  private static aggregateMetrics(foldResults: ValidationResult['foldResults']): ModelMetrics {
    if (foldResults.length === 0) {
      return {
        accuracy: 0, precision: 0, recall: 0, f1Score: 0,
        logLoss: Infinity, calibrationError: 1, sharpeRatio: 0,
        hitRate: 0, coverageRate: 0, expectedValue: 0,
        consistencyScore: 0, diversityScore: 0, temporalStability: 0,
        uncertaintyCalibration: 0
      };
    }
    
    const metrics = foldResults.map(fold => fold.metrics);
    const weights = foldResults.map(fold => fold.testSize);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    // Moyenne pondérée des métriques
    const aggregated: ModelMetrics = {
      accuracy: 0, precision: 0, recall: 0, f1Score: 0,
      logLoss: 0, calibrationError: 0, sharpeRatio: 0,
      hitRate: 0, coverageRate: 0, expectedValue: 0,
      consistencyScore: 0, diversityScore: 0, temporalStability: 0,
      uncertaintyCalibration: 0
    };
    
    Object.keys(aggregated).forEach(key => {
      const metricKey = key as keyof ModelMetrics;
      let weightedSum = 0;
      
      metrics.forEach((metric, index) => {
        const value = metric[metricKey];
        if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
          weightedSum += value * weights[index];
        }
      });
      
      aggregated[metricKey] = totalWeight > 0 ? weightedSum / totalWeight : 0;
    });
    
    return aggregated;
  }
  
  /**
   * Calcule un score de stabilité basé sur la variance des métriques
   */
  private static calculateStabilityScore(foldResults: ValidationResult['foldResults']): number {
    if (foldResults.length < 2) return 0;
    
    const keyMetrics = ['hitRate', 'coverageRate', 'f1Score', 'expectedValue'];
    let totalStability = 0;
    
    keyMetrics.forEach(metricName => {
      const values = foldResults.map(fold => 
        fold.metrics[metricName as keyof ModelMetrics] as number
      ).filter(val => !isNaN(val) && isFinite(val));
      
      if (values.length > 1) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const cv = mean > 0 ? Math.sqrt(variance) / mean : 1; // Coefficient de variation
        
        // Stabilité = 1 - coefficient de variation normalisé
        totalStability += Math.max(0, 1 - cv);
      }
    });
    
    return totalStability / keyMetrics.length;
  }
  
  /**
   * Analyse la convergence des performances à travers les folds
   */
  private static analyzeConvergence(foldResults: ValidationResult['foldResults']): {
    isStable: boolean;
    trendDirection: 'improving' | 'declining' | 'stable';
    volatility: number;
  } {
    if (foldResults.length < 3) {
      return { isStable: false, trendDirection: 'stable', volatility: 1 };
    }
    
    // Utiliser le F1-Score comme métrique principale pour l'analyse de tendance
    const f1Scores = foldResults.map(fold => fold.metrics.f1Score);
    
    // Calculer la tendance (régression linéaire simple)
    const n = f1Scores.length;
    const xMean = (n - 1) / 2;
    const yMean = f1Scores.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    f1Scores.forEach((y, x) => {
      numerator += (x - xMean) * (y - yMean);
      denominator += Math.pow(x - xMean, 2);
    });
    
    const slope = denominator > 0 ? numerator / denominator : 0;
    
    // Déterminer la direction de la tendance
    let trendDirection: 'improving' | 'declining' | 'stable';
    if (Math.abs(slope) < 0.01) {
      trendDirection = 'stable';
    } else if (slope > 0) {
      trendDirection = 'improving';
    } else {
      trendDirection = 'declining';
    }
    
    // Calculer la volatilité
    const variance = f1Scores.reduce((sum, score) => sum + Math.pow(score - yMean, 2), 0) / n;
    const volatility = Math.sqrt(variance);
    
    // Déterminer la stabilité
    const isStable = volatility < 0.05 && Math.abs(slope) < 0.02;
    
    return {
      isStable,
      trendDirection,
      volatility
    };
  }
  
  /**
   * Génère un rapport de validation détaillé
   */
  static generateValidationReport(result: ValidationResult): string {
    const { aggregatedMetrics, stabilityScore, convergenceAnalysis, foldResults } = result;
    
    let report = `
=== RAPPORT DE VALIDATION CROISÉE TEMPORELLE ===

📊 MÉTRIQUES AGRÉGÉES:
- Hit Rate: ${(aggregatedMetrics.hitRate * 100).toFixed(1)}%
- Coverage Rate: ${(aggregatedMetrics.coverageRate * 100).toFixed(1)}%
- F1-Score: ${aggregatedMetrics.f1Score.toFixed(3)}
- Valeur Espérée: ${aggregatedMetrics.expectedValue.toFixed(3)}
- Précision: ${aggregatedMetrics.precision.toFixed(3)}
- Rappel: ${aggregatedMetrics.recall.toFixed(3)}

🎯 STABILITÉ:
- Score de Stabilité: ${stabilityScore.toFixed(3)}
- Tendance: ${convergenceAnalysis.trendDirection}
- Volatilité: ${convergenceAnalysis.volatility.toFixed(3)}
- Convergence: ${convergenceAnalysis.isStable ? 'Stable' : 'Instable'}

📈 DÉTAILS PAR FOLD:
`;
    
    foldResults.forEach((fold, index) => {
      report += `
Fold ${index + 1}:
  - Période d'entraînement: ${fold.trainPeriod.end} → ${fold.trainPeriod.start}
  - Période de test: ${fold.testPeriod.end} → ${fold.testPeriod.start}
  - Hit Rate: ${(fold.metrics.hitRate * 100).toFixed(1)}%
  - F1-Score: ${fold.metrics.f1Score.toFixed(3)}
`;
    });
    
    return report;
  }
}
