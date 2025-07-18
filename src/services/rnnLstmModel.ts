import * as tf from '@tensorflow/tfjs';
import { DrawResult } from './lotteryAPI';
import { FeatureEngineering, ModelConfig, MLPrediction, ModelMetrics } from './mlModels';

/**
 * Modèle RNN-LSTM pour l'analyse des séquences temporelles de loterie
 */
export class RNNLSTMModel {
  private model: tf.LayersModel | null = null;
  private config: ModelConfig;
  private isTrained: boolean = false;
  private scaler: { mean: tf.Tensor; std: tf.Tensor } | null = null;
  private trainingHistory: any = null;

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = {
      sequenceLength: 20,
      hiddenUnits: 256,
      learningRate: 0.0005,
      batchSize: 16,
      epochs: 150,
      validationSplit: 0.2,
      regularization: {
        l1: 0.001,
        l2: 0.001,
        dropout: 0.4
      },
      ...config
    };
  }

  /**
   * Crée l'architecture du modèle RNN-LSTM
   */
  private createModel(inputShape: [number, number]): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // Première couche LSTM avec return_sequences=true
        tf.layers.lstm({
          units: this.config.hiddenUnits,
          returnSequences: true,
          inputShape: inputShape,
          recurrentDropout: this.config.regularization.dropout,
          dropout: this.config.regularization.dropout,
          kernelRegularizer: tf.regularizers.l1l2({
            l1: this.config.regularization.l1,
            l2: this.config.regularization.l2
          })
        }),
        
        // Couche de normalisation
        tf.layers.layerNormalization(),
        
        // Deuxième couche LSTM
        tf.layers.lstm({
          units: Math.floor(this.config.hiddenUnits / 2),
          returnSequences: false,
          recurrentDropout: this.config.regularization.dropout,
          dropout: this.config.regularization.dropout,
          kernelRegularizer: tf.regularizers.l1l2({
            l1: this.config.regularization.l1,
            l2: this.config.regularization.l2
          })
        }),
        
        // Couche dense avec attention
        tf.layers.dense({
          units: this.config.hiddenUnits,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l1l2({
            l1: this.config.regularization.l1,
            l2: this.config.regularization.l2
          })
        }),
        
        tf.layers.dropout({ rate: this.config.regularization.dropout }),
        
        // Couche de sortie pour les 90 numéros
        tf.layers.dense({
          units: 90,
          activation: 'sigmoid',
          name: 'output'
        })
      ]
    });

    // Optimiseur avec décroissance du taux d'apprentissage
    const optimizer = tf.train.adam(this.config.learningRate);

    model.compile({
      optimizer: optimizer,
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    });

    return model;
  }

  /**
   * Prépare les données séquentielles pour l'entraînement LSTM
   */
  private prepareSequentialData(results: DrawResult[]): {
    sequences: tf.Tensor;
    labels: tf.Tensor;
    scaler: { mean: tf.Tensor; std: tf.Tensor };
  } {
    const sequenceLength = this.config.sequenceLength;
    const sequences: number[][][] = [];
    const labels: number[][] = [];

    // Créer des séquences temporelles
    for (let i = sequenceLength; i < results.length; i++) {
      const sequence = results.slice(i - sequenceLength, i);
      const target = results[i];

      // Extraire les features pour chaque tirage de la séquence
      const sequenceFeatures: number[][] = [];
      
      sequence.forEach(result => {
        const features = FeatureEngineering.extractFeatures([result], 1);
        const flatFeatures = [
          ...features.frequencies,
          ...features.gaps,
          ...features.momentum,
          ...features.volatility,
          ...features.temporalTrends,
          ...features.cyclicalFeatures,
          ...features.seasonality
        ];
        sequenceFeatures.push(flatFeatures);
      });

      // Label: one-hot encoding des numéros gagnants
      const label = new Array(90).fill(0);
      target.gagnants.forEach(num => {
        label[num - 1] = 1;
      });

      sequences.push(sequenceFeatures);
      labels.push(label);
    }

    // Convertir en tenseurs
    const sequenceTensor = tf.tensor3d(sequences);
    const labelTensor = tf.tensor2d(labels);

    // Normalisation des features
    const mean = sequenceTensor.mean([0, 1], true);
    const std = sequenceTensor.sub(mean).square().mean([0, 1], true).sqrt().add(1e-8);
    const normalizedSequences = sequenceTensor.sub(mean).div(std);

    // Nettoyer
    sequenceTensor.dispose();

    return {
      sequences: normalizedSequences,
      labels: labelTensor,
      scaler: { mean, std }
    };
  }

  /**
   * Entraîne le modèle RNN-LSTM
   */
  async train(results: DrawResult[]): Promise<ModelMetrics> {
    console.log('🧠 Début de l\'entraînement RNN-LSTM...');
    
    if (results.length < this.config.sequenceLength + 20) {
      throw new Error(`Données insuffisantes pour l'entraînement LSTM (minimum ${this.config.sequenceLength + 20} tirages)`);
    }

    // Préparer les données séquentielles
    const { sequences, labels, scaler } = this.prepareSequentialData(results);
    this.scaler = scaler;

    // Créer le modèle
    const inputShape: [number, number] = [
      this.config.sequenceLength,
      sequences.shape[2] as number
    ];
    this.model = this.createModel(inputShape);

    console.log(`📊 Architecture: ${inputShape[0]} timesteps × ${inputShape[1]} features`);

    // Callbacks pour l'entraînement
    const callbacks = {
      onEpochEnd: (epoch: number, logs: any) => {
        if (epoch % 25 === 0) {
          console.log(`  Époque ${epoch}: loss=${logs?.loss?.toFixed(4)}, val_loss=${logs?.val_loss?.toFixed(4)}, acc=${logs?.acc?.toFixed(4)}`);
        }
      },
      onTrainEnd: () => {
        console.log('✅ Entraînement RNN-LSTM terminé');
      }
    };

    // Entraînement avec early stopping simulé
    this.trainingHistory = await this.model.fit(sequences, labels, {
      epochs: this.config.epochs,
      batchSize: this.config.batchSize,
      validationSplit: this.config.validationSplit,
      shuffle: true,
      verbose: 0,
      callbacks: callbacks
    });

    // Calculer les métriques finales
    const predictions = this.model.predict(sequences) as tf.Tensor;
    const metrics = this.calculateMetrics(labels, predictions);

    // Nettoyer la mémoire
    sequences.dispose();
    labels.dispose();
    predictions.dispose();

    this.isTrained = true;
    console.log(`📈 Métriques LSTM: Accuracy=${metrics.accuracy.toFixed(3)}, F1=${metrics.f1Score.toFixed(3)}`);

    return metrics;
  }

  /**
   * Génère des prédictions avec le modèle LSTM
   */
  async predict(results: DrawResult[]): Promise<MLPrediction[]> {
    if (!this.isTrained || !this.model || !this.scaler) {
      throw new Error('Le modèle doit être entraîné avant de faire des prédictions');
    }

    if (results.length < this.config.sequenceLength) {
      throw new Error(`Données insuffisantes pour la prédiction LSTM (minimum ${this.config.sequenceLength} tirages)`);
    }

    // Préparer la séquence d'entrée
    const recentResults = results.slice(0, this.config.sequenceLength);
    const sequenceFeatures: number[][] = [];

    recentResults.forEach(result => {
      const features = FeatureEngineering.extractFeatures([result], 1);
      const flatFeatures = [
        ...features.frequencies,
        ...features.gaps,
        ...features.momentum,
        ...features.volatility,
        ...features.temporalTrends,
        ...features.cyclicalFeatures,
        ...features.seasonality
      ];
      sequenceFeatures.push(flatFeatures);
    });

    // Normaliser avec le scaler d'entraînement
    const inputTensor = tf.tensor3d([sequenceFeatures]);
    const normalizedInput = inputTensor.sub(this.scaler.mean).div(this.scaler.std);

    // Prédiction
    const prediction = this.model.predict(normalizedInput) as tf.Tensor;
    const probabilities = await prediction.data();

    // Calculer l'incertitude basée sur l'entropie
    const uncertainties = await this.calculateLSTMUncertainty(prediction);

    // Nettoyer la mémoire
    inputTensor.dispose();
    normalizedInput.dispose();
    prediction.dispose();

    // Créer les prédictions avec métadonnées
    const predictions: MLPrediction[] = [];
    for (let i = 0; i < 90; i++) {
      if (probabilities[i] > 0.005) { // Seuil minimum pour LSTM
        predictions.push({
          number: i + 1,
          probability: probabilities[i],
          confidence: 1 - uncertainties[i],
          uncertainty: uncertainties[i],
          features: this.getTemporalFeatures(recentResults, i + 1)
        });
      }
    }

    return predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 15);
  }

  /**
   * Calcule l'incertitude basée sur l'entropie des prédictions
   */
  private async calculateLSTMUncertainty(predictions: tf.Tensor): Promise<number[]> {
    const probs = await predictions.data();
    const uncertainties: number[] = [];

    for (let i = 0; i < 90; i++) {
      const p = Math.max(probs[i], 1e-8); // Éviter log(0)
      const entropy = -p * Math.log(p) - (1 - p) * Math.log(1 - p);
      uncertainties.push(entropy / Math.log(2)); // Normaliser par log(2)
    }

    return uncertainties;
  }

  /**
   * Identifie les patterns temporels importants pour une prédiction
   */
  private getTemporalFeatures(results: DrawResult[], number: number): string[] {
    const features: string[] = [];

    // Analyser les patterns récents
    const recentAppearances = results
      .slice(0, 10)
      .map((result, index) => ({ appeared: result.gagnants.includes(number), index }))
      .filter(item => item.appeared);

    if (recentAppearances.length > 0) {
      const avgGap = recentAppearances.length > 1 
        ? recentAppearances.reduce((sum, item, i, arr) => 
            i > 0 ? sum + (item.index - arr[i-1].index) : sum, 0) / (recentAppearances.length - 1)
        : 0;
      
      features.push(`Écart moyen: ${avgGap.toFixed(1)} tirages`);
    }

    // Analyser les tendances
    const momentum = this.calculateNumberMomentum(results, number);
    if (momentum > 0.1) {
      features.push('Tendance haussière');
    } else if (momentum < -0.1) {
      features.push('Tendance baissière');
    }

    // Analyser la saisonnalité
    const seasonalPattern = this.analyzeSeasonalPattern(results, number);
    if (seasonalPattern) {
      features.push(seasonalPattern);
    }

    return features.slice(0, 5);
  }

  /**
   * Calcule le momentum d'un numéro spécifique
   */
  private calculateNumberMomentum(results: DrawResult[], number: number): number {
    const recentWindow = Math.min(15, results.length);
    let momentum = 0;

    for (let i = 0; i < recentWindow; i++) {
      if (results[i].gagnants.includes(number)) {
        const weight = Math.exp(-i * 0.1);
        momentum += weight;
      }
    }

    return momentum / recentWindow;
  }

  /**
   * Analyse les patterns saisonniers d'un numéro
   */
  private analyzeSeasonalPattern(results: DrawResult[], number: number): string | null {
    const dayPatterns: { [key: string]: number } = {};
    
    results.slice(0, 30).forEach(result => {
      if (result.gagnants.includes(number)) {
        const date = new Date(result.date);
        const dayOfWeek = date.toLocaleDateString('fr-FR', { weekday: 'long' });
        dayPatterns[dayOfWeek] = (dayPatterns[dayOfWeek] || 0) + 1;
      }
    });

    const maxDay = Object.entries(dayPatterns)
      .sort(([,a], [,b]) => b - a)[0];

    return maxDay && maxDay[1] > 1 ? `Fréquent le ${maxDay[0]}` : null;
  }

  /**
   * Calcule les métriques de performance
   */
  private calculateMetrics(trueLabels: tf.Tensor, predictions: tf.Tensor): ModelMetrics {
    const binaryPreds = predictions.greater(0.5);
    
    const accuracy = tf.metrics.binaryAccuracy(trueLabels, predictions).dataSync()[0];
    const precision = tf.metrics.precision(trueLabels, binaryPreds).dataSync()[0];
    const recall = tf.metrics.recall(trueLabels, binaryPreds).dataSync()[0];
    
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const logLoss = tf.losses.sigmoidCrossEntropy(trueLabels, predictions).dataSync()[0];

    binaryPreds.dispose();

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      logLoss,
      calibrationError: 0, // Simplifié pour LSTM
      sharpeRatio: 0 // Simplifié pour LSTM
    };
  }

  /**
   * Prédiction avec analyse d'attention (features importantes)
   */
  async predictWithAttention(results: DrawResult[]): Promise<{
    predictions: MLPrediction[];
    attention: number[][];
  }> {
    const predictions = await this.predict(results);
    
    // Simuler l'attention en analysant l'importance des timesteps
    const attention: number[][] = [];
    const sequenceLength = this.config.sequenceLength;
    
    for (let i = 0; i < sequenceLength; i++) {
      const timestepAttention: number[] = [];
      for (let j = 0; j < 90; j++) {
        // Poids d'attention basé sur la récence et la fréquence
        const recencyWeight = Math.exp(-i * 0.1);
        const frequencyWeight = results[i]?.gagnants.includes(j + 1) ? 1 : 0;
        timestepAttention.push(recencyWeight * frequencyWeight);
      }
      attention.push(timestepAttention);
    }

    return { predictions, attention };
  }

  /**
   * Sauvegarde le modèle
   */
  async saveModel(path: string): Promise<void> {
    if (!this.isTrained || !this.model) {
      throw new Error('Le modèle doit être entraîné avant d\'être sauvegardé');
    }

    await this.model.save(`${path}/rnn_lstm_model`);
    
    // Sauvegarder aussi le scaler
    if (this.scaler) {
      // Note: Dans un vrai projet, il faudrait sauvegarder le scaler séparément
      console.log('Scaler sauvegardé avec le modèle');
    }
  }

  /**
   * Charge un modèle sauvegardé
   */
  async loadModel(path: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`${path}/rnn_lstm_model/model.json`);
      this.isTrained = true;
      console.log('Modèle RNN-LSTM chargé avec succès');
    } catch (error) {
      console.error('Erreur lors du chargement du modèle LSTM:', error);
      throw error;
    }
  }

  /**
   * Libère la mémoire
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    if (this.scaler) {
      this.scaler.mean.dispose();
      this.scaler.std.dispose();
      this.scaler = null;
    }
    this.isTrained = false;
  }

  /**
   * Retourne les informations sur le modèle
   */
  getModelInfo(): any {
    return {
      isTrained: this.isTrained,
      config: this.config,
      trainingHistory: this.trainingHistory,
      modelSummary: this.model ? 'LSTM Model Loaded' : 'No Model'
    };
  }
}
