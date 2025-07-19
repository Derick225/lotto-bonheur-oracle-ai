import { UserManagementService, Permission } from './userManagement';
import { AuditService, AuditCategory } from './auditService';

/**
 * Configuration globale de l'application
 */
export interface AppConfig {
  general: {
    appName: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    maintenanceMode: boolean;
    maxUsers: number;
    sessionTimeout: number; // en minutes
    timezone: string;
    language: string;
  };
  
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      maxAge: number; // en jours
    };
    twoFactorRequired: boolean;
    maxLoginAttempts: number;
    lockoutDuration: number; // en minutes
    sessionSecurity: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'strict' | 'lax' | 'none';
    };
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
      burstLimit: number;
    };
  };
  
  predictions: {
    algorithms: {
      xgboost: {
        enabled: boolean;
        weight: number;
        config: any;
      };
      rnnLstm: {
        enabled: boolean;
        weight: number;
        config: any;
      };
      hybrid: {
        enabled: boolean;
        strategy: 'weighted' | 'voting' | 'stacking';
      };
    };
    dataRetention: {
      maxHistoryDays: number;
      cleanupFrequency: number; // en heures
    };
    performance: {
      maxPredictionTime: number; // en secondes
      cacheEnabled: boolean;
      cacheTTL: number; // en minutes
    };
  };
  
  monitoring: {
    alerts: {
      performanceThreshold: number; // en ms
      errorRateThreshold: number; // pourcentage
      memoryThreshold: number; // pourcentage
      diskSpaceThreshold: number; // pourcentage
    };
    notifications: {
      email: {
        enabled: boolean;
        smtpServer: string;
        smtpPort: number;
        username: string;
        password: string;
        fromAddress: string;
      };
      sms: {
        enabled: boolean;
        provider: string;
        apiKey: string;
        fromNumber: string;
      };
      webhook: {
        enabled: boolean;
        url: string;
        secret: string;
      };
    };
    retention: {
      logRetentionDays: number;
      auditRetentionDays: number;
      metricsRetentionDays: number;
    };
  };
  
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    retentionCount: number;
    compression: boolean;
    encryption: boolean;
    destinations: Array<{
      type: 'local' | 'cloud' | 'ftp';
      config: any;
    }>;
  };
  
  performance: {
    cache: {
      enabled: boolean;
      maxSize: number; // en MB
      ttl: number; // en minutes
    };
    database: {
      connectionPool: number;
      queryTimeout: number; // en secondes
      indexOptimization: boolean;
    };
    api: {
      rateLimiting: boolean;
      requestTimeout: number; // en secondes
      compression: boolean;
    };
  };
}

/**
 * Template de notification
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'webhook';
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Historique des modifications de configuration
 */
export interface ConfigChange {
  id: string;
  timestamp: Date;
  userId: string;
  username: string;
  section: string;
  key: string;
  oldValue: any;
  newValue: any;
  reason?: string;
}

/**
 * Service de configuration système
 */
export class SystemConfigService {
  private static config: AppConfig = this.getDefaultConfig();
  private static templates: Map<string, NotificationTemplate> = new Map();
  private static changeHistory: ConfigChange[] = [];

  /**
   * Initialise le service de configuration
   */
  static async initialize(): Promise<void> {
    console.log('⚙️ Initialisation du service de configuration...');
    
    // Charger la configuration depuis le stockage local
    await this.loadConfig();
    
    // Créer les templates par défaut
    this.createDefaultTemplates();
    
    // Valider la configuration
    this.validateConfig();
    
    AuditService.logInfo('system_config', 'Service de configuration initialisé');
  }

  /**
   * Configuration par défaut
   */
  private static getDefaultConfig(): AppConfig {
    return {
      general: {
        appName: 'Loterie Oracle AI',
        version: '1.0.0',
        environment: 'development',
        maintenanceMode: false,
        maxUsers: 1000,
        sessionTimeout: 480, // 8 heures
        timezone: 'Europe/Paris',
        language: 'fr'
      },
      security: {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          maxAge: 90
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
      },
      predictions: {
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
      },
      monitoring: {
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
      },
      backup: {
        enabled: true,
        frequency: 'daily',
        retentionCount: 7,
        compression: true,
        encryption: false,
        destinations: [
          {
            type: 'local',
            config: { path: '/backups' }
          }
        ]
      },
      performance: {
        cache: {
          enabled: true,
          maxSize: 100,
          ttl: 30
        },
        database: {
          connectionPool: 10,
          queryTimeout: 30,
          indexOptimization: true
        },
        api: {
          rateLimiting: true,
          requestTimeout: 30,
          compression: true
        }
      }
    };
  }

  /**
   * Charge la configuration depuis le stockage
   */
  private static async loadConfig(): Promise<void> {
    try {
      const stored = localStorage.getItem('system_config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        this.config = { ...this.config, ...parsedConfig };
      }
    } catch (error) {
      AuditService.logError('system_config', error, { action: 'load_config' });
    }
  }

  /**
   * Sauvegarde la configuration
   */
  private static async saveConfig(): Promise<void> {
    try {
      localStorage.setItem('system_config', JSON.stringify(this.config));
      AuditService.logInfo('system_config', 'Configuration sauvegardée');
    } catch (error) {
      AuditService.logError('system_config', error, { action: 'save_config' });
      throw error;
    }
  }

  /**
   * Obtient la configuration complète
   */
  static getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Obtient une section de configuration
   */
  static getConfigSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    return { ...this.config[section] };
  }

  /**
   * Met à jour une section de configuration
   */
  static async updateConfigSection<K extends keyof AppConfig>(
    section: K,
    updates: Partial<AppConfig[K]>,
    reason?: string
  ): Promise<void> {
    if (!UserManagementService.hasPermission(Permission.SYSTEM_CONFIG)) {
      throw new Error('Permission insuffisante pour modifier la configuration');
    }

    const currentUser = UserManagementService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non authentifié');
    }

    const oldValue = { ...this.config[section] };
    const newValue = { ...oldValue, ...updates };

    // Valider les changements
    this.validateSectionUpdate(section, newValue);

    // Enregistrer le changement
    const change: ConfigChange = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: currentUser.id,
      username: currentUser.username,
      section: section as string,
      key: Object.keys(updates).join(', '),
      oldValue,
      newValue,
      reason
    };

    this.changeHistory.unshift(change);

    // Appliquer les changements
    this.config[section] = newValue;

    // Sauvegarder
    await this.saveConfig();

    // Audit
    AuditService.audit(AuditCategory.SYSTEM_CONFIG, 'update_config', section as string, true, {
      oldValue,
      newValue,
      risk: this.assessConfigRisk(section, updates)
    });

    console.log(`⚙️ Configuration mise à jour: ${section}`);
  }

  /**
   * Valide une mise à jour de section
   */
  private static validateSectionUpdate<K extends keyof AppConfig>(
    section: K,
    newValue: AppConfig[K]
  ): void {
    switch (section) {
      case 'security':
        const security = newValue as AppConfig['security'];
        if (security.passwordPolicy.minLength < 6) {
          throw new Error('La longueur minimale du mot de passe doit être d\'au moins 6 caractères');
        }
        if (security.maxLoginAttempts < 1) {
          throw new Error('Le nombre maximum de tentatives de connexion doit être d\'au moins 1');
        }
        break;
        
      case 'general':
        const general = newValue as AppConfig['general'];
        if (general.sessionTimeout < 5) {
          throw new Error('Le timeout de session doit être d\'au moins 5 minutes');
        }
        if (general.maxUsers < 1) {
          throw new Error('Le nombre maximum d\'utilisateurs doit être d\'au moins 1');
        }
        break;
    }
  }

  /**
   * Évalue le risque d'un changement de configuration
   */
  private static assessConfigRisk<K extends keyof AppConfig>(
    section: K,
    updates: Partial<AppConfig[K]>
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (section === 'security') {
      return 'high';
    }
    if (section === 'general' && 'maintenanceMode' in updates) {
      return 'medium';
    }
    if (section === 'backup' && 'enabled' in updates) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Valide la configuration complète
   */
  private static validateConfig(): void {
    // Vérifications de cohérence
    const errors: string[] = [];

    if (this.config.general.sessionTimeout <= 0) {
      errors.push('Timeout de session invalide');
    }

    if (this.config.security.maxLoginAttempts <= 0) {
      errors.push('Nombre maximum de tentatives de connexion invalide');
    }

    if (errors.length > 0) {
      AuditService.logError('system_config', new Error('Configuration invalide'), { errors });
      throw new Error(`Configuration invalide: ${errors.join(', ')}`);
    }
  }

  /**
   * Remet la configuration par défaut
   */
  static async resetToDefaults(section?: keyof AppConfig): Promise<void> {
    if (!UserManagementService.hasPermission(Permission.SYSTEM_CONFIG)) {
      throw new Error('Permission insuffisante pour réinitialiser la configuration');
    }

    const defaultConfig = this.getDefaultConfig();
    
    if (section) {
      await this.updateConfigSection(section, defaultConfig[section], 'Réinitialisation par défaut');
    } else {
      this.config = defaultConfig;
      await this.saveConfig();
      
      AuditService.audit(AuditCategory.SYSTEM_CONFIG, 'reset_config', 'all', true, {
        risk: 'high'
      });
    }
  }

  /**
   * Gestion des templates de notification
   */
  static createDefaultTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'alert_performance',
        name: 'Alerte Performance',
        type: 'email',
        subject: 'Alerte Performance - {{appName}}',
        body: 'Une dégradation de performance a été détectée.\n\nDétails:\n- Opération: {{operation}}\n- Durée: {{duration}}ms\n- Seuil: {{threshold}}ms',
        variables: ['appName', 'operation', 'duration', 'threshold'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'alert_security',
        name: 'Alerte Sécurité',
        type: 'email',
        subject: 'Alerte Sécurité - {{appName}}',
        body: 'Un événement de sécurité a été détecté.\n\nDétails:\n- Type: {{eventType}}\n- Utilisateur: {{username}}\n- IP: {{ipAddress}}\n- Heure: {{timestamp}}',
        variables: ['appName', 'eventType', 'username', 'ipAddress', 'timestamp'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'backup_success',
        name: 'Sauvegarde Réussie',
        type: 'email',
        subject: 'Sauvegarde Réussie - {{appName}}',
        body: 'La sauvegarde a été effectuée avec succès.\n\nDétails:\n- Taille: {{size}}\n- Durée: {{duration}}\n- Destination: {{destination}}',
        variables: ['appName', 'size', 'duration', 'destination'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Obtient tous les templates
   */
  static getNotificationTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Obtient un template par ID
   */
  static getNotificationTemplate(id: string): NotificationTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Crée ou met à jour un template
   */
  static saveNotificationTemplate(template: Partial<NotificationTemplate>): NotificationTemplate {
    if (!UserManagementService.hasPermission(Permission.SYSTEM_CONFIG)) {
      throw new Error('Permission insuffisante pour gérer les templates');
    }

    const now = new Date();
    const fullTemplate: NotificationTemplate = {
      id: template.id || `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: template.name || '',
      type: template.type || 'email',
      subject: template.subject,
      body: template.body || '',
      variables: template.variables || [],
      isActive: template.isActive !== undefined ? template.isActive : true,
      createdAt: template.createdAt || now,
      updatedAt: now
    };

    this.templates.set(fullTemplate.id, fullTemplate);

    AuditService.audit(AuditCategory.SYSTEM_CONFIG, 'save_template', 'notification_template', true, {
      resourceId: fullTemplate.id,
      newValue: fullTemplate
    });

    return fullTemplate;
  }

  /**
   * Supprime un template
   */
  static deleteNotificationTemplate(id: string): void {
    if (!UserManagementService.hasPermission(Permission.SYSTEM_CONFIG)) {
      throw new Error('Permission insuffisante pour supprimer les templates');
    }

    const template = this.templates.get(id);
    if (template) {
      this.templates.delete(id);
      
      AuditService.audit(AuditCategory.SYSTEM_CONFIG, 'delete_template', 'notification_template', true, {
        resourceId: id,
        oldValue: template
      });
    }
  }

  /**
   * Obtient l'historique des changements
   */
  static getChangeHistory(limit: number = 100): ConfigChange[] {
    if (!UserManagementService.hasPermission(Permission.VIEW_LOGS)) {
      return [];
    }
    return this.changeHistory.slice(0, limit);
  }

  /**
   * Exporte la configuration
   */
  static exportConfig(): Blob {
    if (!UserManagementService.hasPermission(Permission.SYSTEM_CONFIG)) {
      throw new Error('Permission insuffisante pour exporter la configuration');
    }

    const exportData = {
      config: this.config,
      templates: Array.from(this.templates.values()),
      exportDate: new Date().toISOString(),
      version: this.config.general.version
    };

    AuditService.audit(AuditCategory.SYSTEM_CONFIG, 'export_config', 'configuration', true);

    return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  }

  /**
   * Importe une configuration
   */
  static async importConfig(configData: any): Promise<void> {
    if (!UserManagementService.hasPermission(Permission.SYSTEM_CONFIG)) {
      throw new Error('Permission insuffisante pour importer la configuration');
    }

    try {
      // Valider les données importées
      if (!configData.config || !configData.version) {
        throw new Error('Format de configuration invalide');
      }

      // Sauvegarder la configuration actuelle
      const backup = { ...this.config };

      // Appliquer la nouvelle configuration
      this.config = { ...this.getDefaultConfig(), ...configData.config };
      
      // Valider
      this.validateConfig();
      
      // Sauvegarder
      await this.saveConfig();

      // Importer les templates si présents
      if (configData.templates) {
        configData.templates.forEach((template: NotificationTemplate) => {
          this.templates.set(template.id, template);
        });
      }

      AuditService.audit(AuditCategory.SYSTEM_CONFIG, 'import_config', 'configuration', true, {
        risk: 'high',
        oldValue: backup,
        newValue: this.config
      });

    } catch (error) {
      AuditService.logError('system_config', error, { action: 'import_config' });
      throw error;
    }
  }
}
