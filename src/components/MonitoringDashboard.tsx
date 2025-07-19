import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu,
  Database,
  TrendingUp,
  Zap,
  Bell,
  BellOff,
  RefreshCw
} from 'lucide-react';
import { ModelMonitoringService, MonitoringMetrics, MonitoringAlert } from '@/services/modelMonitoring';

export const MonitoringDashboard: React.FC = () => {
  const [currentMetrics, setCurrentMetrics] = useState<MonitoringMetrics | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<MonitoringAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Démarrer le monitoring
    ModelMonitoringService.startMonitoring();
    
    // Charger les données initiales
    loadMonitoringData();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadMonitoringData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadMonitoringData = () => {
    setIsLoading(true);
    try {
      const metrics = ModelMonitoringService.getCurrentMetrics();
      const alerts = ModelMonitoringService.getActiveAlerts();
      
      setCurrentMetrics(metrics);
      setActiveAlerts(alerts);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erreur lors du chargement des données de monitoring:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    ModelMonitoringService.acknowledgeAlert(alertId);
    loadMonitoringData();
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getAlertBadgeVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      default: return 'secondary';
    }
  };

  const getHealthStatus = (): { status: string; color: string; icon: React.ReactNode } => {
    if (!currentMetrics) return { status: 'Inconnu', color: 'text-gray-500', icon: <Clock className="h-4 w-4" /> };
    
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;
    
    if (criticalAlerts > 0) {
      return { status: 'Critique', color: 'text-red-600', icon: <AlertTriangle className="h-4 w-4" /> };
    } else if (highAlerts > 0) {
      return { status: 'Attention', color: 'text-orange-600', icon: <AlertTriangle className="h-4 w-4" /> };
    } else if (activeAlerts.length > 0) {
      return { status: 'Avertissement', color: 'text-yellow-600', icon: <AlertTriangle className="h-4 w-4" /> };
    } else {
      return { status: 'Sain', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> };
    }
  };

  const healthStatus = getHealthStatus();

  if (isLoading && !currentMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            Chargement du monitoring...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statut global */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitoring des Modèles
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {healthStatus.icon}
                <span className={`font-medium ${healthStatus.color}`}>
                  {healthStatus.status}
                </span>
              </div>
              <Button
                onClick={loadMonitoringData}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Dernière mise à jour: {lastUpdate.toLocaleString('fr-FR')}
          </div>
          {activeAlerts.length > 0 && (
            <Alert className="mt-4">
              <Bell className="h-4 w-4" />
              <AlertDescription>
                {activeAlerts.length} alerte(s) active(s) nécessitent votre attention
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Onglets de monitoring */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="models">Modèles</TabsTrigger>
          <TabsTrigger value="system">Système</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {currentMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Performance Globale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(currentMetrics.modelPerformance).map(([model, perf]) => (
                      <div key={model} className="flex items-center justify-between">
                        <span className="text-sm">{model}</span>
                        <span className="font-medium">
                          {(perf.hitRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Qualité des Données
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Complétude</span>
                        <span>{(currentMetrics.dataQuality.completeness * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={currentMetrics.dataQuality.completeness * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Cohérence</span>
                        <span>{(currentMetrics.dataQuality.consistency * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={currentMetrics.dataQuality.consistency * 100} className="h-2" />
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Fraîcheur: </span>
                      <span>{currentMetrics.dataQuality.freshness} min</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Santé du Système
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Mémoire</span>
                        <span>{(currentMetrics.systemHealth.memoryUsage * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={currentMetrics.systemHealth.memoryUsage * 100} className="h-2" />
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Latence: </span>
                      <span>{currentMetrics.systemHealth.predictionLatency.toFixed(0)}ms</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Erreurs: </span>
                      <span>{(currentMetrics.systemHealth.errorRate * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          {currentMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(currentMetrics.modelPerformance).map(([modelName, performance]) => (
                <Card key={modelName}>
                  <CardHeader>
                    <CardTitle className="text-sm">{modelName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Hit Rate</span>
                          <span className="font-medium">{(performance.hitRate * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={performance.hitRate * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Confiance</span>
                          <span>{(performance.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={performance.confidence * 100} className="h-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Prédictions: </span>
                          <span className="font-medium">{performance.predictionCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Incertitude: </span>
                          <span className="font-medium">{(performance.averageUncertainty * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {currentMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Métriques Système</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Utilisation Mémoire</span>
                        <span>{(currentMetrics.systemHealth.memoryUsage * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={currentMetrics.systemHealth.memoryUsage * 100} className="h-3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Latence Moyenne</span>
                        <div className="font-medium text-lg">
                          {currentMetrics.systemHealth.predictionLatency.toFixed(0)}ms
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Taux d'Erreur</span>
                        <div className="font-medium text-lg">
                          {(currentMetrics.systemHealth.errorRate * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Qualité des Données</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Complétude</span>
                        <span>{(currentMetrics.dataQuality.completeness * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={currentMetrics.dataQuality.completeness * 100} className="h-3" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Cohérence</span>
                        <span>{(currentMetrics.dataQuality.consistency * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={currentMetrics.dataQuality.consistency * 100} className="h-3" />
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Dernière mise à jour: </span>
                      <span className="font-medium">{currentMetrics.dataQuality.freshness} minutes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertes Actives ({activeAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAlerts.length > 0 ? (
                <div className="space-y-3">
                  {activeAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.severity)}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alert.message}</span>
                            <Badge variant={getAlertBadgeVariant(alert.severity)}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {alert.timestamp.toLocaleString('fr-FR')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Type: {alert.type}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => acknowledgeAlert(alert.id)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <BellOff className="h-4 w-4" />
                        Acquitter
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Aucune alerte active</p>
                  <p className="text-sm">Tous les systèmes fonctionnent normalement</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
