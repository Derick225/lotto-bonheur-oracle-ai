import { UserManagementService, Permission } from './userManagement';

/**
 * Niveaux de log
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Catégories d'audit
 */
export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SYSTEM_CONFIG = 'system_config',
  USER_MANAGEMENT = 'user_management',
  PREDICTION = 'prediction',
  BACKUP_RESTORE = 'backup_restore',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

/**
 * Entrée de log système
 */
export interface SystemLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  details: any;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  stackTrace?: string;
  correlationId?: string;
}

/**
 * Entrée d'audit
 */
export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  username: string;
  category: AuditCategory;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  success: boolean;
  errorMessage?: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Métriques de performance
 */
export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  memoryUsage: number;
  cpuUsage: number;
  details: any;
}

/**
 * Configuration d'export
 */
export interface ExportConfig {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  dateRange: {
    start: Date;
    end: Date;
  };
  categories?: AuditCategory[];
  levels?: LogLevel[];
  includeDetails: boolean;
  maxRecords: number;
}

/**
 * Service d'audit et de logs
 */
export class AuditService {
  private static logs: SystemLog[] = [];
  private static auditEntries: AuditEntry[] = [];
  private static performanceMetrics: PerformanceMetric[] = [];
  private static correlationMap: Map<string, string[]> = new Map();

  /**
   * Initialise le service d'audit
   */
  static initialize(): void {
    console.log('📋 Initialisation du service d\'audit...');
    
    // Programmer le nettoyage périodique
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000); // Tous les jours

    // Capturer les erreurs globales
    this.setupGlobalErrorHandling();
  }

  /**
   * Configure la capture d'erreurs globales
   */
  private static setupGlobalErrorHandling(): void {
    // Capturer les erreurs JavaScript non gérées
    window.addEventListener('error', (event) => {
      this.logError('Global Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Capturer les promesses rejetées non gérées
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason, {
        promise: event.promise
      });
    });
  }

  /**
   * Enregistre un log système
   */
  static log(
    level: LogLevel,
    category: string,
    message: string,
    details?: any,
    correlationId?: string
  ): void {
    const currentUser = UserManagementService.getCurrentUser();
    
    const logEntry: SystemLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message,
      details: details || {},
      userId: currentUser?.id,
      correlationId,
      ipAddress: this.getCurrentIP(),
      userAgent: navigator.userAgent
    };

    this.logs.unshift(logEntry);
    
    // Garder seulement les 50000 derniers logs
    if (this.logs.length > 50000) {
      this.logs = this.logs.slice(0, 50000);
    }

    // Ajouter à la corrélation si nécessaire
    if (correlationId) {
      const existing = this.correlationMap.get(correlationId) || [];
      existing.push(logEntry.id);
      this.correlationMap.set(correlationId, existing);
    }

    // Log critique : alerter immédiatement
    if (level === LogLevel.CRITICAL) {
      this.handleCriticalLog(logEntry);
    }

    console.log(`[${level.toUpperCase()}] ${category}: ${message}`, details);
  }

  /**
   * Enregistre une entrée d'audit
   */
  static audit(
    category: AuditCategory,
    action: string,
    resource: string,
    success: boolean,
    options: {
      resourceId?: string;
      oldValue?: any;
      newValue?: any;
      errorMessage?: string;
      risk?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): void {
    const currentUser = UserManagementService.getCurrentUser();
    
    if (!currentUser) {
      this.log(LogLevel.WARN, 'audit', 'Tentative d\'audit sans utilisateur connecté', { action, resource });
      return;
    }

    const auditEntry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: currentUser.id,
      username: currentUser.username,
      category,
      action,
      resource,
      resourceId: options.resourceId,
      oldValue: options.oldValue,
      newValue: options.newValue,
      success,
      errorMessage: options.errorMessage,
      ipAddress: this.getCurrentIP(),
      userAgent: navigator.userAgent,
      sessionId: this.getCurrentSessionId(),
      risk: options.risk || 'low'
    };

    this.auditEntries.unshift(auditEntry);
    
    // Garder seulement les 100000 dernières entrées
    if (this.auditEntries.length > 100000) {
      this.auditEntries = this.auditEntries.slice(0, 100000);
    }

    // Audit à haut risque : log critique
    if (auditEntry.risk === 'critical' || auditEntry.risk === 'high') {
      this.log(LogLevel.WARN, 'security_audit', 
        `Action à risque ${auditEntry.risk}: ${action} sur ${resource}`, auditEntry);
    }
  }

  /**
   * Enregistre une métrique de performance
   */
  static recordPerformance(
    operation: string,
    startTime: number,
    success: boolean,
    details?: any
  ): void {
    const metric: PerformanceMetric = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      operation,
      duration: Date.now() - startTime,
      success,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: 0, // Simulé - dans un vrai environnement, utiliser des APIs appropriées
      details: details || {}
    };

    this.performanceMetrics.unshift(metric);
    
    // Garder seulement les 10000 dernières métriques
    if (this.performanceMetrics.length > 10000) {
      this.performanceMetrics = this.performanceMetrics.slice(0, 10000);
    }

    // Performance dégradée : log d'avertissement
    if (metric.duration > 5000) { // Plus de 5 secondes
      this.log(LogLevel.WARN, 'performance', 
        `Opération lente détectée: ${operation} (${metric.duration}ms)`, metric);
    }
  }

  /**
   * Logs spécialisés
   */
  static logInfo(category: string, message: string, details?: any): void {
    this.log(LogLevel.INFO, category, message, details);
  }

  static logWarn(category: string, message: string, details?: any): void {
    this.log(LogLevel.WARN, category, message, details);
  }

  static logError(category: string, error: any, details?: any): void {
    const errorDetails = {
      ...details,
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    };
    
    this.log(LogLevel.ERROR, category, error?.message || 'Erreur inconnue', errorDetails);
  }

  static logCritical(category: string, message: string, details?: any): void {
    this.log(LogLevel.CRITICAL, category, message, details);
  }

  /**
   * Obtient les logs avec filtres
   */
  static getLogs(filters: {
    levels?: LogLevel[];
    categories?: string[];
    dateRange?: { start: Date; end: Date };
    userId?: string;
    limit?: number;
    search?: string;
  } = {}): SystemLog[] {
    if (!UserManagementService.hasPermission(Permission.VIEW_LOGS)) {
      return [];
    }

    let filteredLogs = [...this.logs];

    // Filtrer par niveau
    if (filters.levels && filters.levels.length > 0) {
      filteredLogs = filteredLogs.filter(log => filters.levels!.includes(log.level));
    }

    // Filtrer par catégorie
    if (filters.categories && filters.categories.length > 0) {
      filteredLogs = filteredLogs.filter(log => filters.categories!.includes(log.category));
    }

    // Filtrer par plage de dates
    if (filters.dateRange) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= filters.dateRange!.start && 
        log.timestamp <= filters.dateRange!.end
      );
    }

    // Filtrer par utilisateur
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    // Recherche textuelle
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.category.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    }

    // Limiter les résultats
    const limit = filters.limit || 1000;
    return filteredLogs.slice(0, limit);
  }

  /**
   * Obtient les entrées d'audit avec filtres
   */
  static getAuditEntries(filters: {
    categories?: AuditCategory[];
    dateRange?: { start: Date; end: Date };
    userId?: string;
    risk?: string[];
    success?: boolean;
    limit?: number;
    search?: string;
  } = {}): AuditEntry[] {
    if (!UserManagementService.hasPermission(Permission.VIEW_LOGS)) {
      return [];
    }

    let filteredEntries = [...this.auditEntries];

    // Filtrer par catégorie
    if (filters.categories && filters.categories.length > 0) {
      filteredEntries = filteredEntries.filter(entry => 
        filters.categories!.includes(entry.category)
      );
    }

    // Filtrer par plage de dates
    if (filters.dateRange) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.timestamp >= filters.dateRange!.start && 
        entry.timestamp <= filters.dateRange!.end
      );
    }

    // Filtrer par utilisateur
    if (filters.userId) {
      filteredEntries = filteredEntries.filter(entry => entry.userId === filters.userId);
    }

    // Filtrer par niveau de risque
    if (filters.risk && filters.risk.length > 0) {
      filteredEntries = filteredEntries.filter(entry => filters.risk!.includes(entry.risk));
    }

    // Filtrer par succès
    if (filters.success !== undefined) {
      filteredEntries = filteredEntries.filter(entry => entry.success === filters.success);
    }

    // Recherche textuelle
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredEntries = filteredEntries.filter(entry => 
        entry.action.toLowerCase().includes(searchLower) ||
        entry.resource.toLowerCase().includes(searchLower) ||
        entry.username.toLowerCase().includes(searchLower)
      );
    }

    // Limiter les résultats
    const limit = filters.limit || 1000;
    return filteredEntries.slice(0, limit);
  }

  /**
   * Obtient les métriques de performance
   */
  static getPerformanceMetrics(filters: {
    operations?: string[];
    dateRange?: { start: Date; end: Date };
    limit?: number;
  } = {}): PerformanceMetric[] {
    if (!UserManagementService.hasPermission(Permission.VIEW_LOGS)) {
      return [];
    }

    let filteredMetrics = [...this.performanceMetrics];

    // Filtrer par opération
    if (filters.operations && filters.operations.length > 0) {
      filteredMetrics = filteredMetrics.filter(metric => 
        filters.operations!.includes(metric.operation)
      );
    }

    // Filtrer par plage de dates
    if (filters.dateRange) {
      filteredMetrics = filteredMetrics.filter(metric => 
        metric.timestamp >= filters.dateRange!.start && 
        metric.timestamp <= filters.dateRange!.end
      );
    }

    // Limiter les résultats
    const limit = filters.limit || 1000;
    return filteredMetrics.slice(0, limit);
  }

  /**
   * Exporte les logs selon la configuration
   */
  static async exportLogs(config: ExportConfig): Promise<Blob> {
    if (!UserManagementService.hasPermission(Permission.VIEW_LOGS)) {
      throw new Error('Permission insuffisante pour exporter les logs');
    }

    const logs = this.getLogs({
      levels: config.levels,
      categories: config.categories?.map(c => c.toString()),
      dateRange: config.dateRange,
      limit: config.maxRecords
    });

    const auditEntries = this.getAuditEntries({
      categories: config.categories,
      dateRange: config.dateRange,
      limit: config.maxRecords
    });

    const data = {
      exportDate: new Date().toISOString(),
      config,
      logs: config.includeDetails ? logs : logs.map(l => ({
        timestamp: l.timestamp,
        level: l.level,
        category: l.category,
        message: l.message,
        userId: l.userId
      })),
      auditEntries: config.includeDetails ? auditEntries : auditEntries.map(e => ({
        timestamp: e.timestamp,
        username: e.username,
        category: e.category,
        action: e.action,
        resource: e.resource,
        success: e.success,
        risk: e.risk
      }))
    };

    switch (config.format) {
      case 'json':
        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      
      case 'csv':
        return this.exportToCSV(data);
      
      default:
        throw new Error(`Format d'export non supporté: ${config.format}`);
    }
  }

  /**
   * Exporte en format CSV
   */
  private static exportToCSV(data: any): Blob {
    const csvLines: string[] = [];
    
    // En-têtes pour les logs
    csvLines.push('Type,Timestamp,Level/Category,Action/Message,User,Success,Risk');
    
    // Logs système
    data.logs.forEach((log: SystemLog) => {
      csvLines.push([
        'LOG',
        log.timestamp.toISOString(),
        log.level,
        `"${log.message.replace(/"/g, '""')}"`,
        log.userId || '',
        '',
        ''
      ].join(','));
    });
    
    // Entrées d'audit
    data.auditEntries.forEach((entry: AuditEntry) => {
      csvLines.push([
        'AUDIT',
        entry.timestamp.toISOString(),
        entry.category,
        `"${entry.action.replace(/"/g, '""')}"`,
        entry.username,
        entry.success.toString(),
        entry.risk
      ].join(','));
    });

    return new Blob([csvLines.join('\n')], { type: 'text/csv' });
  }

  /**
   * Gère les logs critiques
   */
  private static handleCriticalLog(logEntry: SystemLog): void {
    // Dans un environnement réel, envoyer des alertes immédiates
    console.error('🚨 LOG CRITIQUE:', logEntry);
    
    // Enregistrer dans l'audit
    this.audit(AuditCategory.SECURITY, 'critical_log', 'system', true, {
      risk: 'critical',
      newValue: logEntry
    });
  }

  /**
   * Utilitaires
   */
  private static getCurrentIP(): string {
    // Dans un environnement réel, obtenir l'IP via une API
    return '127.0.0.1';
  }

  private static getCurrentSessionId(): string {
    // Dans un environnement réel, obtenir l'ID de session actuel
    return 'session_current';
  }

  private static getMemoryUsage(): number {
    // Utiliser l'API Performance si disponible
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Nettoie les anciens logs
   */
  private static cleanupOldLogs(): void {
    const cutoffDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 180 jours
    
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
    this.auditEntries = this.auditEntries.filter(entry => entry.timestamp > cutoffDate);
    this.performanceMetrics = this.performanceMetrics.filter(metric => metric.timestamp > cutoffDate);
    
    console.log('🧹 Nettoyage des anciens logs effectué');
  }

  /**
   * Obtient les statistiques des logs
   */
  static getLogStatistics(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    totalAuditEntries: number;
    auditByCategory: Record<AuditCategory, number>;
    averagePerformance: number;
  } {
    const logsByLevel = Object.values(LogLevel).reduce((acc, level) => {
      acc[level] = this.logs.filter(log => log.level === level).length;
      return acc;
    }, {} as Record<LogLevel, number>);

    const auditByCategory = Object.values(AuditCategory).reduce((acc, category) => {
      acc[category] = this.auditEntries.filter(entry => entry.category === category).length;
      return acc;
    }, {} as Record<AuditCategory, number>);

    const avgPerformance = this.performanceMetrics.length > 0 
      ? this.performanceMetrics.reduce((sum, metric) => sum + metric.duration, 0) / this.performanceMetrics.length
      : 0;

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      totalAuditEntries: this.auditEntries.length,
      auditByCategory,
      averagePerformance: avgPerformance
    };
  }
}
