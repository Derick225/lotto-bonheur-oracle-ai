// Service de prédiction temporairement désactivé
export interface PredictionResult {
  numbers: number[];
  confidence: number;
  algorithm: string;
  metadata?: any;
}

export interface PredictionRequest {
  drawName: string;
  historicalData: any[];
  algorithm?: string;
}

export class PredictionService {
  static async generatePrediction(request: PredictionRequest): Promise<PredictionResult> {
    // Prédiction simulée
    return {
      numbers: [1, 2, 3, 4, 5].map(() => Math.floor(Math.random() * 49) + 1).sort((a, b) => a - b),
      confidence: Math.random() * 0.5 + 0.5,
      algorithm: 'Simulation'
    };
  }

  static async getPredictionHistory(drawName: string): Promise<PredictionResult[]> {
    return [];
  }

  static async getModelPerformance(): Promise<any> {
    return {};
  }
}

export default PredictionService;