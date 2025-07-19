import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SyncService, SyncStatus as SyncStatusType } from '@/services/syncService';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SyncStatusProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  className?: string;
}

export function SyncStatus({ showDetails = false, autoRefresh = true, className = '' }: SyncStatusProps) {
  const [status, setStatus] = useState<SyncStatusType | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fetchStatus = async () => {
    try {
      const currentStatus = await SyncService.getSyncStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);
      setError('Impossible de récupérer le statut');
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError('');
      setLastSyncResult('Synchronisation en cours...');
      
      const result = await SyncService.forcSync();
      setLastSyncResult(result.message);
      
      // Actualiser le statut après la synchronisation
      await fetchStatus();
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setError(error instanceof Error ? error.message : 'Erreur de synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchStatus, 30000); // Actualiser toutes les 30 secondes
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (!status) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="secondary">
          <Activity className="h-3 w-3 mr-1 animate-pulse" />
          Chargement...
        </Badge>
      </div>
    );
  }

  const StatusBadge = () => (
    <Badge variant={status.isOnline ? "default" : "secondary"} className="gap-1">
      {status.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {status.isOnline ? 'En ligne' : 'Hors ligne'}
    </Badge>
  );

  const DataBadge = () => (
    <Badge variant="outline" className="gap-1">
      <Database className="h-3 w-3" />
      {status.totalRecords.toLocaleString()} enregistrements
    </Badge>
  );

  const SyncBadge = () => (
    <Badge variant={status.pendingSync ? "destructive" : "secondary"} className="gap-1">
      {status.pendingSync ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : status.lastSync ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {status.pendingSync ? 'Synchronisation...' : status.lastSync ? 'Synchronisé' : 'Jamais synchronisé'}
    </Badge>
  );

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <StatusBadge />
        <DataBadge />
        <SyncBadge />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSync}
          disabled={syncing || status.pendingSync}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Statut de Synchronisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Badges de statut */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge />
          <DataBadge />
          <SyncBadge />
        </div>

        {/* Informations détaillées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Dernière synchronisation:</span>
            </div>
            <p className="text-muted-foreground ml-6">
              {status.lastSync 
                ? format(status.lastSync, 'PPpp', { locale: fr })
                : 'Jamais synchronisé'
              }
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Données locales:</span>
            </div>
            <p className="text-muted-foreground ml-6">
              {status.totalRecords.toLocaleString()} enregistrements stockés
            </p>
          </div>
        </div>

        {/* Messages de statut */}
        {lastSyncResult && (
          <Alert>
            <AlertDescription>{lastSyncResult}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={handleSync}
            disabled={syncing || status.pendingSync}
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={fetchStatus}
            disabled={syncing}
          >
            <Activity className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Informations supplémentaires */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p>• La synchronisation automatique s'effectue toutes les 10 minutes</p>
          <p>• Les données sont mises en cache localement pour un accès hors ligne</p>
          <p>• {status.isOnline ? 'Connexion active' : 'Mode hors ligne - utilisation du cache local'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant compact pour la barre de navigation
export function SyncStatusCompact({ className = '' }: { className?: string }) {
  return <SyncStatus showDetails={false} className={className} />;
}

// Composant détaillé pour les pages d'administration
export function SyncStatusDetailed({ className = '' }: { className?: string }) {
  return <SyncStatus showDetails={true} className={className} />;
}
