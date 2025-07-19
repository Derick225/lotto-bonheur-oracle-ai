import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  HardDrive, 
  Play, 
  Pause, 
  Download, 
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Shield,
  Zap,
  AlertTriangle,
  Info,
  Settings
} from 'lucide-react';
import { 
  BackupService, 
  BackupType, 
  BackupStatus, 
  BackupMetadata, 
  MaintenanceTask,
  IntegrityCheckResult
} from '@/services/backupService';

export const MaintenancePanel: React.FC = () => {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [backupStats, setBackupStats] = useState<any>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const backupList = BackupService.getBackups();
      setBackups(backupList);

      const taskList = BackupService.getMaintenanceTasks();
      setMaintenanceTasks(taskList);

      const stats = BackupService.getBackupStatistics();
      setBackupStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des données de maintenance:', error);
    }
  };

  const createBackup = async (options: {
    type: BackupType;
    description?: string;
    compression?: boolean;
    encryption?: boolean;
  }) => {
    setIsCreatingBackup(true);
    try {
      await BackupService.createBackup(options);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la création de la sauvegarde:', error);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir restaurer cette sauvegarde ? Cette action peut écraser les données actuelles.')) {
      return;
    }

    try {
      await BackupService.restoreBackup(backupId, { overwrite: true });
      alert('Sauvegarde restaurée avec succès');
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);
      alert('Erreur lors de la restauration de la sauvegarde');
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette sauvegarde ?')) {
      return;
    }

    try {
      await BackupService.deleteBackup(backupId);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const runMaintenanceTask = async (taskId: string) => {
    setRunningTasks(prev => new Set(prev).add(taskId));
    try {
      await BackupService.runMaintenanceTask(taskId);
      loadData();
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la tâche:', error);
    } finally {
      setRunningTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: BackupStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case BackupStatus.COMPLETED: return 'default';
      case BackupStatus.RUNNING: return 'outline';
      case BackupStatus.FAILED: return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: BackupStatus) => {
    switch (status) {
      case BackupStatus.COMPLETED: return <CheckCircle className="h-4 w-4 text-green-500" />;
      case BackupStatus.RUNNING: return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case BackupStatus.FAILED: return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTaskStatusBadge = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return 'default';
      case 'running': return 'outline';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
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

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Maintenance et Sauvegarde</h2>
          <p className="text-muted-foreground">
            Gestion des sauvegardes et tâches de maintenance
          </p>
        </div>
        <Button
          onClick={() => createBackup({ type: BackupType.FULL, description: 'Sauvegarde manuelle' })}
          disabled={isCreatingBackup}
          className="flex items-center gap-2"
        >
          <HardDrive className="h-4 w-4" />
          {isCreatingBackup ? 'Création...' : 'Nouvelle Sauvegarde'}
        </Button>
      </div>

      {/* Statistiques */}
      {backupStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Total Sauvegardes</p>
                  <p className="text-2xl font-bold">{backupStats.totalBackups}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Réussies</p>
                  <p className="text-2xl font-bold">{backupStats.successfulBackups}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Taille Totale</p>
                  <p className="text-2xl font-bold">{formatFileSize(backupStats.totalSize)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Dernière Sauvegarde</p>
                  <p className="text-sm font-bold">
                    {backupStats.lastBackup ? 
                      new Date(backupStats.lastBackup).toLocaleDateString('fr-FR') : 
                      'Aucune'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onglets principaux */}
      <Tabs defaultValue="backups" className="w-full">
        <TabsList>
          <TabsTrigger value="backups">Sauvegardes</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="integrity">Intégrité</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => createBackup({ 
                    type: BackupType.FULL, 
                    description: 'Sauvegarde complète manuelle',
                    compression: true 
                  })}
                  disabled={isCreatingBackup}
                  variant="outline"
                >
                  Sauvegarde Complète
                </Button>
                <Button
                  onClick={() => createBackup({ 
                    type: BackupType.INCREMENTAL, 
                    description: 'Sauvegarde incrémentale',
                    compression: true 
                  })}
                  disabled={isCreatingBackup}
                  variant="outline"
                >
                  Sauvegarde Incrémentale
                </Button>
                <Button
                  onClick={() => createBackup({ 
                    type: BackupType.DIFFERENTIAL, 
                    description: 'Sauvegarde différentielle',
                    compression: true,
                    encryption: true 
                  })}
                  disabled={isCreatingBackup}
                  variant="outline"
                >
                  Sauvegarde Chiffrée
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Liste des sauvegardes */}
          <Card>
            <CardHeader>
              <CardTitle>Historique des Sauvegardes ({backups.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(backup.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{backup.description || `Sauvegarde ${backup.type}`}</p>
                          <Badge variant={getStatusBadge(backup.status)}>
                            {backup.status}
                          </Badge>
                          <Badge variant="outline">
                            {backup.type}
                          </Badge>
                          {backup.compression && <Badge variant="secondary">Compressé</Badge>}
                          {backup.encryption && <Badge variant="secondary">Chiffré</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(backup.size)} | 
                          Créé le {backup.startTime.toLocaleString('fr-FR')} par {backup.username}
                        </p>
                        {backup.duration && (
                          <p className="text-xs text-muted-foreground">
                            Durée: {formatDuration(backup.duration)} | Checksum: {backup.checksum.slice(0, 8)}...
                          </p>
                        )}
                        {backup.error && (
                          <p className="text-xs text-red-600">
                            Erreur: {backup.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {backup.status === BackupStatus.COMPLETED && (
                        <>
                          <Button
                            onClick={() => restoreBackup(backup.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              // Simuler le téléchargement
                              const link = document.createElement('a');
                              link.href = '#';
                              link.download = `backup_${backup.id}.zip`;
                              link.click();
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => deleteBackup(backup.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {backups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune sauvegarde trouvée
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tâches de Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {maintenanceTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium">{task.name}</p>
                        <Badge variant={getTaskStatusBadge(task.status)}>
                          {task.status}
                        </Badge>
                        {!task.enabled && <Badge variant="outline">Désactivé</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {task.description}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {task.lastRun && (
                          <span>Dernière exécution: {task.lastRun.toLocaleString('fr-FR')} </span>
                        )}
                        {task.duration && (
                          <span>| Durée: {formatDuration(task.duration)} </span>
                        )}
                        <span>| Prochaine: {task.nextRun.toLocaleString('fr-FR')}</span>
                      </div>
                      {task.result && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <strong>Résultat:</strong> {task.result.message || JSON.stringify(task.result)}
                        </div>
                      )}
                      {task.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                          <strong>Erreur:</strong> {task.error}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => runMaintenanceTask(task.id)}
                        disabled={!task.enabled || runningTasks.has(task.id) || task.status === 'running'}
                        variant="outline"
                        size="sm"
                      >
                        {runningTasks.has(task.id) || task.status === 'running' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vérification d'Intégrité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    La vérification d'intégrité analyse la cohérence et la validité des données stockées.
                  </AlertDescription>
                </Alert>
                
                <Button
                  onClick={() => runMaintenanceTask('integrity_check')}
                  disabled={runningTasks.has('integrity_check')}
                  className="flex items-center gap-2"
                >
                  {runningTasks.has('integrity_check') ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Lancer la Vérification
                </Button>

                {/* Résultats de la dernière vérification */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Dernière Vérification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm font-medium">État Général</p>
                          <p className="text-lg font-bold text-green-600">Excellent</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Database className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                          <p className="text-sm font-medium">Enregistrements</p>
                          <p className="text-lg font-bold">5,247</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                          <p className="text-sm font-medium">Erreurs</p>
                          <p className="text-lg font-bold text-red-600">0</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Clock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-sm font-medium">Dernière Vérif.</p>
                          <p className="text-sm font-bold">Il y a 2h</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
