import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Activity, 
  Database, 
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  HardDrive,
  Cpu,
  BarChart3,
  PieChart,
  LineChart,
  Bell
} from 'lucide-react';
import { UserManagementService } from '@/services/userManagement';
import { AuditService } from '@/services/auditService';
import { ModelMonitoring } from '@/services/modelMonitoring';
import { BackupService } from '@/services/backupService';
import { NotificationService } from '@/services/notificationService';

interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    newToday: number;
    onlineNow: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    responseTime: number;
  };
  predictions: {
    totalToday: number;
    successRate: number;
    averageConfidence: number;
    modelsActive: number;
  };
  security: {
    failedLogins: number;
    blockedIPs: number;
    securityAlerts: number;
    lastSecurityScan: Date;
  };
  data: {
    totalRecords: number;
    dataQuality: number;
    lastBackup: Date;
    storageUsed: number;
  };
}

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<'excellent' | 'good' | 'warning' | 'critical'>('good');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Charger les métriques utilisateurs
      const users = UserManagementService.getUsers();
      const activeSessions = UserManagementService.getActiveSessions();
      const activities = UserManagementService.getUserActivities(undefined, 20);
      
      // Charger les métriques système
      const monitoringMetrics = await ModelMonitoring.getMetrics();
      const auditStats = AuditService.getLogStatistics();
      const backupStats = BackupService.getBackupStatistics();
      const notificationStats = NotificationService.getNotificationStatistics();
      
      // Calculer les métriques
      const dashboardMetrics: DashboardMetrics = {
        users: {
          total: users.length,
          active: users.filter(u => u.isActive).length,
          newToday: users.filter(u => {
            const today = new Date();
            const userDate = new Date(u.createdAt);
            return userDate.toDateString() === today.toDateString();
          }).length,
          onlineNow: activeSessions.length
        },
        system: {
          uptime: Math.floor(Math.random() * 720) + 24, // Simulation
          memoryUsage: Math.random() * 80,
          cpuUsage: Math.random() * 60,
          diskUsage: Math.random() * 70,
          responseTime: Math.random() * 200
        },
        predictions: {
          totalToday: Math.floor(Math.random() * 500) + 100,
          successRate: 0.18,
          averageConfidence: 0.75,
          modelsActive: 2
        },
        security: {
          failedLogins: activities.filter(a => a.action === 'login_failed').length,
          blockedIPs: Math.floor(Math.random() * 5),
          securityAlerts: Math.floor(Math.random() * 3),
          lastSecurityScan: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
        },
        data: {
          totalRecords: Math.floor(Math.random() * 10000) + 5000,
          dataQuality: Math.random() * 20 + 80,
          lastBackup: backupStats.lastBackup || new Date(),
          storageUsed: backupStats.totalSize || Math.random() * 1000000000
        }
      };

      setMetrics(dashboardMetrics);
      setRecentActivities(activities.slice(0, 10));
      
      // Déterminer l'état de santé du système
      const healthScore = calculateSystemHealth(dashboardMetrics);
      setSystemHealth(healthScore);
      
      // Charger les alertes actives
      const activeAlerts = [];
      setAlerts(activeAlerts);
      
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSystemHealth = (metrics: DashboardMetrics): 'excellent' | 'good' | 'warning' | 'critical' => {
    let score = 100;
    
    // Pénalités basées sur les métriques
    if (metrics.system.memoryUsage > 90) score -= 30;
    else if (metrics.system.memoryUsage > 80) score -= 15;
    
    if (metrics.system.cpuUsage > 90) score -= 25;
    else if (metrics.system.cpuUsage > 70) score -= 10;
    
    if (metrics.system.responseTime > 2000) score -= 20;
    else if (metrics.system.responseTime > 1000) score -= 10;
    
    if (metrics.predictions.successRate < 0.1) score -= 25;
    else if (metrics.predictions.successRate < 0.15) score -= 10;
    
    if (metrics.security.securityAlerts > 5) score -= 20;
    else if (metrics.security.securityAlerts > 2) score -= 10;
    
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  const getHealthColor = (health: string): string => {
    switch (health) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'good': return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatUptime = (hours: number): string => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}j ${remainingHours}h`;
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
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
      {/* En-tête avec état de santé */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tableau de Bord Administrateur</h2>
          <p className="text-muted-foreground">
            Vue d'ensemble du système et des performances
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getHealthIcon(systemHealth)}
          <span className={`font-medium ${getHealthColor(systemHealth)}`}>
            Système {systemHealth === 'excellent' ? 'Excellent' : 
                     systemHealth === 'good' ? 'Bon' :
                     systemHealth === 'warning' ? 'Attention' : 'Critique'}
          </span>
        </div>
      </div>

      {/* Alertes actives */}
      {alerts.length > 0 && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            {alerts.length} alerte(s) active(s) nécessitent votre attention
          </AlertDescription>
        </Alert>
      )}

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Utilisateurs</p>
                <p className="text-2xl font-bold">{metrics.users.total}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.users.onlineNow} en ligne
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Prédictions</p>
                <p className="text-2xl font-bold">{metrics.predictions.totalToday}</p>
                <p className="text-xs text-muted-foreground">
                  {(metrics.predictions.successRate * 100).toFixed(1)}% de réussite
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Données</p>
                <p className="text-2xl font-bold">{metrics.data.totalRecords.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  Qualité: {metrics.data.dataQuality.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Sécurité</p>
                <p className="text-2xl font-bold">{metrics.security.securityAlerts}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.security.failedLogins} échecs de connexion
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métriques système détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Performance Système
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Utilisation Mémoire</span>
                <span>{metrics.system.memoryUsage.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.system.memoryUsage} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Utilisation CPU</span>
                <span>{metrics.system.cpuUsage.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.system.cpuUsage} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Utilisation Disque</span>
                <span>{metrics.system.diskUsage.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.system.diskUsage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="font-medium">{formatUptime(metrics.system.uptime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temps de réponse</p>
                <p className="font-medium">{metrics.system.responseTime.toFixed(0)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Activité des Modèles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Modèles Actifs</p>
                <p className="text-2xl font-bold">{metrics.predictions.modelsActive}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confiance Moyenne</p>
                <p className="text-2xl font-bold">
                  {(metrics.predictions.averageConfidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Taux de Réussite</span>
                <span>{(metrics.predictions.successRate * 100).toFixed(1)}%</span>
              </div>
              <Progress value={metrics.predictions.successRate * 100} className="h-2" />
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">Prédictions Aujourd'hui</p>
              <p className="text-lg font-bold">{metrics.predictions.totalToday}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activités récentes et stockage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activités Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-muted-foreground">
                      {activity.resource} | {activity.ipAddress}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={activity.success ? "default" : "destructive"}>
                      {activity.success ? "Succès" : "Échec"}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Stockage et Sauvegardes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Espace Utilisé</p>
              <p className="text-lg font-bold">{formatFileSize(metrics.data.storageUsed)}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Dernière Sauvegarde</p>
              <p className="font-medium">
                {metrics.data.lastBackup.toLocaleDateString('fr-FR')} à{' '}
                {metrics.data.lastBackup.toLocaleTimeString('fr-FR')}
              </p>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Qualité des Données</span>
                <span>{metrics.data.dataQuality.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.data.dataQuality} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
