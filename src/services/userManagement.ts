import { IndexedDBService } from './indexedDBService';

/**
 * Rôles utilisateur disponibles
 */
export enum UserRole {
  ADMIN = 'admin',
  ANALYST = 'analyst',
  USER = 'user'
}

/**
 * Permissions granulaires
 */
export enum Permission {
  // Gestion des données
  VIEW_DATA = 'view_data',
  EDIT_DATA = 'edit_data',
  DELETE_DATA = 'delete_data',
  EXPORT_DATA = 'export_data',
  
  // Prédictions
  VIEW_PREDICTIONS = 'view_predictions',
  CREATE_PREDICTIONS = 'create_predictions',
  MANAGE_MODELS = 'manage_models',
  
  // Administration
  MANAGE_USERS = 'manage_users',
  VIEW_LOGS = 'view_logs',
  SYSTEM_CONFIG = 'system_config',
  BACKUP_RESTORE = 'backup_restore',
  
  // Monitoring
  VIEW_MONITORING = 'view_monitoring',
  MANAGE_ALERTS = 'manage_alerts',
  
  // Sécurité
  SECURITY_AUDIT = 'security_audit',
  MANAGE_PERMISSIONS = 'manage_permissions'
}

/**
 * Interface utilisateur
 */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
  securitySettings: SecuritySettings;
}

/**
 * Préférences utilisateur
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'en';
  timezone: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  dashboard: {
    defaultView: string;
    refreshInterval: number;
  };
}

/**
 * Paramètres de sécurité
 */
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  passwordLastChanged: Date;
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
  accountLocked: boolean;
  lockoutUntil?: Date;
  trustedDevices: string[];
}

/**
 * Session utilisateur
 */
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

/**
 * Activité utilisateur
 */
export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
}

/**
 * Service de gestion des utilisateurs
 */
export class UserManagementService {
  private static users: Map<string, User> = new Map();
  private static sessions: Map<string, UserSession> = new Map();
  private static activities: UserActivity[] = [];
  private static currentUser: User | null = null;

  /**
   * Définition des permissions par rôle
   */
  private static rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
      // Toutes les permissions
      ...Object.values(Permission)
    ],
    [UserRole.ANALYST]: [
      Permission.VIEW_DATA,
      Permission.EDIT_DATA,
      Permission.EXPORT_DATA,
      Permission.VIEW_PREDICTIONS,
      Permission.CREATE_PREDICTIONS,
      Permission.MANAGE_MODELS,
      Permission.VIEW_MONITORING,
      Permission.VIEW_LOGS
    ],
    [UserRole.USER]: [
      Permission.VIEW_DATA,
      Permission.VIEW_PREDICTIONS,
      Permission.VIEW_MONITORING
    ]
  };

  /**
   * Initialise le service avec des utilisateurs par défaut
   */
  static async initialize(): Promise<void> {
    console.log('🔐 Initialisation du service de gestion des utilisateurs...');
    
    // Créer un utilisateur admin par défaut si aucun n'existe
    if (this.users.size === 0) {
      await this.createDefaultAdmin();
    }
    
    // Nettoyer les sessions expirées
    this.cleanupExpiredSessions();
    
    // Programmer le nettoyage périodique
    setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupOldActivities();
    }, 60 * 60 * 1000); // Toutes les heures
  }

  /**
   * Crée un utilisateur administrateur par défaut
   */
  private static async createDefaultAdmin(): Promise<void> {
    const adminUser: User = {
      id: 'admin-default',
      username: 'admin',
      email: 'admin@loterie-oracle.com',
      firstName: 'Administrateur',
      lastName: 'Système',
      role: UserRole.ADMIN,
      permissions: this.rolePermissions[UserRole.ADMIN],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        theme: 'system',
        language: 'fr',
        timezone: 'Europe/Paris',
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        dashboard: {
          defaultView: 'overview',
          refreshInterval: 30
        }
      },
      securitySettings: {
        twoFactorEnabled: false,
        passwordLastChanged: new Date(),
        failedLoginAttempts: 0,
        accountLocked: false,
        trustedDevices: []
      }
    };

    this.users.set(adminUser.id, adminUser);
    console.log('✅ Utilisateur administrateur par défaut créé');
  }

  /**
   * Authentifie un utilisateur
   */
  static async authenticateUser(
    username: string, 
    password: string, 
    deviceInfo: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ user: User; token: string } | null> {
    // Simulation d'authentification - dans la réalité, vérifier le mot de passe hashé
    const user = Array.from(this.users.values()).find(u => 
      u.username === username && u.isActive
    );

    if (!user) {
      this.logActivity('', 'login_failed', 'authentication', 
        { username, reason: 'user_not_found' }, ipAddress, userAgent, false);
      return null;
    }

    // Vérifier si le compte est verrouillé
    if (user.securitySettings.accountLocked) {
      this.logActivity(user.id, 'login_failed', 'authentication', 
        { reason: 'account_locked' }, ipAddress, userAgent, false);
      return null;
    }

    // Créer une session
    const session = this.createSession(user.id, deviceInfo, ipAddress, userAgent);
    
    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    user.securitySettings.failedLoginAttempts = 0;
    this.users.set(user.id, user);

    this.logActivity(user.id, 'login_success', 'authentication', 
      { deviceInfo }, ipAddress, userAgent, true);

    this.currentUser = user;
    return { user, token: session.token };
  }

  /**
   * Crée une nouvelle session
   */
  private static createSession(
    userId: string, 
    deviceInfo: string, 
    ipAddress: string, 
    userAgent: string
  ): UserSession {
    const session: UserSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      token: this.generateToken(),
      deviceInfo,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      isActive: true
    };

    this.sessions.set(session.token, session);
    return session;
  }

  /**
   * Génère un token de session
   */
  private static generateToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Valide un token de session
   */
  static validateSession(token: string): User | null {
    const session = this.sessions.get(token);
    
    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return null;
    }

    const user = this.users.get(session.userId);
    if (!user || !user.isActive) {
      return null;
    }

    // Mettre à jour l'activité de la session
    session.lastActivity = new Date();
    this.sessions.set(token, session);

    return user;
  }

  /**
   * Déconnecte un utilisateur
   */
  static logout(token: string): void {
    const session = this.sessions.get(token);
    if (session) {
      session.isActive = false;
      this.sessions.set(token, session);
      
      this.logActivity(session.userId, 'logout', 'authentication', 
        { sessionId: session.id }, session.ipAddress, session.userAgent, true);
    }
    
    this.currentUser = null;
  }

  /**
   * Crée un nouvel utilisateur
   */
  static async createUser(userData: Partial<User>): Promise<User> {
    if (!this.hasPermission(Permission.MANAGE_USERS)) {
      throw new Error('Permission insuffisante pour créer un utilisateur');
    }

    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: userData.username!,
      email: userData.email!,
      firstName: userData.firstName!,
      lastName: userData.lastName!,
      role: userData.role || UserRole.USER,
      permissions: this.rolePermissions[userData.role || UserRole.USER],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        theme: 'system',
        language: 'fr',
        timezone: 'Europe/Paris',
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        dashboard: {
          defaultView: 'overview',
          refreshInterval: 30
        }
      },
      securitySettings: {
        twoFactorEnabled: false,
        passwordLastChanged: new Date(),
        failedLoginAttempts: 0,
        accountLocked: false,
        trustedDevices: []
      }
    };

    this.users.set(user.id, user);
    
    this.logActivity(this.currentUser?.id || '', 'create_user', 'user_management', 
      { targetUserId: user.id, username: user.username }, '', '', true);

    return user;
  }

  /**
   * Met à jour un utilisateur
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    if (!this.hasPermission(Permission.MANAGE_USERS)) {
      throw new Error('Permission insuffisante pour modifier un utilisateur');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    
    // Mettre à jour les permissions si le rôle a changé
    if (updates.role && updates.role !== user.role) {
      updatedUser.permissions = this.rolePermissions[updates.role];
    }

    this.users.set(userId, updatedUser);
    
    this.logActivity(this.currentUser?.id || '', 'update_user', 'user_management', 
      { targetUserId: userId, changes: updates }, '', '', true);

    return updatedUser;
  }

  /**
   * Supprime un utilisateur
   */
  static async deleteUser(userId: string): Promise<void> {
    if (!this.hasPermission(Permission.MANAGE_USERS)) {
      throw new Error('Permission insuffisante pour supprimer un utilisateur');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Ne pas permettre la suppression du dernier admin
    const adminCount = Array.from(this.users.values()).filter(u => 
      u.role === UserRole.ADMIN && u.isActive
    ).length;
    
    if (user.role === UserRole.ADMIN && adminCount <= 1) {
      throw new Error('Impossible de supprimer le dernier administrateur');
    }

    this.users.delete(userId);
    
    // Désactiver toutes les sessions de cet utilisateur
    this.sessions.forEach((session, token) => {
      if (session.userId === userId) {
        session.isActive = false;
        this.sessions.set(token, session);
      }
    });

    this.logActivity(this.currentUser?.id || '', 'delete_user', 'user_management', 
      { targetUserId: userId, username: user.username }, '', '', true);
  }

  /**
   * Obtient tous les utilisateurs
   */
  static getUsers(): User[] {
    if (!this.hasPermission(Permission.MANAGE_USERS)) {
      return [];
    }
    return Array.from(this.users.values());
  }

  /**
   * Obtient un utilisateur par ID
   */
  static getUser(userId: string): User | null {
    return this.users.get(userId) || null;
  }

  /**
   * Vérifie si l'utilisateur actuel a une permission
   */
  static hasPermission(permission: Permission): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.includes(permission);
  }

  /**
   * Obtient l'utilisateur actuel
   */
  static getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Enregistre une activité utilisateur
   */
  private static logActivity(
    userId: string,
    action: string,
    resource: string,
    details: any,
    ipAddress: string,
    userAgent: string,
    success: boolean
  ): void {
    const activity: UserActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      resource,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      success
    };

    this.activities.unshift(activity);
    
    // Garder seulement les 10000 dernières activités
    if (this.activities.length > 10000) {
      this.activities = this.activities.slice(0, 10000);
    }
  }

  /**
   * Obtient les activités utilisateur
   */
  static getUserActivities(userId?: string, limit: number = 100): UserActivity[] {
    if (!this.hasPermission(Permission.VIEW_LOGS)) {
      return [];
    }

    let activities = this.activities;
    
    if (userId) {
      activities = activities.filter(a => a.userId === userId);
    }

    return activities.slice(0, limit);
  }

  /**
   * Obtient les sessions actives
   */
  static getActiveSessions(): UserSession[] {
    if (!this.hasPermission(Permission.MANAGE_USERS)) {
      return [];
    }

    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  /**
   * Nettoie les sessions expirées
   */
  private static cleanupExpiredSessions(): void {
    const now = new Date();
    this.sessions.forEach((session, token) => {
      if (session.expiresAt < now) {
        session.isActive = false;
        this.sessions.set(token, session);
      }
    });
  }

  /**
   * Nettoie les anciennes activités
   */
  private static cleanupOldActivities(): void {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 jours
    this.activities = this.activities.filter(a => a.timestamp > cutoffDate);
  }
}
