/**
 * Security Configuration Service
 * Manages application-wide security settings and headers
 */

export interface SecurityConfig {
  // Content Security Policy
  contentSecurityPolicy: {
    enabled: boolean;
    directives: Record<string, string>;
  };
  
  // HTTPS and Transport Security
  httpsOnly: boolean;
  hstsMaxAge: number;
  
  // Frame protection
  preventClickjacking: boolean;
  
  // XSS Protection
  xssProtection: boolean;
  
  // MIME type sniffing protection
  noSniff: boolean;
  
  // Referrer policy
  referrerPolicy: string;
  
  // Session security
  sessionSecurity: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
  
  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  
  // Input validation
  inputValidation: {
    maxRequestSize: number;
    sanitizeHtml: boolean;
    validateXSS: boolean;
  };
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  contentSecurityPolicy: {
    enabled: true,
    directives: {
      'default-src': "'self'",
      'script-src': "'self' 'unsafe-inline' 'unsafe-eval'",
      'style-src': "'self' 'unsafe-inline'",
      'img-src': "'self' data: https:",
      'font-src': "'self' data:",
      'connect-src': "'self' https://weoetyijrqllvttttiir.supabase.co wss://weoetyijrqllvttttiir.supabase.co",
      'frame-ancestors': "'none'",
      'base-uri': "'self'",
      'form-action': "'self'"
    }
  },
  
  httpsOnly: true,
  hstsMaxAge: 31536000, // 1 year
  
  preventClickjacking: true,
  xssProtection: true,
  noSniff: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  sessionSecurity: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  rateLimiting: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  
  inputValidation: {
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    sanitizeHtml: true,
    validateXSS: true
  }
};

/**
 * Security Configuration Service
 */
export class SecurityConfigService {
  private static config: SecurityConfig = DEFAULT_SECURITY_CONFIG;
  private static isInitialized = false;
  
  /**
   * Initialize security configuration
   */
  static initialize(customConfig?: Partial<SecurityConfig>): void {
    if (this.isInitialized) {
      return;
    }
    
    if (customConfig) {
      this.config = { ...DEFAULT_SECURITY_CONFIG, ...customConfig };
    }
    
    this.applySecurityHeaders();
    this.setupGlobalErrorHandling();
    this.isInitialized = true;
  }
  
  /**
   * Get current security configuration
   */
  static getConfig(): SecurityConfig {
    return { ...this.config };
  }
  
  /**
   * Update security configuration
   */
  static updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.applySecurityHeaders();
  }
  
  /**
   * Apply security headers (for client-side meta tags)
   */
  private static applySecurityHeaders(): void {
    const head = document.head;
    
    // Remove existing security meta tags
    const existingTags = head.querySelectorAll('meta[name^="security-"], meta[http-equiv^="Content-Security-Policy"]');
    existingTags.forEach(tag => tag.remove());
    
    // Content Security Policy
    if (this.config.contentSecurityPolicy.enabled) {
      const csp = Object.entries(this.config.contentSecurityPolicy.directives)
        .map(([directive, value]) => `${directive} ${value}`)
        .join('; ');
      
      const cspMeta = document.createElement('meta');
      cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
      cspMeta.setAttribute('content', csp);
      head.appendChild(cspMeta);
    }
    
    // X-Frame-Options
    if (this.config.preventClickjacking) {
      const frameMeta = document.createElement('meta');
      frameMeta.setAttribute('http-equiv', 'X-Frame-Options');
      frameMeta.setAttribute('content', 'DENY');
      head.appendChild(frameMeta);
    }
    
    // X-Content-Type-Options
    if (this.config.noSniff) {
      const noSniffMeta = document.createElement('meta');
      noSniffMeta.setAttribute('http-equiv', 'X-Content-Type-Options');
      noSniffMeta.setAttribute('content', 'nosniff');
      head.appendChild(noSniffMeta);
    }
    
    // Referrer Policy
    const referrerMeta = document.createElement('meta');
    referrerMeta.setAttribute('name', 'referrer');
    referrerMeta.setAttribute('content', this.config.referrerPolicy);
    head.appendChild(referrerMeta);
  }
  
  /**
   * Setup global error handling for security
   */
  private static setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logSecurityEvent('UNHANDLED_REJECTION', {
        reason: event.reason?.message || 'Unknown error'
      });
      
      // Prevent default behavior in production to avoid exposing error details
      if (process.env.NODE_ENV === 'production') {
        event.preventDefault();
      }
    });
    
    // Handle global errors
    window.addEventListener('error', (event) => {
      this.logSecurityEvent('GLOBAL_ERROR', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno
      });
    });
  }
  
  /**
   * Validate request against security policies
   */
  static validateRequest(request: {
    size?: number;
    contentType?: string;
    origin?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check request size
    if (request.size && request.size > this.config.inputValidation.maxRequestSize) {
      errors.push('Request size exceeds maximum allowed limit');
    }
    
    // Additional validation can be added here
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Sanitize user input for security
   */
  static sanitizeInput(input: string): string {
    if (!this.config.inputValidation.sanitizeHtml) {
      return input;
    }
    
    // Basic HTML sanitization
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  /**
   * Check for XSS patterns
   */
  static detectXSS(input: string): boolean {
    if (!this.config.inputValidation.validateXSS) {
      return false;
    }
    
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
      /<embed[\s\S]*?>/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }
  
  /**
   * Log security events
   */
  private static logSecurityEvent(type: string, details: Record<string, any>): void {
    // Only log in development or send to secure logging service
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Security Event: ${type}`, details);
    }
    
    // In production, this should be sent to a secure logging service
    try {
      const securityLogs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
      securityLogs.push({
        timestamp: new Date().toISOString(),
        type,
        details: this.sanitizeLogDetails(details)
      });
      
      // Keep only last 100 security events
      if (securityLogs.length > 100) {
        securityLogs.splice(0, securityLogs.length - 100);
      }
      
      localStorage.setItem('securityLogs', JSON.stringify(securityLogs));
    } catch {
      // Fail silently if logging fails
    }
  }
  
  /**
   * Sanitize log details
   */
  private static sanitizeLogDetails(details: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(details)) {
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('key')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 200) {
        sanitized[key] = value.substring(0, 200) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Generate nonce for CSP
   */
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
  
  /**
   * Get security headers for HTTP requests
   */
  static getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.config.xssProtection) {
      headers['X-XSS-Protection'] = '1; mode=block';
    }
    
    if (this.config.noSniff) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }
    
    if (this.config.preventClickjacking) {
      headers['X-Frame-Options'] = 'DENY';
    }
    
    headers['Referrer-Policy'] = this.config.referrerPolicy;
    
    return headers;
  }
}

// Initialize security configuration on module load
if (typeof window !== 'undefined') {
  SecurityConfigService.initialize();
}
