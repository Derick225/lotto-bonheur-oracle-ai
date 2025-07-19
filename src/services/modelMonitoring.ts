import { DrawResult } from './lotteryAPI';
import { PredictionResult } from './predictionService';
import { FeatureEngineering, MLPrediction, ModelMetrics } from './mlModels';
import { IndexedDBService } from './indexedDBService';

/**
 * Alerte de monitoring
 */
export interface MonitoringAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance_degradation' | 'data_drift' | 'model_instability' | 'prediction_anomaly';
  message: string;
  details: any;
  acknowledged: boolean;
}

/**
 * Métriques de monitoring en temps réel
 */
export interface MonitoringMetrics {
  timestamp: Date;
  modelPerformance: {
    [modelName: string]: {
      hitRate: number;
      confidence: number;
      predictionCount: number;
      averageUncertainty: number;
    };
  };
  dataQuality: {
    completeness: number;
    consistency: number;
    freshness: number; // Minutes depuis la dernière mise à jour
  };
  systemHealth: {
    memoryUsage: number;
    predictionLatency: number;
    errorRate: number;
  };
  alerts: MonitoringAlert[];
}

/**
 * Configuration du monitoring
 */
export interface MonitoringConfig {
  performanceThresholds: {
    minHitRate: number;
    maxUncertainty: number;
    maxLatency: number;
  };
  dataQualityThresholds: {
    minCompleteness: number;
    maxFreshnessMinutes: number;
  };
  alertRetentionDays: number;
  monitoringIntervalMinutes: number;
}

/**
 * Service de monitoring des modèles en temps réel
 */
export class ModelMonitoringService {
  private static alerts: MonitoringAlert[] = [];
  private static metricsHistory: MonitoringMetrics[] = [];
  private static config: MonitoringConfig = {
    performanceThresholds: {
      minHitRate: 0.15,
      maxUncertainty: 0.8,
      maxLatency: 5000 // ms
    },
    dataQualityThresholds: {
      minCompleteness: 0.95,
      maxFreshnessMinutes: 60
    },
    alertRetentionDays: 30,
    monitoringIntervalMinutes: 15
  };

  /**
   * Démarre le monitoring en temps réel
   */
  static startMonitoring(): void {
    console.log('🔍 Démarrage du monitoring des modèles...');
    
    // Monitoring périodique
    setInterval(() => {
      this.performMonitoringCheck();
    }, this.config.monitoringIntervalMinutes * 60 * 1000);

    // Premier check immédiat
    this.performMonitoringCheck();
  }

  /**
   * Effectue un check de monitoring complet
   */
  private static async performMonitoringCheck(): Promise<void> {
    try {
      const metrics = await this.collectMetrics();
      this.metricsHistory.push(metrics);
      
      // Garder seulement les 1000 dernières métriques
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-1000);
      }

      // Analyser les métriques et générer des alertes
      await this.analyzeMetrics(metrics);
      
      // Nettoyer les anciennes alertes
      this.cleanupOldAlerts();

    } catch (error) {
      console.error('Erreur lors du monitoring:', error);
      this.createAlert('critical', 'model_instability', 'Erreur système lors du monitoring', { error });
    }
  }

  /**
   * Collecte les métriques actuelles
   */
  private static async collectMetrics(): Promise<MonitoringMetrics> {
    const timestamp = new Date();
    
    // Métriques de performance des modèles (simulées pour l'exemple)
    const modelPerformance = {
      'XGBoost': {
        hitRate: 0.18 + Math.random() * 0.1,
        confidence: 0.7 + Math.random() * 0.2,
        predictionCount: Math.floor(Math.random() * 50) + 10,
        averageUncertainty: 0.3 + Math.random() * 0.3
      },
      'RNN-LSTM': {
        hitRate: 0.16 + Math.random() * 0.12,
        confidence: 0.65 + Math.random() * 0.25,
        predictionCount: Math.floor(Math.random() * 45) + 8,
        averageUncertainty: 0.35 + Math.random() * 0.35
      },
      'Hybrid': {
        hitRate: 0.20 + Math.random() * 0.08,
        confidence: 0.75 + Math.random() * 0.15,
        predictionCount: Math.floor(Math.random() * 60) + 15,
        averageUncertainty: 0.25 + Math.random() * 0.25
      }
    };

    // Métriques de qualité des données
    const dataQuality = {
      completeness: 0.95 + Math.random() * 0.05,
      consistency: 0.92 + Math.random() * 0.08,
      freshness: Math.floor(Math.random() * 30) // Minutes
    };

    // Métriques de santé du système
    const systemHealth = {
      memoryUsage: 0.4 + Math.random() * 0.3, // Pourcentage
      predictionLatency: 1000 + Math.random() * 2000, // ms
      errorRate: Math.random() * 0.05 // Pourcentage
    };

    return {
      timestamp,
      modelPerformance,
      dataQuality,
      systemHealth,
      alerts: [...this.alerts]
    };
  }

  /**
   * Analyse les métriques et génère des alertes si nécessaire
   */
  private static async analyzeMetrics(metrics: MonitoringMetrics): Promise<void> {
    const { modelPerformance, dataQuality, systemHealth } = metrics;

    // Vérifier les performances des modèles
    Object.entries(modelPerformance).forEach(([modelName, performance]) => {
      if (performance.hitRate < this.config.performanceThresholds.minHitRate) {
        this.createAlert(
          'high',
          'performance_degradation',
          `Performance dégradée pour ${modelName}`,
          { modelName, hitRate: performance.hitRate, threshold: this.config.performanceThresholds.minHitRate }
        );
      }

      if (performance.averageUncertainty > this.config.performanceThresholds.maxUncertainty) {
        this.createAlert(
          'medium',
          'model_instability',
          `Incertitude élevée pour ${modelName}`,
          { modelName, uncertainty: performance.averageUncertainty, threshold: this.config.performanceThresholds.maxUncertainty }
        );
      }
    });

    // Vérifier la qualité des données
    if (dataQuality.completeness < this.config.dataQualityThresholds.minCompleteness) {
      this.createAlert(
        'medium',
        'data_drift',
        'Complétude des données insuffisante',
        { completeness: dataQuality.completeness, threshold: this.config.dataQualityThresholds.minCompleteness }
      );
    }

    if (dataQuality.freshness > this.config.dataQualityThresholds.maxFreshnessMinutes) {
      this.createAlert(
        'high',
        'data_drift',
        'Données pas assez récentes',
        { freshness: dataQuality.freshness, threshold: this.config.dataQualityThresholds.maxFreshnessMinutes }
      );
    }

    // Vérifier la santé du système
    if (systemHealth.predictionLatency > this.config.performanceThresholds.maxLatency) {
      this.createAlert(
        'medium',
        'prediction_anomaly',
        'Latence de prédiction élevée',
        { latency: systemHealth.predictionLatency, threshold: this.config.performanceThresholds.maxLatency }
      );
    }

    if (systemHealth.errorRate > 0.1) {
      this.createAlert(
        'high',
        'model_instability',
        'Taux d\'erreur élevé',
        { errorRate: systemHealth.errorRate }
      );
    }
  }

  /**
   * Crée une nouvelle alerte
   */
  private static createAlert(
    severity: MonitoringAlert['severity'],
    type: MonitoringAlert['type'],
    message: string,
    details: any
  ): void {
    // Éviter les doublons d'alertes récentes
    const recentAlert = this.alerts.find(alert => 
      alert.type === type && 
      alert.message === message && 
      Date.now() - alert.timestamp.getTime() < 30 * 60 * 1000 // 30 minutes
    );

    if (recentAlert) return;

    const alert: MonitoringAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity,
      type,
      message,
      details,
      acknowledged: false
    };

    this.alerts.unshift(alert);
    console.warn(`🚨 Alerte ${severity}: ${message}`, details);
  }

  /**
   * Nettoie les anciennes alertes
   */
  private static cleanupOldAlerts(): void {
    const cutoffDate = new Date(Date.now() - this.config.alertRetentionDays * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffDate);
  }

  /**
   * Marque une alerte comme acquittée
   */
  static acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Obtient les métriques actuelles
   */
  static getCurrentMetrics(): MonitoringMetrics | null {
    return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  /**
   * Obtient l'historique des métriques
   */
  static getMetricsHistory(hours: number = 24): MonitoringMetrics[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return this.metricsHistory.filter(metrics => metrics.timestamp.getTime() > cutoffTime);
  }

  /**
   * Obtient les alertes actives
   */
  static getActiveAlerts(): MonitoringAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Obtient toutes les alertes
   */
  static getAllAlerts(): MonitoringAlert[] {
    return [...this.alerts];
  }

  /**
   * Met à jour la configuration du monitoring
   */
  static updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Configuration du monitoring mise à jour:', this.config);
  }

  /**
   * Génère un rapport de santé du système
   */
  static generateHealthReport(): string {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    
    if (!currentMetrics) {
      return 'Aucune métrique disponible';
    }

    let report = `
=== RAPPORT DE SANTÉ DU SYSTÈME ===
Timestamp: ${currentMetrics.timestamp.toLocaleString('fr-FR')}

🤖 PERFORMANCE DES MODÈLES:
`;

    Object.entries(currentMetrics.modelPerformance).forEach(([model, perf]) => {
      report += `
${model}:
  - Hit Rate: ${(perf.hitRate * 100).toFixed(1)}%
  - Confiance: ${(perf.confidence * 100).toFixed(1)}%
  - Incertitude: ${(perf.averageUncertainty * 100).toFixed(1)}%
  - Prédictions: ${perf.predictionCount}
`;
    });

    report += `
📊 QUALITÉ DES DONNÉES:
- Complétude: ${(currentMetrics.dataQuality.completeness * 100).toFixed(1)}%
- Cohérence: ${(currentMetrics.dataQuality.consistency * 100).toFixed(1)}%
- Fraîcheur: ${currentMetrics.dataQuality.freshness} minutes

⚡ SANTÉ DU SYSTÈME:
- Utilisation mémoire: ${(currentMetrics.systemHealth.memoryUsage * 100).toFixed(1)}%
- Latence: ${currentMetrics.systemHealth.predictionLatency.toFixed(0)}ms
- Taux d'erreur: ${(currentMetrics.systemHealth.errorRate * 100).toFixed(2)}%

🚨 ALERTES ACTIVES: ${activeAlerts.length}
`;

    activeAlerts.forEach(alert => {
      report += `
- [${alert.severity.toUpperCase()}] ${alert.message}
  Type: ${alert.type}
  Heure: ${alert.timestamp.toLocaleString('fr-FR')}
`;
    });

    return report;
  }
}
