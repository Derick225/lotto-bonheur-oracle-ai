import { DrawResult } from './lotteryAPI';
import { PredictionService, PredictionResult } from './predictionService';
import { FeatureEngineering, MLPrediction } from './mlModels';

/**
 * Configuration pour le backtesting
 */
export interface BacktestConfig {
  startDate: string;
  endDate: string;
  rebalanceFrequency: number; // Nombre de tirages entre les réentraînements
  minTrainingSize: number;
  topN: number; // Nombre de prédictions à considérer
  algorithms: Array<'XGBoost' | 'RNN-LSTM' | 'Hybrid'>;
}

/**
 * Résultat d'un trade (prédiction vs réalité)
 */
export interface TradeResult {
  date: string;
  drawName: string;
  predictions: number[];
  actualNumbers: number[];
  hits: number[];
  hitRate: number;
  confidence: number;
  algorithm: string;
  profit: number; // Simulé basé sur les hits
}

/**
 * Résultats du backtesting
 */
export interface BacktestResults {
  trades: TradeResult[];
  summary: {
    totalTrades: number;
    totalHits: number;
    averageHitRate: number;
    totalProfit: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    bestAlgorithm: string;
  };
  algorithmComparison: {
    [algorithm: string]: {
      trades: number;
      hits: number;
      hitRate: number;
      profit: number;
      sharpeRatio: number;
    };
  };
  timeSeriesAnalysis: {
    monthlyPerformance: Array<{
      month: string;
      hitRate: number;
      profit: number;
      trades: number;
    }>;
    rollingMetrics: Array<{
      date: string;
      rollingHitRate: number;
      rollingProfit: number;
      drawdown: number;
    }>;
  };
}

/**
 * Service de backtesting pour évaluer les performances historiques
 */
export class BacktestingService {
  
  /**
   * Effectue un backtesting complet
   */
  static async runBacktest(
    results: DrawResult[],
    config: BacktestConfig
  ): Promise<BacktestResults> {
    console.log('🔄 Début du backtesting...');
    console.log(`Période: ${config.startDate} → ${config.endDate}`);
    console.log(`Algorithmes: ${config.algorithms.join(', ')}`);
    
    // Filtrer les résultats par période
    const filteredResults = this.filterResultsByPeriod(results, config.startDate, config.endDate);
    
    if (filteredResults.length < config.minTrainingSize + 10) {
      throw new Error('Données insuffisantes pour le backtesting');
    }
    
    const trades: TradeResult[] = [];
    let currentTrainingSize = config.minTrainingSize;
    
    // Simuler le trading en avançant dans le temps
    for (let i = currentTrainingSize; i < filteredResults.length; i++) {
      const trainingData = filteredResults.slice(0, i);
      const testData = filteredResults[i];
      
      // Réentraîner les modèles si nécessaire
      if ((i - currentTrainingSize) % config.rebalanceFrequency === 0) {
        console.log(`📊 Réentraînement des modèles à l'index ${i}`);
        await PredictionService.trainModels(trainingData);
      }
      
      // Générer des prédictions pour chaque algorithme
      for (const algorithm of config.algorithms) {
        try {
          const prediction = await PredictionService.generatePrediction(
            testData.draw_name,
            trainingData,
            algorithm
          );
          
          const trade = this.evaluateTrade(prediction, testData, config.topN);
          trades.push(trade);
          
        } catch (error) {
          console.warn(`Erreur de prédiction pour ${algorithm}:`, error);
        }
      }
      
      // Afficher le progrès
      if (i % 50 === 0) {
        const progress = ((i - currentTrainingSize) / (filteredResults.length - currentTrainingSize)) * 100;
        console.log(`Progrès: ${progress.toFixed(1)}%`);
      }
    }
    
    // Analyser les résultats
    const summary = this.calculateSummary(trades);
    const algorithmComparison = this.compareAlgorithms(trades);
    const timeSeriesAnalysis = this.analyzeTimeSeries(trades);
    
    console.log('✅ Backtesting terminé');
    console.log(`Total trades: ${trades.length}`);
    console.log(`Hit rate moyen: ${(summary.averageHitRate * 100).toFixed(1)}%`);
    
    return {
      trades,
      summary,
      algorithmComparison,
      timeSeriesAnalysis
    };
  }
  
  /**
   * Filtre les résultats par période
   */
  private static filterResultsByPeriod(
    results: DrawResult[],
    startDate: string,
    endDate: string
  ): DrawResult[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return results.filter(result => {
      const resultDate = new Date(result.date);
      return resultDate >= start && resultDate <= end;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Plus récent en premier
  }
  
  /**
   * Évalue un trade individuel
   */
  private static evaluateTrade(
    prediction: PredictionResult,
    actualResult: DrawResult,
    topN: number
  ): TradeResult {
    const predictions = prediction.numbers.slice(0, topN).map(p => p.number);
    const actualNumbers = actualResult.gagnants;
    
    // Trouver les hits
    const hits = predictions.filter(pred => actualNumbers.includes(pred));
    const hitRate = hits.length / predictions.length;
    
    // Calculer le profit simulé
    // Système simple: +1 par hit, -0.2 par miss
    const profit = hits.length * 1 - (predictions.length - hits.length) * 0.2;
    
    return {
      date: actualResult.date,
      drawName: actualResult.draw_name,
      predictions,
      actualNumbers,
      hits,
      hitRate,
      confidence: prediction.confidence,
      algorithm: prediction.algorithm,
      profit
    };
  }
  
  /**
   * Calcule le résumé des performances
   */
  private static calculateSummary(trades: TradeResult[]): BacktestResults['summary'] {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        totalHits: 0,
        averageHitRate: 0,
        totalProfit: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        winRate: 0,
        bestAlgorithm: ''
      };
    }
    
    const totalTrades = trades.length;
    const totalHits = trades.reduce((sum, trade) => sum + trade.hits.length, 0);
    const averageHitRate = trades.reduce((sum, trade) => sum + trade.hitRate, 0) / totalTrades;
    const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
    
    // Calculer le maximum drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let cumulativeProfit = 0;
    
    trades.forEach(trade => {
      cumulativeProfit += trade.profit;
      if (cumulativeProfit > peak) {
        peak = cumulativeProfit;
      }
      const drawdown = peak - cumulativeProfit;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });
    
    // Calculer le ratio de Sharpe
    const profits = trades.map(trade => trade.profit);
    const avgProfit = profits.reduce((a, b) => a + b, 0) / profits.length;
    const profitVariance = profits.reduce((sum, profit) => sum + Math.pow(profit - avgProfit, 2), 0) / profits.length;
    const profitStdDev = Math.sqrt(profitVariance);
    const sharpeRatio = profitStdDev > 0 ? avgProfit / profitStdDev : 0;
    
    // Calculer le win rate
    const winningTrades = trades.filter(trade => trade.profit > 0).length;
    const winRate = winningTrades / totalTrades;
    
    // Trouver le meilleur algorithme
    const algorithmPerformance = new Map<string, number>();
    trades.forEach(trade => {
      const current = algorithmPerformance.get(trade.algorithm) || 0;
      algorithmPerformance.set(trade.algorithm, current + trade.profit);
    });
    
    const bestAlgorithm = Array.from(algorithmPerformance.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    
    return {
      totalTrades,
      totalHits,
      averageHitRate,
      totalProfit,
      maxDrawdown,
      sharpeRatio,
      winRate,
      bestAlgorithm
    };
  }
  
  /**
   * Compare les performances des algorithmes
   */
  private static compareAlgorithms(trades: TradeResult[]): BacktestResults['algorithmComparison'] {
    const comparison: BacktestResults['algorithmComparison'] = {};
    
    // Grouper par algorithme
    const tradesByAlgorithm = new Map<string, TradeResult[]>();
    trades.forEach(trade => {
      if (!tradesByAlgorithm.has(trade.algorithm)) {
        tradesByAlgorithm.set(trade.algorithm, []);
      }
      tradesByAlgorithm.get(trade.algorithm)!.push(trade);
    });
    
    // Calculer les métriques pour chaque algorithme
    tradesByAlgorithm.forEach((algorithmTrades, algorithm) => {
      const totalTrades = algorithmTrades.length;
      const totalHits = algorithmTrades.reduce((sum, trade) => sum + trade.hits.length, 0);
      const hitRate = algorithmTrades.reduce((sum, trade) => sum + trade.hitRate, 0) / totalTrades;
      const profit = algorithmTrades.reduce((sum, trade) => sum + trade.profit, 0);
      
      // Calculer le Sharpe ratio pour cet algorithme
      const profits = algorithmTrades.map(trade => trade.profit);
      const avgProfit = profits.reduce((a, b) => a + b, 0) / profits.length;
      const variance = profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / profits.length;
      const stdDev = Math.sqrt(variance);
      const sharpeRatio = stdDev > 0 ? avgProfit / stdDev : 0;
      
      comparison[algorithm] = {
        trades: totalTrades,
        hits: totalHits,
        hitRate,
        profit,
        sharpeRatio
      };
    });
    
    return comparison;
  }
  
  /**
   * Analyse les séries temporelles
   */
  private static analyzeTimeSeries(trades: TradeResult[]): BacktestResults['timeSeriesAnalysis'] {
    // Performance mensuelle
    const monthlyData = new Map<string, { hitRate: number; profit: number; trades: number }>();
    
    trades.forEach(trade => {
      const month = trade.date.substring(0, 7); // YYYY-MM
      const current = monthlyData.get(month) || { hitRate: 0, profit: 0, trades: 0 };
      
      current.hitRate += trade.hitRate;
      current.profit += trade.profit;
      current.trades += 1;
      
      monthlyData.set(month, current);
    });
    
    const monthlyPerformance = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      hitRate: data.hitRate / data.trades,
      profit: data.profit,
      trades: data.trades
    })).sort((a, b) => a.month.localeCompare(b.month));
    
    // Métriques roulantes (fenêtre de 30 trades)
    const rollingMetrics: BacktestResults['timeSeriesAnalysis']['rollingMetrics'] = [];
    const windowSize = 30;
    
    for (let i = windowSize; i < trades.length; i++) {
      const window = trades.slice(i - windowSize, i);
      const rollingHitRate = window.reduce((sum, trade) => sum + trade.hitRate, 0) / windowSize;
      const rollingProfit = window.reduce((sum, trade) => sum + trade.profit, 0);
      
      // Calculer le drawdown
      let peak = -Infinity;
      let cumulativeProfit = 0;
      let maxDrawdown = 0;
      
      window.forEach(trade => {
        cumulativeProfit += trade.profit;
        if (cumulativeProfit > peak) {
          peak = cumulativeProfit;
        }
        const drawdown = peak - cumulativeProfit;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      });
      
      rollingMetrics.push({
        date: trades[i].date,
        rollingHitRate,
        rollingProfit,
        drawdown: maxDrawdown
      });
    }
    
    return {
      monthlyPerformance,
      rollingMetrics
    };
  }
  
  /**
   * Génère un rapport de backtesting
   */
  static generateBacktestReport(results: BacktestResults): string {
    const { summary, algorithmComparison } = results;
    
    let report = `
=== RAPPORT DE BACKTESTING ===

📊 RÉSUMÉ GÉNÉRAL:
- Total des trades: ${summary.totalTrades}
- Total des hits: ${summary.totalHits}
- Hit rate moyen: ${(summary.averageHitRate * 100).toFixed(1)}%
- Profit total: ${summary.totalProfit.toFixed(2)}
- Max drawdown: ${summary.maxDrawdown.toFixed(2)}
- Ratio de Sharpe: ${summary.sharpeRatio.toFixed(3)}
- Win rate: ${(summary.winRate * 100).toFixed(1)}%
- Meilleur algorithme: ${summary.bestAlgorithm}

🤖 COMPARAISON DES ALGORITHMES:
`;
    
    Object.entries(algorithmComparison).forEach(([algorithm, metrics]) => {
      report += `
${algorithm}:
  - Trades: ${metrics.trades}
  - Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%
  - Profit: ${metrics.profit.toFixed(2)}
  - Sharpe ratio: ${metrics.sharpeRatio.toFixed(3)}
`;
    });
    
    return report;
  }
}
