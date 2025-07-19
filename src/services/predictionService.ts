import { DrawResult } from './lotteryAPI';
import { XGBoostModel } from './xgboostModel';
import { RNNLSTMModel } from './rnnLstmModel';
import { FeatureEngineering, MLPrediction, ModelMetrics } from './mlModels';
import { IndexedDBService } from './indexedDBService';
import { EnsembleOptimizer, HyperparameterConfig, EnsembleConfig } from './ensembleOptimizer';

// Interface pour les prédictions améliorée
export interface PredictionResult {
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
  metadata: {
    dataPoints: number;
    lastUpdate: Date;
    modelVersion: string;
    modelMetrics?: ModelMetrics;
    ensembleWeights?: { [key: string]: number };
    bayesianAnalysis?: BayesianAnalysis;
  };
}

// Interface pour l'analyse bayésienne
export interface BayesianAnalysis {
  priorProbabilities: number[];
  posteriorProbabilities: number[];
  evidenceStrength: number;
  credibleIntervals: Array<{ lower: number; upper: number }>;
}

// Analyse des patterns et fréquences
class PatternAnalyzer {
  static analyzeFrequency(results: DrawResult[]): { [key: number]: number } {
    const frequency: { [key: number]: number } = {};
    
    results.forEach(result => {
      result.gagnants.forEach(num => {
        frequency[num] = (frequency[num] || 0) + 1;
      });
    });
    
    return frequency;
  }

  static analyzeGaps(results: DrawResult[]): { [key: number]: number[] } {
    const gaps: { [key: number]: number[] } = {};
    const lastSeen: { [key: number]: number } = {};
    
    results.forEach((result, index) => {
      result.gagnants.forEach(num => {
        if (lastSeen[num] !== undefined) {
          const gap = index - lastSeen[num];
          if (!gaps[num]) gaps[num] = [];
          gaps[num].push(gap);
        }
        lastSeen[num] = index;
      });
    });
    
    return gaps;
  }

  static analyzeCoOccurrences(results: DrawResult[]): { [key: string]: number } {
    const coOccurrences: { [key: string]: number } = {};
    
    results.forEach(result => {
      const numbers = result.gagnants.sort((a, b) => a - b);
      
      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          const pair = `${numbers[i]}-${numbers[j]}`;
          coOccurrences[pair] = (coOccurrences[pair] || 0) + 1;
        }
      }
    });
    
    return coOccurrences;
  }

  static analyzeSequentialPatterns(results: DrawResult[]): { [key: string]: number } {
    const patterns: { [key: string]: number } = {};
    
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1].gagnants.sort((a, b) => a - b);
      const curr = results[i].gagnants.sort((a, b) => a - b);
      
      // Analyser les transitions
      const transitions = curr.filter(num => prev.includes(num));
      if (transitions.length > 0) {
        const pattern = `repeat_${transitions.length}`;
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      }
    }
    
    return patterns;
  }
}

// Simulateur XGBoost (version simplifiée)
class XGBoostSimulator {
  static predict(results: DrawResult[]): Array<{ number: number; probability: number }> {
    const frequency = PatternAnalyzer.analyzeFrequency(results);
    const gaps = PatternAnalyzer.analyzeGaps(results);
    
    const predictions: Array<{ number: number; probability: number }> = [];
    
    // Analyser les tendances pour chaque numéro
    for (let num = 1; num <= 90; num++) {
      const freq = frequency[num] || 0;
      const numGaps = gaps[num] || [];
      const avgGap = numGaps.length > 0 ? numGaps.reduce((a, b) => a + b, 0) / numGaps.length : 10;
      const lastGap = numGaps.length > 0 ? numGaps[numGaps.length - 1] : 0;
      
      // Score basé sur fréquence et récence
      const frequencyScore = freq / results.length;
      const recencyScore = Math.max(0, 1 - (lastGap / avgGap));
      const cyclicScore = Math.sin((num / 90) * Math.PI * 2) * 0.1 + 0.1;
      
      const probability = (frequencyScore * 0.5 + recencyScore * 0.3 + cyclicScore * 0.2);
      
      if (probability > 0.05) {
        predictions.push({ number: num, probability });
      }
    }
    
    return predictions.sort((a, b) => b.probability - a.probability).slice(0, 15);
  }
}

// Simulateur Random Forest
class RandomForestSimulator {
  static predict(results: DrawResult[]): Array<{ number: number; probability: number }> {
    const coOccurrences = PatternAnalyzer.analyzeCoOccurrences(results);
    const frequency = PatternAnalyzer.analyzeFrequency(results);
    
    const predictions: Array<{ number: number; probability: number }> = [];
    
    // Utiliser les co-occurrences pour prédire
    for (let num = 1; num <= 90; num++) {
      const relatedPairs = Object.entries(coOccurrences)
        .filter(([pair]) => pair.includes(num.toString()))
        .reduce((sum, [, count]) => sum + count, 0);
      
      const freq = frequency[num] || 0;
      const interactionScore = relatedPairs / results.length;
      const stabilityScore = Math.random() * 0.1; // Simule la variabilité des arbres
      
      const probability = (freq / results.length) * 0.6 + interactionScore * 0.3 + stabilityScore * 0.1;
      
      if (probability > 0.03) {
        predictions.push({ number: num, probability });
      }
    }
    
    return predictions.sort((a, b) => b.probability - a.probability).slice(0, 15);
  }
}

// Simulateur RNN-LSTM (version simplifiée)
class RNNLSTMSimulator {
  static predict(results: DrawResult[]): Array<{ number: number; probability: number }> {
    const sequenceLength = Math.min(10, results.length);
    const recentResults = results.slice(0, sequenceLength);
    
    const predictions: Array<{ number: number; probability: number }> = [];
    
    // Analyser les séquences temporelles
    for (let num = 1; num <= 90; num++) {
      const occurrences = recentResults.map((result, index) => {
        const weight = Math.exp(-index * 0.1); // Poids décroissant pour les anciens résultats
        return result.gagnants.includes(num) ? weight : 0;
      });
      
      const temporalScore = occurrences.reduce((sum, occ) => sum + occ, 0);
      const momentum = this.calculateMomentum(recentResults, num);
      const seasonality = Math.sin((Date.now() / (1000 * 60 * 60 * 24 * 7)) * Math.PI * 2) * 0.05;
      
      const probability = (temporalScore * 0.5 + momentum * 0.3 + seasonality * 0.2) / sequenceLength;
      
      if (probability > 0.02) {
        predictions.push({ number: num, probability });
      }
    }
    
    return predictions.sort((a, b) => b.probability - a.probability).slice(0, 15);
  }

  private static calculateMomentum(results: DrawResult[], num: number): number {
    let momentum = 0;
    let streak = 0;
    
    for (let i = 0; i < Math.min(5, results.length); i++) {
      if (results[i].gagnants.includes(num)) {
        streak++;
        momentum += streak * 0.2;
      } else {
        streak = Math.max(0, streak - 1);
      }
    }
    
    return momentum;
  }
}

/**
 * Classe pour l'analyse bayésienne
 */
class BayesianAnalyzer {
  /**
   * Calcule les probabilités a priori basées sur l'historique
   */
  static calculatePriorProbabilities(results: DrawResult[]): number[] {
    const frequencies = new Array(90).fill(0);
    const totalDraws = results.length;

    results.forEach(result => {
      result.gagnants.forEach(num => {
        frequencies[num - 1]++;
      });
    });

    // Probabilité a priori = fréquence historique + lissage de Laplace
    return frequencies.map(freq => (freq + 1) / (totalDraws + 90));
  }

  /**
   * Met à jour les probabilités avec l'évidence (théorème de Bayes)
   */
  static updatePosteriorProbabilities(
    priors: number[],
    likelihood: number[],
    evidence: number
  ): number[] {
    return priors.map((prior, i) => (prior * likelihood[i]) / evidence);
  }

  /**
   * Calcule les intervalles de crédibilité
   */
  static calculateCredibleIntervals(
    posteriors: number[],
    confidence: number = 0.95
  ): Array<{ lower: number; upper: number }> {
    const alpha = (1 - confidence) / 2;

    return posteriors.map(prob => {
      // Approximation normale pour les intervalles de crédibilité
      const variance = prob * (1 - prob);
      const stdDev = Math.sqrt(variance);
      const zScore = 1.96; // Pour 95% de confiance

      return {
        lower: Math.max(0, prob - zScore * stdDev),
        upper: Math.min(1, prob + zScore * stdDev)
      };
    });
  }

  /**
   * Effectue une analyse bayésienne complète
   */
  static performBayesianAnalysis(
    results: DrawResult[],
    modelPredictions: MLPrediction[]
  ): BayesianAnalysis {
    const priors = this.calculatePriorProbabilities(results);

    // Utiliser les prédictions du modèle comme likelihood
    const likelihood = new Array(90).fill(0.01); // Probabilité de base
    modelPredictions.forEach(pred => {
      likelihood[pred.number - 1] = pred.probability;
    });

    // Calculer l'évidence (normalisation)
    const evidence = priors.reduce((sum, prior, i) => sum + prior * likelihood[i], 0);

    // Calculer les probabilités a posteriori
    const posteriors = this.updatePosteriorProbabilities(priors, likelihood, evidence);

    // Calculer les intervalles de crédibilité
    const credibleIntervals = this.calculateCredibleIntervals(posteriors);

    return {
      priorProbabilities: priors,
      posteriorProbabilities: posteriors,
      evidenceStrength: evidence,
      credibleIntervals
    };
  }
}

// Service principal de prédiction amélioré
export class PredictionService {
  private static xgboostModel: XGBoostModel | null = null;
  private static rnnLstmModel: RNNLSTMModel | null = null;
  private static isInitialized: boolean = false;
  private static isOptimized: boolean = false;
  private static ensembleConfig: EnsembleConfig = {
    models: ['XGBoost', 'RNN-LSTM'],
    weightingStrategy: 'adaptive',
    performanceWindow: 20,
    rebalanceFrequency: 10,
    diversityWeight: 0.2,
    stabilityWeight: 0.1
  };

  /**
   * Initialise les modèles de machine learning avec optimisation optionnelle
   */
  static async initializeModels(optimize: boolean = false): Promise<void> {
    if (this.isInitialized && (!optimize || this.isOptimized)) return;

    console.log('🤖 Initialisation des modèles de prédiction...');

    if (optimize && !this.isOptimized) {
      console.log('🔧 Mode optimisation activé - recherche des meilleurs hyperparamètres...');
      await this.optimizeModels();
    } else {
      // Configuration par défaut optimisée
      this.xgboostModel = new XGBoostModel({
        sequenceLength: 15,
        hiddenUnits: 128,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 80,
        validationSplit: 0.2,
        regularization: { l1: 0.01, l2: 0.01, dropout: 0.3 }
      });

      this.rnnLstmModel = new RNNLSTMModel({
        sequenceLength: 20,
        hiddenUnits: 256,
        learningRate: 0.0005,
        batchSize: 16,
        epochs: 120,
        validationSplit: 0.2,
        regularization: { l1: 0.001, l2: 0.001, dropout: 0.4 }
      });
    }

    this.isInitialized = true;
    console.log('✅ Modèles initialisés');
  }

  /**
   * Optimise automatiquement les hyperparamètres des modèles
   */
  static async optimizeModels(): Promise<void> {
    console.log('🎯 Optimisation automatique des modèles...');

    // Récupérer les données historiques pour l'optimisation
    const historicalData = await IndexedDBService.getAllResults();
    if (historicalData.length < 100) {
      console.warn('⚠️ Données insuffisantes pour l\'optimisation, utilisation des paramètres par défaut');
      return;
    }

    // Espace de recherche pour XGBoost
    const xgboostSearchSpace: HyperparameterConfig = {
      sequenceLength: [10, 15, 20, 25],
      hiddenUnits: [64, 128, 256, 512],
      learningRate: [0.0005, 0.001, 0.002, 0.005],
      batchSize: [16, 32, 64],
      epochs: [50, 80, 100, 120],
      regularization: {
        l1: [0.001, 0.01, 0.1],
        l2: [0.001, 0.01, 0.1],
        dropout: [0.2, 0.3, 0.4, 0.5]
      }
    };

    // Espace de recherche pour RNN-LSTM
    const lstmSearchSpace: HyperparameterConfig = {
      sequenceLength: [15, 20, 25, 30],
      hiddenUnits: [128, 256, 512],
      learningRate: [0.0001, 0.0005, 0.001, 0.002],
      batchSize: [8, 16, 32],
      epochs: [80, 120, 150, 200],
      regularization: {
        l1: [0.0001, 0.001, 0.01],
        l2: [0.0001, 0.001, 0.01],
        dropout: [0.3, 0.4, 0.5, 0.6]
      }
    };

    try {
      // Optimiser les deux modèles en parallèle
      const [xgboostResult, lstmResult] = await Promise.all([
        EnsembleOptimizer.optimizeHyperparameters('XGBoost', historicalData, xgboostSearchSpace, 15),
        EnsembleOptimizer.optimizeHyperparameters('RNN-LSTM', historicalData, lstmSearchSpace, 15)
      ]);

      // Créer les modèles avec les configurations optimisées
      this.xgboostModel = new XGBoostModel(xgboostResult.bestConfig);
      this.rnnLstmModel = new RNNLSTMModel(lstmResult.bestConfig);

      this.isOptimized = true;

      console.log('🏆 Optimisation terminée:');
      console.log(`  XGBoost - Score: ${xgboostResult.bestScore.toFixed(4)}`);
      console.log(`  RNN-LSTM - Score: ${lstmResult.bestScore.toFixed(4)}`);

      // Sauvegarder les résultats d'optimisation
      await this.saveOptimizationResults(xgboostResult, lstmResult);

    } catch (error) {
      console.error('❌ Erreur lors de l\'optimisation:', error);
      console.log('🔄 Utilisation des paramètres par défaut...');

      // Fallback vers les paramètres par défaut
      this.xgboostModel = new XGBoostModel({
        sequenceLength: 15,
        hiddenUnits: 128,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 80,
        validationSplit: 0.2,
        regularization: { l1: 0.01, l2: 0.01, dropout: 0.3 }
      });

      this.rnnLstmModel = new RNNLSTMModel({
        sequenceLength: 20,
        hiddenUnits: 256,
        learningRate: 0.0005,
        batchSize: 16,
        epochs: 120,
        validationSplit: 0.2,
        regularization: { l1: 0.001, l2: 0.001, dropout: 0.4 }
      });
    }
  }

  /**
   * Entraîne les modèles avec les données historiques
   */
  static async trainModels(results: DrawResult[]): Promise<{
    xgboostMetrics: ModelMetrics;
    lstmMetrics: ModelMetrics;
  }> {
    await this.initializeModels();

    if (!this.xgboostModel || !this.rnnLstmModel) {
      throw new Error('Modèles non initialisés');
    }

    console.log('🎯 Début de l\'entraînement des modèles...');

    // Entraîner les deux modèles en parallèle
    const [xgboostMetrics, lstmMetrics] = await Promise.all([
      this.xgboostModel.train(results),
      this.rnnLstmModel.train(results)
    ]);

    // Sauvegarder les modèles entraînés
    await this.saveTrainedModels();

    console.log('🏆 Entraînement terminé avec succès');

    return { xgboostMetrics, lstmMetrics };
  }

  /**
   * Génère une prédiction avec le système hybride avancé
   */
  static async generatePrediction(
    drawName: string,
    results: DrawResult[],
    algorithm: 'XGBoost' | 'RNN-LSTM' | 'RandomForest' | 'Hybrid' = 'Hybrid'
  ): Promise<PredictionResult> {

    if (results.length < 30) {
      throw new Error('Données insuffisantes pour générer une prédiction fiable (minimum 30 tirages)');
    }

    await this.initializeModels();

    let predictions: MLPrediction[];
    let confidence: number;
    let modelMetrics: ModelMetrics | undefined;
    let ensembleWeights: { [key: string]: number } | undefined;
    let bayesianAnalysis: BayesianAnalysis | undefined;

    try {
      switch (algorithm) {
        case 'XGBoost':
          if (!this.xgboostModel) throw new Error('Modèle XGBoost non disponible');

          // Entraîner si nécessaire
          if (!this.xgboostModel.getModelInfo().isTrained) {
            modelMetrics = await this.xgboostModel.train(results);
          }

          predictions = await this.xgboostModel.predict(results);
          confidence = this.calculateDynamicConfidence(predictions, results.length, 'XGBoost');
          break;

        case 'RNN-LSTM':
          if (!this.rnnLstmModel) throw new Error('Modèle RNN-LSTM non disponible');

          // Entraîner si nécessaire
          if (!this.rnnLstmModel.getModelInfo().isTrained) {
            modelMetrics = await this.rnnLstmModel.train(results);
          }

          predictions = await this.rnnLstmModel.predict(results);
          confidence = this.calculateDynamicConfidence(predictions, results.length, 'RNN-LSTM');
          break;

        case 'Hybrid':
        default:
          // Système hybride avancé
          const hybridResult = await this.generateHybridPrediction(results);
          predictions = hybridResult.predictions;
          confidence = hybridResult.confidence;
          ensembleWeights = hybridResult.ensembleWeights;
          bayesianAnalysis = hybridResult.bayesianAnalysis;
          break;
      }

      // Effectuer l'analyse bayésienne si pas déjà fait
      if (!bayesianAnalysis) {
        bayesianAnalysis = BayesianAnalyzer.performBayesianAnalysis(results, predictions);
      }

      // Enrichir les prédictions avec l'analyse bayésienne
      const enrichedPredictions = predictions.slice(0, 5).map(pred => ({
        number: pred.number,
        probability: pred.probability,
        confidence: pred.confidence,
        uncertainty: pred.uncertainty,
        bayesianProbability: bayesianAnalysis!.posteriorProbabilities[pred.number - 1],
        features: pred.features
      }));

      // Sauvegarder la prédiction
      await this.savePrediction(drawName, {
        numbers: enrichedPredictions,
        confidence,
        algorithm,
        features: this.generateFeatureDescription(predictions),
        metadata: {
          dataPoints: results.length,
          lastUpdate: new Date(),
          modelVersion: '2.0.0',
          modelMetrics,
          ensembleWeights,
          bayesianAnalysis
        }
      });

      return {
        numbers: enrichedPredictions,
        confidence,
        algorithm,
        features: this.generateFeatureDescription(predictions),
        metadata: {
          dataPoints: results.length,
          lastUpdate: new Date(),
          modelVersion: '2.0.0',
          modelMetrics,
          ensembleWeights,
          bayesianAnalysis
        }
      };

    } catch (error) {
      console.error('Erreur lors de la génération de prédiction:', error);

      // Fallback vers les anciens simulateurs
      return this.generateFallbackPrediction(drawName, results, algorithm);
    }
  }

  /**
   * Génère une prédiction hybride avancée combinant XGBoost et RNN-LSTM
   */
  private static async generateHybridPrediction(results: DrawResult[]): Promise<{
    predictions: MLPrediction[];
    confidence: number;
    ensembleWeights: { [key: string]: number };
    bayesianAnalysis: BayesianAnalysis;
  }> {
    if (!this.xgboostModel || !this.rnnLstmModel) {
      throw new Error('Modèles non initialisés');
    }

    // Entraîner les modèles si nécessaire
    const trainingPromises: Promise<any>[] = [];

    if (!this.xgboostModel.getModelInfo().isTrained) {
      trainingPromises.push(this.xgboostModel.train(results));
    }

    if (!this.rnnLstmModel.getModelInfo().isTrained) {
      trainingPromises.push(this.rnnLstmModel.train(results));
    }

    if (trainingPromises.length > 0) {
      await Promise.all(trainingPromises);
    }

    // Obtenir les prédictions des deux modèles
    const [xgboostPreds, lstmPreds] = await Promise.all([
      this.xgboostModel.predict(results),
      this.rnnLstmModel.predict(results)
    ]);

    // Utiliser l'optimiseur d'ensemble pour calculer les poids adaptatifs
    const models = [
      { name: 'XGBoost', predictions: xgboostPreds },
      { name: 'RNN-LSTM', predictions: lstmPreds }
    ];

    const optimizedWeights = await EnsembleOptimizer.optimizeEnsembleWeights(
      models,
      results,
      this.ensembleConfig
    );

    // Convertir les poids pour la compatibilité
    const ensembleWeights = {
      xgboost: optimizedWeights.get('XGBoost') || 0.5,
      lstm: optimizedWeights.get('RNN-LSTM') || 0.5
    };

    // Combiner les prédictions avec les poids optimisés
    const combinedPredictions = this.combineMLPredictions(
      xgboostPreds,
      lstmPreds,
      ensembleWeights
    );

    // Effectuer l'analyse bayésienne
    const bayesianAnalysis = BayesianAnalyzer.performBayesianAnalysis(results, combinedPredictions);

    // Calculer la confiance globale avec métriques avancées
    const confidence = this.calculateAdvancedEnsembleConfidence(
      xgboostPreds,
      lstmPreds,
      combinedPredictions,
      results
    );

    // Mettre à jour l'historique de performance
    const modelPerformances = new Map<string, number>();
    modelPerformances.set('XGBoost', this.evaluateModelPerformance(xgboostPreds, results.slice(0, 5)));
    modelPerformances.set('RNN-LSTM', this.evaluateModelPerformance(lstmPreds, results.slice(0, 5)));

    const ensemblePerformance = this.evaluateModelPerformance(combinedPredictions, results.slice(0, 5));
    EnsembleOptimizer.updatePerformanceHistory(modelPerformances, ensemblePerformance);

    return {
      predictions: combinedPredictions,
      confidence,
      ensembleWeights,
      bayesianAnalysis
    };
  }

  /**
   * Combine les prédictions de plusieurs modèles ML
   */
  private static combineMLPredictions(
    xgboostPreds: MLPrediction[],
    lstmPreds: MLPrediction[],
    weights: { [key: string]: number }
  ): MLPrediction[] {
    const combined: { [key: number]: MLPrediction } = {};

    // Combiner XGBoost
    xgboostPreds.forEach(pred => {
      combined[pred.number] = {
        number: pred.number,
        probability: pred.probability * weights.xgboost,
        confidence: pred.confidence * weights.xgboost,
        uncertainty: pred.uncertainty,
        features: [...pred.features]
      };
    });

    // Ajouter LSTM
    lstmPreds.forEach(pred => {
      if (combined[pred.number]) {
        combined[pred.number].probability += pred.probability * weights.lstm;
        combined[pred.number].confidence += pred.confidence * weights.lstm;
        combined[pred.number].uncertainty = Math.max(
          combined[pred.number].uncertainty,
          pred.uncertainty
        );
        combined[pred.number].features.push(...pred.features);
      } else {
        combined[pred.number] = {
          number: pred.number,
          probability: pred.probability * weights.lstm,
          confidence: pred.confidence * weights.lstm,
          uncertainty: pred.uncertainty,
          features: [...pred.features]
        };
      }
    });

    // Normaliser et trier
    return Object.values(combined)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 15);
  }

  /**
   * Calcule une confiance d'ensemble avancée avec métriques multiples
   */
  private static calculateAdvancedEnsembleConfidence(
    xgboostPreds: MLPrediction[],
    lstmPreds: MLPrediction[],
    combinedPreds: MLPrediction[],
    results: DrawResult[]
  ): number {
    // Confiance de base
    const baseConfidence = this.calculateEnsembleConfidence(
      xgboostPreds,
      lstmPreds,
      combinedPreds,
      results.length
    );

    // Facteurs d'ajustement
    const diversityFactor = this.calculatePredictionDiversity(combinedPreds);
    const stabilityFactor = this.calculatePredictionStability(combinedPreds, results);
    const consensusFactor = this.calculateModelConsensus(xgboostPreds, lstmPreds);

    // Combinaison pondérée
    const adjustedConfidence =
      baseConfidence * 0.5 +
      diversityFactor * 0.2 +
      stabilityFactor * 0.2 +
      consensusFactor * 0.1;

    return Math.max(0, Math.min(1, adjustedConfidence));
  }

  /**
   * Calcule la diversité des prédictions
   */
  private static calculatePredictionDiversity(predictions: MLPrediction[]): number {
    if (predictions.length < 2) return 0;

    const topPreds = predictions.slice(0, 5);
    const numbers = topPreds.map(p => p.number);

    // Vérifier la distribution dans les différentes plages
    const ranges = [
      [1, 18], [19, 36], [37, 54], [55, 72], [73, 90]
    ];

    let coveredRanges = 0;
    ranges.forEach(([min, max]) => {
      if (numbers.some(num => num >= min && num <= max)) {
        coveredRanges++;
      }
    });

    return coveredRanges / ranges.length;
  }

  /**
   * Calcule la stabilité des prédictions par rapport à l'historique
   */
  private static calculatePredictionStability(
    predictions: MLPrediction[],
    results: DrawResult[]
  ): number {
    const recentResults = results.slice(0, 10);
    const topPreds = predictions.slice(0, 5).map(p => p.number);

    // Analyser la cohérence avec les tendances récentes
    const recentNumbers = new Set<number>();
    recentResults.forEach(result => {
      result.gagnants.forEach(num => recentNumbers.add(num));
    });

    const trendAlignment = topPreds.filter(num => recentNumbers.has(num)).length / topPreds.length;

    // Éviter la sur-adaptation (équilibrer avec la nouveauté)
    const noveltyScore = topPreds.filter(num => !recentNumbers.has(num)).length / topPreds.length;

    return (trendAlignment * 0.7 + noveltyScore * 0.3);
  }

  /**
   * Calcule le consensus entre les modèles
   */
  private static calculateModelConsensus(
    xgboostPreds: MLPrediction[],
    lstmPreds: MLPrediction[]
  ): number {
    const xgbTop = xgboostPreds.slice(0, 5).map(p => p.number);
    const lstmTop = lstmPreds.slice(0, 5).map(p => p.number);

    const intersection = xgbTop.filter(num => lstmTop.includes(num)).length;
    const union = new Set([...xgbTop, ...lstmTop]).size;

    return union > 0 ? intersection / Math.min(xgbTop.length, lstmTop.length) : 0;
  }

  /**
   * Évalue la performance d'un modèle sur des résultats récents
   */
  private static evaluateModelPerformance(
    predictions: MLPrediction[],
    actualResults: DrawResult[]
  ): number {
    if (predictions.length === 0 || actualResults.length === 0) return 0;

    const topPreds = predictions.slice(0, 5);
    let totalScore = 0;
    let totalPredictions = 0;

    actualResults.forEach(result => {
      topPreds.forEach(pred => {
        totalPredictions++;
        if (result.gagnants.includes(pred.number)) {
          totalScore += pred.probability * pred.confidence;
        }
      });
    });

    return totalPredictions > 0 ? totalScore / totalPredictions : 0;
  }

  /**
   * Sauvegarde les résultats d'optimisation
   */
  private static async saveOptimizationResults(
    xgboostResult: any,
    lstmResult: any
  ): Promise<void> {
    try {
      const optimizationData = {
        timestamp: new Date().toISOString(),
        xgboost: {
          bestScore: xgboostResult.bestScore,
          bestConfig: xgboostResult.bestConfig,
          convergenceHistory: xgboostResult.convergenceHistory
        },
        lstm: {
          bestScore: lstmResult.bestScore,
          bestConfig: lstmResult.bestConfig,
          convergenceHistory: lstmResult.convergenceHistory
        }
      };

      await IndexedDBService.saveOptimizationResults(optimizationData);
      console.log('💾 Résultats d\'optimisation sauvegardés');
    } catch (error) {
      console.warn('⚠️ Erreur lors de la sauvegarde des résultats d\'optimisation:', error);
    }
  }

  /**
   * Calcule les poids dynamiques pour l'ensemble
   */
  private static calculateDynamicWeights(
    xgboostPreds: MLPrediction[],
    lstmPreds: MLPrediction[],
    results: DrawResult[]
  ): { [key: string]: number } {
    // Évaluer la performance récente de chaque modèle
    const recentResults = results.slice(0, 10);
    let xgboostScore = 0;
    let lstmScore = 0;

    recentResults.forEach(result => {
      // Score basé sur la précision des prédictions récentes
      const xgbHits = xgboostPreds.filter(pred =>
        result.gagnants.includes(pred.number)
      ).length;
      const lstmHits = lstmPreds.filter(pred =>
        result.gagnants.includes(pred.number)
      ).length;

      xgboostScore += xgbHits;
      lstmScore += lstmHits;
    });

    // Normaliser les poids
    const totalScore = xgboostScore + lstmScore;
    if (totalScore === 0) {
      return { xgboost: 0.6, lstm: 0.4 }; // Poids par défaut
    }

    return {
      xgboost: xgboostScore / totalScore,
      lstm: lstmScore / totalScore
    };
  }

  /**
   * Calcule la confiance dynamique basée sur les prédictions
   */
  private static calculateDynamicConfidence(
    predictions: MLPrediction[],
    dataPoints: number,
    algorithm: string
  ): number {
    const baseConfidence = {
      'XGBoost': 0.75,
      'RNN-LSTM': 0.70,
      'Hybrid': 0.85
    }[algorithm] || 0.65;

    // Ajuster basé sur la quantité de données
    const dataBonus = Math.min(0.15, (dataPoints - 30) / 1000 * 0.15);

    // Ajuster basé sur la cohérence des prédictions
    const avgConfidence = predictions.reduce((sum, pred) => sum + pred.confidence, 0) / predictions.length;
    const consistencyBonus = avgConfidence * 0.1;

    return Math.min(0.95, baseConfidence + dataBonus + consistencyBonus);
  }

  /**
   * Calcule la confiance de l'ensemble
   */
  private static calculateEnsembleConfidence(
    xgboostPreds: MLPrediction[],
    lstmPreds: MLPrediction[],
    combinedPreds: MLPrediction[],
    dataPoints: number
  ): number {
    // Mesurer l'accord entre les modèles
    const agreement = this.calculateModelAgreement(xgboostPreds, lstmPreds);

    // Confiance basée sur l'accord et la quantité de données
    const baseConfidence = 0.80;
    const agreementBonus = agreement * 0.15;
    const dataBonus = Math.min(0.10, (dataPoints - 50) / 1000 * 0.10);

    return Math.min(0.95, baseConfidence + agreementBonus + dataBonus);
  }

  /**
   * Mesure l'accord entre deux ensembles de prédictions
   */
  private static calculateModelAgreement(
    preds1: MLPrediction[],
    preds2: MLPrediction[]
  ): number {
    const top5_1 = new Set(preds1.slice(0, 5).map(p => p.number));
    const top5_2 = new Set(preds2.slice(0, 5).map(p => p.number));

    const intersection = new Set([...top5_1].filter(x => top5_2.has(x)));
    return intersection.size / 5; // Pourcentage d'accord sur le top 5
  }

  /**
   * Génère une description des features utilisées
   */
  private static generateFeatureDescription(predictions: MLPrediction[]): string[] {
    const allFeatures = new Set<string>();

    predictions.slice(0, 5).forEach(pred => {
      pred.features.forEach(feature => allFeatures.add(feature));
    });

    const baseFeatures = [
      'Analyse de fréquence historique avancée',
      'Patterns de co-occurrence multi-dimensionnels',
      'Tendances temporelles avec LSTM',
      'Analyse des écarts avec régularisation',
      'Cycles saisonniers et momentum',
      'Analyse bayésienne des probabilités'
    ];

    return [...baseFeatures, ...Array.from(allFeatures).slice(0, 4)];
  }

  /**
   * Sauvegarde une prédiction dans la base de données
   */
  private static async savePrediction(drawName: string, prediction: PredictionResult): Promise<void> {
    try {
      await IndexedDBService.savePrediction({
        drawName,
        date: new Date().toISOString().split('T')[0],
        numbers: prediction.numbers,
        confidence: prediction.confidence,
        algorithm: prediction.algorithm,
        features: prediction.features
      });
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de la prédiction:', error);
    }
  }

  /**
   * Sauvegarde les modèles entraînés
   */
  private static async saveTrainedModels(): Promise<void> {
    try {
      if (this.xgboostModel) {
        await this.xgboostModel.saveModel('indexeddb://xgboost');
      }
      if (this.rnnLstmModel) {
        await this.rnnLstmModel.saveModel('indexeddb://lstm');
      }
      console.log('✅ Modèles sauvegardés');
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde des modèles:', error);
    }
  }

  /**
   * Génère une prédiction de fallback avec les anciens simulateurs
   */
  private static async generateFallbackPrediction(
    drawName: string,
    results: DrawResult[],
    algorithm: string
  ): Promise<PredictionResult> {
    console.warn('🔄 Utilisation du mode fallback pour les prédictions');

    // Utiliser les anciens simulateurs comme fallback
    const xgbPreds = XGBoostSimulator.predict(results);
    const rnnPreds = RNNLSTMSimulator.predict(results);

    const combined = this.combineHybridPredictions(xgbPreds, [], rnnPreds);
    const topPredictions = combined.slice(0, 5);

    return {
      numbers: topPredictions.map(pred => ({
        number: pred.number,
        probability: pred.probability,
        confidence: 0.6,
        uncertainty: 0.3,
        features: ['Mode fallback - Simulateurs basiques']
      })),
      confidence: 0.6,
      algorithm: algorithm as any,
      features: ['Mode fallback activé'],
      metadata: {
        dataPoints: results.length,
        lastUpdate: new Date(),
        modelVersion: '1.0.0-fallback'
      }
    };
  }

  /**
   * Combine les prédictions des anciens simulateurs (fallback)
   */
  private static combineHybridPredictions(
    xgb: Array<{ number: number; probability: number }>,
    rf: Array<{ number: number; probability: number }>,
    rnn: Array<{ number: number; probability: number }>
  ): Array<{ number: number; probability: number }> {
    const combined: { [key: number]: number } = {};
    const weights = { xgb: 0.5, rf: 0.2, rnn: 0.3 };

    [xgb, rf, rnn].forEach((preds, index) => {
      const weight = index === 0 ? weights.xgb : index === 1 ? weights.rf : weights.rnn;

      preds.forEach(pred => {
        combined[pred.number] = (combined[pred.number] || 0) + (pred.probability * weight);
      });
    });

    return Object.entries(combined)
      .map(([num, prob]) => ({ number: parseInt(num), probability: prob }))
      .sort((a, b) => b.probability - a.probability);
  }

  // Évaluation de la qualité des prédictions passées
  static evaluatePredictionAccuracy(
    predictions: Array<{ number: number; probability: number }>,
    actualResult: number[]
  ): {
    accuracy: number;
    hits: number;
    misses: number;
    probabilityScore: number;
  } {

    const predictedNumbers = predictions.map(p => p.number);
    const hits = predictedNumbers.filter(num => actualResult.includes(num)).length;
    const misses = 5 - hits;
    const accuracy = hits / 5;

    // Score de probabilité pondéré
    const probabilityScore = predictions.reduce((score, pred) => {
      if (actualResult.includes(pred.number)) {
        return score + pred.probability;
      }
      return score;
    }, 0);

    return {
      accuracy,
      hits,
      misses,
      probabilityScore
    };
  }

  /**
   * Libère la mémoire des modèles
   */
  static dispose(): void {
    if (this.xgboostModel) {
      this.xgboostModel.dispose();
      this.xgboostModel = null;
    }
    if (this.rnnLstmModel) {
      this.rnnLstmModel.dispose();
      this.rnnLstmModel = null;
    }
    this.isInitialized = false;
  }

  /**
   * Retourne les informations sur les modèles
   */
  static getModelsInfo(): any {
    return {
      isInitialized: this.isInitialized,
      xgboost: this.xgboostModel?.getModelInfo() || null,
      lstm: this.rnnLstmModel?.getModelInfo() || null
    };
  }
}