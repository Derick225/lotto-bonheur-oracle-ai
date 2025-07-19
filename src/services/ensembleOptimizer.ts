import * as tf from '@tensorflow/tfjs';
import { DrawResult } from './lotteryAPI';
import { XGBoostModel } from './xgboostModel';
import { RNNLSTMModel } from './rnnLstmModel';
import { FeatureEngineering, MLPrediction, ModelMetrics, ModelConfig } from './mlModels';

/**
 * Configuration pour l'optimisation des hyperparamètres
 */
export interface HyperparameterConfig {
  sequenceLength: number[];
  hiddenUnits: number[];
  learningRate: number[];
  batchSize: number[];
  epochs: number[];
  regularization: {
    l1: number[];
    l2: number[];
    dropout: number[];
  };
}

/**
 * Résultat de l'optimisation des hyperparamètres
 */
export interface OptimizationResult {
  bestConfig: ModelConfig;
  bestScore: number;
  allResults: Array<{
    config: ModelConfig;
    score: number;
    metrics: ModelMetrics;
  }>;
  convergenceHistory: number[];
}

/**
 * Configuration pour l'ensemble adaptatif
 */
export interface EnsembleConfig {
  models: string[];
  weightingStrategy: 'static' | 'dynamic' | 'adaptive' | 'bayesian';
  performanceWindow: number;
  rebalanceFrequency: number;
  diversityWeight: number;
  stabilityWeight: number;
}

/**
 * Service d'optimisation avancée pour l'ensemble de modèles
 */
export class EnsembleOptimizer {
  private static optimizationHistory: Map<string, OptimizationResult> = new Map();
  private static ensembleWeights: Map<string, number> = new Map();
  private static performanceHistory: Array<{
    timestamp: Date;
    modelPerformances: Map<string, number>;
    ensemblePerformance: number;
  }> = [];

  /**
   * Optimise les hyperparamètres d'un modèle avec recherche bayésienne
   */
  static async optimizeHyperparameters(
    modelType: 'XGBoost' | 'RNN-LSTM',
    results: DrawResult[],
    searchSpace: HyperparameterConfig,
    maxIterations: number = 20
  ): Promise<OptimizationResult> {
    console.log(`🔍 Optimisation des hyperparamètres pour ${modelType}...`);
    
    const allResults: Array<{
      config: ModelConfig;
      score: number;
      metrics: ModelMetrics;
    }> = [];
    
    const convergenceHistory: number[] = [];
    let bestScore = -Infinity;
    let bestConfig: ModelConfig | null = null;

    // Validation croisée temporelle pour l'évaluation
    const folds = FeatureEngineering.performTimeSeriesCrossValidation(results, 3, 0.2);
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      console.log(`  Itération ${iteration + 1}/${maxIterations}`);
      
      // Générer une configuration candidate (recherche bayésienne simplifiée)
      const candidateConfig = this.generateCandidateConfig(
        searchSpace,
        allResults,
        iteration
      );

      // Évaluer la configuration sur tous les folds
      let totalScore = 0;
      let totalMetrics: Partial<ModelMetrics> = {};
      
      for (const fold of folds) {
        const { score, metrics } = await this.evaluateConfiguration(
          modelType,
          candidateConfig,
          fold.train,
          fold.test
        );
        
        totalScore += score;
        
        // Accumuler les métriques
        Object.keys(metrics).forEach(key => {
          const metricKey = key as keyof ModelMetrics;
          totalMetrics[metricKey] = (totalMetrics[metricKey] || 0) + metrics[metricKey]!;
        });
      }
      
      // Moyenne des scores et métriques
      const avgScore = totalScore / folds.length;
      const avgMetrics: ModelMetrics = {} as ModelMetrics;
      Object.keys(totalMetrics).forEach(key => {
        const metricKey = key as keyof ModelMetrics;
        avgMetrics[metricKey] = totalMetrics[metricKey]! / folds.length;
      });
      
      allResults.push({
        config: candidateConfig,
        score: avgScore,
        metrics: avgMetrics
      });
      
      convergenceHistory.push(avgScore);
      
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestConfig = candidateConfig;
        console.log(`    ✨ Nouveau meilleur score: ${avgScore.toFixed(4)}`);
      }
    }

    const result: OptimizationResult = {
      bestConfig: bestConfig!,
      bestScore,
      allResults,
      convergenceHistory
    };

    this.optimizationHistory.set(modelType, result);
    console.log(`✅ Optimisation terminée. Meilleur score: ${bestScore.toFixed(4)}`);
    
    return result;
  }

  /**
   * Génère une configuration candidate pour l'optimisation
   */
  private static generateCandidateConfig(
    searchSpace: HyperparameterConfig,
    previousResults: Array<{ config: ModelConfig; score: number; metrics: ModelMetrics }>,
    iteration: number
  ): ModelConfig {
    // Pour les premières itérations, exploration aléatoire
    if (iteration < 5 || previousResults.length === 0) {
      return {
        sequenceLength: this.randomChoice(searchSpace.sequenceLength),
        hiddenUnits: this.randomChoice(searchSpace.hiddenUnits),
        learningRate: this.randomChoice(searchSpace.learningRate),
        batchSize: this.randomChoice(searchSpace.batchSize),
        epochs: this.randomChoice(searchSpace.epochs),
        validationSplit: 0.2,
        regularization: {
          l1: this.randomChoice(searchSpace.regularization.l1),
          l2: this.randomChoice(searchSpace.regularization.l2),
          dropout: this.randomChoice(searchSpace.regularization.dropout)
        }
      };
    }

    // Recherche bayésienne simplifiée : exploitation des bonnes configurations
    const topConfigs = previousResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    const baseConfig = topConfigs[0].config;
    
    // Perturbation autour de la meilleure configuration
    return {
      sequenceLength: this.perturbValue(baseConfig.sequenceLength, searchSpace.sequenceLength),
      hiddenUnits: this.perturbValue(baseConfig.hiddenUnits, searchSpace.hiddenUnits),
      learningRate: this.perturbValue(baseConfig.learningRate, searchSpace.learningRate),
      batchSize: this.perturbValue(baseConfig.batchSize, searchSpace.batchSize),
      epochs: this.perturbValue(baseConfig.epochs, searchSpace.epochs),
      validationSplit: 0.2,
      regularization: {
        l1: this.perturbValue(baseConfig.regularization.l1, searchSpace.regularization.l1),
        l2: this.perturbValue(baseConfig.regularization.l2, searchSpace.regularization.l2),
        dropout: this.perturbValue(baseConfig.regularization.dropout, searchSpace.regularization.dropout)
      }
    };
  }

  /**
   * Évalue une configuration sur un fold de validation
   */
  private static async evaluateConfiguration(
    modelType: 'XGBoost' | 'RNN-LSTM',
    config: ModelConfig,
    trainData: DrawResult[],
    testData: DrawResult[]
  ): Promise<{ score: number; metrics: ModelMetrics }> {
    try {
      let model: XGBoostModel | RNNLSTMModel;
      
      if (modelType === 'XGBoost') {
        model = new XGBoostModel(config);
      } else {
        model = new RNNLSTMModel(config);
      }

      // Entraîner le modèle
      const metrics = await model.train(trainData);
      
      // Évaluer sur les données de test
      const predictions = await model.predict(testData);
      
      // Calculer des métriques avancées spécifiques à la loterie
      const advancedMetrics = FeatureEngineering.calculateAdvancedMetrics(
        predictions,
        testData,
        testData.length
      );
      
      // Score composite combinant plusieurs métriques
      const score = this.calculateCompositeScore(metrics, advancedMetrics);
      
      return { score, metrics };
    } catch (error) {
      console.warn(`Erreur lors de l'évaluation de la configuration:`, error);
      return { 
        score: -1, 
        metrics: {
          accuracy: 0, precision: 0, recall: 0, f1Score: 0,
          logLoss: Infinity, calibrationError: 1, sharpeRatio: 0,
          hitRate: 0, coverageRate: 0, expectedValue: 0,
          consistencyScore: 0, diversityScore: 0, temporalStability: 0,
          uncertaintyCalibration: 0
        }
      };
    }
  }

  /**
   * Calcule un score composite pour l'optimisation
   */
  private static calculateCompositeScore(
    basicMetrics: ModelMetrics,
    advancedMetrics: Partial<ModelMetrics>
  ): number {
    const weights = {
      hitRate: 0.3,
      coverageRate: 0.2,
      f1Score: 0.15,
      expectedValue: 0.1,
      consistencyScore: 0.1,
      diversityScore: 0.05,
      temporalStability: 0.05,
      uncertaintyCalibration: 0.05
    };

    let score = 0;
    score += (advancedMetrics.hitRate || 0) * weights.hitRate;
    score += (advancedMetrics.coverageRate || 0) * weights.coverageRate;
    score += basicMetrics.f1Score * weights.f1Score;
    score += (advancedMetrics.expectedValue || 0) * weights.expectedValue;
    score += (advancedMetrics.consistencyScore || 0) * weights.consistencyScore;
    score += (advancedMetrics.diversityScore || 0) * weights.diversityScore;
    score += (advancedMetrics.temporalStability || 0) * weights.temporalStability;
    score += (advancedMetrics.uncertaintyCalibration || 0) * weights.uncertaintyCalibration;

    return score;
  }

  /**
   * Utilitaires pour la génération de configurations
   */
  private static randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private static perturbValue<T>(currentValue: T, possibleValues: T[]): T {
    const currentIndex = possibleValues.indexOf(currentValue);
    if (currentIndex === -1) return this.randomChoice(possibleValues);
    
    // Perturbation gaussienne autour de l'index actuel
    const perturbation = Math.round((Math.random() - 0.5) * 2);
    const newIndex = Math.max(0, Math.min(possibleValues.length - 1, currentIndex + perturbation));
    
    return possibleValues[newIndex];
  }

  /**
   * Optimise les poids de l'ensemble de manière adaptative
   */
  static async optimizeEnsembleWeights(
    models: Array<{ name: string; predictions: MLPrediction[] }>,
    actualResults: DrawResult[],
    config: EnsembleConfig
  ): Promise<Map<string, number>> {
    console.log('🎯 Optimisation des poids d\'ensemble...');

    const { weightingStrategy, performanceWindow, diversityWeight, stabilityWeight } = config;

    switch (weightingStrategy) {
      case 'dynamic':
        return this.calculateDynamicWeights(models, actualResults, performanceWindow);

      case 'adaptive':
        return this.calculateAdaptiveWeights(models, actualResults, config);

      case 'bayesian':
        return this.calculateBayesianWeights(models, actualResults, performanceWindow);

      default:
        return this.calculateStaticWeights(models);
    }
  }

  /**
   * Calcule des poids dynamiques basés sur la performance récente
   */
  private static calculateDynamicWeights(
    models: Array<{ name: string; predictions: MLPrediction[] }>,
    actualResults: DrawResult[],
    window: number
  ): Map<string, number> {
    const weights = new Map<string, number>();
    const recentResults = actualResults.slice(0, window);

    // Calculer la performance de chaque modèle
    const performances = new Map<string, number>();

    models.forEach(({ name, predictions }) => {
      let score = 0;
      let totalPredictions = 0;

      recentResults.forEach(result => {
        const topPreds = predictions.slice(0, 5);
        topPreds.forEach(pred => {
          totalPredictions++;
          if (result.gagnants.includes(pred.number)) {
            score += pred.probability * pred.confidence;
          }
        });
      });

      performances.set(name, totalPredictions > 0 ? score / totalPredictions : 0);
    });

    // Normaliser les poids
    const totalPerformance = Array.from(performances.values()).reduce((a, b) => a + b, 0);

    if (totalPerformance > 0) {
      performances.forEach((perf, name) => {
        weights.set(name, perf / totalPerformance);
      });
    } else {
      // Poids égaux si aucune performance mesurable
      const equalWeight = 1 / models.length;
      models.forEach(({ name }) => weights.set(name, equalWeight));
    }

    return weights;
  }

  /**
   * Calcule des poids adaptatifs avec prise en compte de la diversité
   */
  private static calculateAdaptiveWeights(
    models: Array<{ name: string; predictions: MLPrediction[] }>,
    actualResults: DrawResult[],
    config: EnsembleConfig
  ): Map<string, number> {
    const { performanceWindow, diversityWeight, stabilityWeight } = config;
    const weights = new Map<string, number>();

    // Performance de base
    const baseWeights = this.calculateDynamicWeights(models, actualResults, performanceWindow);

    // Ajustement pour la diversité
    const diversityScores = this.calculateDiversityScores(models);

    // Ajustement pour la stabilité
    const stabilityScores = this.calculateStabilityScores(models, actualResults);

    // Combinaison pondérée
    models.forEach(({ name }) => {
      const baseWeight = baseWeights.get(name) || 0;
      const diversityScore = diversityScores.get(name) || 0;
      const stabilityScore = stabilityScores.get(name) || 0;

      const adaptiveWeight =
        baseWeight * (1 - diversityWeight - stabilityWeight) +
        diversityScore * diversityWeight +
        stabilityScore * stabilityWeight;

      weights.set(name, adaptiveWeight);
    });

    // Renormaliser
    const total = Array.from(weights.values()).reduce((a, b) => a + b, 0);
    if (total > 0) {
      weights.forEach((weight, name) => weights.set(name, weight / total));
    }

    return weights;
  }

  /**
   * Calcule des poids bayésiens avec mise à jour des croyances
   */
  private static calculateBayesianWeights(
    models: Array<{ name: string; predictions: MLPrediction[] }>,
    actualResults: DrawResult[],
    window: number
  ): Map<string, number> {
    const weights = new Map<string, number>();

    // Priors uniformes
    const priors = new Map<string, number>();
    models.forEach(({ name }) => priors.set(name, 1 / models.length));

    // Mise à jour bayésienne basée sur les résultats récents
    const recentResults = actualResults.slice(0, window);

    models.forEach(({ name, predictions }) => {
      let likelihood = 1;

      recentResults.forEach(result => {
        const topPreds = predictions.slice(0, 3);
        let predLikelihood = 0.01; // Probabilité de base

        topPreds.forEach(pred => {
          if (result.gagnants.includes(pred.number)) {
            predLikelihood += pred.probability;
          }
        });

        likelihood *= predLikelihood;
      });

      // Posterior = Prior × Likelihood
      const posterior = (priors.get(name) || 0) * likelihood;
      weights.set(name, posterior);
    });

    // Normaliser
    const total = Array.from(weights.values()).reduce((a, b) => a + b, 0);
    if (total > 0) {
      weights.forEach((weight, name) => weights.set(name, weight / total));
    }

    return weights;
  }

  /**
   * Calcule des poids statiques égaux
   */
  private static calculateStaticWeights(
    models: Array<{ name: string; predictions: MLPrediction[] }>
  ): Map<string, number> {
    const weights = new Map<string, number>();
    const equalWeight = 1 / models.length;

    models.forEach(({ name }) => weights.set(name, equalWeight));

    return weights;
  }

  /**
   * Calcule les scores de diversité des modèles
   */
  private static calculateDiversityScores(
    models: Array<{ name: string; predictions: MLPrediction[] }>
  ): Map<string, number> {
    const diversityScores = new Map<string, number>();

    models.forEach(({ name, predictions }, index) => {
      let diversitySum = 0;
      let comparisons = 0;

      // Comparer avec tous les autres modèles
      models.forEach(({ predictions: otherPreds }, otherIndex) => {
        if (index !== otherIndex) {
          const topPreds = predictions.slice(0, 5).map(p => p.number);
          const otherTopPreds = otherPreds.slice(0, 5).map(p => p.number);

          // Calculer la dissimilarité (1 - Jaccard similarity)
          const intersection = topPreds.filter(num => otherTopPreds.includes(num)).length;
          const union = new Set([...topPreds, ...otherTopPreds]).size;
          const jaccard = union > 0 ? intersection / union : 0;

          diversitySum += (1 - jaccard);
          comparisons++;
        }
      });

      diversityScores.set(name, comparisons > 0 ? diversitySum / comparisons : 0);
    });

    return diversityScores;
  }

  /**
   * Calcule les scores de stabilité des modèles
   */
  private static calculateStabilityScores(
    models: Array<{ name: string; predictions: MLPrediction[] }>,
    actualResults: DrawResult[]
  ): Map<string, number> {
    const stabilityScores = new Map<string, number>();

    // Utiliser l'historique de performance si disponible
    models.forEach(({ name }) => {
      const modelHistory = this.performanceHistory
        .slice(-10) // 10 dernières mesures
        .map(entry => entry.modelPerformances.get(name) || 0);

      if (modelHistory.length > 1) {
        // Calculer la variance (stabilité = 1 - variance normalisée)
        const mean = modelHistory.reduce((a, b) => a + b, 0) / modelHistory.length;
        const variance = modelHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / modelHistory.length;
        const normalizedVariance = Math.min(1, variance / (mean + 0.001)); // Éviter division par zéro

        stabilityScores.set(name, 1 - normalizedVariance);
      } else {
        stabilityScores.set(name, 0.5); // Score neutre pour les nouveaux modèles
      }
    });

    return stabilityScores;
  }

  /**
   * Met à jour l'historique de performance
   */
  static updatePerformanceHistory(
    modelPerformances: Map<string, number>,
    ensemblePerformance: number
  ): void {
    this.performanceHistory.push({
      timestamp: new Date(),
      modelPerformances: new Map(modelPerformances),
      ensemblePerformance
    });

    // Garder seulement les 50 dernières entrées
    if (this.performanceHistory.length > 50) {
      this.performanceHistory = this.performanceHistory.slice(-50);
    }
  }

  /**
   * Obtient l'historique d'optimisation
   */
  static getOptimizationHistory(): Map<string, OptimizationResult> {
    return this.optimizationHistory;
  }

  /**
   * Obtient l'historique de performance
   */
  static getPerformanceHistory(): Array<{
    timestamp: Date;
    modelPerformances: Map<string, number>;
    ensemblePerformance: number;
  }> {
    return this.performanceHistory;
  }
}
