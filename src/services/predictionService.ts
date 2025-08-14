import { supabase } from '@/integrations/supabase/client';
import { FeatureEngineering, MLPrediction, ModelMetrics } from './mlModels';
import { XGBoostModel } from './xgboostModel';
import { RNNLSTMModel } from './rnnLstmModel';
import { DrawResult as LotteryDrawResult } from './lotteryAPI';

export interface PredictionResult {
  numbers: number[];
  confidence: number;
  algorithm: string;
  metadata?: {
    features?: any;
    modelPerformance?: Partial<ModelMetrics>;
    uncertaintyRange?: [number, number];
    alternativePredictions?: number[][];
    predictionDate?: string;
    accuracy?: number;
  };
}

export interface PredictionRequest {
  drawName: string;
  historicalData?: any[];
  algorithm?: 'xgboost' | 'lstm' | 'hybrid';
  topN?: number;
}

interface DBDrawResult {
  id: number;
  draw_name: string;
  date: string;
  gagnants: number[];
  machine?: number[];
  created_at: string;
  updated_at: string;
}

export class PredictionService {
  private static xgboostModel = new XGBoostModel();
  private static lstmModel = new RNNLSTMModel();
  private static modelCache = new Map<string, any>();

  static async generatePrediction(request: PredictionRequest): Promise<PredictionResult> {
    const { drawName, algorithm = 'hybrid', topN = 5 } = request;
    
    try {
      // Fetch historical data from Supabase
      const { data: historicalData, error } = await supabase
        .from('lottery_results')
        .select('*')
        .eq('draw_name', drawName)
        .order('date', { ascending: false })
        .limit(1000);

      if (error) throw error;
      if (!historicalData || historicalData.length < 10) {
        throw new Error(`Insufficient historical data for ${drawName}`);
      }

      // Convert to LotteryDrawResult format for feature engineering
      const drawResults: LotteryDrawResult[] = historicalData.map(row => ({
        ...row,
        day: new Date(row.date).toLocaleDateString('fr-FR', { weekday: 'long' }),
        time: '21:00' // Default time for lottery draws
      }));

      // Extract advanced features
      const features = FeatureEngineering.extractFeatures(drawResults, 50);
      
      let predictions: MLPrediction[] = [];
      let modelName = '';
      let confidence = 0;

      switch (algorithm) {
        case 'xgboost':
          predictions = await this.generateXGBoostPredictions(drawResults, features);
          modelName = 'XGBoost';
          break;
        case 'lstm':
          predictions = await this.generateLSTMPredictions(drawResults, features);
          modelName = 'RNN-LSTM';
          break;
        case 'hybrid':
        default:
          predictions = await this.generateHybridPredictions(drawResults, features);
          modelName = 'Hybrid (XGBoost + LSTM)';
          break;
      }

      // Sort by probability and take top N
      const topPredictions = predictions
        .sort((a, b) => b.probability - a.probability)
        .slice(0, topN);

      // Calculate ensemble confidence
      confidence = topPredictions.reduce((sum, p) => sum + p.confidence, 0) / topPredictions.length;

      // Get predicted numbers
      const numbers = topPredictions.map(p => p.number).sort((a, b) => a - b);

      // Store prediction in database
      await this.storePrediction(drawName, numbers, confidence, modelName, features);

      return {
        numbers,
        confidence: Math.round(confidence * 100) / 100,
        algorithm: modelName,
        metadata: {
          features: {
            totalDraws: drawResults.length,
            timeSpan: this.calculateTimeSpan(drawResults),
            featureCount: Object.keys(features).length
          },
          uncertaintyRange: this.calculateUncertaintyRange(topPredictions),
          alternativePredictions: this.generateAlternativePredictions(predictions, topN)
        }
      };

    } catch (error) {
      console.error('Prediction generation error:', error);
      
      // Fallback to statistical prediction
      return this.generateStatisticalFallback(drawName);
    }
  }

  private static async generateXGBoostPredictions(drawResults: LotteryDrawResult[], features: any): Promise<MLPrediction[]> {
    try {
      return await XGBoostModel.predict();
    } catch (error) {
      console.error('XGBoost prediction error:', error);
      return this.generateBasicPredictions(drawResults);
    }
  }

  private static async generateLSTMPredictions(drawResults: LotteryDrawResult[], features: any): Promise<MLPrediction[]> {
    try {
      return await RNNLSTMModel.predict();
    } catch (error) {
      console.error('LSTM prediction error:', error);
      return this.generateBasicPredictions(drawResults);
    }
  }

  private static async generateHybridPredictions(drawResults: LotteryDrawResult[], features: any): Promise<MLPrediction[]> {
    try {
      const [xgboostPreds, lstmPreds] = await Promise.all([
        this.generateXGBoostPredictions(drawResults, features),
        this.generateLSTMPredictions(drawResults, features)
      ]);

      // Ensemble averaging with weights
      const hybridPredictions: MLPrediction[] = [];
      const numberMap = new Map<number, { xgb?: MLPrediction, lstm?: MLPrediction }>();

      // Group predictions by number
      [...xgboostPreds, ...lstmPreds].forEach(pred => {
        if (!numberMap.has(pred.number)) {
          numberMap.set(pred.number, {});
        }
        const entry = numberMap.get(pred.number)!;
        if (xgboostPreds.includes(pred)) {
          entry.xgb = pred;
        } else {
          entry.lstm = pred;
        }
      });

      // Create hybrid predictions
      numberMap.forEach((preds, number) => {
        const xgbProb = preds.xgb?.probability || 0;
        const lstmProb = preds.lstm?.probability || 0;
        const xgbConf = preds.xgb?.confidence || 0;
        const lstmConf = preds.lstm?.confidence || 0;

        // Weighted ensemble (XGBoost 60%, LSTM 40%)
        const probability = (xgbProb * 0.6 + lstmProb * 0.4);
        const confidence = (xgbConf * 0.6 + lstmConf * 0.4);

        if (probability > 0) {
          hybridPredictions.push({
            number,
            probability,
            confidence,
            uncertainty: Math.abs(xgbProb - lstmProb), // Model disagreement as uncertainty
            features: { ...preds.xgb?.features, ...preds.lstm?.features }
          });
        }
      });

      return hybridPredictions;
    } catch (error) {
      console.error('Hybrid prediction error:', error);
      return this.generateBasicPredictions(drawResults);
    }
  }

  private static generateBasicPredictions(drawResults: LotteryDrawResult[]): MLPrediction[] {
    // Statistical fallback based on frequency analysis
    const numberFreq = new Map<number, number>();
    
    drawResults.forEach(result => {
      result.gagnants.forEach(num => {
        numberFreq.set(num, (numberFreq.get(num) || 0) + 1);
      });
    });

    const total = drawResults.length;
    const predictions: MLPrediction[] = [];

    numberFreq.forEach((freq, number) => {
      const probability = freq / total;
      predictions.push({
        number,
        probability,
        confidence: Math.min(probability * 2, 0.9), // Cap confidence
        uncertainty: 0.1,
        features: [freq.toString(), probability.toString()]
      });
    });

    return predictions;
  }

  private static calculateTimeSpan(drawResults: LotteryDrawResult[]): number {
    if (drawResults.length < 2) return 0;
    const oldest = new Date(drawResults[drawResults.length - 1].date);
    const newest = new Date(drawResults[0].date);
    return Math.floor((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));
  }

  private static calculateUncertaintyRange(predictions: MLPrediction[]): [number, number] {
    const uncertainties = predictions.map(p => p.uncertainty);
    return [Math.min(...uncertainties), Math.max(...uncertainties)];
  }

  private static generateAlternativePredictions(predictions: MLPrediction[], topN: number): number[][] {
    const alternatives: number[][] = [];
    const sorted = predictions.sort((a, b) => b.probability - a.probability);
    
    // Generate 3 alternative sets with different probability thresholds
    for (let i = 0; i < 3; i++) {
      const offset = (i + 1) * 2;
      const altNumbers = sorted.slice(offset, offset + topN).map(p => p.number).sort((a, b) => a - b);
      if (altNumbers.length === topN) {
        alternatives.push(altNumbers);
      }
    }
    
    return alternatives;
  }

  private static async storePrediction(drawName: string, numbers: number[], confidence: number, algorithm: string, features: any): Promise<void> {
    try {
      await supabase.from('ml_predictions').insert({
        draw_name: drawName,
        predicted_numbers: numbers,
        confidence,
        model_used: algorithm,
        prediction_date: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to store prediction:', error);
    }
  }

  private static async generateStatisticalFallback(drawName: string): Promise<PredictionResult> {
    // Simple frequency-based fallback
    const { data } = await supabase
      .from('lottery_results')
      .select('gagnants')
      .eq('draw_name', drawName)
      .limit(100);

    if (data && data.length > 0) {
      const freq = new Map<number, number>();
      data.forEach(result => {
        result.gagnants.forEach((num: number) => {
          freq.set(num, (freq.get(num) || 0) + 1);
        });
      });

      const topNumbers = Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([num]) => num)
        .sort((a, b) => a - b);

      return {
        numbers: topNumbers,
        confidence: 0.6,
        algorithm: 'Statistical Fallback',
        metadata: { features: { method: 'frequency_analysis', dataPoints: data.length } }
      };
    }

    // Ultimate fallback
    return {
      numbers: [1, 7, 14, 21, 35].sort(),
      confidence: 0.3,
      algorithm: 'Default Fallback',
      metadata: { 
        features: { method: 'default_fallback', dataPoints: 0, totalDraws: 0 },
        alternativePredictions: [[3, 9, 16, 22, 38]]
      }
    };
  }

  static async getPredictionHistory(drawName: string): Promise<PredictionResult[]> {
    try {
      const { data, error } = await supabase
        .from('ml_predictions')
        .select('*')
        .eq('draw_name', drawName)
        .order('prediction_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map(pred => ({
        numbers: pred.predicted_numbers,
        confidence: pred.confidence || 0,
        algorithm: pred.model_used || 'Unknown',
        metadata: {
          predictionDate: pred.prediction_date,
          accuracy: pred.accuracy
        }
      }));
    } catch (error) {
      console.error('Failed to fetch prediction history:', error);
      return [];
    }
  }

  static async getModelPerformance(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('model_performance')
        .select('*')
        .order('avg_accuracy', { ascending: false });

      if (error) throw error;

      return {
        models: data || [],
        globalStats: {
          totalPredictions: data?.reduce((sum, model) => sum + (model.total_predictions || 0), 0) || 0,
          averageAccuracy: data?.reduce((sum, model) => sum + (model.avg_accuracy || 0), 0) / (data?.length || 1) || 0
        }
      };
    } catch (error) {
      console.error('Failed to fetch model performance:', error);
      return { models: [], globalStats: { totalPredictions: 0, averageAccuracy: 0 } };
    }
  }
}

export default PredictionService;