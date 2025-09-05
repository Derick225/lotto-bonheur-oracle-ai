import { DrawResult } from './lotteryAPI';
import { FeatureEngineering, MLPrediction, ModelMetrics } from './mlModels';

/**
 * Implémentation d'un modèle LightGBM simulé pour l'analyse des fréquences et écarts
 * Note: LightGBM natif n'est pas disponible dans le navigateur, cette implémentation 
 * simule les concepts clés avec une approche de boosting de gradients simplifié
 */
export class LightGBMModel {
  private trees: GradientBoostingTree[] = [];
  private featureImportance: Map<string, number> = new Map();
  private learningRate = 0.1;
  private numTrees = 100;
  private maxDepth = 6;
  private trained = false;

  constructor(
    learningRate = 0.1,
    numTrees = 100,
    maxDepth = 6
  ) {
    this.learningRate = learningRate;
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
  }

  /**
   * Entraîne le modèle sur les données historiques
   */
  async train(results: DrawResult[]): Promise<void> {
    console.log('Entraînement du modèle LightGBM...');
    
    const trainingData = this.prepareTrainingData(results);
    if (trainingData.features.length === 0) {
      throw new Error('Pas assez de données pour l\'entraînement');
    }

    // Initialisation des prédictions avec la moyenne
    let predictions = new Array(trainingData.labels.length).fill(0.5);
    
    // Construction des arbres de boosting
    for (let treeIndex = 0; treeIndex < this.numTrees; treeIndex++) {
      // Calcul des résidus (gradients)
      const residuals = trainingData.labels.map((label, i) => 
        label - predictions[i]
      );

      // Construction d'un arbre pour prédire les résidus
      const tree = new GradientBoostingTree(this.maxDepth);
      tree.fit(trainingData.features, residuals);
      
      this.trees.push(tree);

      // Mise à jour des prédictions
      predictions = predictions.map((pred, i) => 
        pred + this.learningRate * tree.predict(trainingData.features[i])
      );

      // Calcul de l'importance des features
      this.updateFeatureImportance(tree, trainingData.featureNames);
    }

    this.trained = true;
    console.log(`Modèle LightGBM entraîné avec ${this.trees.length} arbres`);
  }

  /**
   * Génère des prédictions pour les numéros
   */
  predict(results: DrawResult[], targetCount = 5): MLPrediction[] {
    if (!this.trained) {
      throw new Error('Le modèle doit être entraîné avant de faire des prédictions');
    }

    const features = this.extractPredictionFeatures(results);
    const predictions: MLPrediction[] = [];

    // Prédiction pour chaque numéro
    for (let number = 1; number <= 90; number++) {
      const numberFeatures = this.getNumberFeatures(features, number);
      
      let score = 0;
      
      // Agrégation des prédictions de tous les arbres
      for (const tree of this.trees) {
        score += this.learningRate * tree.predict(numberFeatures);
      }

      // Normalisation avec sigmoid
      const probability = 1 / (1 + Math.exp(-score));
      
      // Calcul de la confiance basée sur la variance des prédictions d'arbres
      const treeScores = this.trees.map(tree => tree.predict(numberFeatures));
      const variance = this.calculateVariance(treeScores);
      const confidence = Math.max(0.1, 1 - variance);

      // Incertitude basée sur la dispersion des features
      const uncertainty = Math.min(0.9, variance + 0.1);

      predictions.push({
        number,
        probability,
        confidence,
        uncertainty,
        features: this.getTopFeatures(number)
      });
    }

    // Trier par probabilité et retourner le top
    return predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, targetCount);
  }

  /**
   * Prépare les données d'entraînement
   */
  private prepareTrainingData(results: DrawResult[]) {
    const features: number[][] = [];
    const labels: number[] = [];
    const featureNames: string[] = [];

    // Générer les noms des features une seule fois
    for (let i = 1; i <= 90; i++) {
      featureNames.push(
        `freq_${i}`, `gap_${i}`, `momentum_${i}`, `volatility_${i}`,
        `trend_${i}`, `cyclical_${i}`, `cooccur_${i}`, `seasonal_${i}`
      );
    }

    // Créer les échantillons d'entraînement
    for (let i = 10; i < results.length - 1; i++) {
      const sequence = results.slice(i - 10, i);
      const target = results[i];
      
      // Extraire les features enrichies
      const featureSet = FeatureEngineering.extractFeatures(sequence, 10);
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

      // Pour chaque numéro, créer un échantillon
      for (let num = 1; num <= 90; num++) {
        const numberFeatures = this.getNumberFeatures(flatFeatures, num);
        const label = target.gagnants.includes(num) ? 1 : 0;
        
        features.push(numberFeatures);
        labels.push(label);
      }
    }

    return { features, labels, featureNames };
  }

  /**
   * Extrait les features pour la prédiction
   */
  private extractPredictionFeatures(results: DrawResult[]): number[] {
    const recent = results.slice(0, Math.min(50, results.length));
    const featureSet = FeatureEngineering.extractFeatures(recent, recent.length);
    
    return [
      ...featureSet.frequencies,
      ...featureSet.gaps,
      ...featureSet.momentum,
      ...featureSet.volatility,
      ...featureSet.temporalTrends,
      ...featureSet.cyclicalFeatures,
      ...featureSet.coOccurrences,
      ...featureSet.seasonality
    ];
  }

  /**
   * Obtient les features spécifiques à un numéro
   */
  private getNumberFeatures(allFeatures: number[], number: number): number[] {
    const idx = number - 1;
    const featuresPerNumber = 8; // freq, gap, momentum, volatility, trend, cyclical, cooccur, seasonal
    const totalFeatures = 90 * featuresPerNumber;
    
    if (allFeatures.length < totalFeatures) {
      console.warn('Pas assez de features, padding avec des zéros');
      allFeatures = [...allFeatures, ...new Array(totalFeatures - allFeatures.length).fill(0)];
    }

    return [
      allFeatures[idx], // frequency
      allFeatures[90 + idx], // gap
      allFeatures[180 + idx], // momentum
      allFeatures[270 + idx], // volatility
      allFeatures[360 + idx], // trend
      allFeatures[450 + idx], // cyclical
      allFeatures[540 + idx], // cooccur
      allFeatures[630 + idx] // seasonal
    ];
  }

  /**
   * Met à jour l'importance des features
   */
  private updateFeatureImportance(tree: GradientBoostingTree, featureNames: string[]): void {
    const importance = tree.getFeatureImportance();
    importance.forEach((value, index) => {
      const featureName = featureNames[index] || `feature_${index}`;
      const current = this.featureImportance.get(featureName) || 0;
      this.featureImportance.set(featureName, current + value);
    });
  }

  /**
   * Obtient les features les plus importantes pour un numéro
   */
  private getTopFeatures(number: number): string[] {
    const idx = number - 1;
    const features = [
      { name: `Fréquence_${number}`, importance: this.featureImportance.get(`freq_${number}`) || 0 },
      { name: `Écart_${number}`, importance: this.featureImportance.get(`gap_${number}`) || 0 },
      { name: `Momentum_${number}`, importance: this.featureImportance.get(`momentum_${number}`) || 0 },
      { name: `Tendance_${number}`, importance: this.featureImportance.get(`trend_${number}`) || 0 }
    ];

    return features
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map(f => f.name);
  }

  /**
   * Calcule la variance d'un tableau de valeurs
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Évalue les performances du modèle
   */
  async evaluate(testResults: DrawResult[]): Promise<Partial<ModelMetrics>> {
    if (!this.trained) {
      throw new Error('Le modèle doit être entraîné avant l\'évaluation');
    }

    const predictions = this.predict(testResults.slice(0, -1), 10);
    const actualNumbers = testResults[testResults.length - 1]?.gagnants || [];

    let hits = 0;
    let totalPredicted = predictions.length;
    
    predictions.forEach(pred => {
      if (actualNumbers.includes(pred.number)) {
        hits++;
      }
    });

    const accuracy = totalPredicted > 0 ? hits / totalPredicted : 0;
    const hitRate = hits / Math.max(1, actualNumbers.length);

    return {
      accuracy,
      hitRate,
      precision: accuracy, // Approximation
      recall: hitRate,
      f1Score: accuracy > 0 && hitRate > 0 ? 2 * (accuracy * hitRate) / (accuracy + hitRate) : 0
    };
  }

  /**
   * Retourne l'importance des features
   */
  getFeatureImportance(): Map<string, number> {
    return new Map(this.featureImportance);
  }
}

/**
 * Classe pour représenter un arbre de boosting de gradients
 */
class GradientBoostingTree {
  private root: TreeNode | null = null;
  private maxDepth: number;
  private featureImportance: number[] = [];

  constructor(maxDepth = 6) {
    this.maxDepth = maxDepth;
  }

  fit(features: number[][], targets: number[]): void {
    if (features.length === 0) return;
    
    const numFeatures = features[0].length;
    this.featureImportance = new Array(numFeatures).fill(0);
    
    this.root = this.buildTree(features, targets, 0);
  }

  predict(features: number[]): number {
    if (!this.root) return 0;
    return this.traverseTree(this.root, features);
  }

  getFeatureImportance(): number[] {
    return [...this.featureImportance];
  }

  private buildTree(features: number[][], targets: number[], depth: number): TreeNode | null {
    if (depth >= this.maxDepth || targets.length < 2) {
      const mean = targets.reduce((a, b) => a + b, 0) / targets.length;
      return { isLeaf: true, value: mean };
    }

    const bestSplit = this.findBestSplit(features, targets);
    if (!bestSplit) {
      const mean = targets.reduce((a, b) => a + b, 0) / targets.length;
      return { isLeaf: true, value: mean };
    }

    // Mise à jour de l'importance de la feature
    this.featureImportance[bestSplit.featureIndex] += bestSplit.importance;

    const { leftIndices, rightIndices } = this.splitData(features, { featureIndex: bestSplit.featureIndex, threshold: bestSplit.threshold });
    
    const leftFeatures = leftIndices.map(i => features[i]);
    const leftTargets = leftIndices.map(i => targets[i]);
    const rightFeatures = rightIndices.map(i => features[i]);
    const rightTargets = rightIndices.map(i => targets[i]);

    return {
      isLeaf: false,
      featureIndex: bestSplit.featureIndex,
      threshold: bestSplit.threshold,
      left: this.buildTree(leftFeatures, leftTargets, depth + 1),
      right: this.buildTree(rightFeatures, rightTargets, depth + 1)
    };
  }

  private findBestSplit(features: number[][], targets: number[]): BestSplit | null {
    let bestSplit: BestSplit | null = null;
    let bestGain = -Infinity;

    const parentVariance = this.calculateVariance(targets);

    for (let featureIndex = 0; featureIndex < features[0].length; featureIndex++) {
      const featureValues = features.map(f => f[featureIndex]);
      const uniqueValues = [...new Set(featureValues)].sort((a, b) => a - b);

      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        
        const { leftIndices, rightIndices } = this.splitData(features, { featureIndex, threshold });
        
        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftTargets = leftIndices.map(i => targets[i]);
        const rightTargets = rightIndices.map(i => targets[i]);

        const leftVariance = this.calculateVariance(leftTargets);
        const rightVariance = this.calculateVariance(rightTargets);

        const weightedVariance = 
          (leftTargets.length / targets.length) * leftVariance +
          (rightTargets.length / targets.length) * rightVariance;

        const gain = parentVariance - weightedVariance;

        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = {
            featureIndex,
            threshold,
            importance: gain
          };
        }
      }
    }

    return bestSplit;
  }

  private splitData(features: number[][], split: { featureIndex: number; threshold: number }): 
    { leftIndices: number[]; rightIndices: number[] } {
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];

    features.forEach((feature, index) => {
      if (feature[split.featureIndex] <= split.threshold) {
        leftIndices.push(index);
      } else {
        rightIndices.push(index);
      }
    });

    return { leftIndices, rightIndices };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private traverseTree(node: TreeNode, features: number[]): number {
    if (node.isLeaf) {
      return node.value!;
    }

    if (features[node.featureIndex!] <= node.threshold!) {
      return node.left ? this.traverseTree(node.left, features) : 0;
    } else {
      return node.right ? this.traverseTree(node.right, features) : 0;
    }
  }
}

interface TreeNode {
  isLeaf: boolean;
  value?: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

interface BestSplit {
  featureIndex: number;
  threshold: number;
  importance: number;
}