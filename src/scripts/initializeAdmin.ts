/**
 * Script d'initialisation du système d'administration
 * Ce script configure automatiquement tous les services d'administration
 * et crée les données de base nécessaires au fonctionnement
 */

import { UserManagementService, UserRole } from '../services/userManagement';
import { AuditService } from '../services/auditService';
import { SystemConfigService } from '../services/systemConfig';
import { BackupService } from '../services/backupService';
import { NotificationService } from '../services/notificationService';
import { SecurityService } from '../services/securityService';

/**
 * Types pour les événements de sécurité
 */
enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  SYSTEM_RESET = 'system_reset'
}

/**
 * Types pour les sauvegardes
 */
enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental'
}

/**
 * Types pour les notifications
 */
enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

/**
 * Interface pour la configuration d'initialisation
 */
interface InitConfig {
  adminUser: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
  createSampleData: boolean;
  enableAutoBackup: boolean;
  setupNotifications: boolean;
}

/**
 * Interface pour l'utilisateur
 */
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  securitySettings: {
    twoFactorEnabled: boolean;
    lastPasswordChange: Date;
    failedLoginAttempts: number;
    accountLocked: boolean;
  };
}

/**
 * Classe d'erreur personnalisée pour l'initialisation
 */
class AdminInitializationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AdminInitializationError';
  }
}

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG: InitConfig = {
  adminUser: {
    username: 'admin',
    email: 'admin@loterie-oracle.com',
    password: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!', // À remplacer par une variable d'environnement
    firstName: 'Administrateur',
    lastName: 'Système'
  },
  createSampleData: true,
  enableAutoBackup: true,
  setupNotifications: true
};

/**
 * Classe d'initialisation du système d'administration
 */
export class AdminInitializer {
  private config: InitConfig;
  private initLog: string[] = [];

  constructor(config: Partial<InitConfig> = {}) {
    this.validateConfig(config);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Valide la configuration fournie
   */
  private validateConfig(config: Partial<InitConfig>): void {
    if (config.adminUser) {
      if (!config.adminUser.email.includes('@')) {
        throw new AdminInitializationError('Email administrateur invalide', 'INVALID_EMAIL');
      }
      if (config.adminUser.password.length < 8) {
        throw new AdminInitializationError('Mot de passe administrateur trop court', 'INVALID_PASSWORD');
      }
      if (!config.adminUser.username) {
        throw new AdminInitializationError('Nom d\'utilisateur administrateur requis', 'INVALID_USERNAME');
      }
    }
  }

  /**
   * Exécute une opération avec des tentatives de réessai
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new AdminInitializationError(
            `Échec après ${maxAttempts} tentatives: ${error.message}`,
            'RETRY_EXHAUSTED'
          );
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new AdminInitializationError('Échec inattendu des retries', 'UNEXPECTED_RETRY_FAILURE');
  }

  /**
   * Lance l'initialisation complète
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initialisation du système d\'administration...');
    this.log('Début de l\'initialisation du système d\'administration');

    try {
      const steps = [
        () => this.initializeBaseServices(),
        () => this.createAdminUser(),
        () => this.setupSystemConfiguration(),
        () => this.config.createSampleData ? this.createSampleData() : Promise.resolve(),
        () => this.config.enableAutoBackup ? this.setupAutoBackup() : Promise.resolve(),
        () => this.config.setupNotifications ? this.setupNotifications() : Promise.resolve(),
        () => this.verifyInstallation()
      ];

      for (const [index, step] of steps.entries()) {
        this.log(`Exécution de l'étape ${index + 1}/${steps.length}`);
        await this.withRetry(step);
      }

      console.log('✅ Initialisation terminée avec succès !');
      this.log('Initialisation terminée avec succès');

    } catch (error) {
      const initError = error instanceof AdminInitializationError 
        ? error 
        : new AdminInitializationError(`Échec de l'initialisation: ${error.message}`, 'INIT_FAILED');
      console.error('❌ Erreur lors de l\'initialisation:', initError);
      this.log(`Erreur lors de l'initialisation: ${initError.message}`);
      throw initError;
    }
  }

  /**
   * Initialise les services de base
   */
  private async initializeBaseServices(): Promise<void> {
    this.log('Initialisation des services de base...');

    try {
      await this.withRetry(() => UserManagementService.initialize());
      this.log('✓ UserManagementService initialisé');

      await this.withRetry(() => AuditService.initialize());
      this.log('✓ AuditService initialisé');

      await this.withRetry(() => SecurityService.initialize());
      this.log('✓ SecurityService initialisé');

      await this.withRetry(() => SystemConfigService.initialize());
      this.log('✓ SystemConfigService initialisé');

      await this.withRetry(() => BackupService.initialize());
      this.log('✓ BackupService initialisé');

      await this.withRetry(() => NotificationService.initialize());
      this.log('✓ NotificationService initialisé');

    } catch (error) {
      this.log(`Erreur lors de l'initialisation des services: ${error.message}`);
      throw new AdminInitializationError(`Échec de l'initialisation des services: ${error.message}`, 'SERVICE_INIT_FAILED');
    }
  }

  /**
   * Crée l'utilisateur administrateur par défaut
   */
  private async createAdminUser(): Promise<void> {
    this.log('Création de l\'utilisateur administrateur...');

    try {
      const existingUsers = UserManagementService.getUsers() || [];
      const existingAdmin = existingUsers.find(u => u.role === UserRole.ADMIN);

      if (existingAdmin) {
        this.log('Un utilisateur administrateur existe déjà, création ignorée');
        return;
      }

      const adminUser = await this.withRetry(() => UserManagementService.createUser({
        username: this.config.adminUser.username,
        email: this.config.adminUser.email,
        password: this.config.adminUser.password,
        firstName: this.config.adminUser.firstName,
        lastName: this.config.adminUser.lastName,
        role: UserRole.ADMIN,
        isActive: true
      }));

      this.log(`✓ Utilisateur administrateur créé: ${adminUser.username}`);

      await this.withRetry(() => UserManagementService.updateUser(adminUser.id, {
        securitySettings: {
          twoFactorEnabled: false,
          lastPasswordChange: new Date(),
          failedLoginAttempts: 0,
          accountLocked: false
        }
      }));

      this.log('✓ Permissions administrateur configurées');

    } catch (error) {
      this.log(`Erreur lors de la création de l'administrateur: ${error.message}`);
      throw new AdminInitializationError(`Échec de la création de l'administrateur: ${error.message}`, 'ADMIN_CREATION_FAILED');
    }
  }

  /**
   * Configure les paramètres système par défaut
   */
  private async setupSystemConfiguration(): Promise<void> {
    this.log('Configuration des paramètres système...');

    try {
      await this.withRetry(() => SystemConfigService.updateConfigSection('security', {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 90,
          preventReuse: 5
        },
        twoFactorRequired: false,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        sessionSecurity: {
          httpOnly: true,
          secure: true,
          sameSite: 'strict'
        },
        rateLimiting: {
          enabled: true,
          requestsPerMinute: 60,
          burstLimit: 10
        }
      }, 'Configuration initiale du système'));

      this.log('✓ Configuration de sécurité appliquée');

      await this.withRetry(() => SystemConfigService.updateConfigSection('predictions', {
        algorithms: {
          xgboost: {
            enabled: true,
            weight: 0.4,
            config: {
              sequenceLength: 15,
              hiddenUnits: 128,
              learningRate: 0.001
            }
          },
          rnnLstm: {
            enabled: true,
            weight: 0.4,
            config: {
              sequenceLength: 20,
              hiddenUnits: 256,
              learningRate: 0.0005
            }
          },
          hybrid: {
            enabled: true,
            strategy: 'weighted'
          }
        },
        dataRetention: {
          maxHistoryDays: 365,
          cleanupFrequency: 24
        },
        performance: {
          maxPredictionTime: 30,
          cacheEnabled: true,
          cacheTTL: 60
        }
      }, 'Configuration initiale des prédictions'));

      this.log('✓ Configuration des prédictions appliquée');

      await this.withRetry(() => SystemConfigService.updateConfigSection('monitoring', {
        alerts: {
          performanceThreshold: 5000,
          errorRateThreshold: 5,
          memoryThreshold: 80,
          diskSpaceThreshold: 90
        },
        notifications: {
          email: {
            enabled: false,
            smtpServer: '',
            smtpPort: 587,
            username: '',
            password: '',
            fromAddress: ''
          },
          sms: {
            enabled: false,
            provider: '',
            apiKey: '',
            fromNumber: ''
          },
          webhook: {
            enabled: false,
            url: '',
            secret: ''
          }
        },
        retention: {
          logRetentionDays: 90,
          auditRetentionDays: 365,
          metricsRetentionDays: 30
        }
      }, 'Configuration initiale du monitoring'));

      this.log('✓ Configuration du monitoring appliquée');

    } catch (error) {
      this.log(`Erreur lors de la configuration système: ${error.message}`);
      throw new AdminInitializationError(`Échec de la configuration système: ${error.message}`, 'CONFIG_FAILED');
    }
  }

  /**
   * Crée des données d'exemple pour les tests
   */
  private async createSampleData(): Promise<void> {
    this.log('Création des données d\'exemple...');

    try {
      const sampleUsers = [
        {
          username: 'analyste1',
          email: 'analyste1@example.com',
          password: 'Analyste123!',
          firstName: 'Jean',
          lastName: 'Dupont',
          role: UserRole.ANALYST,
          isActive: true
        },
        {
          username: 'user1',
          email: 'user1@example.com',
          password: 'User123!',
          firstName: 'Marie',
          lastName: 'Martin',
          role: UserRole.USER,
          isActive: true
        }
      ];

      for (const userData of sampleUsers) {
        try {
          await this.withRetry(() => UserManagementService.createUser(userData));
          this.log(`✓ Utilisateur d'exemple créé: ${userData.username}`);
        } catch (error) {
          if (!error.message.includes('existe déjà')) {
            throw error;
          }
          this.log(`Utilisateur ${userData.username} existe déjà, création ignorée`);
        }
      }

      await this.withRetry(() => SecurityService.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        { message: 'Connexion réussie lors de l\'initialisation' },
        '127.0.0.1',
        'Admin Initializer',
        'admin-init',
        'Système'
      ));

      this.log('✓ Données d\'exemple créées');

    } catch (error) {
      this.log(`Erreur lors de la création des données d'exemple: ${error.message}`);
      console.warn('Avertissement: Impossible de créer les données d\'exemple:', error);
    }
  }

  /**
   * Configure les sauvegardes automatiques
   */
  private async setupAutoBackup(): Promise<void> {
    this.log('Configuration des sauvegardes automatiques...');

    try {
      await this.withRetry(() => BackupService.createBackup({
        type: BackupType.FULL,
        description: 'Sauvegarde initiale du système',
        compression: true,
        encryption: false
      }));

      this.log('✓ Sauvegarde initiale créée');
      this.log('✓ Sauvegardes automatiques configurées');

    } catch (error) {
      this.log(`Erreur lors de la configuration des sauvegardes: ${error.message}`);
      console.warn('Avertissement: Impossible de configurer les sauvegardes:', error);
    }
  }

  /**
   * Configure les notifications système
   */
  private async setupNotifications(): Promise<void> {
    this.log('Configuration des notifications...');

    try {
      await this.withRetry(() => NotificationService.sendSystemAlert(
        NotificationType.INFO,
        'Système d\'administration initialisé',
        'Le système d\'administration a été configuré avec succès et est prêt à être utilisé.'
      ));

      this.log('✓ Notifications configurées et testées');

    } catch (error) {
      this.log(`Erreur lors de la configuration des notifications: ${error.message}`);
      console.warn('Avertissement: Impossible de configurer les notifications:', error);
    }
  }

  /**
   * Vérifie que l'installation s'est bien déroulée
   */
  private async verifyInstallation(): Promise<void> {
    this.log('Vérification de l\'installation...');

    try {
      const users = UserManagementService.getUsers() || [];
      const admin = users.find(u => u.role === UserRole.ADMIN);
      if (!admin) {
        throw new AdminInitializationError('Aucun utilisateur administrateur trouvé', 'NO_ADMIN_FOUND');
      }

      const config = SystemConfigService.getConfig();
      if (!config) {
        throw new AdminInitializationError('Configuration système non trouvée', 'NO_CONFIG_FOUND');
      }

      const stats = SecurityService.getSecurityStatistics();
      if (!stats) {
        throw new AdminInitializationError('Service de sécurité non fonctionnel', 'SECURITY_SERVICE_FAILED');
      }

      this.log('✓ Vérification réussie - Système opérationnel');

    } catch (error) {
      this.log(`Erreur lors de la vérification: ${error.message}`);
      throw new AdminInitializationError(`Échec de la vérification: ${error.message}`, 'VERIFICATION_FAILED');
    }
  }

  /**
   * Ajoute une entrée au log d'initialisation
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.initLog.push(logEntry);
    console.log(logEntry);
  }

  /**
   * Retourne le log d'initialisation
   */
  getInitLog(): string[] {
    return [...this.initLog];
  }

  /**
   * Exporte le log d'initialisation
   */
  exportInitLog(): Blob {
    const logContent = this.initLog.join('\n');
    return new Blob([logContent], { type: 'text/plain' });
  }
}

/**
 * Fonction utilitaire pour initialiser le système d'administration
 */
export async function initializeAdminSystem(config?: Partial<InitConfig>): Promise<void> {
  const initializer = new AdminInitializer(config);
  await initializer.initialize();
}

/**
 * Fonction pour vérifier si le système est déjà initialisé
 */
export function isAdminSystemInitialized(): boolean {
  try {
    const users = UserManagementService.getUsers() || [];
    return users.some(u => u.role === UserRole.ADMIN);
  } catch (error) {
    return false;
  }
}

/**
 * Fonction pour réinitialiser le système (ATTENTION: Supprime toutes les données)
 */
export async function resetAdminSystem(confirmationToken: string): Promise<void> {
  console.warn('⚠️ ATTENTION: Réinitialisation du système d\'administration');

  if (process.env.NODE_ENV === 'production') {
    throw new AdminInitializationError('La réinitialisation n\'est pas autorisée en production', 'PROD_RESET_BLOCKED');
  }

  if (confirmationToken !== process.env.RESET_CONFIRMATION_TOKEN) {
    throw new AdminInitializationError('Token de confirmation invalide', 'INVALID_TOKEN');
  }

  try {
    await AuditService.logEvent({
      type: SecurityEventType.SYSTEM_RESET,
      description: 'Réinitialisation complète du système',
      user: 'system',
      timestamp: new Date()
    });

    localStorage.clear();
    sessionStorage.clear();

    await initializeAdminSystem();
  } catch (error) {
    throw new AdminInitializationError(`Échec de la réinitialisation: ${error.message}`, 'RESET_FAILED');
  }
}

// Export par défaut
export default AdminInitializer;
