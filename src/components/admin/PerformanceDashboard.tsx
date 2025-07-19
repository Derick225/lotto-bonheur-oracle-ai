import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cpu, 
  HardDrive, 
  Activity,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Database,
  Globe
} from 'lucide-react';
import { ModelMonitoringService } from '@/services/modelMonitoring';
import { AuditService } from '@/services/auditService';

interface PerformanceMetrics {
  system: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    uptime: number;
  };
  application: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeUsers: number;
    requestsPerSecond: number;
  };
  database: {
    connections: number;
    queryTime: number;
    cacheHitRate: number;
    indexEfficiency: number;
  };
  models: {
    predictionLatency: number;
    accuracy: number;
    confidence: number;
    modelsActive: number;
  };
}

interface PerformanceTrend {
  timestamp: Date;
  cpu: number;
  memory: number;
  responseTime: number;
  throughput: number;
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadPerformanceData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadPerformanceData, 30000); // Actualiser toutes les 30 secondes
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadPerformanceData = async () => {
    try {
      // Simuler le chargement des métriques de performance
      const systemMetrics = await generateSystemMetrics();
      const appMetrics = await generateApplicationMetrics();
      const dbMetrics = await generateDatabaseMetrics();
      const modelMetrics = await generateModelMetrics();
      
      const performanceMetrics: PerformanceMetrics = {
        system: systemMetrics,
        application: appMetrics,
        database: dbMetrics,
        models: modelMetrics
      };
      
      setMetrics(performanceMetrics);
      
      // Générer les tendances
      const newTrend: PerformanceTrend = {
        timestamp: new Date(),
        cpu: systemMetrics.cpu,
        memory: systemMetrics.memory,
        responseTime: appMetrics.responseTime,
        throughput: appMetrics.throughput
      };
      
      setTrends(prev => {
        const updated = [newTrend, ...prev].slice(0, 50); // Garder les 50 derniers points
        return updated;
      });
      
      // Vérifier les alertes
      checkPerformanceAlerts(performanceMetrics);
      
    } catch (error) {
      console.error('Erreur lors du chargement des métriques de performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSystemMetrics = async () => {
    return {
      cpu: Math.random() * 80 + 10, // 10-90%
      memory: Math.random() * 70 + 20, // 20-90%
      disk: Math.random() * 60 + 30, // 30-90%
      network: Math.random() * 100, // 0-100 Mbps
      uptime: Math.floor(Math.random() * 720) + 24 // 24-744 heures
    };
  };

  const generateApplicationMetrics = async () => {
    return {
      responseTime: Math.random() * 500 + 50, // 50-550ms
      throughput: Math.random() * 1000 + 100, // 100-1100 req/min
      errorRate: Math.random() * 5, // 0-5%
      activeUsers: Math.floor(Math.random() * 100) + 10, // 10-110 utilisateurs
      requestsPerSecond: Math.random() * 50 + 10 // 10-60 req/s
    };
  };

  const generateDatabaseMetrics = async () => {
    return {
      connections: Math.floor(Math.random() * 50) + 5, // 5-55 connexions
      queryTime: Math.random() * 100 + 10, // 10-110ms
      cacheHitRate: Math.random() * 20 + 80, // 80-100%
      indexEfficiency: Math.random() * 15 + 85 // 85-100%
    };
  };

  const generateModelMetrics = async () => {
    try {
      const monitoringMetrics = ModelMonitoringService.getCurrentMetrics();
      return {
        predictionLatency: monitoringMetrics?.systemHealth?.predictionLatency || Math.random() * 200 + 50,
        accuracy: Object.values(monitoringMetrics?.modelPerformance || {})
          .reduce((sum: number, perf: any) => sum + perf.hitRate, 0) / 
          Object.keys(monitoringMetrics?.modelPerformance || {}).length || 0.18,
        confidence: Object.values(monitoringMetrics?.modelPerformance || {})
          .reduce((sum: number, perf: any) => sum + perf.confidence, 0) / 
          Object.keys(monitoringMetrics?.modelPerformance || {}).length || 0.75,
        modelsActive: Object.keys(monitoringMetrics?.modelPerformance || {}).length || 3
      };
    } catch (error) {
      return {
        predictionLatency: Math.random() * 200 + 50,
        accuracy: Math.random() * 0.3 + 0.1,
        confidence: Math.random() * 0.3 + 0.7,
        modelsActive: 3
      };
    }
  };

  const checkPerformanceAlerts = (metrics: PerformanceMetrics) => {
    const newAlerts = [];
    
    if (metrics.system.cpu > 90) {
      newAlerts.push({
        type: 'critical',
        message: `Utilisation CPU critique: ${metrics.system.cpu.toFixed(1)}%`,
        timestamp: new Date()
      });
    }
    
    if (metrics.system.memory > 85) {
      newAlerts.push({
        type: 'warning',
        message: `Utilisation mémoire élevée: ${metrics.system.memory.toFixed(1)}%`,
        timestamp: new Date()
      });
    }
    
    if (metrics.application.responseTime > 1000) {
      newAlerts.push({
        type: 'warning',
        message: `Temps de réponse élevé: ${metrics.application.responseTime.toFixed(0)}ms`,
        timestamp: new Date()
      });
    }
    
    if (metrics.application.errorRate > 5) {
      newAlerts.push({
        type: 'critical',
        message: `Taux d'erreur élevé: ${metrics.application.errorRate.toFixed(1)}%`,
        timestamp: new Date()
      });
    }
    
    setAlerts(newAlerts);
  };

  const getHealthStatus = (value: number, thresholds: { warning: number; critical: number }): 'good' | 'warning' | 'critical' => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'good';
  };

  const getHealthColor = (status: string): string => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatUptime = (hours: number): string => {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return `${days}j ${remainingHours}h`;
  };

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tableau de Bord Performance</h2>
          <p className="text-muted-foreground">
            Surveillance en temps réel des performances système
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-actualisation
          </Button>
          <Button onClick={loadPerformanceData} variant="outline" size="sm">
            Actualiser
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div key={index} className={`p-3 rounded-lg border ${
              alert.type === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${
                  alert.type === 'critical' ? 'text-red-600' : 'text-yellow-600'
                }`} />
                <span className="text-sm font-medium">{alert.message}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {alert.timestamp.toLocaleTimeString('fr-FR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">CPU</p>
                  <p className="text-2xl font-bold">{metrics.system.cpu.toFixed(1)}%</p>
                </div>
              </div>
              {getHealthIcon(getHealthStatus(metrics.system.cpu, { warning: 70, critical: 90 }))}
            </div>
            <Progress value={metrics.system.cpu} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Mémoire</p>
                  <p className="text-2xl font-bold">{metrics.system.memory.toFixed(1)}%</p>
                </div>
              </div>
              {getHealthIcon(getHealthStatus(metrics.system.memory, { warning: 80, critical: 90 }))}
            </div>
            <Progress value={metrics.system.memory} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Réponse</p>
                  <p className="text-2xl font-bold">{metrics.application.responseTime.toFixed(0)}ms</p>
                </div>
              </div>
              {getHealthIcon(getHealthStatus(metrics.application.responseTime, { warning: 500, critical: 1000 }))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Débit</p>
                  <p className="text-2xl font-bold">{metrics.application.throughput.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">req/min</p>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets détaillés */}
      <Tabs defaultValue="system" className="w-full">
        <TabsList>
          <TabsTrigger value="system">Système</TabsTrigger>
          <TabsTrigger value="application">Application</TabsTrigger>
          <TabsTrigger value="database">Base de Données</TabsTrigger>
          <TabsTrigger value="models">Modèles IA</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ressources Système</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU</span>
                    <span>{metrics.system.cpu.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.system.cpu} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Mémoire</span>
                    <span>{metrics.system.memory.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.system.memory} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Disque</span>
                    <span>{metrics.system.disk.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.system.disk} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informations Système</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className="font-medium">{formatUptime(metrics.system.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Réseau</span>
                  <span className="font-medium">{metrics.system.network.toFixed(1)} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Utilisateurs actifs</span>
                  <span className="font-medium">{metrics.application.activeUsers}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="application" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-muted-foreground">Temps de Réponse</p>
                  <p className="text-2xl font-bold">{metrics.application.responseTime.toFixed(0)}ms</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-muted-foreground">Débit</p>
                  <p className="text-2xl font-bold">{metrics.application.requestsPerSecond.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">req/s</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="text-sm text-muted-foreground">Taux d'Erreur</p>
                  <p className="text-2xl font-bold">{metrics.application.errorRate.toFixed(2)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Base de Données</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Connexions actives</span>
                  <span className="font-medium">{metrics.database.connections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Temps de requête moyen</span>
                  <span className="font-medium">{metrics.database.queryTime.toFixed(1)}ms</span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Taux de cache hit</span>
                    <span>{metrics.database.cacheHitRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.database.cacheHitRate} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Efficacité des index</span>
                    <span>{metrics.database.indexEfficiency.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.database.indexEfficiency} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance des Modèles IA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Modèles actifs</span>
                  <span className="font-medium">{metrics.models.modelsActive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Latence de prédiction</span>
                  <span className="font-medium">{metrics.models.predictionLatency.toFixed(0)}ms</span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Précision moyenne</span>
                    <span>{(metrics.models.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.models.accuracy * 100} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Confiance moyenne</span>
                    <span>{(metrics.models.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.models.confidence * 100} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
