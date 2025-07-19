import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Zap,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

interface AdvancedMetrics {
  hitRate: number;
  coverageRate: number;
  expectedValue: number;
  consistencyScore: number;
  diversityScore: number;
  temporalStability: number;
  uncertaintyCalibration: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

interface MetricsDisplayProps {
  metrics: AdvancedMetrics;
  modelName: string;
  isLoading?: boolean;
}

export const AdvancedMetricsDisplay: React.FC<MetricsDisplayProps> = ({
  metrics,
  modelName,
  isLoading = false
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number): { variant: "default" | "secondary" | "destructive" | "outline", text: string } => {
    if (score >= 0.8) return { variant: "default", text: "Excellent" };
    if (score >= 0.6) return { variant: "secondary", text: "Bon" };
    if (score >= 0.4) return { variant: "outline", text: "Moyen" };
    return { variant: "destructive", text: "Faible" };
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatScore = (value: number): string => {
    return value.toFixed(3);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            Chargement des métriques...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Métriques Avancées - {modelName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="quality">Qualité</TabsTrigger>
              <TabsTrigger value="stability">Stabilité</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Taux de Réussite
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-green-600">
                          {formatPercentage(metrics.hitRate)}
                        </span>
                        <Badge {...getScoreBadge(metrics.hitRate)}>
                          {getScoreBadge(metrics.hitRate).text}
                        </Badge>
                      </div>
                      <Progress value={metrics.hitRate * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Pourcentage de prédictions correctes
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Couverture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-blue-600">
                          {formatPercentage(metrics.coverageRate)}
                        </span>
                        <Badge {...getScoreBadge(metrics.coverageRate)}>
                          {getScoreBadge(metrics.coverageRate).text}
                        </Badge>
                      </div>
                      <Progress value={metrics.coverageRate * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Pourcentage de numéros gagnants prédits
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Valeur Espérée
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-purple-600">
                          {formatScore(metrics.expectedValue)}
                        </span>
                        <Badge {...getScoreBadge(metrics.expectedValue)}>
                          {getScoreBadge(metrics.expectedValue).text}
                        </Badge>
                      </div>
                      <Progress value={metrics.expectedValue * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Rendement espéré des prédictions
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      F1-Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-indigo-600">
                          {formatScore(metrics.f1Score)}
                        </span>
                        <Badge {...getScoreBadge(metrics.f1Score)}>
                          {getScoreBadge(metrics.f1Score).text}
                        </Badge>
                      </div>
                      <Progress value={metrics.f1Score * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Équilibre précision/rappel
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Cohérence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-orange-600">
                          {formatScore(metrics.consistencyScore)}
                        </span>
                        <Badge {...getScoreBadge(metrics.consistencyScore)}>
                          {getScoreBadge(metrics.consistencyScore).text}
                        </Badge>
                      </div>
                      <Progress value={metrics.consistencyScore * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Cohérence des prédictions dans le temps
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Diversité
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-pink-600">
                          {formatScore(metrics.diversityScore)}
                        </span>
                        <Badge {...getScoreBadge(metrics.diversityScore)}>
                          {getScoreBadge(metrics.diversityScore).text}
                        </Badge>
                      </div>
                      <Progress value={metrics.diversityScore * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Diversité des prédictions
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Calibration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-teal-600">
                          {formatScore(metrics.uncertaintyCalibration)}
                        </span>
                        <Badge {...getScoreBadge(metrics.uncertaintyCalibration)}>
                          {getScoreBadge(metrics.uncertaintyCalibration).text}
                        </Badge>
                      </div>
                      <Progress value={metrics.uncertaintyCalibration * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Qualité de la calibration d'incertitude
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Précision
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-emerald-600">
                          {formatScore(metrics.precision)}
                        </span>
                        <Badge {...getScoreBadge(metrics.precision)}>
                          {getScoreBadge(metrics.precision).text}
                        </Badge>
                      </div>
                      <Progress value={metrics.precision * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Précision des prédictions positives
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="stability" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Stabilité Temporelle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-cyan-600">
                          {formatScore(metrics.temporalStability)}
                        </span>
                        <Badge {...getScoreBadge(metrics.temporalStability)}>
                          {getScoreBadge(metrics.temporalStability).text}
                        </Badge>
                      </div>
                      <Progress value={metrics.temporalStability * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Stabilité des prédictions dans le temps
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Rappel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-violet-600">
                          {formatScore(metrics.recall)}
                        </span>
                        <Badge {...getScoreBadge(metrics.recall)}>
                          {getScoreBadge(metrics.recall).text}
                        </Badge>
                      </div>
                      <Progress value={metrics.recall * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Capacité à identifier les vrais positifs
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
