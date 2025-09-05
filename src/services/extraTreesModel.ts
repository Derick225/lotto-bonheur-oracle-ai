import { DrawResult } from './lotteryAPI';
import { FeatureEngineering, MLPrediction, ModelMetrics } from './mlModels';

/**
 * Implémentation d'un modèle Extra Trees (Extremely Randomized Trees)
 * pour la validation des interactions entre numéros
 */
export class ExtraTreesModel {
  private trees: RandomizedTree[] = [];
  private numTrees = 50;
  private maxDepth = 10;
  private minSamplesSplit = 2;
  private randomSeed = 42;
  private trained = false;
  private featureImportance: Map<string, number> = new Map();

  constructor(
    numTrees = 50,
    maxDepth = 10,
    minSamplesSplit = 2,
    randomSeed = 42
  ) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.randomSeed = randomSeed;
  }

  /**
   * Entraîne le modèle Extra Trees
   */
  async train(results: DrawResult[]): Promise<void> {
    console.log('Entraînement du modèle Extra Trees...');
    
    const trainingData = this.prepareTrainingData(results);
    if (trainingData.features.length === 0) {
      throw new Error('Pas assez de données pour l\'entraînement');
    }

    this.trees = [];
    
    // Construction des arbres avec randomisation maximale
    for (let i = 0; i < this.numTrees; i++) {
      const tree = new RandomizedTree(
        this.maxDepth, 
        this.minSamplesSplit, 
        this.randomSeed + i
      );

      // Bootstrap sampling avec randomisation
      const { bootstrapFeatures, bootstrapLabels } = this.createBootstrapSample(
        trainingData.features, 
        trainingData.labels
      );

      await tree.fit(bootstrapFeatures, bootstrapLabels, trainingData.featureNames);
      this.trees.push(tree);

      // Agrégation de l'importance des features
      this.aggregateFeatureImportance(tree, trainingData.featureNames);
    }

    this.trained = true;
    console.log(`Modèle Extra Trees entraîné avec ${this.trees.length} arbres`);
  }

  /**
   * Génère des prédictions en validant les interactions entre numéros
   */
  predict(results: DrawResult[], targetCount = 5): MLPrediction[] {
    if (!this.trained) {
      throw new Error('Le modèle doit être entraîné avant de faire des prédictions');
    }

    const features = this.extractPredictionFeatures(results);
    const predictions: MLPrediction[] = [];

    // Analyse des interactions pour chaque numéro
    for (let number = 1; number <= 90; number++) {
      const numberFeatures = this.getNumberFeatures(features, number);
      const interactionScores = this.calculateInteractionScores(results, number);
      
      // Prédictions de tous les arbres
      const treePredictions = this.trees.map(tree => tree.predict(numberFeatures));
      
      // Agrégation avec pondération par les interactions
      const probability = this.aggregatePredictions(treePredictions, interactionScores);
      
      // Calcul de la confiance basée sur la variance des prédictions
      const variance = this.calculateVariance(treePredictions);
      const confidence = Math.max(0.1, 1 - variance);
      
      // Incertitude inversement proportionnelle à la confiance
      const uncertainty = Math.min(0.9, variance + 0.1);

      predictions.push({
        number,
        probability,
        confidence,
        uncertainty,
        features: this.getTopInteractionFeatures(number, results)
      });
    }

    // Validation croisée des interactions entre les numéros sélectionnés
    const sortedPredictions = predictions.sort((a, b) => b.probability - a.probability);
    const validatedPredictions = this.validateInteractions(sortedPredictions, results);

    return validatedPredictions.slice(0, targetCount);
  }

  /**
   * Prépare les données d'entraînement avec focus sur les interactions
   */
  private prepareTrainingData(results: DrawResult[]) {
    const features: number[][] = [];
    const labels: number[] = [];
    const featureNames: string[] = [];

    // Générer les noms des features incluant les interactions
    for (let i = 1; i <= 90; i++) {
      featureNames.push(
        `freq_${i}`, `gap_${i}`, `momentum_${i}`, `cooccur_${i}`,
        `interaction_strength_${i}`, `pair_frequency_${i}`, 
        `sequential_probability_${i}`, `cluster_membership_${i}`
      );
    }

    // Créer les échantillons d'entraînement
    for (let i = 15; i < results.length - 1; i++) {
      const sequence = results.slice(i - 15, i);
      const target = results[i];
      
      // Extraire features de base
      const baseFeatures = FeatureEngineering.extractFeatures(sequence, 15);
      
      // Ajouter features d'interaction spécialisées
      const interactionFeatures = this.calculateInteractionFeatures(sequence);
      const correlationFeatures = FeatureEngineering.calculateCorrelationFeatures(sequence);
      const sequenceFeatures = FeatureEngineering.calculateSequenceFeatures(sequence);
      
      const flatFeatures = [
        ...baseFeatures.frequencies,
        ...baseFeatures.gaps,
        ...baseFeatures.momentum,
        ...baseFeatures.coOccurrences,
        ...interactionFeatures,
        ...correlationFeatures,
        ...sequenceFeatures
      ];

      // Pour chaque numéro, créer un échantillon avec contexte d'interaction
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
   * Calcule des features d'interaction spécialisées
   */
  private calculateInteractionFeatures(results: DrawResult[]): number[] {
    const interactions = new Array(90).fill(0);
    
    results.forEach((result, index) => {
      const timeWeight = Math.exp(-index * 0.02);
      const numbers = result.gagnants;
      
      // Analyser les interactions pair-wise
      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          const num1 = numbers[i] - 1;
          const num2 = numbers[j] - 1;
          
          // Force d'interaction basée sur la co-occurrence
          const interactionStrength = this.calculatePairInteraction(num1 + 1, num2 + 1, results);
          
          interactions[num1] += interactionStrength * timeWeight;
          interactions[num2] += interactionStrength * timeWeight;
        }
      }
      
      // Analyser les patterns de séquence
      if (index > 0) {
        const prevNumbers = results[index - 1].gagnants;
        const sharedNumbers = numbers.filter(n => prevNumbers.includes(n));
        
        sharedNumbers.forEach(num => {
          interactions[num - 1] += 0.5 * timeWeight; // Bonus de continuité
        });
      }
    });

    // Normalisation
    const maxInteraction = Math.max(...interactions.map(Math.abs));
    return interactions.map(inter => maxInteraction > 0 ? inter / maxInteraction : 0);
  }

  /**
   * Calcule la force d'interaction entre deux numéros
   */
  private calculatePairInteraction(num1: number, num2: number, results: DrawResult[]): number {
    let coOccurrences = 0;
    let totalOccurrences = 0;
    
    results.forEach(result => {
      const hasNum1 = result.gagnants.includes(num1);
      const hasNum2 = result.gagnants.includes(num2);
      
      if (hasNum1 || hasNum2) {
        totalOccurrences++;
        if (hasNum1 && hasNum2) {
          coOccurrences++;
        }
      }
    });

    return totalOccurrences > 0 ? coOccurrences / totalOccurrences : 0;
  }

  /**
   * Calcule les scores d'interaction pour un numéro donné
   */
  private calculateInteractionScores(results: DrawResult[], number: number): number {
    const recentResults = results.slice(0, Math.min(20, results.length));
    let totalInteractionScore = 0;
    
    recentResults.forEach((result, index) => {
      const timeWeight = Math.exp(-index * 0.1);
      
      if (result.gagnants.includes(number)) {
        // Score basé sur les autres numéros du même tirage
        result.gagnants.forEach(otherNum => {
          if (otherNum !== number) {
            const interactionScore = this.calculatePairInteraction(number, otherNum, results);
            totalInteractionScore += interactionScore * timeWeight;
          }
        });
      }
    });

    return totalInteractionScore / Math.max(1, recentResults.length);
  }

  /**
   * Obtient les features spécifiques à un numéro avec contexte d'interaction
   */
  private getNumberFeatures(allFeatures: number[], number: number): number[] {
    const idx = number - 1;
    const featuresPerNumber = 8; // freq, gap, momentum, cooccur, interaction, pair, sequential, cluster
    const totalExpectedFeatures = 90 * featuresPerNumber;
    
    if (allFeatures.length < totalExpectedFeatures) {
      // Padding avec des zéros si nécessaire
      allFeatures = [...allFeatures, ...new Array(totalExpectedFeatures - allFeatures.length).fill(0)];
    }

    return [
      allFeatures[idx] || 0, // frequency
      allFeatures[90 + idx] || 0, // gap
      allFeatures[180 + idx] || 0, // momentum
      allFeatures[270 + idx] || 0, // cooccur
      allFeatures[360 + idx] || 0, // interaction_strength
      allFeatures[450 + idx] || 0, // pair_frequency
      allFeatures[540 + idx] || 0, // sequential_probability
      allFeatures[630 + idx] || 0  // cluster_membership
    ];
  }

  /**
   * Crée un échantillon bootstrap avec randomisation
   */
  private createBootstrapSample(features: number[][], labels: number[]): 
    { bootstrapFeatures: number[][], bootstrapLabels: number[] } {
    const sampleSize = features.length;
    const bootstrapFeatures: number[][] = [];
    const bootstrapLabels: number[] = [];

    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * features.length);
      bootstrapFeatures.push([...features[randomIndex]]);
      bootstrapLabels.push(labels[randomIndex]);
    }

    return { bootstrapFeatures, bootstrapLabels };
  }

  /**
   * Agrège les prédictions avec pondération par interactions
   */
  private aggregatePredictions(predictions: number[], interactionWeight: number): number {
    if (predictions.length === 0) return 0;

    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    
    // Pondération par le score d'interaction
    const weightedMean = mean * (0.7 + 0.3 * interactionWeight);
    
    // Application d'une fonction sigmoid pour normaliser
    return 1 / (1 + Math.exp(-5 * (weightedMean - 0.5)));
  }

  /**
   * Valide les interactions entre les numéros prédits
   */
  private validateInteractions(predictions: MLPrediction[], results: DrawResult[]): MLPrediction[] {
    const validated = [...predictions];
    
    // Calculer les interactions entre les top prédictions
    for (let i = 0; i < Math.min(10, validated.length); i++) {
      let interactionBonus = 0;
      
      for (let j = 0; j < Math.min(10, validated.length); j++) {
        if (i !== j) {
          const interaction = this.calculatePairInteraction(
            validated[i].number, 
            validated[j].number, 
            results
          );
          interactionBonus += interaction;
        }
      }
      
      // Ajuster la probabilité basée sur les interactions
      const avgInteraction = interactionBonus / Math.max(1, Math.min(9, validated.length - 1));
      validated[i].probability *= (0.8 + 0.2 * avgInteraction);
      
      // Mettre à jour la confiance
      validated[i].confidence = Math.min(0.95, validated[i].confidence + avgInteraction * 0.1);
    }

    return validated.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Obtient les features d'interaction les plus importantes
   */
  private getTopInteractionFeatures(number: number, results: DrawResult[]): string[] {
    const interactions: Array<{ partner: number; score: number }> = [];
    
    // Analyser les interactions avec tous les autres numéros
    for (let otherNum = 1; otherNum <= 90; otherNum++) {
      if (otherNum !== number) {
        const score = this.calculatePairInteraction(number, otherNum, results);
        interactions.push({ partner: otherNum, score });
      }
    }

    // Retourner les 3 meilleures interactions
    return interactions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(inter => `Interaction_${number}-${inter.partner}`);
  }

  /**
   * Calcule la variance d'un tableau de valeurs
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 1;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * Agrège l'importance des features
   */
  private aggregateFeatureImportance(tree: RandomizedTree, featureNames: string[]): void {
    const treeImportance = tree.getFeatureImportance();
    
    treeImportance.forEach((importance, index) => {
      const featureName = featureNames[index] || `feature_${index}`;
      const current = this.featureImportance.get(featureName) || 0;
      this.featureImportance.set(featureName, current + importance);
    });
  }

  /**
   * Extrait les features pour la prédiction
   */
  private extractPredictionFeatures(results: DrawResult[]): number[] {
    const recent = results.slice(0, Math.min(50, results.length));
    const baseFeatures = FeatureEngineering.extractFeatures(recent, recent.length);
    const interactionFeatures = this.calculateInteractionFeatures(recent);
    const correlationFeatures = FeatureEngineering.calculateCorrelationFeatures(recent);
    const sequenceFeatures = FeatureEngineering.calculateSequenceFeatures(recent);
    
    return [
      ...baseFeatures.frequencies,
      ...baseFeatures.gaps,
      ...baseFeatures.momentum,
      ...baseFeatures.coOccurrences,
      ...interactionFeatures,
      ...correlationFeatures,
      ...sequenceFeatures
    ];
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
    predictions.forEach(pred => {
      if (actualNumbers.includes(pred.number)) {
        hits++;
      }
    });

    const accuracy = predictions.length > 0 ? hits / predictions.length : 0;
    const recall = actualNumbers.length > 0 ? hits / actualNumbers.length : 0;
    const f1Score = accuracy + recall > 0 ? 2 * (accuracy * recall) / (accuracy + recall) : 0;

    return {
      accuracy,
      precision: accuracy,
      recall,
      f1Score,
      hitRate: recall
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
 * Classe pour représenter un arbre complètement randomisé
 */
class RandomizedTree {
  private root: TreeNode | null = null;
  private maxDepth: number;
  private minSamplesSplit: number;
  private rng: SeededRandom;
  private featureImportance: number[] = [];

  constructor(maxDepth = 10, minSamplesSplit = 2, seed = 42) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.rng = new SeededRandom(seed);
  }

  async fit(features: number[][], labels: number[], featureNames: string[]): Promise<void> {
    if (features.length === 0) return;
    
    const numFeatures = features[0].length;
    this.featureImportance = new Array(numFeatures).fill(0);
    
    this.root = await this.buildRandomizedTree(features, labels, 0, numFeatures);
  }

  predict(features: number[]): number {
    if (!this.root) return 0;
    return this.traverseTree(this.root, features);
  }

  getFeatureImportance(): number[] {
    return [...this.featureImportance];
  }

  private async buildRandomizedTree(
    features: number[][], 
    labels: number[], 
    depth: number, 
    numFeatures: number
  ): Promise<TreeNode | null> {
    if (depth >= this.maxDepth || labels.length < this.minSamplesSplit) {
      const mean = labels.reduce((a, b) => a + b, 0) / labels.length;
      return { isLeaf: true, value: mean };
    }

    // Sélection complètement randomisée de la feature et du seuil
    const randomFeatureIndex = Math.floor(this.rng.random() * numFeatures);
    const featureValues = features.map(f => f[randomFeatureIndex]);
    const minVal = Math.min(...featureValues);
    const maxVal = Math.max(...featureValues);
    
    if (minVal === maxVal) {
      const mean = labels.reduce((a, b) => a + b, 0) / labels.length;
      return { isLeaf: true, value: mean };
    }

    const randomThreshold = minVal + this.rng.random() * (maxVal - minVal);

    // Division des données
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];

    features.forEach((feature, index) => {
      if (feature[randomFeatureIndex] <= randomThreshold) {
        leftIndices.push(index);
      } else {
        rightIndices.push(index);
      }
    });

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      const mean = labels.reduce((a, b) => a + b, 0) / labels.length;
      return { isLeaf: true, value: mean };
    }

    // Calcul de l'importance (réduction de variance)
    const parentVariance = this.calculateVariance(labels);
    const leftLabels = leftIndices.map(i => labels[i]);
    const rightLabels = rightIndices.map(i => labels[i]);
    const leftVariance = this.calculateVariance(leftLabels);
    const rightVariance = this.calculateVariance(rightLabels);
    
    const weightedVariance = 
      (leftLabels.length / labels.length) * leftVariance +
      (rightLabels.length / labels.length) * rightVariance;
    
    const importance = parentVariance - weightedVariance;
    this.featureImportance[randomFeatureIndex] += importance;

    // Construction récursive
    const leftFeatures = leftIndices.map(i => features[i]);
    const rightFeatures = rightIndices.map(i => features[i]);

    return {
      isLeaf: false,
      featureIndex: randomFeatureIndex,
      threshold: randomThreshold,
      left: await this.buildRandomizedTree(leftFeatures, leftLabels, depth + 1, numFeatures),
      right: await this.buildRandomizedTree(rightFeatures, rightLabels, depth + 1, numFeatures)
    };
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

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
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

/**
 * Générateur de nombres pseudo-aléatoires avec seed
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}