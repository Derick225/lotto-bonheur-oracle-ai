import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Filter, 
  Search, 
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Activity,
  BarChart3
} from 'lucide-react';
import { 
  AuditService, 
  LogLevel, 
  AuditCategory, 
  SystemLog, 
  AuditEntry, 
  PerformanceMetric,
  ExportConfig
} from '@/services/auditService';

export const AuditLogsPanel: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  
  // Filtres
  const [logFilters, setLogFilters] = useState({
    levels: [] as LogLevel[],
    categories: [] as string[],
    search: '',
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 jours
      end: new Date()
    }
  });

  const [auditFilters, setAuditFilters] = useState({
    categories: [] as AuditCategory[],
    risk: [] as string[],
    success: undefined as boolean | undefined,
    search: '',
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  });

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const systemLogs = AuditService.getLogs({
        levels: logFilters.levels.length > 0 ? logFilters.levels : undefined,
        categories: logFilters.categories.length > 0 ? logFilters.categories : undefined,
        search: logFilters.search || undefined,
        dateRange: logFilters.dateRange,
        limit: 1000
      });
      setLogs(systemLogs);

      const audits = AuditService.getAuditEntries({
        categories: auditFilters.categories.length > 0 ? auditFilters.categories : undefined,
        risk: auditFilters.risk.length > 0 ? auditFilters.risk : undefined,
        success: auditFilters.success,
        search: auditFilters.search || undefined,
        dateRange: auditFilters.dateRange,
        limit: 1000
      });
      setAuditEntries(audits);

      const metrics = AuditService.getPerformanceMetrics({
        dateRange: logFilters.dateRange,
        limit: 500
      });
      setPerformanceMetrics(metrics);

      const stats = AuditService.getLogStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des données d\'audit:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [logFilters, auditFilters]);

  const getLogLevelIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case LogLevel.WARN:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case LogLevel.INFO:
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getLogLevelBadge = (level: LogLevel): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case LogLevel.CRITICAL: return 'destructive';
      case LogLevel.ERROR: return 'destructive';
      case LogLevel.WARN: return 'outline';
      case LogLevel.INFO: return 'default';
      default: return 'secondary';
    }
  };

  const getRiskBadge = (risk: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      default: return 'secondary';
    }
  };

  const handleExport = async (config: ExportConfig) => {
    try {
      const blob = await AuditService.exportLogs(config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${config.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit et Logs</h2>
          <p className="text-muted-foreground">
            Surveillance et traçabilité des activités système
          </p>
        </div>
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exporter les Logs</DialogTitle>
            </DialogHeader>
            <ExportForm onSubmit={handleExport} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Total Logs</p>
                  <p className="text-2xl font-bold">{statistics.totalLogs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Entrées d'Audit</p>
                  <p className="text-2xl font-bold">{statistics.totalAuditEntries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <XCircle className="h-4 w-4 text-red-500" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Erreurs</p>
                  <p className="text-2xl font-bold">
                    {(statistics.logsByLevel[LogLevel.ERROR] || 0) + 
                     (statistics.logsByLevel[LogLevel.CRITICAL] || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Perf. Moyenne</p>
                  <p className="text-2xl font-bold">{statistics.averagePerformance.toFixed(0)}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onglets principaux */}
      <Tabs defaultValue="logs" className="w-full">
        <TabsList>
          <TabsTrigger value="logs">Logs Système</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filtres pour logs */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Recherche</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher dans les logs..."
                      value={logFilters.search}
                      onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value })}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Niveau</Label>
                  <Select 
                    value={logFilters.levels[0] || 'all'} 
                    onValueChange={(value) => 
                      setLogFilters({ 
                        ...logFilters, 
                        levels: value === 'all' ? [] : [value as LogLevel] 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les niveaux" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les niveaux</SelectItem>
                      <SelectItem value={LogLevel.CRITICAL}>Critique</SelectItem>
                      <SelectItem value={LogLevel.ERROR}>Erreur</SelectItem>
                      <SelectItem value={LogLevel.WARN}>Avertissement</SelectItem>
                      <SelectItem value={LogLevel.INFO}>Information</SelectItem>
                      <SelectItem value={LogLevel.DEBUG}>Debug</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Input
                    placeholder="Filtrer par catégorie..."
                    value={logFilters.categories[0] || ''}
                    onChange={(e) => 
                      setLogFilters({ 
                        ...logFilters, 
                        categories: e.target.value ? [e.target.value] : [] 
                      })
                    }
                  />
                </div>
                <div>
                  <Button onClick={loadData} className="mt-6">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des logs */}
          <Card>
            <CardHeader>
              <CardTitle>Logs Système ({logs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getLogLevelIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getLogLevelBadge(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{log.category}</span>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp.toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.message}</p>
                      {log.userId && (
                        <p className="text-xs text-muted-foreground">
                          Utilisateur: {log.userId} | IP: {log.ipAddress}
                        </p>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Détails
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun log trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          {/* Filtres pour audit */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Recherche</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher dans l'audit..."
                      value={auditFilters.search}
                      onChange={(e) => setAuditFilters({ ...auditFilters, search: e.target.value })}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select 
                    value={auditFilters.categories[0] || 'all'} 
                    onValueChange={(value) => 
                      setAuditFilters({ 
                        ...auditFilters, 
                        categories: value === 'all' ? [] : [value as AuditCategory] 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {Object.values(AuditCategory).map(category => (
                        <SelectItem key={category} value={category}>
                          {category.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Risque</Label>
                  <Select 
                    value={auditFilters.risk[0] || 'all'} 
                    onValueChange={(value) => 
                      setAuditFilters({ 
                        ...auditFilters, 
                        risk: value === 'all' ? [] : [value] 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les risques" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les risques</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                      <SelectItem value="high">Élevé</SelectItem>
                      <SelectItem value="medium">Moyen</SelectItem>
                      <SelectItem value="low">Faible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select 
                    value={auditFilters.success === undefined ? 'all' : auditFilters.success.toString()} 
                    onValueChange={(value) => 
                      setAuditFilters({ 
                        ...auditFilters, 
                        success: value === 'all' ? undefined : value === 'true' 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="true">Succès</SelectItem>
                      <SelectItem value="false">Échec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des entrées d'audit */}
          <Card>
            <CardHeader>
              <CardTitle>Entrées d'Audit ({auditEntries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={entry.success ? "default" : "destructive"}>
                          {entry.success ? "Succès" : "Échec"}
                        </Badge>
                        <Badge variant={getRiskBadge(entry.risk)}>
                          {entry.risk}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{entry.category}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.timestamp.toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {entry.username} - {entry.action} sur {entry.resource}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        IP: {entry.ipAddress} | Session: {entry.sessionId.slice(-8)}
                      </p>
                      {entry.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">
                          Erreur: {entry.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {auditEntries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune entrée d'audit trouvée
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métriques de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {performanceMetrics.map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{metric.operation}</p>
                      <p className="text-sm text-muted-foreground">
                        {metric.timestamp.toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{metric.duration}ms</p>
                      <Badge variant={metric.success ? "default" : "destructive"}>
                        {metric.success ? "Succès" : "Échec"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {performanceMetrics.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune métrique de performance trouvée
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Composant de formulaire d'export
interface ExportFormProps {
  onSubmit: (config: ExportConfig) => void;
}

const ExportForm: React.FC<ExportFormProps> = ({ onSubmit }) => {
  const [config, setConfig] = useState<ExportConfig>({
    format: 'json',
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    includeDetails: true,
    maxRecords: 10000
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Format</Label>
        <Select value={config.format} onValueChange={(value) => setConfig({ ...config, format: value as any })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>Nombre maximum d'enregistrements</Label>
        <Input
          type="number"
          value={config.maxRecords}
          onChange={(e) => setConfig({ ...config, maxRecords: parseInt(e.target.value) })}
          min="1"
          max="100000"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="includeDetails"
          checked={config.includeDetails}
          onChange={(e) => setConfig({ ...config, includeDetails: e.target.checked })}
        />
        <Label htmlFor="includeDetails">Inclure les détails</Label>
      </div>
      
      <Button type="submit" className="w-full">
        Exporter
      </Button>
    </form>
  );
};
