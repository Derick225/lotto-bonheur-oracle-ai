import { SecurityConfigService } from '@/services/securityConfig';

/**
 * Enhanced Security Validation Utilities
 * Provides comprehensive input validation with security-first approach
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedValue?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowedCharacters?: RegExp;
  preventXSS?: boolean;
  preventSQLInjection?: boolean;
  sanitize?: boolean;
  required?: boolean;
}

/**
 * Enhanced Security Validator
 */
export class SecurityEnhancedValidator {
  /**
   * Validate email with enhanced security checks
   */
  static validateSecureEmail(email: string): ValidationResult {
    const errors: string[] = [];
    let riskLevel: ValidationResult['riskLevel'] = 'low';

    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      errors.push('Format d\'email invalide');
      riskLevel = 'medium';
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(email)) {
      errors.push('Caractères suspects détectés');
      riskLevel = 'high';
    }

    // Check length limits
    if (email.length > 254) {
      errors.push('Email trop long');
      riskLevel = 'medium';
    }

    // Check for XSS attempts
    if (SecurityConfigService.detectXSS(email)) {
      errors.push('Tentative XSS détectée');
      riskLevel = 'critical';
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedValue: SecurityConfigService.sanitizeInput(email),
      riskLevel
    };
  }

  /**
   * Validate password with comprehensive security checks
   */
  static validateSecurePassword(password: string): ValidationResult {
    const errors: string[] = [];
    let riskLevel: ValidationResult['riskLevel'] = 'low';

    // Length requirements
    if (password.length < 12) {
      errors.push('Le mot de passe doit contenir au moins 12 caractères');
      riskLevel = 'high';
    }

    if (password.length > 128) {
      errors.push('Le mot de passe ne peut pas dépasser 128 caractères');
      riskLevel = 'medium';
    }

    // Complexity requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
      riskLevel = 'medium';
    }

    if (!hasLowercase) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
      riskLevel = 'medium';
    }

    if (!hasNumbers) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
      riskLevel = 'medium';
    }

    if (!hasSpecialChars) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
      riskLevel = 'medium';
    }

    // Check for common weak passwords
    if (this.isWeakPassword(password)) {
      errors.push('Mot de passe trop faible ou couramment utilisé');
      riskLevel = 'high';
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(password)) {
      errors.push('Patterns suspects détectés dans le mot de passe');
      riskLevel = 'critical';
    }

    return {
      valid: errors.length === 0,
      errors,
      riskLevel
    };
  }

  /**
   * Validate lottery numbers with security checks
   */
  static validateLotteryNumbers(numbers: number[]): ValidationResult {
    const errors: string[] = [];
    let riskLevel: ValidationResult['riskLevel'] = 'low';

    // Check if numbers is an array
    if (!Array.isArray(numbers)) {
      errors.push('Les numéros doivent être fournis sous forme de liste');
      riskLevel = 'high';
      return { valid: false, errors, riskLevel };
    }

    // Check count (5 numbers for most lotteries)
    if (numbers.length !== 5) {
      errors.push('Exactement 5 numéros sont requis');
      riskLevel = 'medium';
    }

    // Check range (1-90 for this lottery system)
    const invalidNumbers = numbers.filter(num => num < 1 || num > 90);
    if (invalidNumbers.length > 0) {
      errors.push('Les numéros doivent être entre 1 et 90');
      riskLevel = 'medium';
    }

    // Check for duplicates
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      errors.push('Les numéros ne peuvent pas être dupliqués');
      riskLevel = 'medium';
    }

    // Check for integer values
    const nonIntegers = numbers.filter(num => !Number.isInteger(num));
    if (nonIntegers.length > 0) {
      errors.push('Tous les numéros doivent être des entiers');
      riskLevel = 'medium';
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedValue: numbers.filter(num => Number.isInteger(num) && num >= 1 && num <= 90).slice(0, 5).join(','),
      riskLevel
    };
  }

  /**
   * Validate general text input with security focus
   */
  static validateSecureText(
    text: string, 
    options: SecurityValidationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    let riskLevel: ValidationResult['riskLevel'] = 'low';
    let sanitizedValue = text;

    // Required check
    if (options.required && (!text || text.trim().length === 0)) {
      errors.push('Ce champ est requis');
      riskLevel = 'medium';
      return { valid: false, errors, riskLevel };
    }

    // Length checks
    if (options.minLength && text.length < options.minLength) {
      errors.push(`Minimum ${options.minLength} caractères requis`);
      riskLevel = 'medium';
    }

    if (options.maxLength && text.length > options.maxLength) {
      errors.push(`Maximum ${options.maxLength} caractères autorisés`);
      riskLevel = 'medium';
    }

    // Character validation
    if (options.allowedCharacters && !options.allowedCharacters.test(text)) {
      errors.push('Caractères non autorisés détectés');
      riskLevel = 'high';
    }

    // XSS Detection
    if (options.preventXSS !== false && SecurityConfigService.detectXSS(text)) {
      errors.push('Tentative XSS détectée');
      riskLevel = 'critical';
    }

    // SQL Injection Detection
    if (options.preventSQLInjection !== false && this.detectSQLInjection(text)) {
      errors.push('Tentative d\'injection SQL détectée');
      riskLevel = 'critical';
    }

    // Sanitization
    if (options.sanitize !== false) {
      sanitizedValue = SecurityConfigService.sanitizeInput(text);
    }

    // Suspicious patterns
    if (this.containsSuspiciousPatterns(text)) {
      errors.push('Patterns suspects détectés');
      riskLevel = 'high';
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedValue,
      riskLevel
    };
  }

  /**
   * Validate session token format
   */
  static validateSessionToken(token: string): ValidationResult {
    const errors: string[] = [];
    let riskLevel: ValidationResult['riskLevel'] = 'low';

    if (!token || typeof token !== 'string') {
      errors.push('Token de session invalide');
      riskLevel = 'critical';
      return { valid: false, errors, riskLevel };
    }

    // Check minimum length for security
    if (token.length < 32) {
      errors.push('Token de session trop court');
      riskLevel = 'high';
    }

    // Check for base64 format (common for secure tokens)
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(token)) {
      errors.push('Format de token invalide');
      riskLevel = 'high';
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(token)) {
      errors.push('Token contient des patterns suspects');
      riskLevel = 'critical';
    }

    return {
      valid: errors.length === 0,
      errors,
      riskLevel
    };
  }

  /**
   * Check for weak passwords
   */
  private static isWeakPassword(password: string): boolean {
    const weakPasswords = [
      'password', '123456', 'qwerty', 'admin', 'letmein',
      'welcome', 'monkey', '1234567890', 'password123',
      'admin123', 'root', 'toor', 'pass', 'test'
    ];

    const lowerPassword = password.toLowerCase();
    return weakPasswords.some(weak => 
      lowerPassword.includes(weak) || 
      weak.includes(lowerPassword)
    );
  }

  /**
   * Detect SQL injection patterns
   */
  private static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bSELECT\b.*\bFROM\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bALTER\b.*\bTABLE\b)/i,
      /(\bCREATE\b.*\bTABLE\b)/i,
      /(--|#|\/\*|\*\/)/,
      /(\bOR\b.*=.*)/i,
      /(\bAND\b.*=.*)/i,
      /(1=1|1=0)/,
      /(\bEXEC\b|\bEXECUTE\b)/i,
      /(\bxp_\w+)/i,
      /(\bsp_\w+)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for suspicious patterns
   */
  private static containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      // Script tags
      /<script[\s\S]*?>/i,
      // Iframe tags
      /<iframe[\s\S]*?>/i,
      // Object tags
      /<object[\s\S]*?>/i,
      // Embed tags
      /<embed[\s\S]*?>/i,
      // JavaScript protocol
      /javascript:/i,
      // Data URLs with scripts
      /data:.*script/i,
      // Event handlers
      /on\w+\s*=/i,
      // Expression() CSS
      /expression\s*\(/i,
      // Unusual encoding
      /(%3c|%3e|%22|%27|%3b)/i,
      // Multiple slashes (path traversal)
      /(\.\.\/|\.\.\\)/,
      // Null bytes
      /\0/,
      // Control characters
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Rate limiting check
   */
  static checkRateLimit(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]');
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);
    
    // Check if limit exceeded
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    // Add current attempt
    validAttempts.push(now);
    localStorage.setItem(`rate_limit_${key}`, JSON.stringify(validAttempts));
    
    return true;
  }

  /**
   * Clear rate limit for a key
   */
  static clearRateLimit(key: string): void {
    localStorage.removeItem(`rate_limit_${key}`);
  }
}

export default SecurityEnhancedValidator;