// Service de monitoring temporairement désactivé

export interface ModelMetrics {
  hitRate: number;
  confidence: number;
  predictionCount: number;
  averageUncertainty: number;
}

export class ModelMonitoring {
  static async getMetrics(): Promise<ModelMetrics> {
    return {
      hitRate: 0.5,
      confidence: 0.7,
      predictionCount: 100,
      averageUncertainty: 0.3
    };
  }

  static async getPerformanceStats(): Promise<any> {
    return {
      hitRate: 0.5,
      confidence: 0.7,
      predictionCount: 100,
      averageUncertainty: 0.3
    };
  }
}

export default ModelMonitoring;