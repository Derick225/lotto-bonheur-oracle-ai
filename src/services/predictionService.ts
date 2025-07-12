import { DrawResult } from './lotteryAPI';

// Interface pour les prédictions
export interface PredictionResult {
  numbers: Array<{ number: number; probability: number }>;
  confidence: number;
  algorithm: 'XGBoost' | 'RNN-LSTM' | 'RandomForest' | 'Hybrid';
  features: string[];
  metadata: {
    dataPoints: number;
    lastUpdate: Date;
    modelVersion: string;
  };
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

// Service principal de prédiction
export class PredictionService {
  static async generatePrediction(
    drawName: string,
    results: DrawResult[],
    algorithm: 'XGBoost' | 'RNN-LSTM' | 'RandomForest' | 'Hybrid' = 'Hybrid'
  ): Promise<PredictionResult> {
    
    if (results.length < 10) {
      throw new Error('Données insuffisantes pour générer une prédiction fiable');
    }

    let predictions: Array<{ number: number; probability: number }>;
    let confidence: number;
    
    switch (algorithm) {
      case 'XGBoost':
        predictions = XGBoostSimulator.predict(results);
        confidence = Math.min(0.85, 0.6 + (results.length / 1000) * 0.25);
        break;
        
      case 'RandomForest':
        predictions = RandomForestSimulator.predict(results);
        confidence = Math.min(0.80, 0.55 + (results.length / 1000) * 0.25);
        break;
        
      case 'RNN-LSTM':
        predictions = RNNLSTMSimulator.predict(results);
        confidence = Math.min(0.82, 0.58 + (results.length / 1000) * 0.24);
        break;
        
      case 'Hybrid':
      default:
        const xgbPreds = XGBoostSimulator.predict(results);
        const rfPreds = RandomForestSimulator.predict(results);
        const rnnPreds = RNNLSTMSimulator.predict(results);
        
        // Combiner les prédictions avec pondération
        const combined = this.combineHybridPredictions(xgbPreds, rfPreds, rnnPreds);
        predictions = combined;
        confidence = Math.min(0.88, 0.65 + (results.length / 1000) * 0.23);
        break;
    }
    
    // Sélectionner les 5 meilleurs
    const topPredictions = predictions.slice(0, 5);
    
    return {
      numbers: topPredictions,
      confidence,
      algorithm,
      features: [
        'Analyse de fréquence historique',
        'Patterns de co-occurrence',
        'Tendances temporelles',
        'Analyse des écarts',
        'Cycles saisonniers',
        'Momentum séquentiel'
      ],
      metadata: {
        dataPoints: results.length,
        lastUpdate: new Date(),
        modelVersion: '1.0.0'
      }
    };
  }

  private static combineHybridPredictions(
    xgb: Array<{ number: number; probability: number }>,
    rf: Array<{ number: number; probability: number }>,
    rnn: Array<{ number: number; probability: number }>
  ): Array<{ number: number; probability: number }> {
    
    const combined: { [key: number]: number } = {};
    
    // Pondération: XGBoost 40%, Random Forest 30%, RNN-LSTM 30%
    const weights = { xgb: 0.4, rf: 0.3, rnn: 0.3 };
    
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
}