import { DrawResult } from './lotteryAPI';
import { PredictionService, PredictionResult } from './predictionService';
import { FeatureEngineering, MLPrediction, ModelMetrics } from './mlModels';
import { IndexedDBService } from './indexedDBService';
import { ModelMonitoringService } from './modelMonitoring';
import { EnsembleOptimizer } from './ensembleOptimizer';

/**
 * Configuration de l'apprentissage continu
 */
export interface ContinuousLearningConfig {
  retrainingThreshold: number; // Seuil de dégradation pour déclencher un réentraînement
  minNewDataPoints: number; // Nombre minimum de nouveaux points de données
  retrainingFrequency: number; // Fréquence de vérification en heures
  performanceWindow: number; // Fenêtre d'évaluation de performance
  adaptiveLearningRate: boolean; // Ajustement automatique du learning rate
  ensembleRebalancing: boolean; // Rééquilibrage automatique de l'ensemble
}

/**
 * Résultat d'une session d'apprentissage
 */
export interface LearningSession {
  id: string;
  timestamp: Date;
  trigger: 'scheduled' | 'performance_degradation' | 'new_data' | 'manual';
  dataPoints: number;
  modelsRetrained: string[];
  performanceImprovement: {
    [modelName: string]: {
      before: ModelMetrics;
      after: ModelMetrics;
      improvement: number;
    };
  };
  duration: number; // en millisecondes
  success: boolean;
  errors?: string[];
}

/**
 * Service d'apprentissage continu pour l'amélioration automatique des modèles
 */
export class ContinuousLearningService {
  private static config: ContinuousLearningConfig = {
    retrainingThreshold: 0.05, // 5% de dégradation
    minNewDataPoints: 20,
    retrainingFrequency: 6, // 6 heures
    performanceWindow: 50,
    adaptiveLearningRate: true,
    ensembleRebalancing: true
  };

  private static learningHistory: LearningSession[] = [];
  private static isLearning: boolean = false;
  private static lastCheck: Date = new Date();

  /**
   * Démarre le service d'apprentissage continu
   */
  static startContinuousLearning(): void {
    console.log('🧠 Démarrage de l\'apprentissage continu...');
    
    // Vérification périodique
    setInterval(() => {
      this.checkForLearningTriggers();
    }, this.config.retrainingFrequency * 60 * 60 * 1000);

    // Premier check immédiat
    this.checkForLearningTriggers();
  }

  /**
   * Vérifie s'il faut déclencher un apprentissage
   */
  private static async checkForLearningTriggers(): Promise<void> {
    if (this.isLearning) {
      console.log('⏳ Apprentissage déjà en cours, skip...');
      return;
    }

    try {
      const triggers = await this.evaluateLearningTriggers();
      
      if (triggers.length > 0) {
        console.log(`🎯 Déclencheurs détectés: ${triggers.join(', ')}`);
        await this.performLearningSession(triggers[0]);
      }

      this.lastCheck = new Date();
    } catch (error) {
      console.error('Erreur lors de la vérification des déclencheurs:', error);
    }
  }

  /**
   * Évalue les déclencheurs d'apprentissage
   */
  private static async evaluateLearningTriggers(): Promise<string[]> {
    const triggers: string[] = [];

    // 1. Vérifier la dégradation de performance
    const currentMetrics = ModelMonitoringService.getCurrentMetrics();
    if (currentMetrics) {
      const performanceDegradation = this.detectPerformanceDegradation(currentMetrics);
      if (performanceDegradation) {
        triggers.push('performance_degradation');
      }
    }

    // 2. Vérifier les nouvelles données
    const newDataCount = await this.countNewDataSinceLastTraining();
    if (newDataCount >= this.config.minNewDataPoints) {
      triggers.push('new_data');
    }

    // 3. Vérification programmée
    const hoursSinceLastCheck = (Date.now() - this.lastCheck.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastCheck >= this.config.retrainingFrequency) {
      triggers.push('scheduled');
    }

    return triggers;
  }

  /**
   * Détecte une dégradation de performance
   */
  private static detectPerformanceDegradation(currentMetrics: any): boolean {
    const metricsHistory = ModelMonitoringService.getMetricsHistory(24); // 24h
    
    if (metricsHistory.length < 10) return false; // Pas assez d'historique

    // Comparer la performance actuelle avec la moyenne des 24 dernières heures
    const recentPerformance = metricsHistory.slice(-this.config.performanceWindow);
    
    Object.entries(currentMetrics.modelPerformance).forEach(([modelName, currentPerf]: [string, any]) => {
      const historicalPerf = recentPerformance.map(m => m.modelPerformance[modelName]?.hitRate || 0);
      const avgHistoricalPerf = historicalPerf.reduce((a, b) => a + b, 0) / historicalPerf.length;
      
      const degradation = (avgHistoricalPerf - currentPerf.hitRate) / avgHistoricalPerf;
      
      if (degradation > this.config.retrainingThreshold) {
        console.log(`📉 Dégradation détectée pour ${modelName}: ${(degradation * 100).toFixed(1)}%`);
        return true;
      }
    });

    return false;
  }

  /**
   * Compte les nouvelles données depuis le dernier entraînement
   */
  private static async countNewDataSinceLastTraining(): Promise<number> {
    try {
      const allResults = await IndexedDBService.getAllResults();
      const lastSession = this.learningHistory[this.learningHistory.length - 1];
      
      if (!lastSession) return allResults.length;

      const newResults = allResults.filter(result => 
        new Date(result.date) > lastSession.timestamp
      );

      return newResults.length;
    } catch (error) {
      console.error('Erreur lors du comptage des nouvelles données:', error);
      return 0;
    }
  }

  /**
   * Effectue une session d'apprentissage
   */
  private static async performLearningSession(trigger: string): Promise<LearningSession> {
    const sessionId = `learning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`🚀 Début de la session d'apprentissage: ${sessionId}`);
    console.log(`Déclencheur: ${trigger}`);

    this.isLearning = true;

    const session: LearningSession = {
      id: sessionId,
      timestamp: new Date(),
      trigger: trigger as any,
      dataPoints: 0,
      modelsRetrained: [],
      performanceImprovement: {},
      duration: 0,
      success: false,
      errors: []
    };

    try {
      // 1. Récupérer les données d'entraînement
      const trainingData = await IndexedDBService.getAllResults();
      session.dataPoints = trainingData.length;

      if (trainingData.length < 50) {
        throw new Error('Données insuffisantes pour l\'apprentissage');
      }

      // 2. Évaluer les performances actuelles
      const beforeMetrics = await this.evaluateCurrentPerformance(trainingData);

      // 3. Réentraîner les modèles
      const modelsToRetrain = this.selectModelsForRetraining(trigger);
      
      for (const modelType of modelsToRetrain) {
        try {
          console.log(`🔄 Réentraînement du modèle ${modelType}...`);
          
          // Ajuster la configuration si nécessaire
          const optimizedConfig = await this.optimizeModelConfig(modelType, trainingData);
          
          // Réentraîner le modèle
          await this.retrainModel(modelType, trainingData, optimizedConfig);
          
          session.modelsRetrained.push(modelType);
        } catch (error) {
          console.error(`Erreur lors du réentraînement de ${modelType}:`, error);
          session.errors?.push(`${modelType}: ${error}`);
        }
      }

      // 4. Évaluer les nouvelles performances
      const afterMetrics = await this.evaluateCurrentPerformance(trainingData);

      // 5. Calculer les améliorations
      session.performanceImprovement = this.calculatePerformanceImprovement(
        beforeMetrics,
        afterMetrics
      );

      // 6. Rééquilibrer l'ensemble si nécessaire
      if (this.config.ensembleRebalancing && session.modelsRetrained.length > 0) {
        await this.rebalanceEnsemble(trainingData);
      }

      session.success = session.modelsRetrained.length > 0;
      
    } catch (error) {
      console.error('Erreur lors de la session d\'apprentissage:', error);
      session.errors?.push(`Session error: ${error}`);
      session.success = false;
    } finally {
      session.duration = Date.now() - startTime;
      this.isLearning = false;
      
      // Sauvegarder la session
      this.learningHistory.push(session);
      
      // Garder seulement les 100 dernières sessions
      if (this.learningHistory.length > 100) {
        this.learningHistory = this.learningHistory.slice(-100);
      }

      console.log(`✅ Session d'apprentissage terminée: ${session.success ? 'Succès' : 'Échec'}`);
      console.log(`Durée: ${(session.duration / 1000).toFixed(1)}s`);
      console.log(`Modèles réentraînés: ${session.modelsRetrained.join(', ')}`);
    }

    return session;
  }

  /**
   * Sélectionne les modèles à réentraîner selon le déclencheur
   */
  private static selectModelsForRetraining(trigger: string): string[] {
    switch (trigger) {
      case 'performance_degradation':
        // Réentraîner tous les modèles en cas de dégradation
        return ['XGBoost', 'RNN-LSTM'];
      
      case 'new_data':
        // Réentraîner seulement le modèle le moins performant
        return ['RNN-LSTM']; // LSTM est généralement plus adaptatif
      
      case 'scheduled':
        // Réentraînement programmé léger
        return ['XGBoost'];
      
      default:
        return ['XGBoost', 'RNN-LSTM'];
    }
  }

  /**
   * Optimise la configuration d'un modèle
   */
  private static async optimizeModelConfig(
    modelType: string,
    trainingData: DrawResult[]
  ): Promise<any> {
    // Configuration adaptative basée sur la quantité de données
    const dataSize = trainingData.length;
    
    if (modelType === 'XGBoost') {
      return {
        sequenceLength: Math.min(20, Math.floor(dataSize / 10)),
        hiddenUnits: dataSize > 500 ? 256 : 128,
        learningRate: this.config.adaptiveLearningRate ? 
          Math.max(0.0005, 0.002 - (dataSize / 10000)) : 0.001,
        batchSize: Math.min(64, Math.max(16, Math.floor(dataSize / 20))),
        epochs: Math.min(100, Math.max(50, Math.floor(dataSize / 5))),
        validationSplit: 0.2,
        regularization: { l1: 0.01, l2: 0.01, dropout: 0.3 }
      };
    } else {
      return {
        sequenceLength: Math.min(25, Math.floor(dataSize / 8)),
        hiddenUnits: dataSize > 500 ? 512 : 256,
        learningRate: this.config.adaptiveLearningRate ? 
          Math.max(0.0001, 0.001 - (dataSize / 20000)) : 0.0005,
        batchSize: Math.min(32, Math.max(8, Math.floor(dataSize / 30))),
        epochs: Math.min(150, Math.max(80, Math.floor(dataSize / 3))),
        validationSplit: 0.2,
        regularization: { l1: 0.001, l2: 0.001, dropout: 0.4 }
      };
    }
  }

  /**
   * Réentraîne un modèle spécifique
   */
  private static async retrainModel(
    modelType: string,
    trainingData: DrawResult[],
    config: any
  ): Promise<void> {
    // Cette méthode devrait utiliser les services de modèles existants
    // Pour l'instant, on simule le réentraînement
    await PredictionService.initializeModels(false);
    
    // Dans une implémentation réelle, on réentraînerait spécifiquement le modèle
    console.log(`Modèle ${modelType} réentraîné avec ${trainingData.length} points de données`);
  }

  /**
   * Évalue les performances actuelles
   */
  private static async evaluateCurrentPerformance(data: DrawResult[]): Promise<any> {
    // Simulation d'évaluation - dans la réalité, on utiliserait les vrais modèles
    return {
      'XGBoost': { hitRate: 0.18, f1Score: 0.25, confidence: 0.7 },
      'RNN-LSTM': { hitRate: 0.16, f1Score: 0.23, confidence: 0.65 }
    };
  }

  /**
   * Calcule l'amélioration de performance
   */
  private static calculatePerformanceImprovement(before: any, after: any): any {
    const improvement: any = {};
    
    Object.keys(before).forEach(modelName => {
      const beforeMetrics = before[modelName];
      const afterMetrics = after[modelName];
      
      const hitRateImprovement = afterMetrics.hitRate - beforeMetrics.hitRate;
      
      improvement[modelName] = {
        before: beforeMetrics,
        after: afterMetrics,
        improvement: hitRateImprovement
      };
    });
    
    return improvement;
  }

  /**
   * Rééquilibre l'ensemble de modèles
   */
  private static async rebalanceEnsemble(data: DrawResult[]): Promise<void> {
    console.log('⚖️ Rééquilibrage de l\'ensemble...');
    
    // Utiliser l'optimiseur d'ensemble pour recalculer les poids
    const models = [
      { name: 'XGBoost', predictions: [] }, // Simulated
      { name: 'RNN-LSTM', predictions: [] }
    ];
    
    await EnsembleOptimizer.optimizeEnsembleWeights(
      models,
      data.slice(0, 50),
      {
        models: ['XGBoost', 'RNN-LSTM'],
        weightingStrategy: 'adaptive',
        performanceWindow: 20,
        rebalanceFrequency: 10,
        diversityWeight: 0.2,
        stabilityWeight: 0.1
      }
    );
  }

  /**
   * Déclenche manuellement une session d'apprentissage
   */
  static async triggerManualLearning(): Promise<LearningSession> {
    return this.performLearningSession('manual');
  }

  /**
   * Obtient l'historique d'apprentissage
   */
  static getLearningHistory(): LearningSession[] {
    return [...this.learningHistory];
  }

  /**
   * Obtient le statut actuel
   */
  static getStatus(): {
    isLearning: boolean;
    lastCheck: Date;
    totalSessions: number;
    successRate: number;
  } {
    const successfulSessions = this.learningHistory.filter(s => s.success).length;
    const successRate = this.learningHistory.length > 0 ? 
      successfulSessions / this.learningHistory.length : 0;

    return {
      isLearning: this.isLearning,
      lastCheck: this.lastCheck,
      totalSessions: this.learningHistory.length,
      successRate
    };
  }

  /**
   * Met à jour la configuration
   */
  static updateConfig(newConfig: Partial<ContinuousLearningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Configuration d\'apprentissage continu mise à jour:', this.config);
  }
}
