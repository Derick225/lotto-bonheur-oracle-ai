import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PWAService } from '@/services/pwaService';
import { 
  Download, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Bell,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface PWAManagerProps {
  className?: string;
}

export function PWAManager({ className }: PWAManagerProps) {
  const [pwaInfo, setPwaInfo] = useState(PWAService.getInfo());
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Initialiser le service PWA
    PWAService.initialize();

    // Écouter les événements PWA
    const handleInstallAvailable = () => {
      setShowInstallPrompt(true);
      setPwaInfo(PWAService.getInfo());
    };

    const handleInstalled = () => {
      setShowInstallPrompt(false);
      setPwaInfo(PWAService.getInfo());
    };

    const handleUpdateAvailable = () => {
      setShowUpdatePrompt(true);
      setPwaInfo(PWAService.getInfo());
    };

    const handleOnline = () => {
      setPwaInfo(PWAService.getInfo());
    };

    const handleOffline = () => {
      setPwaInfo(PWAService.getInfo());
    };

    // Ajouter les listeners
    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('pwa-online', handleOnline);
    window.addEventListener('pwa-offline', handleOffline);

    // Mettre à jour le statut périodiquement
    const interval = setInterval(() => {
      setPwaInfo(PWAService.getInfo());
    }, 30000);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('pwa-online', handleOnline);
      window.removeEventListener('pwa-offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const success = await PWAService.installPWA();
      if (success) {
        setShowInstallPrompt(false);
        // Afficher une notification de succès
        await PWAService.showNotification('Installation réussie!', {
          body: 'L\'application Lotto Oracle est maintenant installée sur votre appareil.',
          icon: '/icon-192x192.png'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'installation:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await PWAService.applyUpdate();
      setShowUpdatePrompt(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    } finally {
      setUpdating(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await PWAService.showNotification('Notifications activées!', {
          body: 'Vous recevrez maintenant des notifications pour les nouveaux résultats.',
          icon: '/icon-192x192.png'
        });
      }
    }
  };

  return (
    <div className={className}>
      {/* Invite d'installation */}
      {showInstallPrompt && !pwaInfo.isInstalled && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Smartphone className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Installer l'application</strong>
                <p className="text-sm mt-1">
                  Installez Lotto Oracle sur votre {pwaInfo.platform} pour un accès rapide et hors ligne.
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button 
                  size="sm" 
                  onClick={handleInstall}
                  disabled={installing}
                >
                  {installing ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3 mr-1" />
                  )}
                  Installer
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowInstallPrompt(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Invite de mise à jour */}
      {showUpdatePrompt && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <RefreshCw className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Mise à jour disponible</strong>
                <p className="text-sm mt-1">
                  Une nouvelle version de l'application est disponible avec des améliorations.
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button 
                  size="sm" 
                  onClick={handleUpdate}
                  disabled={updating}
                >
                  {updating ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Mettre à jour
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowUpdatePrompt(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Statut hors ligne */}
      {!pwaInfo.isOnline && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <strong>Mode hors ligne</strong>
            <p className="text-sm mt-1">
              Vous êtes actuellement hors ligne. Les données en cache restent disponibles.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Composant compact pour la barre de statut
export function PWAStatusBar({ className }: { className?: string }) {
  const [pwaInfo, setPwaInfo] = useState(PWAService.getInfo());

  useEffect(() => {
    const updateStatus = () => {
      setPwaInfo(PWAService.getInfo());
    };

    window.addEventListener('pwa-online', updateStatus);
    window.addEventListener('pwa-offline', updateStatus);
    window.addEventListener('pwa-installed', updateStatus);

    const interval = setInterval(updateStatus, 10000);

    return () => {
      window.removeEventListener('pwa-online', updateStatus);
      window.removeEventListener('pwa-offline', updateStatus);
      window.removeEventListener('pwa-installed', updateStatus);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Statut de connexion */}
      <Badge variant={pwaInfo.isOnline ? "default" : "secondary"} className="gap-1">
        {pwaInfo.isOnline ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {pwaInfo.isOnline ? 'En ligne' : 'Hors ligne'}
      </Badge>

      {/* Statut d'installation */}
      {pwaInfo.isInstalled && (
        <Badge variant="outline" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Installée
        </Badge>
      )}

      {/* Mise à jour disponible */}
      {pwaInfo.updateAvailable && (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Mise à jour
        </Badge>
      )}
    </div>
  );
}

// Composant détaillé pour les paramètres
export function PWASettings({ className }: { className?: string }) {
  const [pwaInfo, setPwaInfo] = useState(PWAService.getInfo());
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  useEffect(() => {
    const updateInfo = () => {
      setPwaInfo(PWAService.getInfo());
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    };

    window.addEventListener('pwa-installed', updateInfo);
    window.addEventListener('pwa-online', updateInfo);
    window.addEventListener('pwa-offline', updateInfo);

    return () => {
      window.removeEventListener('pwa-installed', updateInfo);
      window.removeEventListener('pwa-online', updateInfo);
      window.removeEventListener('pwa-offline', updateInfo);
    };
  }, []);

  const handleInstall = async () => {
    await PWAService.installPWA();
    setPwaInfo(PWAService.getInfo());
  };

  const handleNotificationRequest = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        await PWAService.showNotification('Notifications activées!', {
          body: 'Vous recevrez des notifications pour les nouveaux résultats.',
          icon: '/icon-192x192.png'
        });
      }
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Paramètres PWA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut d'installation */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Installation</h4>
            <p className="text-sm text-muted-foreground">
              {pwaInfo.isInstalled 
                ? 'Application installée sur votre appareil'
                : 'Installer l\'application pour un accès rapide'
              }
            </p>
          </div>
          {!pwaInfo.isInstalled && pwaInfo.canInstall && (
            <Button onClick={handleInstall} size="sm">
              <Download className="h-3 w-3 mr-1" />
              Installer
            </Button>
          )}
          {pwaInfo.isInstalled && (
            <Badge variant="default">
              <CheckCircle className="h-3 w-3 mr-1" />
              Installée
            </Badge>
          )}
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Notifications</h4>
            <p className="text-sm text-muted-foreground">
              Recevoir des notifications pour les nouveaux résultats
            </p>
          </div>
          {notificationPermission === 'default' && (
            <Button onClick={handleNotificationRequest} size="sm" variant="outline">
              <Bell className="h-3 w-3 mr-1" />
              Activer
            </Button>
          )}
          {notificationPermission === 'granted' && (
            <Badge variant="default">
              <CheckCircle className="h-3 w-3 mr-1" />
              Activées
            </Badge>
          )}
          {notificationPermission === 'denied' && (
            <Badge variant="destructive">
              <X className="h-3 w-3 mr-1" />
              Refusées
            </Badge>
          )}
        </div>

        {/* Informations techniques */}
        <div className="pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plateforme:</span>
            <span>{pwaInfo.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service Worker:</span>
            <span>{pwaInfo.hasServiceWorker ? 'Supporté' : 'Non supporté'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Statut:</span>
            <span className={pwaInfo.isOnline ? 'text-green-600' : 'text-orange-600'}>
              {pwaInfo.isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
