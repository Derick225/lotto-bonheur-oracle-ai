import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Settings, 
  TrendingUp, 
  Zap, 
  BarChart3, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { PredictionService } from '@/services/predictionService';
import { EnsembleOptimizer } from '@/services/ensembleOptimizer';
import { IndexedDBService } from '@/services/indexedDBService';
import { TimeSeriesValidator } from '@/services/timeSeriesValidator';
import { BacktestingService } from '@/services/backtestingService';
import { ContinuousLearningService } from '@/services/continuousLearning';

interface OptimizationStatus {
  isRunning: boolean;
  progress: number;
  currentModel: string;
  currentIteration: number;
  totalIterations: number;
  bestScore: number;
  timeElapsed: number;
}

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  hitRate: number;
  coverageRate: number;
  expectedValue: number;
  consistencyScore: number;
}

export const ModelOptimizationPanel: React.FC = () => {
  const [optimizationStatus, setOptimizationStatus] = useState<OptimizationStatus>({
    isRunning: false,
    progress: 0,
    currentModel: '',
    currentIteration: 0,
    totalIterations: 0,
    bestScore: 0,
    timeElapsed: 0
  });

  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<{
    xgboost: ModelMetrics | null;
    lstm: ModelMetrics | null;
    ensemble: ModelMetrics | null;
  }>({
    xgboost: null,
    lstm: null,
    ensemble: null
  });
  const [validationResults, setValidationResults] = useState<any>(null);
  const [backtestResults, setBacktestResults] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [learningStatus, setLearningStatus] = useState<any>(null);
  const [learningHistory, setLearningHistory] = useState<any[]>([]);

  useEffect(() => {
    loadOptimizationHistory();
    loadPerformanceHistory();
    loadLearningStatus();

    // Démarrer l'apprentissage continu
    ContinuousLearningService.startContinuousLearning();
  }, []);

  const loadOptimizationHistory = async () => {
    try {
      const history = await IndexedDBService.getAllOptimizationResults();
      setOptimizationHistory(history);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique d\'optimisation:', error);
    }
  };

  const loadPerformanceHistory = async () => {
    try {
      const history = EnsembleOptimizer.getPerformanceHistory();
      setPerformanceHistory(history.slice(-20)); // 20 dernières mesures
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique de performance:', error);
    }
  };

  const startOptimization = async () => {
    setOptimizationStatus(prev => ({
      ...prev,
      isRunning: true,
      progress: 0,
      currentModel: 'Initialisation...',
      timeElapsed: 0
    }));

    const startTime = Date.now();
    const timer = setInterval(() => {
      setOptimizationStatus(prev => ({
        ...prev,
        timeElapsed: Math.floor((Date.now() - startTime) / 1000)
      }));
    }, 1000);

    try {
      // Simuler le processus d'optimisation avec des mises à jour de statut
      setOptimizationStatus(prev => ({
        ...prev,
        currentModel: 'XGBoost',
        totalIterations: 30
      }));

      // Lancer l'optimisation réelle
      await PredictionService.initializeModels(true);

      setOptimizationStatus(prev => ({
        ...prev,
        progress: 100,
        currentModel: 'Terminé',
        isRunning: false
      }));

      // Recharger les données
      await loadOptimizationHistory();
      await loadPerformanceHistory();

    } catch (error) {
      console.error('Erreur lors de l\'optimisation:', error);
      setOptimizationStatus(prev => ({
        ...prev,
        isRunning: false,
        currentModel: 'Erreur'
      }));
    } finally {
      clearInterval(timer);
    }
  };

  const resetOptimization = async () => {
    try {
      // Réinitialiser les modèles avec les paramètres par défaut
      await PredictionService.initializeModels(false);
      setOptimizationStatus({
        isRunning: false,
        progress: 0,
        currentModel: '',
        currentIteration: 0,
        totalIterations: 0,
        bestScore: 0,
        timeElapsed: 0
      });
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
    }
  };

  const runValidation = async () => {
    setIsValidating(true);
    try {
      const results = await IndexedDBService.getAllResults();
      if (results.length < 100) {
        throw new Error('Données insuffisantes pour la validation');
      }

      // Validation pour XGBoost
      const xgboostValidation = await TimeSeriesValidator.performTimeSeriesValidation(
        'XGBoost',
        results,
        { nFolds: 5, testSize: 0.15, minTrainSize: 50, stepSize: 10, purgeGap: 5 }
      );

      // Validation pour RNN-LSTM
      const lstmValidation = await TimeSeriesValidator.performTimeSeriesValidation(
        'RNN-LSTM',
        results,
        { nFolds: 5, testSize: 0.15, minTrainSize: 50, stepSize: 10, purgeGap: 5 }
      );

      setValidationResults({
        xgboost: xgboostValidation,
        lstm: lstmValidation
      });

    } catch (error) {
      console.error('Erreur lors de la validation:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const runBacktest = async () => {
    setIsBacktesting(true);
    try {
      const results = await IndexedDBService.getAllResults();
      if (results.length < 200) {
        throw new Error('Données insuffisantes pour le backtesting');
      }

      // Configurer le backtesting pour les 6 derniers mois
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const backtestResults = await BacktestingService.runBacktest(results, {
        startDate,
        endDate,
        rebalanceFrequency: 20,
        minTrainingSize: 100,
        topN: 5,
        algorithms: ['XGBoost', 'RNN-LSTM', 'Hybrid']
      });

      setBacktestResults(backtestResults);

    } catch (error) {
      console.error('Erreur lors du backtesting:', error);
    } finally {
      setIsBacktesting(false);
    }
  };

  const loadLearningStatus = () => {
    try {
      const status = ContinuousLearningService.getStatus();
      const history = ContinuousLearningService.getLearningHistory();

      setLearningStatus(status);
      setLearningHistory(history.slice(-10)); // 10 dernières sessions
    } catch (error) {
      console.error('Erreur lors du chargement du statut d\'apprentissage:', error);
    }
  };

  const triggerManualLearning = async () => {
    try {
      setOptimizationStatus(prev => ({
        ...prev,
        isRunning: true,
        currentModel: 'Apprentissage continu...'
      }));

      await ContinuousLearningService.triggerManualLearning();
      loadLearningStatus();

    } catch (error) {
      console.error('Erreur lors du déclenchement manuel:', error);
    } finally {
      setOptimizationStatus(prev => ({
        ...prev,
        isRunning: false,
        currentModel: ''
      }));
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Terminé': return 'text-green-600';
      case 'Erreur': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Statut de l'optimisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Optimisation des Modèles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Statut:</span>
                <Badge variant={optimizationStatus.isRunning ? "default" : "secondary"}>
                  {optimizationStatus.isRunning ? "En cours" : "Arrêté"}
                </Badge>
              </div>
              {optimizationStatus.currentModel && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Modèle actuel:</span>
                  <span className={`text-sm font-medium ${getStatusColor(optimizationStatus.currentModel)}`}>
                    {optimizationStatus.currentModel}
                  </span>
                </div>
              )}
              {optimizationStatus.timeElapsed > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Temps écoulé: {formatTime(optimizationStatus.timeElapsed)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={startOptimization}
                disabled={optimizationStatus.isRunning}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Optimiser
              </Button>
              <Button
                onClick={resetOptimization}
                variant="outline"
                disabled={optimizationStatus.isRunning}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </Button>
              <Button
                onClick={runValidation}
                variant="outline"
                disabled={isValidating || optimizationStatus.isRunning}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isValidating ? 'Validation...' : 'Valider'}
              </Button>
              <Button
                onClick={runBacktest}
                variant="outline"
                disabled={isBacktesting || optimizationStatus.isRunning}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                {isBacktesting ? 'Backtesting...' : 'Backtest'}
              </Button>
              <Button
                onClick={triggerManualLearning}
                variant="outline"
                disabled={optimizationStatus.isRunning || learningStatus?.isLearning}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {learningStatus?.isLearning ? 'Apprentissage...' : 'Apprendre'}
              </Button>
            </div>
          </div>

          {optimizationStatus.isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression</span>
                <span>{optimizationStatus.progress}%</span>
              </div>
              <Progress value={optimizationStatus.progress} className="w-full" />
            </div>
          )}

          {optimizationStatus.bestScore > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Meilleur score atteint: {optimizationStatus.bestScore.toFixed(4)}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Onglets pour les détails */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="metrics">Métriques</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
          <TabsTrigger value="learning">Apprentissage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Historique d'Optimisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {optimizationHistory.length > 0 ? (
                <div className="space-y-3">
                  {optimizationHistory.slice(0, 5).map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          {new Date(result.timestamp).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          XGBoost: {result.xgboost.bestScore.toFixed(4)} | 
                          LSTM: {result.lstm.bestScore.toFixed(4)}
                        </div>
                      </div>
                      <Badge variant="outline">
                        Optimisé
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun historique d'optimisation disponible
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['xgboost', 'lstm', 'ensemble'].map((modelType) => (
              <Card key={modelType}>
                <CardHeader>
                  <CardTitle className="text-sm capitalize">{modelType}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Précision:</span>
                      <span>-</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rappel:</span>
                      <span>-</span>
                    </div>
                    <div className="flex justify-between">
                      <span>F1-Score:</span>
                      <span>-</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hit Rate:</span>
                      <span>-</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Validation Croisée Temporelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validationResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">XGBoost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Hit Rate:</span>
                            <span>{(validationResults.xgboost.aggregatedMetrics.hitRate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stabilité:</span>
                            <span>{validationResults.xgboost.stabilityScore.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tendance:</span>
                            <Badge variant="outline">
                              {validationResults.xgboost.convergenceAnalysis.trendDirection}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">RNN-LSTM</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Hit Rate:</span>
                            <span>{(validationResults.lstm.aggregatedMetrics.hitRate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stabilité:</span>
                            <span>{validationResults.lstm.stabilityScore.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tendance:</span>
                            <Badge variant="outline">
                              {validationResults.lstm.convergenceAnalysis.trendDirection}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun résultat de validation disponible. Cliquez sur "Valider" pour lancer la validation croisée.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backtest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Résultats du Backtesting
              </CardTitle>
            </CardHeader>
            <CardContent>
              {backtestResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Performance Globale</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Trades:</span>
                            <span>{backtestResults.summary.totalTrades}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Hit Rate:</span>
                            <span>{(backtestResults.summary.averageHitRate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Profit Total:</span>
                            <span className={backtestResults.summary.totalProfit > 0 ? 'text-green-600' : 'text-red-600'}>
                              {backtestResults.summary.totalProfit.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sharpe Ratio:</span>
                            <span>{backtestResults.summary.sharpeRatio.toFixed(3)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Meilleur Algorithme</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <Badge variant="default" className="text-lg">
                            {backtestResults.summary.bestAlgorithm}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-2">
                            Win Rate: {(backtestResults.summary.winRate * 100).toFixed(1)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Risque</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Max Drawdown:</span>
                            <span className="text-red-600">
                              {backtestResults.summary.maxDrawdown.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun résultat de backtesting disponible. Cliquez sur "Backtest" pour lancer l'analyse historique.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Apprentissage Continu
              </CardTitle>
            </CardHeader>
            <CardContent>
              {learningStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Statut</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Badge variant={learningStatus.isLearning ? "default" : "secondary"}>
                            {learningStatus.isLearning ? "En cours" : "Inactif"}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            Dernière vérification: {learningStatus.lastCheck ? new Date(learningStatus.lastCheck).toLocaleString('fr-FR') : 'N/A'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Sessions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold">{learningStatus.totalSessions}</div>
                          <div className="text-sm text-muted-foreground">
                            Taux de succès: {(learningStatus.successRate * 100).toFixed(1)}%
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={triggerManualLearning}
                          disabled={learningStatus.isLearning}
                          className="w-full"
                        >
                          Déclencher Apprentissage
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {learningHistory.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="font-medium">Historique des Sessions</h5>
                      {learningHistory.slice(0, 5).map((session, index) => (
                        <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">
                              {new Date(session.timestamp).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Déclencheur: {session.trigger} | Modèles: {session.modelsRetrained.join(', ')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Durée: {(session.duration / 1000).toFixed(1)}s | Points: {session.dataPoints}
                            </div>
                          </div>
                          <Badge variant={session.success ? "default" : "destructive"}>
                            {session.success ? "Succès" : "Échec"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Chargement du statut d'apprentissage...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance en Temps Réel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceHistory.length > 0 ? (
                <div className="space-y-3">
                  {performanceHistory.slice(-5).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          {new Date(entry.timestamp).toLocaleString('fr-FR')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Performance d'ensemble: {entry.ensemblePerformance.toFixed(4)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          XGB: {entry.modelPerformances.get('XGBoost')?.toFixed(3) || 'N/A'}
                        </div>
                        <div className="text-sm">
                          LSTM: {entry.modelPerformances.get('RNN-LSTM')?.toFixed(3) || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune donnée de performance disponible
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
