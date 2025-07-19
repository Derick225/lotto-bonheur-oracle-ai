import { UserManagementService, User, Permission } from './userManagement';
import { AuditService, AuditCategory } from './auditService';

/**
 * Types d'événements de sécurité
 */
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  PERMISSION_DENIED = 'permission_denied',
  DATA_ACCESS = 'data_access',
  CONFIGURATION_CHANGE = 'configuration_change'
}

/**
 * Événement de sécurité
 */
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  userId?: string;
  username?: string;
  ipAddress: string;
  userAgent: string;
  details: any;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

/**
 * Configuration de sécurité
 */
export interface SecurityConfig {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // jours
    preventReuse: number; // nombre de mots de passe précédents
  };
  accountLockout: {
    maxAttempts: number;
    lockoutDuration: number; // minutes
    resetAfter: number; // heures
  };
  sessionSecurity: {
    maxConcurrentSessions: number;
    sessionTimeout: number; // minutes
    requireReauth: boolean; // pour actions sensibles
  };
  twoFactor: {
    required: boolean;
    methods: ('totp' | 'sms' | 'email')[];
    backupCodes: boolean;
  };
  monitoring: {
    detectBruteForce: boolean;
    detectAnomalousLogin: boolean;
    detectPrivilegeEscalation: boolean;
    alertThreshold: number;
  };
}

/**
 * Résultat d'analyse de risque
 */
export interface RiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    factor: string;
    weight: number;
    description: string;
  }>;
  recommendations: string[];
}

/**
 * Service de sécurité avancé
 */
export class SecurityService {
  private static events: SecurityEvent[] = [];
  private static config: SecurityConfig = this.getDefaultConfig();
  private static blockedIPs: Map<string, Date> = new Map();
  private static loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();

  /**
   * Initialise le service de sécurité
   */
  static initialize(): void {
    console.log('🔒 Initialisation du service de sécurité...');
    
    // Programmer le nettoyage périodique
    setInterval(() => {
      this.cleanupOldEvents();
      this.cleanupExpiredBlocks();
    }, 60 * 60 * 1000); // Toutes les heures

    // Démarrer la surveillance
    this.startSecurityMonitoring();
    
    AuditService.logInfo('security_service', 'Service de sécurité initialisé');
  }

  /**
   * Configuration par défaut
   */
  private static getDefaultConfig(): SecurityConfig {
    return {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        maxAge: 90,
        preventReuse: 5
      },
      accountLockout: {
        maxAttempts: 5,
        lockoutDuration: 30,
        resetAfter: 24
      },
      sessionSecurity: {
        maxConcurrentSessions: 3,
        sessionTimeout: 480,
        requireReauth: true
      },
      twoFactor: {
        required: false,
        methods: ['totp'],
        backupCodes: true
      },
      monitoring: {
        detectBruteForce: true,
        detectAnomalousLogin: true,
        detectPrivilegeEscalation: true,
        alertThreshold: 5
      }
    };
  }

  /**
   * Enregistre un événement de sécurité
   */
  static logSecurityEvent(
    type: SecurityEventType,
    details: any,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'Unknown',
    userId?: string,
    username?: string
  ): void {
    const event: SecurityEvent = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      userId,
      username,
      ipAddress,
      userAgent,
      details,
      riskLevel: this.assessEventRisk(type, details, ipAddress),
      resolved: false
    };

    this.events.unshift(event);
    
    // Garder seulement les 10000 derniers événements
    if (this.events.length > 10000) {
      this.events = this.events.slice(0, 10000);
    }

    // Audit automatique pour les événements à haut risque
    if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
      AuditService.audit(AuditCategory.SECURITY, type, 'security_event', true, {
        risk: event.riskLevel,
        newValue: event
      });
    }

    // Déclencher des actions automatiques si nécessaire
    this.handleSecurityEvent(event);
  }

  /**
   * Évalue le niveau de risque d'un événement
   */
  private static assessEventRisk(
    type: SecurityEventType,
    details: any,
    ipAddress: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;

    // Score de base selon le type d'événement
    switch (type) {
      case SecurityEventType.LOGIN_FAILURE:
        score += 20;
        break;
      case SecurityEventType.ACCOUNT_LOCKED:
        score += 40;
        break;
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        score += 60;
        break;
      case SecurityEventType.PERMISSION_DENIED:
        score += 30;
        break;
      case SecurityEventType.CONFIGURATION_CHANGE:
        score += 50;
        break;
      default:
        score += 10;
    }

    // Facteurs aggravants
    if (this.isKnownBadIP(ipAddress)) score += 30;
    if (this.hasRecentFailures(ipAddress)) score += 20;
    if (details.adminAction) score += 25;
    if (details.sensitiveData) score += 35;

    // Déterminer le niveau
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Gère automatiquement un événement de sécurité
   */
  private static handleSecurityEvent(event: SecurityEvent): void {
    switch (event.type) {
      case SecurityEventType.LOGIN_FAILURE:
        this.handleLoginFailure(event);
        break;
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        this.handleSuspiciousActivity(event);
        break;
      case SecurityEventType.ACCOUNT_LOCKED:
        this.notifyAdmins('Compte verrouillé', `Le compte ${event.username} a été verrouillé`, event);
        break;
    }
  }

  /**
   * Gère les échecs de connexion
   */
  private static handleLoginFailure(event: SecurityEvent): void {
    const key = `${event.ipAddress}_${event.username || 'unknown'}`;
    const attempts = this.loginAttempts.get(key) || { count: 0, lastAttempt: new Date(0) };
    
    attempts.count++;
    attempts.lastAttempt = new Date();
    this.loginAttempts.set(key, attempts);

    // Bloquer l'IP après trop de tentatives
    if (attempts.count >= this.config.accountLockout.maxAttempts) {
      this.blockIP(event.ipAddress, 'Trop de tentatives de connexion échouées');
      
      this.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        { reason: 'brute_force_detected', attempts: attempts.count },
        event.ipAddress,
        event.userAgent
      );
    }
  }

  /**
   * Gère les activités suspectes
   */
  private static handleSuspiciousActivity(event: SecurityEvent): void {
    // Bloquer temporairement l'IP
    this.blockIP(event.ipAddress, 'Activité suspecte détectée');
    
    // Notifier les administrateurs
    this.notifyAdmins(
      'Activité suspecte détectée',
      `Activité suspecte depuis ${event.ipAddress}: ${event.details.reason}`,
      event
    );
  }

  /**
   * Bloque une adresse IP
   */
  static blockIP(ipAddress: string, reason: string): void {
    const blockUntil = new Date(Date.now() + this.config.accountLockout.lockoutDuration * 60 * 1000);
    this.blockedIPs.set(ipAddress, blockUntil);
    
    this.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      { action: 'ip_blocked', reason },
      ipAddress
    );
  }

  /**
   * Vérifie si une IP est bloquée
   */
  static isIPBlocked(ipAddress: string): boolean {
    const blockUntil = this.blockedIPs.get(ipAddress);
    if (!blockUntil) return false;
    
    if (blockUntil < new Date()) {
      this.blockedIPs.delete(ipAddress);
      return false;
    }
    
    return true;
  }

  /**
   * Valide un mot de passe selon la politique
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const policy = this.config.passwordPolicy;

    if (password.length < policy.minLength) {
      errors.push(`Le mot de passe doit contenir au moins ${policy.minLength} caractères`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Génère un code TOTP secret
   */
  static generateTOTPSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Vérifie un code TOTP
   */
  static verifyTOTP(secret: string, token: string): boolean {
    // Simulation de vérification TOTP
    // Dans un vrai environnement, utiliser une bibliothèque comme 'otplib'
    const timeStep = Math.floor(Date.now() / 30000);
    const expectedToken = this.generateTOTPToken(secret, timeStep);
    
    // Vérifier le token actuel et les tokens adjacents (pour la tolérance de temps)
    return token === expectedToken ||
           token === this.generateTOTPToken(secret, timeStep - 1) ||
           token === this.generateTOTPToken(secret, timeStep + 1);
  }

  /**
   * Génère un token TOTP (simulation)
   */
  private static generateTOTPToken(secret: string, timeStep: number): string {
    // Simulation simple - dans la réalité, utiliser HMAC-SHA1
    const hash = (secret + timeStep.toString()).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return Math.abs(hash % 1000000).toString().padStart(6, '0');
  }

  /**
   * Effectue une analyse de risque pour un utilisateur
   */
  static assessUserRisk(userId: string, context: any): RiskAssessment {
    const user = UserManagementService.getUser(userId);
    if (!user) {
      return {
        score: 100,
        level: 'critical',
        factors: [{ factor: 'user_not_found', weight: 100, description: 'Utilisateur non trouvé' }],
        recommendations: ['Vérifier l\'identité de l\'utilisateur']
      };
    }

    let score = 0;
    const factors: Array<{ factor: string; weight: number; description: string }> = [];

    // Facteurs de risque
    if (!user.isActive) {
      score += 50;
      factors.push({ factor: 'inactive_account', weight: 50, description: 'Compte inactif' });
    }

    if (user.securitySettings.failedLoginAttempts > 0) {
      const weight = Math.min(user.securitySettings.failedLoginAttempts * 10, 30);
      score += weight;
      factors.push({ 
        factor: 'failed_logins', 
        weight, 
        description: `${user.securitySettings.failedLoginAttempts} tentatives échouées` 
      });
    }

    if (!user.securitySettings.twoFactorEnabled && this.config.twoFactor.required) {
      score += 25;
      factors.push({ factor: 'no_2fa', weight: 25, description: '2FA non activé' });
    }

    // Analyser l'historique récent
    const recentEvents = this.events.filter(e => 
      e.userId === userId && 
      e.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const suspiciousEvents = recentEvents.filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical');
    if (suspiciousEvents.length > 0) {
      const weight = Math.min(suspiciousEvents.length * 15, 40);
      score += weight;
      factors.push({ 
        factor: 'suspicious_activity', 
        weight, 
        description: `${suspiciousEvents.length} événements suspects récents` 
      });
    }

    // Déterminer le niveau et les recommandations
    let level: RiskAssessment['level'] = 'low';
    const recommendations: string[] = [];

    if (score >= 70) {
      level = 'critical';
      recommendations.push('Suspendre le compte immédiatement');
      recommendations.push('Effectuer une investigation approfondie');
    } else if (score >= 50) {
      level = 'high';
      recommendations.push('Exiger une re-authentification');
      recommendations.push('Activer la surveillance renforcée');
    } else if (score >= 25) {
      level = 'medium';
      recommendations.push('Encourager l\'activation du 2FA');
      recommendations.push('Surveiller les activités');
    } else {
      recommendations.push('Continuer la surveillance normale');
    }

    return { score, level, factors, recommendations };
  }

  /**
   * Obtient les événements de sécurité
   */
  static getSecurityEvents(filters: {
    types?: SecurityEventType[];
    riskLevels?: string[];
    dateRange?: { start: Date; end: Date };
    userId?: string;
    ipAddress?: string;
    resolved?: boolean;
    limit?: number;
  } = {}): SecurityEvent[] {
    if (!UserManagementService.hasPermission(Permission.SECURITY_AUDIT)) {
      return [];
    }

    let events = [...this.events];

    // Appliquer les filtres
    if (filters.types && filters.types.length > 0) {
      events = events.filter(e => filters.types!.includes(e.type));
    }

    if (filters.riskLevels && filters.riskLevels.length > 0) {
      events = events.filter(e => filters.riskLevels!.includes(e.riskLevel));
    }

    if (filters.dateRange) {
      events = events.filter(e => 
        e.timestamp >= filters.dateRange!.start && 
        e.timestamp <= filters.dateRange!.end
      );
    }

    if (filters.userId) {
      events = events.filter(e => e.userId === filters.userId);
    }

    if (filters.ipAddress) {
      events = events.filter(e => e.ipAddress === filters.ipAddress);
    }

    if (filters.resolved !== undefined) {
      events = events.filter(e => e.resolved === filters.resolved);
    }

    const limit = filters.limit || 1000;
    return events.slice(0, limit);
  }

  /**
   * Marque un événement comme résolu
   */
  static resolveSecurityEvent(eventId: string, resolvedBy: string): void {
    if (!UserManagementService.hasPermission(Permission.SECURITY_AUDIT)) {
      throw new Error('Permission insuffisante');
    }

    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.resolved = true;
      event.resolvedBy = resolvedBy;
      event.resolvedAt = new Date();

      AuditService.audit(AuditCategory.SECURITY, 'resolve_security_event', 'security_event', true, {
        resourceId: eventId,
        newValue: { resolved: true, resolvedBy }
      });
    }
  }

  /**
   * Obtient les statistiques de sécurité
   */
  static getSecurityStatistics(): {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsByRisk: Record<string, number>;
    blockedIPs: number;
    unresolvedEvents: number;
    recentTrends: any;
  } {
    const eventsByType = Object.values(SecurityEventType).reduce((acc, type) => {
      acc[type] = this.events.filter(e => e.type === type).length;
      return acc;
    }, {} as Record<SecurityEventType, number>);

    const eventsByRisk = ['low', 'medium', 'high', 'critical'].reduce((acc, risk) => {
      acc[risk] = this.events.filter(e => e.riskLevel === risk).length;
      return acc;
    }, {} as Record<string, number>);

    const unresolvedEvents = this.events.filter(e => !e.resolved).length;

    // Tendances des 7 derniers jours
    const recentTrends = this.calculateSecurityTrends();

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsByRisk,
      blockedIPs: this.blockedIPs.size,
      unresolvedEvents,
      recentTrends
    };
  }

  /**
   * Calcule les tendances de sécurité
   */
  private static calculateSecurityTrends(): any {
    const days = 7;
    const trends = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayEvents = this.events.filter(e => 
        e.timestamp >= dayStart && e.timestamp < dayEnd
      );
      
      trends.push({
        date: dayStart.toISOString().split('T')[0],
        total: dayEvents.length,
        high_risk: dayEvents.filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical').length,
        login_failures: dayEvents.filter(e => e.type === SecurityEventType.LOGIN_FAILURE).length
      });
    }
    
    return trends;
  }

  /**
   * Utilitaires privés
   */
  private static isKnownBadIP(ipAddress: string): boolean {
    // Dans un vrai environnement, vérifier contre une base de données d'IPs malveillantes
    return this.blockedIPs.has(ipAddress);
  }

  private static hasRecentFailures(ipAddress: string): boolean {
    const recent = this.events.filter(e => 
      e.ipAddress === ipAddress && 
      e.type === SecurityEventType.LOGIN_FAILURE &&
      e.timestamp > new Date(Date.now() - 60 * 60 * 1000) // 1 heure
    );
    return recent.length > 2;
  }

  private static notifyAdmins(title: string, message: string, event: SecurityEvent): void {
    // Dans un vrai environnement, envoyer des notifications aux administrateurs
    console.warn(`🚨 ALERTE SÉCURITÉ: ${title} - ${message}`, event);
  }

  private static startSecurityMonitoring(): void {
    // Surveillance continue en arrière-plan
    setInterval(() => {
      this.detectAnomalies();
    }, 5 * 60 * 1000); // Toutes les 5 minutes
  }

  private static detectAnomalies(): void {
    // Détecter les anomalies dans les patterns d'accès
    const recentEvents = this.events.filter(e => 
      e.timestamp > new Date(Date.now() - 60 * 60 * 1000)
    );

    // Détecter les pics d'activité
    if (recentEvents.length > this.config.monitoring.alertThreshold * 10) {
      this.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        { reason: 'activity_spike', count: recentEvents.length },
        'system'
      );
    }
  }

  private static cleanupOldEvents(): void {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 jours
    this.events = this.events.filter(e => e.timestamp > cutoffDate);
  }

  private static cleanupExpiredBlocks(): void {
    const now = new Date();
    this.blockedIPs.forEach((blockUntil, ip) => {
      if (blockUntil < now) {
        this.blockedIPs.delete(ip);
      }
    });
  }
}
