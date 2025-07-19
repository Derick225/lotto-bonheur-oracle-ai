import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    
    // Écouter les événements de notification globaux
    const handleNewNotification = (event: CustomEvent<AppNotification>) => {
      addNotification(event.detail);
    };

    window.addEventListener('new-notification', handleNewNotification as EventListener);
    
    return () => {
      window.removeEventListener('new-notification', handleNewNotification as EventListener);
    };
  }, []);

  const loadNotifications = () => {
    try {
      const saved = localStorage.getItem('app-notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotifications(parsed.map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp)
        })));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  const saveNotifications = (newNotifications: AppNotification[]) => {
    try {
      localStorage.setItem('app-notifications', JSON.stringify(newNotifications));
      setNotifications(newNotifications);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const addNotification = (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: AppNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false
    };

    const newNotifications = [newNotification, ...notifications].slice(0, 100); // Limite à 100
    saveNotifications(newNotifications);

    // Afficher aussi un toast pour les notifications importantes
    if (notification.type === 'error' || notification.type === 'success') {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    }
  };

  const markAsRead = (id: string) => {
    const newNotifications = notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    );
    saveNotifications(newNotifications);
  };

  const markAllAsRead = () => {
    const newNotifications = notifications.map(notif => ({ ...notif, read: true }));
    saveNotifications(newNotifications);
  };

  const removeNotification = (id: string) => {
    const newNotifications = notifications.filter(notif => notif.id !== id);
    saveNotifications(newNotifications);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative w-9 h-9 rounded-full"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs rounded-full animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 animate-slide-in-down" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-6"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Tout lire
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs h-6"
                >
                  <X className="h-3 w-3 mr-1" />
                  Effacer
                </Button>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border border-transparent hover:bg-accent/50 transition-colors cursor-pointer animate-fade-in ${
                    !notification.read ? 'bg-accent/20' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="h-4 w-4 p-0 opacity-50 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.timestamp.toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {notification.actionUrl && notification.actionLabel && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-6 mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = notification.actionUrl!;
                          }}
                        >
                          {notification.actionLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Hook pour envoyer des notifications
export function useNotifications() {
  const sendNotification = (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const event = new CustomEvent('new-notification', { detail: notification });
    window.dispatchEvent(event);
  };

  return { sendNotification };
}