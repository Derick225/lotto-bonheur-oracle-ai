import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LotteryNumber } from '@/components/LotteryNumber';
import { PredictionResult } from '@/services/predictionService';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Activity
} from 'lucide-react';

interface AdvancedPredictionDisplayProps {
  prediction: PredictionResult | null;
  loading: boolean;
  error?: string;
  onRefresh?: () => void;
  onAlgorithmChange?: (algorithm: string) => void;
}

export function AdvancedPredictionDisplay({
  prediction,
  loading,
  error,
  onRefresh,
  onAlgorithmChange
}: AdvancedPredictionDisplayProps) {
  const [selectedTab, setSelectedTab] = useState('predictions');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            Génération des prédictions...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={33} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Analyse des données historiques et entraînement des modèles...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="ml-2">
              Réessayer
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (!prediction) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Aucune prédiction disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAlgorithmIcon = (algorithm: string) => {
    switch (algorithm) {
      case 'XGBoost': return <BarChart3 className="h-4 w-4" />;
      case 'RNN-LSTM': return <Activity className="h-4 w-4" />;
      case 'Hybrid': return <Cpu className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Prédictions IA Avancées
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              {getAlgorithmIcon(prediction.algorithm)}
              {prediction.algorithm}
            </Badge>
            <Badge 
              variant="secondary" 
              className={`gap-1 ${getConfidenceColor(prediction.confidence)}`}
            >
              <Target className="h-3 w-3" />
              {(prediction.confidence * 100).toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="predictions">Prédictions</TabsTrigger>
            <TabsTrigger value="analysis">Analyse</TabsTrigger>
            <TabsTrigger value="metrics">Métriques</TabsTrigger>
            <TabsTrigger value="bayesian">Bayésien</TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-4">
            <div className="grid gap-4">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top 5 Numéros Recommandés
              </h4>
              
              <div className="grid gap-3">
                {prediction.numbers.map((num, index) => (
                  <div key={num.number} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <LotteryNumber number={num.number} size="lg" />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          Numéro {num.number}
                        </span>
                        <span className="text-sm font-mono">
                          {(num.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      <Progress value={num.probability * 100} className="h-2" />
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Confiance: {(num.confidence * 100).toFixed(1)}%</span>
                        <span>Incertitude: {(num.uncertainty * 100).toFixed(1)}%</span>
                        {num.bayesianProbability && (
                          <span>Bayésien: {(num.bayesianProbability * 100).toFixed(1)}%</span>
                        )}
                      </div>
                      
                      {num.features.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {num.features.slice(0, 3).map((feature, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4">
              <h4 className="font-medium">Analyse des Features</h4>
              
              <div className="grid gap-2">
                {prediction.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {prediction.metadata?.ensembleWeights && (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Poids de l'Ensemble</h5>
                  <div className="grid gap-2">
                    {Object.entries(prediction.metadata.ensembleWeights).map(([model, weight]) => (
                      <div key={model} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{model}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={(weight as number) * 100} className="w-20 h-2" />
                          <span className="text-xs font-mono w-12">
                            {((weight as number) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid gap-4">
              <h4 className="font-medium">Métriques du Modèle</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{prediction.metadata.dataPoints}</div>
                    <p className="text-xs text-muted-foreground">Points de données</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{prediction.metadata.modelVersion}</div>
                    <p className="text-xs text-muted-foreground">Version du modèle</p>
                  </CardContent>
                </Card>
              </div>

              {prediction.metadata?.modelMetrics && (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Performance</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Précision:</span>
                      <span className="font-mono">
                        {(prediction.metadata.modelMetrics.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>F1-Score:</span>
                      <span className="font-mono">
                        {(prediction.metadata.modelMetrics.f1Score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rappel:</span>
                      <span className="font-mono">
                        {(prediction.metadata.modelMetrics.recall * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Log Loss:</span>
                      <span className="font-mono">
                        {prediction.metadata.modelMetrics.logLoss.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Dernière mise à jour: {prediction.metadata.lastUpdate.toLocaleString()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bayesian" className="space-y-4">
            <div className="grid gap-4">
              <h4 className="font-medium">Analyse Bayésienne</h4>
              
              {prediction.metadata?.bayesianAnalysis ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <h5 className="font-medium text-sm">Force de l'Évidence</h5>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={prediction.metadata.bayesianAnalysis.evidenceStrength * 100} 
                        className="flex-1 h-2" 
                      />
                      <span className="text-sm font-mono">
                        {(prediction.metadata.bayesianAnalysis.evidenceStrength * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Intervalles de Crédibilité (95%)</h5>
                    <div className="text-xs text-muted-foreground">
                      Les intervalles de confiance bayésiens pour les numéros prédits
                    </div>
                    
                    <div className="grid gap-1">
                      {prediction.numbers.slice(0, 3).map((num, index) => {
                        const interval = prediction.metadata?.bayesianAnalysis?.credibleIntervals[num.number - 1];
                        return interval ? (
                          <div key={num.number} className="flex items-center justify-between text-sm">
                            <span>Numéro {num.number}:</span>
                            <span className="font-mono">
                              [{(interval.lower * 100).toFixed(1)}% - {(interval.upper * 100).toFixed(1)}%]
                            </span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Analyse bayésienne non disponible pour cette prédiction
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {onRefresh && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {onAlgorithmChange && (
                  <>
                    <Button 
                      variant={prediction.algorithm === 'Hybrid' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => onAlgorithmChange('Hybrid')}
                    >
                      <Cpu className="h-3 w-3 mr-1" />
                      Hybride
                    </Button>
                    <Button 
                      variant={prediction.algorithm === 'XGBoost' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => onAlgorithmChange('XGBoost')}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      XGBoost
                    </Button>
                    <Button 
                      variant={prediction.algorithm === 'RNN-LSTM' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => onAlgorithmChange('RNN-LSTM')}
                    >
                      <Activity className="h-3 w-3 mr-1" />
                      LSTM
                    </Button>
                  </>
                )}
              </div>
              
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <Zap className="h-3 w-3 mr-1" />
                Nouvelle Prédiction
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
