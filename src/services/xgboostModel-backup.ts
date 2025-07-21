import * as tf from '@tensorflow/tfjs';
import { DrawResult } from './lotteryAPI';
import { FeatureEngineering, ModelConfig, MLPrediction, ModelMetrics } from './mlModels';

/**
 * Implémentation d'un modèle de type XGBoost avec TensorFlow.js
 * Utilise un ensemble de réseaux de neurones pour simuler le gradient boosting
 */
export class XGBoostModel {
  private models: tf.LayersModel[] = [];
  private config: ModelConfig;
  private isTrained: boolean = false;
  private featureNames: string[] = [];
  private trainingHistory: any[] = [];

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = {
      sequenceLength: 10,
      hiddenUnits: 128,
      learningRate: 0.001,
      batchSize: 32,
      epochs: 100,
      validationSplit: 0.2,
      regularization: {
        l1: 0.01,
        l2: 0.01,
        dropout: 0.3
      },
      ...config
    };
  }

  /**
   * Crée un modèle de base pour l'ensemble (simulant un arbre de décision)
   */
  private createBaseModel(inputShape: number): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: this.config.hiddenUnits,
          activation: 'relu',
          inputShape: [inputShape],
          kernelRegularizer: tf.regularizers.l1l2({
            l1: this.config.regularization.l1,
            l2: this.config.regularization.l2
          })
        }),
        tf.layers.dropout({ rate: this.config.regularization.dropout }),
        tf.layers.dense({
          units: Math.floor(this.config.hiddenUnits / 2),
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l1l2({
            l1: this.config.regularization.l1,
            l2: this.config.regularization.l2
          })
        }),
        tf.layers.dropout({ rate: this.config.regularization.dropout }),
        tf.layers.dense({
          units: 90, // 90 numéros possibles
          activation: 'sigmoid' // Probabilités pour chaque numéro
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    });

    return model;
  }

  /**
   * Entraîne l'ensemble de modèles (gradient boosting simulé)
   */
  async train(results: DrawResult[]): Promise<ModelMetrics> {
    console.log('🚀 Début de l\'entraînement XGBoost...');
    
    if (results.length < 50) {
      throw new Error('Données insuffisantes pour l\'entraînement (minimum 50 tirages)');
    }

    // Préparer les données
    const { features, labels, featureNames } = FeatureEngineering.prepareTrainingData(
      results, 
      this.config.sequenceLength
    );
    
    this.featureNames = featureNames;
    const inputShape = features.shape[1] as number;

    // Créer plusieurs modèles pour l'ensemble (simulant les arbres de XGBoost)
    const numModels = 5;
    this.models = [];
    
    let residuals = labels.clone();
    const modelPredictions: tf.Tensor[] = [];

    for (let i = 0; i < numModels; i++) {
      console.log(`📊 Entraînement du modèle ${i + 1}/${numModels}...`);
      
      const model = this.createBaseModel(inputShape);
      
      // Entraîner sur les résidus (gradient boosting) avec early stopping
      const earlyStopping = tf.callbacks.earlyStopping({
        monitor: 'val_loss',
        patience: 15,
        restoreBestWeights: true
      });

      const reduceLROnPlateau = tf.callbacks.reduceLROnPlateau({
        monitor: 'val_loss',
        factor: 0.5,
        patience: 8,
        minLr: 0.00001
      });

      const history = await model.fit(features, residuals, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationSplit: this.config.validationSplit,
        verbose: 0,
        callbacks: [earlyStopping, reduceLROnPlateau, {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0) {
              console.log(`  Époque ${epoch}: loss=${logs?.loss?.toFixed(4)}, val_loss=${logs?.val_loss?.toFixed(4)}, acc=${logs?.acc?.toFixed(4)}`);
            }
          }
        }]
      });

      this.models.push(model);
      this.trainingHistory.push(history.history);

      // Calculer les prédictions et mettre à jour les résidus
      const predictions = model.predict(features) as tf.Tensor;
      modelPredictions.push(predictions);
      
      // Mettre à jour les résidus (différence entre labels et prédictions)
      const newResiduals = residuals.sub(predictions.mul(0.1)); // Learning rate pour le boosting
      residuals.dispose();
      residuals = newResiduals;
    }

    // Calculer les métriques finales
    const finalPredictions = this.combineModelPredictions(modelPredictions);
    const metrics = this.calculateMetrics(labels, finalPredictions);

    // Nettoyer la mémoire
    features.dispose();
    labels.dispose();
    residuals.dispose();
    modelPredictions.forEach(pred => pred.dispose());
    finalPredictions.dispose();

    this.isTrained = true;
    console.log('✅ Entraînement XGBoost terminé');
    console.log(`📈 Métriques: Accuracy=${metrics.accuracy.toFixed(3)}, F1=${metrics.f1Score.toFixed(3)}`);

    return metrics;
  }

  /**
   * Combine les prédictions de tous les modèles de l'ensemble
   */
  private combineModelPredictions(predictions: tf.Tensor[]): tf.Tensor {
    // Moyenne pondérée des prédictions (ensemble)
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1]; // Poids décroissants
    
    let combined = predictions[0].mul(weights[0]);
    for (let i = 1; i < predictions.length; i++) {
      combined = combined.add(predictions[i].mul(weights[i]));
    }
    
    return combined;
  }

  /**
   * Génère des prédictions pour un ensemble de données
   */
  async predict(results: DrawResult[]): Promise<MLPrediction[]> {
    if (!this.isTrained) {
      throw new Error('Le modèle doit être entraîné avant de faire des prédictions');
    }

    if (results.length < this.config.sequenceLength) {
      throw new Error(`Données insuffisantes pour la prédiction (minimum ${this.config.sequenceLength} tirages)`);
    }

    // Extraire les features pour les données récentes
    const recentResults = results.slice(0, this.config.sequenceLength);
    const featureSet = FeatureEngineering.extractFeatures(recentResults, this.config.sequenceLength);
    
    const flatFeatures = [
      ...featureSet.frequencies,
      ...featureSet.gaps,
      ...featureSet.momentum,
      ...featureSet.volatility,
      ...featureSet.temporalTrends
    ];

    const inputTensor = tf.tensor2d([flatFeatures]);

    // Prédictions de chaque modèle
    const modelPredictions: tf.Tensor[] = [];
    for (const model of this.models) {
      const pred = model.predict(inputTensor) as tf.Tensor;
      modelPredictions.push(pred);
    }

    // Combiner les prédictions
    const combinedPredictions = this.combineModelPredictions(modelPredictions);
    const probabilities = await combinedPredictions.data();

    // Calculer l'incertitude (variance entre les modèles)
    const uncertainties = await this.calculateUncertainty(modelPredictions);

    // Nettoyer la mémoire
    inputTensor.dispose();
    modelPredictions.forEach(pred => pred.dispose());
    combinedPredictions.dispose();

    // Créer les prédictions avec métadonnées
    const predictions: MLPrediction[] = [];
    for (let i = 0; i < 90; i++) {
      if (probabilities[i] > 0.01) { // Seuil minimum
        predictions.push({
          number: i + 1,
          probability: probabilities[i],
          confidence: 1 - uncertainties[i], // Confiance inversement proportionnelle à l'incertitude
          uncertainty: uncertainties[i],
          features: this.getTopFeatures(flatFeatures, i)
        });
      }
    }

    return predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 15); // Top 15 prédictions
  }

  /**
   * Calcule l'incertitude basée sur la variance entre les modèles
   */
  private async calculateUncertainty(modelPredictions: tf.Tensor[]): Promise<number[]> {
    const predictions = await Promise.all(
      modelPredictions.map(pred => pred.data())
    );

    const uncertainties: number[] = [];
    for (let i = 0; i < 90; i++) {
      const values = predictions.map(pred => pred[i]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      uncertainties.push(Math.sqrt(variance));
    }

    return uncertainties;
  }

  /**
   * Identifie les features les plus importantes pour une prédiction
   */
  private getTopFeatures(features: number[], numberIndex: number): string[] {
    const featureImportances: Array<{ name: string; value: number }> = [];
    
    // Calculer l'importance relative de chaque feature
    features.forEach((value, index) => {
      if (Math.abs(value) > 0.01) {
        featureImportances.push({
          name: this.featureNames[index] || `feature_${index}`,
          value: Math.abs(value)
        });
      }
    });

    return featureImportances
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(f => f.name);
  }

  /**
   * Calcule les métriques de performance avancées du modèle
   */
  private calculateMetrics(trueLabels: tf.Tensor, predictions: tf.Tensor): ModelMetrics {
    // Convertir en prédictions binaires (seuil à 0.5)
    const binaryPreds = predictions.greater(0.5);

    // Calculer les métriques de base
    const accuracy = tf.metrics.binaryAccuracy(trueLabels, predictions).dataSync()[0];
    const precision = tf.metrics.precision(trueLabels, binaryPreds).dataSync()[0];
    const recall = tf.metrics.recall(trueLabels, binaryPreds).dataSync()[0];

    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const logLoss = tf.losses.sigmoidCrossEntropy(trueLabels, predictions).dataSync()[0];

    // Calculer l'erreur de calibration
    const calibrationError = this.calculateCalibrationError(trueLabels, predictions);

    // Calculer le ratio de Sharpe (adapté pour la loterie)
    const sharpeRatio = this.calculateSharpeRatio(predictions);

    // Nettoyer
    binaryPreds.dispose();

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      logLoss,
      calibrationError,
      sharpeRatio,
      // Nouvelles métriques spécialisées (valeurs par défaut)
      hitRate: 0,
      coverageRate: 0,
      expectedValue: 0,
      consistencyScore: 0,
      diversityScore: 0,
      temporalStability: 0,
      uncertaintyCalibration: calibrationError
    };
  }

  /**
   * Calcule l'erreur de calibration (fiabilité des probabilités)
   */
  private calculateCalibrationError(trueLabels: tf.Tensor, predictions: tf.Tensor): number {
    // Implémentation simplifiée de l'Expected Calibration Error
    const numBins = 10;
    const predData = predictions.dataSync();
    const trueData = trueLabels.dataSync();
    
    let totalError = 0;
    let totalSamples = 0;

    for (let bin = 0; bin < numBins; bin++) {
      const binMin = bin / numBins;
      const binMax = (bin + 1) / numBins;
      
      let binCount = 0;
      let binAccuracy = 0;
      let binConfidence = 0;

      for (let i = 0; i < predData.length; i++) {
        if (predData[i] >= binMin && predData[i] < binMax) {
          binCount++;
          binAccuracy += trueData[i];
          binConfidence += predData[i];
        }
      }

      if (binCount > 0) {
        binAccuracy /= binCount;
        binConfidence /= binCount;
        totalError += binCount * Math.abs(binAccuracy - binConfidence);
        totalSamples += binCount;
      }
    }

    return totalSamples > 0 ? totalError / totalSamples : 0;
  }

  /**
   * Calcule le ratio de Sharpe adapté pour évaluer la qualité des prédictions
   */
  private calculateSharpeRatio(predictions: tf.Tensor): number {
    const predData = predictions.dataSync();
    const trueData = trueLabels.dataSync();
    
    // Calculer les "retours" basés sur les prédictions correctes
    const returns: number[] = [];
    for (let i = 0; i < predData.length; i++) {
      const return_ = trueData[i] * predData[i] - (1 - trueData[i]) * predData[i];
      returns.push(return_);
    }

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? meanReturn / stdDev : 0;
  }

  /**
   * Sauvegarde le modèle
   */
  async saveModel(path: string): Promise<void> {
    if (!this.isTrained) {
      throw new Error('Le modèle doit être entraîné avant d\'être sauvegardé');
    }

    for (let i = 0; i < this.models.length; i++) {
      await this.models[i].save(`${path}/xgboost_model_${i}`);
    }
  }

  /**
   * Charge un modèle sauvegardé
   */
  async loadModel(path: string): Promise<void> {
    this.models = [];
    
    for (let i = 0; i < 5; i++) { // Nombre de modèles dans l'ensemble
      try {
        const model = await tf.loadLayersModel(`${path}/xgboost_model_${i}/model.json`);
        this.models.push(model);
      } catch (error) {
        console.warn(`Impossible de charger le modèle ${i}:`, error);
      }
    }

    this.isTrained = this.models.length > 0;
  }

  /**
   * Libère la mémoire utilisée par les modèles
   */
  dispose(): void {
    this.models.forEach(model => model.dispose());
    this.models = [];
    this.isTrained = false;
  }

  /**
   * Retourne les informations sur le modèle
   */
  getModelInfo(): any {
    return {
      isTrained: this.isTrained,
      numModels: this.models.length,
      config: this.config,
      trainingHistory: this.trainingHistory
    };
  }
}
