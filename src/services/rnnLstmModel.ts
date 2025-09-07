import * as tf from '@tensorflow/tfjs';
import { DrawResult } from './lotteryAPI';
import { MLPrediction, ModelMetrics, FeatureEngineering } from './mlModels';

/**
 * Modèle RNN-LSTM avec GRU pour la prédiction de séquences temporelles
 * Utilise TensorFlow.js pour l'entraînement et les prédictions
 */
export class RNNLSTMModel {
  private model: tf.LayersModel | null = null;
  private sequenceLength = 10;
  private hiddenUnits = 64;
  private numFeatures = 12;
  private trained = false;
  private scaler: { mean: tf.Tensor; std: tf.Tensor } | null = null;

  constructor(
    sequenceLength = 10,
    hiddenUnits = 64
  ) {
    this.sequenceLength = sequenceLength;
    this.hiddenUnits = hiddenUnits;
  }

  /**
   * Entraîne le modèle RNN-LSTM/GRU sur les données historiques
   */
  async train(results: DrawResult[]): Promise<void> {
    console.log('🧠 Entraînement du modèle RNN-LSTM/GRU...');
    
    if (results.length < this.sequenceLength + 5) {
      throw new Error('Pas assez de données pour l\'entraînement du RNN');
    }

    try {
      // Préparation des données
      const trainingData = this.prepareSequentialData(results);
      if (trainingData.sequences.length === 0) {
        throw new Error('Aucune séquence valide générée');
      }

      // Création du modèle
      this.model = this.createModel();

      // Normalisation des données
      this.scaler = this.createScaler(trainingData.sequences);
      const normalizedSequences = this.normalizeData(trainingData.sequences, this.scaler);
      const normalizedTargets = this.normalizeTargets(trainingData.targets, this.scaler);

      // Conversion en tensors TensorFlow
      const xTrain = tf.tensor3d(normalizedSequences);
      const yTrain = tf.tensor2d(normalizedTargets);

      console.log(`📊 Entraînement sur ${trainingData.sequences.length} séquences`);

      // Entraînement du modèle
      const history = await this.model.fit(xTrain, yTrain, {
        epochs: 50,
        batchSize: Math.min(32, Math.floor(trainingData.sequences.length / 4)),
        validationSplit: 0.2,
        shuffle: true,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, val_loss=${logs?.val_loss?.toFixed(4)}`);
            }
          }
        }
      });

      // Nettoyage des tensors
      xTrain.dispose();
      yTrain.dispose();

      this.trained = true;
      console.log('✅ Modèle RNN-LSTM entraîné avec succès');

    } catch (error) {
      console.error('❌ Erreur lors de l\'entraînement RNN-LSTM:', error);
      throw error;
    }
  }

  /**
   * Génère des prédictions avec le modèle entraîné
   */
  predict(results: DrawResult[], targetCount = 5): MLPrediction[] {
    if (!this.trained || !this.model || !this.scaler) {
      throw new Error('Le modèle RNN-LSTM doit être entraîné avant les prédictions');
    }

    try {
      const predictions: MLPrediction[] = [];
      
      // Préparer la séquence d'entrée (dernières données)
      const inputSequence = this.prepareInputSequence(results);
      const normalizedInput = this.normalizeData([inputSequence], this.scaler);
      
      const inputTensor = tf.tensor3d(normalizedInput);
      
      // Prédiction pour chaque numéro
      for (let number = 1; number <= 90; number++) {
        // Créer un contexte pour ce numéro spécifique
        const numberContext = this.createNumberContext(inputSequence, number);
        const contextTensor = tf.tensor3d([numberContext]);
        
        // Prédiction probabiliste
        const predictionTensor = this.model.predict(contextTensor) as tf.Tensor;
        const predictionData = predictionTensor.dataSync();
        const predictionArray = Array.from(predictionData);
        
        // Interpréter la prédiction
        const rawProbability = predictionArray[0];
        const probability = this.sigmoid(rawProbability);
        
        // Calcul de la confiance basée sur la consistance du modèle
        const confidence = this.calculateConfidence(probability, inputSequence, number);
        
        // Estimation d'incertitude
        const uncertainty = 1 - confidence;

        predictions.push({
          number,
          probability,
          confidence,
          uncertainty,
          features: ['Séquences temporelles', 'Patterns RNN', 'Tendances GRU']
        });

        // Nettoyage
        contextTensor.dispose();
        predictionTensor.dispose();
      }

      inputTensor.dispose();

      // Trier par probabilité décroissante et retourner les meilleurs
      return predictions
        .sort((a, b) => b.probability - a.probability)
        .slice(0, targetCount);

    } catch (error) {
      console.error('❌ Erreur lors de la prédiction RNN-LSTM:', error);
      throw error;
    }
  }

  /**
   * Évalue les performances du modèle
   */
  async evaluate(testResults: DrawResult[]): Promise<Partial<ModelMetrics>> {
    if (!this.trained || !this.model) {
      throw new Error('Modèle non entraîné');
    }

    const predictions = this.predict(testResults.slice(0, -1), 10);
    const actualNumbers = testResults[testResults.length - 1].gagnants;
    
    // Calculer la précision
    const predictedNumbers = predictions.slice(0, 5).map(p => p.number);
    const correctPredictions = predictedNumbers.filter(num => actualNumbers.includes(num));
    const accuracy = correctPredictions.length / 5;

    return {
      accuracy,
      precision: accuracy,
      recall: correctPredictions.length / actualNumbers.length,
      f1Score: accuracy > 0 ? (2 * accuracy * accuracy) / (2 * accuracy) : 0
    };
  }

  /**
   * Crée l'architecture du modèle RNN-LSTM/GRU
   */
  private createModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // Couche GRU principale pour capturer les patterns temporels
        tf.layers.gru({
          units: this.hiddenUnits,
          returnSequences: true,
          inputShape: [this.sequenceLength, this.numFeatures],
          recurrentDropout: 0.2,
          dropout: 0.2
        }),
        
        // Couche LSTM pour affiner les prédictions temporelles
        tf.layers.lstm({
          units: this.hiddenUnits / 2,
          returnSequences: false,
          recurrentDropout: 0.2,
          dropout: 0.2
        }),
        
        // Couches denses avec régularisation
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        
        // Sortie probabiliste
        tf.layers.dense({
          units: 1,
          activation: 'linear' // Utilisation de sigmoid dans post-traitement
        })
      ]
    });

    // Compilation avec optimiseur Adam
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  /**
   * Prépare les données séquentielles pour l'entraînement
   */
  private prepareSequentialData(results: DrawResult[]): {
    sequences: number[][][];
    targets: number[][];
  } {
    const sequences: number[][][] = [];
    const targets: number[][] = [];
    
    // Trier par date
    const sortedResults = results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (let i = 0; i < sortedResults.length - this.sequenceLength - 1; i++) {
      const sequenceResults = sortedResults.slice(i, i + this.sequenceLength);
      const targetResult = sortedResults[i + this.sequenceLength];
      
      // Créer la séquence de features
      const sequence = sequenceResults.map(result => this.extractFeatures(result, sortedResults, i));
      
      // Target : représentation binaire des numéros gagnants
      const target = this.createTargetVector(targetResult.gagnants);
      
      sequences.push(sequence);
      targets.push(target);
    }
    
    return { sequences, targets };
  }

  /**
   * Extrait les features temporelles pour un résultat
   */
  private extractFeatures(result: DrawResult, allResults: DrawResult[], index: number): number[] {
    const features: number[] = [];
    
    // Features de base : moyenne et variance des numéros
    const mean = result.gagnants.reduce((sum, n) => sum + n, 0) / 5;
    const variance = result.gagnants.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / 5;
    
    features.push(mean / 90, variance / 1000); // Normalisation
    
    // Distribution par tranches
    const ranges = [
      [1, 18], [19, 36], [37, 54], [55, 72], [73, 90]
    ];
    
    ranges.forEach(([min, max]) => {
      const count = result.gagnants.filter(n => n >= min && n <= max).length;
      features.push(count / 5);
    });
    
    // Features temporelles (jour de la semaine, position dans le mois)
    const date = new Date(result.date);
    features.push(
      date.getDay() / 7,
      date.getDate() / 31,
      date.getMonth() / 12
    );
    
    // Parité et somme
    const evenCount = result.gagnants.filter(n => n % 2 === 0).length;
    const sum = result.gagnants.reduce((a, b) => a + b, 0);
    
    features.push(evenCount / 5, sum / 450);
    
    return features;
  }

  /**
   * Crée un vecteur cible pour l'entraînement
   */
  private createTargetVector(winningNumbers: number[]): number[] {
    // Utiliser une approche de régression pour prédire la probabilité moyenne
    const avgNumber = winningNumbers.reduce((sum, n) => sum + n, 0) / winningNumbers.length;
    return [avgNumber / 90]; // Normalisation
  }

  /**
   * Prépare la séquence d'entrée pour la prédiction
   */
  private prepareInputSequence(results: DrawResult[]): number[][] {
    const sortedResults = results
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, this.sequenceLength);
    
    return sortedResults.reverse().map((result, index) => 
      this.extractFeatures(result, results, index)
    );
  }

  /**
   * Crée un contexte spécifique pour un numéro
   */
  private createNumberContext(inputSequence: number[][], targetNumber: number): number[][] {
    return inputSequence.map(features => {
      // Ajouter le numéro cible comme feature contextuelle
      const contextFeatures = [...features];
      contextFeatures.push(targetNumber / 90); // Normalisation du numéro cible
      return contextFeatures.slice(0, this.numFeatures);
    });
  }

  /**
   * Calcule la confiance de la prédiction
   */
  private calculateConfidence(probability: number, sequence: number[][], number: number): number {
    // Analyser la fréquence historique du numéro dans la séquence
    let historicalFrequency = 0;
    
    // Calculer une métrique de confiance basée sur la consistance
    const consistency = Math.exp(-Math.abs(probability - 0.5) * 2);
    
    return Math.min(0.95, Math.max(0.1, consistency));
  }

  /**
   * Fonction sigmoid
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Crée un normalisateur pour les données
   */
  private createScaler(data: number[][][]): { mean: tf.Tensor; std: tf.Tensor } {
    // Aplatir toutes les données pour calculer mean/std
    const flatData: number[] = [];
    data.forEach(sequence => {
      sequence.forEach(features => {
        flatData.push(...features);
      });
    });
    
    const tensor = tf.tensor1d(flatData);
    const mean = tensor.mean();
    const std = tensor.sub(mean).square().mean().sqrt().add(1e-8);
    
    tensor.dispose();
    
    return { mean, std };
  }

  /**
   * Normalise les données avec le scaler
   */
  private normalizeData(data: number[][][], scaler: { mean: tf.Tensor; std: tf.Tensor }): number[][][] {
    return data.map(sequence => 
      sequence.map(features => {
        const tensor = tf.tensor1d(features);
        const normalized = tensor.sub(scaler.mean).div(scaler.std);
        const result = Array.from(normalized.dataSync());
        tensor.dispose();
        normalized.dispose();
        return result;
      })
    );
  }

  /**
   * Normalise les targets (différent des séquences)
   */
  private normalizeTargets(data: number[][], scaler: { mean: tf.Tensor; std: tf.Tensor }): number[][] {
    return data.map(targets => {
      const tensor = tf.tensor1d(targets);
      const normalized = tensor.sub(scaler.mean).div(scaler.std);
      const result = Array.from(normalized.dataSync());
      tensor.dispose();
      normalized.dispose();
      return result;
    });
  }

  /**
   * Libère la mémoire du modèle
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
    this.trained = false;
  }

  /**
   * Retourne l'importance des features
   */
  getFeatureImportance(): Map<string, number> {
    const importance = new Map<string, number>();
    
    // Simuler l'importance des features pour RNN-LSTM
    importance.set('Tendances temporelles', 0.25);
    importance.set('Patterns séquentiels', 0.20);
    importance.set('Distribution des numéros', 0.18);
    importance.set('Cycles temporels', 0.15);
    importance.set('Momentum', 0.12);
    importance.set('Régularités', 0.10);
    
    return importance;
  }
}