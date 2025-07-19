import { UserManagementService, Permission, User } from './userManagement';
import { AuditService, AuditCategory } from './auditService';
import { SystemConfigService, NotificationTemplate } from './systemConfig';

/**
 * Types de notification
 */
export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
  CRITICAL = 'critical'
}

/**
 * Canaux de notification
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app'
}

/**
 * Statut de notification
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Notification
 */
export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  message: string;
  data?: any;
  recipients: string[]; // User IDs
  templateId?: string;
  variables?: Record<string, any>;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  expiresAt?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdBy: string;
  createdAt: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Abonnement utilisateur
 */
export interface UserSubscription {
  userId: string;
  channels: {
    [key in NotificationChannel]: {
      enabled: boolean;
      address?: string; // email, phone, etc.
      preferences: {
        types: NotificationType[];
        quietHours?: {
          start: string; // HH:mm
          end: string; // HH:mm
        };
        frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
      };
    };
  };
  updatedAt: Date;
}

/**
 * Statistiques de notification
 */
export interface NotificationStats {
  total: number;
  byType: Record<NotificationType, number>;
  byChannel: Record<NotificationChannel, number>;
  byStatus: Record<NotificationStatus, number>;
  deliveryRate: number;
  averageDeliveryTime: number;
  failureRate: number;
}

/**
 * Service de notifications
 */
export class NotificationService {
  private static notifications: Map<string, Notification> = new Map();
  private static subscriptions: Map<string, UserSubscription> = new Map();
  private static inAppNotifications: Map<string, Notification[]> = new Map();
  private static isProcessing: boolean = false;

  /**
   * Initialise le service de notifications
   */
  static async initialize(): Promise<void> {
    console.log('📢 Initialisation du service de notifications...');
    
    // Créer les abonnements par défaut pour les utilisateurs existants
    this.createDefaultSubscriptions();
    
    // Démarrer le processeur de notifications
    this.startNotificationProcessor();
    
    // Nettoyer les anciennes notifications
    this.scheduleCleanup();
    
    AuditService.logInfo('notification_service', 'Service de notifications initialisé');
  }

  /**
   * Envoie une notification
   */
  static async sendNotification(options: {
    type: NotificationType;
    title: string;
    message: string;
    recipients: string[];
    channels?: NotificationChannel[];
    data?: any;
    templateId?: string;
    variables?: Record<string, any>;
    scheduledAt?: Date;
    expiresAt?: Date;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<string[]> {
    const currentUser = UserManagementService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    const notificationIds: string[] = [];
    const channels = options.channels || [NotificationChannel.IN_APP];

    // Créer une notification pour chaque canal
    for (const channel of channels) {
      const notification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: options.type,
        channel,
        status: NotificationStatus.PENDING,
        title: options.title,
        message: options.message,
        data: options.data,
        recipients: options.recipients,
        templateId: options.templateId,
        variables: options.variables,
        scheduledAt: options.scheduledAt,
        expiresAt: options.expiresAt,
        retryCount: 0,
        maxRetries: 3,
        createdBy: currentUser.id,
        createdAt: new Date(),
        priority: options.priority || 'normal'
      };

      this.notifications.set(notification.id, notification);
      notificationIds.push(notification.id);

      // Traiter immédiatement si pas de programmation
      if (!options.scheduledAt) {
        await this.processNotification(notification.id);
      }
    }

    AuditService.audit(AuditCategory.SYSTEM_CONFIG, 'send_notification', 'notification', true, {
      newValue: { type: options.type, recipients: options.recipients.length, channels }
    });

    return notificationIds;
  }

  /**
   * Envoie une notification d'alerte système
   */
  static async sendSystemAlert(
    type: NotificationType,
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    // Obtenir tous les administrateurs
    const admins = UserManagementService.getUsers().filter(u => 
      u.role === 'admin' && u.isActive
    );

    if (admins.length === 0) {
      console.warn('Aucun administrateur trouvé pour l\'alerte système');
      return;
    }

    const adminIds = admins.map(admin => admin.id);
    
    // Déterminer les canaux selon la criticité
    let channels = [NotificationChannel.IN_APP];
    if (type === NotificationType.CRITICAL || type === NotificationType.ERROR) {
      channels.push(NotificationChannel.EMAIL);
    }

    await this.sendNotification({
      type,
      title: `[SYSTÈME] ${title}`,
      message,
      recipients: adminIds,
      channels,
      data,
      priority: type === NotificationType.CRITICAL ? 'urgent' : 'high'
    });
  }

  /**
   * Traite une notification
   */
  private static async processNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    // Vérifier si la notification est expirée
    if (notification.expiresAt && notification.expiresAt < new Date()) {
      notification.status = NotificationStatus.CANCELLED;
      this.notifications.set(notificationId, notification);
      return;
    }

    // Vérifier si c'est le moment d'envoyer
    if (notification.scheduledAt && notification.scheduledAt > new Date()) {
      return; // Pas encore le moment
    }

    try {
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();

      // Traiter selon le canal
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSMS(notification);
          break;
        case NotificationChannel.PUSH:
          await this.sendPush(notification);
          break;
        case NotificationChannel.WEBHOOK:
          await this.sendWebhook(notification);
          break;
        case NotificationChannel.IN_APP:
          await this.sendInApp(notification);
          break;
      }

      notification.status = NotificationStatus.DELIVERED;
      notification.deliveredAt = new Date();

    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.error = error instanceof Error ? error.message : 'Erreur inconnue';
      notification.retryCount++;

      // Programmer un retry si possible
      if (notification.retryCount < notification.maxRetries) {
        setTimeout(() => {
          this.processNotification(notificationId);
        }, Math.pow(2, notification.retryCount) * 1000); // Backoff exponentiel
      }

      AuditService.logError('notification_service', error, { notificationId });
    }

    this.notifications.set(notificationId, notification);
  }

  /**
   * Envoie un email
   */
  private static async sendEmail(notification: Notification): Promise<void> {
    const config = SystemConfigService.getConfigSection('monitoring').notifications.email;
    
    if (!config.enabled) {
      throw new Error('Email non configuré');
    }

    // Simuler l'envoi d'email
    console.log(`📧 Email envoyé: ${notification.title} à ${notification.recipients.length} destinataires`);
    
    // Dans un vrai environnement, utiliser un service comme SendGrid, Mailgun, etc.
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulation
  }

  /**
   * Envoie un SMS
   */
  private static async sendSMS(notification: Notification): Promise<void> {
    const config = SystemConfigService.getConfigSection('monitoring').notifications.sms;
    
    if (!config.enabled) {
      throw new Error('SMS non configuré');
    }

    // Simuler l'envoi de SMS
    console.log(`📱 SMS envoyé: ${notification.title} à ${notification.recipients.length} destinataires`);
    
    // Dans un vrai environnement, utiliser un service comme Twilio, AWS SNS, etc.
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulation
  }

  /**
   * Envoie une notification push
   */
  private static async sendPush(notification: Notification): Promise<void> {
    // Simuler l'envoi de push
    console.log(`🔔 Push envoyé: ${notification.title} à ${notification.recipients.length} destinataires`);
    
    // Dans un vrai environnement, utiliser Firebase Cloud Messaging, etc.
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulation
  }

  /**
   * Envoie un webhook
   */
  private static async sendWebhook(notification: Notification): Promise<void> {
    const config = SystemConfigService.getConfigSection('monitoring').notifications.webhook;
    
    if (!config.enabled || !config.url) {
      throw new Error('Webhook non configuré');
    }

    // Simuler l'envoi de webhook
    console.log(`🔗 Webhook envoyé: ${notification.title}`);
    
    // Dans un vrai environnement, faire un POST HTTP
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulation
  }

  /**
   * Envoie une notification in-app
   */
  private static async sendInApp(notification: Notification): Promise<void> {
    // Ajouter aux notifications in-app de chaque destinataire
    notification.recipients.forEach(userId => {
      const userNotifications = this.inAppNotifications.get(userId) || [];
      userNotifications.unshift(notification);
      
      // Garder seulement les 100 dernières notifications par utilisateur
      if (userNotifications.length > 100) {
        userNotifications.splice(100);
      }
      
      this.inAppNotifications.set(userId, userNotifications);
    });

    console.log(`📱 Notification in-app envoyée à ${notification.recipients.length} utilisateurs`);
  }

  /**
   * Obtient les notifications in-app d'un utilisateur
   */
  static getUserNotifications(userId: string, limit: number = 50): Notification[] {
    const notifications = this.inAppNotifications.get(userId) || [];
    return notifications.slice(0, limit);
  }

  /**
   * Marque une notification comme lue
   */
  static markNotificationAsRead(userId: string, notificationId: string): void {
    const userNotifications = this.inAppNotifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (notification && notification.data) {
      notification.data.read = true;
      notification.data.readAt = new Date();
    }
  }

  /**
   * Supprime une notification in-app
   */
  static deleteUserNotification(userId: string, notificationId: string): void {
    const userNotifications = this.inAppNotifications.get(userId) || [];
    const filteredNotifications = userNotifications.filter(n => n.id !== notificationId);
    this.inAppNotifications.set(userId, filteredNotifications);
  }

  /**
   * Gère les abonnements utilisateur
   */
  static updateUserSubscription(userId: string, subscription: Partial<UserSubscription>): void {
    if (!UserManagementService.hasPermission(Permission.MANAGE_USERS) && 
        UserManagementService.getCurrentUser()?.id !== userId) {
      throw new Error('Permission insuffisante pour modifier les abonnements');
    }

    const existing = this.subscriptions.get(userId) || this.createDefaultSubscription(userId);
    const updated = { ...existing, ...subscription, updatedAt: new Date() };
    
    this.subscriptions.set(userId, updated);
    
    AuditService.audit(AuditCategory.USER_MANAGEMENT, 'update_subscription', 'user_subscription', true, {
      resourceId: userId,
      newValue: updated
    });
  }

  /**
   * Obtient l'abonnement d'un utilisateur
   */
  static getUserSubscription(userId: string): UserSubscription | null {
    return this.subscriptions.get(userId) || null;
  }

  /**
   * Crée un abonnement par défaut
   */
  private static createDefaultSubscription(userId: string): UserSubscription {
    return {
      userId,
      channels: {
        [NotificationChannel.EMAIL]: {
          enabled: true,
          preferences: {
            types: [NotificationType.CRITICAL, NotificationType.ERROR],
            frequency: 'immediate'
          }
        },
        [NotificationChannel.SMS]: {
          enabled: false,
          preferences: {
            types: [NotificationType.CRITICAL],
            frequency: 'immediate'
          }
        },
        [NotificationChannel.PUSH]: {
          enabled: true,
          preferences: {
            types: Object.values(NotificationType),
            frequency: 'immediate'
          }
        },
        [NotificationChannel.WEBHOOK]: {
          enabled: false,
          preferences: {
            types: [NotificationType.CRITICAL, NotificationType.ERROR],
            frequency: 'immediate'
          }
        },
        [NotificationChannel.IN_APP]: {
          enabled: true,
          preferences: {
            types: Object.values(NotificationType),
            frequency: 'immediate'
          }
        }
      },
      updatedAt: new Date()
    };
  }

  /**
   * Crée les abonnements par défaut
   */
  private static createDefaultSubscriptions(): void {
    const users = UserManagementService.getUsers();
    users.forEach(user => {
      if (!this.subscriptions.has(user.id)) {
        this.subscriptions.set(user.id, this.createDefaultSubscription(user.id));
      }
    });
  }

  /**
   * Démarre le processeur de notifications
   */
  private static startNotificationProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      
      try {
        // Traiter les notifications en attente
        const pendingNotifications = Array.from(this.notifications.values())
          .filter(n => n.status === NotificationStatus.PENDING);
        
        for (const notification of pendingNotifications) {
          await this.processNotification(notification.id);
        }
      } catch (error) {
        AuditService.logError('notification_service', error, { action: 'process_notifications' });
      } finally {
        this.isProcessing = false;
      }
    }, 10000); // Toutes les 10 secondes
  }

  /**
   * Programme le nettoyage
   */
  private static scheduleCleanup(): void {
    setInterval(() => {
      this.cleanupOldNotifications();
    }, 24 * 60 * 60 * 1000); // Tous les jours
  }

  /**
   * Nettoie les anciennes notifications
   */
  private static cleanupOldNotifications(): void {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours
    
    // Nettoyer les notifications système
    this.notifications.forEach((notification, id) => {
      if (notification.createdAt < cutoffDate) {
        this.notifications.delete(id);
      }
    });
    
    // Nettoyer les notifications in-app
    this.inAppNotifications.forEach((notifications, userId) => {
      const filtered = notifications.filter(n => n.createdAt > cutoffDate);
      this.inAppNotifications.set(userId, filtered);
    });
    
    console.log('🧹 Nettoyage des anciennes notifications effectué');
  }

  /**
   * Obtient les statistiques de notification
   */
  static getNotificationStatistics(): NotificationStats {
    const notifications = Array.from(this.notifications.values());
    
    const byType = Object.values(NotificationType).reduce((acc, type) => {
      acc[type] = notifications.filter(n => n.type === type).length;
      return acc;
    }, {} as Record<NotificationType, number>);
    
    const byChannel = Object.values(NotificationChannel).reduce((acc, channel) => {
      acc[channel] = notifications.filter(n => n.channel === channel).length;
      return acc;
    }, {} as Record<NotificationChannel, number>);
    
    const byStatus = Object.values(NotificationStatus).reduce((acc, status) => {
      acc[status] = notifications.filter(n => n.status === status).length;
      return acc;
    }, {} as Record<NotificationStatus, number>);
    
    const delivered = notifications.filter(n => n.status === NotificationStatus.DELIVERED);
    const failed = notifications.filter(n => n.status === NotificationStatus.FAILED);
    
    const deliveryRate = notifications.length > 0 ? delivered.length / notifications.length : 0;
    const failureRate = notifications.length > 0 ? failed.length / notifications.length : 0;
    
    const avgDeliveryTime = delivered.length > 0 
      ? delivered.reduce((sum, n) => {
          if (n.sentAt && n.deliveredAt) {
            return sum + (n.deliveredAt.getTime() - n.sentAt.getTime());
          }
          return sum;
        }, 0) / delivered.length
      : 0;

    return {
      total: notifications.length,
      byType,
      byChannel,
      byStatus,
      deliveryRate,
      averageDeliveryTime: avgDeliveryTime,
      failureRate
    };
  }

  /**
   * Obtient toutes les notifications (pour admin)
   */
  static getAllNotifications(filters: {
    type?: NotificationType;
    status?: NotificationStatus;
    channel?: NotificationChannel;
    limit?: number;
  } = {}): Notification[] {
    if (!UserManagementService.hasPermission(Permission.VIEW_LOGS)) {
      return [];
    }

    let notifications = Array.from(this.notifications.values());
    
    if (filters.type) {
      notifications = notifications.filter(n => n.type === filters.type);
    }
    
    if (filters.status) {
      notifications = notifications.filter(n => n.status === filters.status);
    }
    
    if (filters.channel) {
      notifications = notifications.filter(n => n.channel === filters.channel);
    }
    
    // Trier par date de création (plus récent en premier)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const limit = filters.limit || 1000;
    return notifications.slice(0, limit);
  }
}
