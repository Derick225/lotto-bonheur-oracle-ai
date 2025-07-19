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
 * Configuration d'initialisation
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
 * Configuration par défaut
 */
const DEFAULT_CONFIG: InitConfig = {
  adminUser: {
    username: 'admin',
    email: 'admin@loterie-oracle.com',
    password: 'Admin123!',
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
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Lance l'initialisation complète
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initialisation du système d\'administration...');
    this.log('Début de l\'initialisation du système d\'administration');

    try {
      // Étape 1: Initialiser les services de base
      await this.initializeBaseServices();

      // Étape 2: Créer l'utilisateur administrateur
      await this.createAdminUser();

      // Étape 3: Configurer les paramètres système
      await this.setupSystemConfiguration();

      // Étape 4: Créer les données d'exemple
      if (this.config.createSampleData) {
        await this.createSampleData();
      }

      // Étape 5: Configurer les sauvegardes automatiques
      if (this.config.enableAutoBackup) {
        await this.setupAutoBackup();
      }

      // Étape 6: Configurer les notifications
      if (this.config.setupNotifications) {
        await this.setupNotifications();
      }

      // Étape 7: Vérifier l'installation
      await this.verifyInstallation();

      console.log('✅ Initialisation terminée avec succès !');
      this.log('Initialisation terminée avec succès');

    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      this.log(`Erreur lors de l'initialisation: ${error}`);
      throw error;
    }
  }

  /**
   * Initialise les services de base
   */
  private async initializeBaseServices(): Promise<void> {
    this.log('Initialisation des services de base...');

    try {
      // Initialiser les services dans l'ordre de dépendance
      await UserManagementService.initialize();
      this.log('✓ UserManagementService initialisé');

      AuditService.initialize();
      this.log('✓ AuditService initialisé');

      SecurityService.initialize();
      this.log('✓ SecurityService initialisé');

      await SystemConfigService.initialize();
      this.log('✓ SystemConfigService initialisé');

      await BackupService.initialize();
      this.log('✓ BackupService initialisé');

      await NotificationService.initialize();
      this.log('✓ NotificationService initialisé');

    } catch (error) {
      this.log(`Erreur lors de l'initialisation des services: ${error}`);
      throw new Error(`Échec de l'initialisation des services: ${error}`);
    }
  }

  /**
   * Crée l'utilisateur administrateur par défaut
   */
  private async createAdminUser(): Promise<void> {
    this.log('Création de l\'utilisateur administrateur...');

    try {
      // Vérifier si un admin existe déjà
      const existingUsers = UserManagementService.getUsers();
      const existingAdmin = existingUsers.find(u => u.role === UserRole.ADMIN);

      if (existingAdmin) {
        this.log('Un utilisateur administrateur existe déjà, création ignorée');
        return;
      }

      // Créer l'utilisateur administrateur
      const adminUser = await UserManagementService.createUser({
        username: this.config.adminUser.username,
        email: this.config.adminUser.email,
        password: this.config.adminUser.password,
        firstName: this.config.adminUser.firstName,
        lastName: this.config.adminUser.lastName,
        role: UserRole.ADMIN,
        isActive: true
      });

      this.log(`✓ Utilisateur administrateur créé: ${adminUser.username}`);

      // Activer toutes les permissions pour l'admin
      await UserManagementService.updateUser(adminUser.id, {
        securitySettings: {
          ...adminUser.securitySettings,
          twoFactorEnabled: false, // Désactivé par défaut, peut être activé manuellement
          lastPasswordChange: new Date(),
          failedLoginAttempts: 0,
          accountLocked: false
        }
      });

      this.log('✓ Permissions administrateur configurées');

    } catch (error) {
      this.log(`Erreur lors de la création de l'administrateur: ${error}`);
      throw new Error(`Échec de la création de l'administrateur: ${error}`);
    }
  }

  /**
   * Configure les paramètres système par défaut
   */
  private async setupSystemConfiguration(): Promise<void> {
    this.log('Configuration des paramètres système...');

    try {
      // Configuration de sécurité renforcée
      await SystemConfigService.updateConfigSection('security', {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 90,
          preventReuse: 5
        },
        twoFactorRequired: false, // Peut être activé manuellement
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
      }, 'Configuration initiale du système');

      this.log('✓ Configuration de sécurité appliquée');

      // Configuration des prédictions
      await SystemConfigService.updateConfigSection('predictions', {
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
      }, 'Configuration initiale des prédictions');

      this.log('✓ Configuration des prédictions appliquée');

      // Configuration du monitoring
      await SystemConfigService.updateConfigSection('monitoring', {
        alerts: {
          performanceThreshold: 5000,
          errorRateThreshold: 5,
          memoryThreshold: 80,
          diskSpaceThreshold: 90
        },
        notifications: {
          email: {
            enabled: false, // À configurer manuellement
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
      }, 'Configuration initiale du monitoring');

      this.log('✓ Configuration du monitoring appliquée');

    } catch (error) {
      this.log(`Erreur lors de la configuration système: ${error}`);
      throw new Error(`Échec de la configuration système: ${error}`);
    }
  }

  /**
   * Crée des données d'exemple pour les tests
   */
  private async createSampleData(): Promise<void> {
    this.log('Création des données d\'exemple...');

    try {
      // Créer des utilisateurs d'exemple
      const sampleUsers = [
        {
          username: 'analyste1',
          email: 'analyste1@example.com',
          password: 'Analyste123!',
          firstName: 'Jean',
          lastName: 'Dupont',
          role: UserRole.ANALYST
        },
        {
          username: 'user1',
          email: 'user1@example.com',
          password: 'User123!',
          firstName: 'Marie',
          lastName: 'Martin',
          role: UserRole.USER
        }
      ];

      for (const userData of sampleUsers) {
        try {
          await UserManagementService.createUser(userData);
          this.log(`✓ Utilisateur d'exemple créé: ${userData.username}`);
        } catch (error) {
          // Ignorer si l'utilisateur existe déjà
          if (!error.message.includes('existe déjà')) {
            throw error;
          }
        }
      }

      // Créer des événements de sécurité d'exemple
      SecurityService.logSecurityEvent(
        'login_success' as any,
        { message: 'Connexion réussie lors de l\'initialisation' },
        '127.0.0.1',
        'Admin Initializer',
        'admin-init',
        'Système'
      );

      this.log('✓ Données d\'exemple créées');

    } catch (error) {
      this.log(`Erreur lors de la création des données d'exemple: ${error}`);
      // Ne pas faire échouer l'initialisation pour les données d'exemple
      console.warn('Avertissement: Impossible de créer les données d\'exemple:', error);
    }
  }

  /**
   * Configure les sauvegardes automatiques
   */
  private async setupAutoBackup(): Promise<void> {
    this.log('Configuration des sauvegardes automatiques...');

    try {
      // Créer une sauvegarde initiale
      await BackupService.createBackup({
        type: 'full' as any,
        description: 'Sauvegarde initiale du système',
        compression: true,
        encryption: false
      });

      this.log('✓ Sauvegarde initiale créée');

      // Les tâches de maintenance sont automatiquement configurées
      // lors de l'initialisation du BackupService

      this.log('✓ Sauvegardes automatiques configurées');

    } catch (error) {
      this.log(`Erreur lors de la configuration des sauvegardes: ${error}`);
      // Ne pas faire échouer l'initialisation pour les sauvegardes
      console.warn('Avertissement: Impossible de configurer les sauvegardes:', error);
    }
  }

  /**
   * Configure les notifications système
   */
  private async setupNotifications(): Promise<void> {
    this.log('Configuration des notifications...');

    try {
      // Les templates par défaut sont créés automatiquement
      // lors de l'initialisation du SystemConfigService

      // Envoyer une notification de test
      await NotificationService.sendSystemAlert(
        'info' as any,
        'Système d\'administration initialisé',
        'Le système d\'administration a été configuré avec succès et est prêt à être utilisé.'
      );

      this.log('✓ Notifications configurées et testées');

    } catch (error) {
      this.log(`Erreur lors de la configuration des notifications: ${error}`);
      // Ne pas faire échouer l'initialisation pour les notifications
      console.warn('Avertissement: Impossible de configurer les notifications:', error);
    }
  }

  /**
   * Vérifie que l'installation s'est bien déroulée
   */
  private async verifyInstallation(): Promise<void> {
    this.log('Vérification de l\'installation...');

    try {
      // Vérifier que l'admin existe
      const users = UserManagementService.getUsers();
      const admin = users.find(u => u.role === UserRole.ADMIN);
      if (!admin) {
        throw new Error('Aucun utilisateur administrateur trouvé');
      }

      // Vérifier la configuration
      const config = SystemConfigService.getConfig();
      if (!config) {
        throw new Error('Configuration système non trouvée');
      }

      // Vérifier les services
      const stats = SecurityService.getSecurityStatistics();
      if (!stats) {
        throw new Error('Service de sécurité non fonctionnel');
      }

      this.log('✓ Vérification réussie - Système opérationnel');

    } catch (error) {
      this.log(`Erreur lors de la vérification: ${error}`);
      throw new Error(`Échec de la vérification: ${error}`);
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
    const users = UserManagementService.getUsers();
    return users.some(u => u.role === UserRole.ADMIN);
  } catch (error) {
    return false;
  }
}

/**
 * Fonction pour réinitialiser le système (ATTENTION: Supprime toutes les données)
 */
export async function resetAdminSystem(): Promise<void> {
  console.warn('⚠️ ATTENTION: Réinitialisation du système d\'administration');
  
  // Cette fonction devrait être utilisée uniquement en développement
  if (process.env.NODE_ENV === 'production') {
    throw new Error('La réinitialisation n\'est pas autorisée en production');
  }

  // Effacer les données stockées
  localStorage.clear();
  sessionStorage.clear();

  // Réinitialiser
  await initializeAdminSystem();
}

// Export par défaut
export default AdminInitializer;
