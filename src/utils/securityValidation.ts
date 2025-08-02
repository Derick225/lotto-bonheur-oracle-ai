/**
 * Utilitaires de validation et sécurisation des données d'entrée
 */

/**
 * Nettoie et valide les entrées utilisateur pour prévenir les injections
 */
export class SecurityValidator {
  
  /**
   * Nettoie une chaîne de caractères pour prévenir les attaques XSS
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(/[<>'"&]/g, (char) => {
        const replacements: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return replacements[char] || char;
      })
      .trim();
  }

  /**
   * Valide un email
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    const sanitized = this.sanitizeString(email);
    
    if (!sanitized) {
      return { valid: false, error: 'Email requis' };
    }

    if (sanitized.length > 254) {
      return { valid: false, error: 'Email trop long' };
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(sanitized)) {
      return { valid: false, error: 'Format email invalide' };
    }

    return { valid: true };
  }

  /**
   * Valide un mot de passe selon les critères de sécurité
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password) {
      errors.push('Mot de passe requis');
      return { valid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }

    if (password.length > 128) {
      errors.push('Le mot de passe ne peut pas dépasser 128 caractères');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    }

    if (!/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }

    // Vérifier les mots de passe faibles courants
    const weakPasswords = [
      'password', '123456', '12345678', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('Ce mot de passe est trop commun');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Valide les numéros de loterie
   */
  static validateLotteryNumbers(numbers: number[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(numbers)) {
      errors.push('Format de numéros invalide');
      return { valid: false, errors };
    }

    if (numbers.length !== 5) {
      errors.push('Exactement 5 numéros sont requis');
    }

    for (const num of numbers) {
      if (!Number.isInteger(num) || num < 1 || num > 90) {
        errors.push('Les numéros doivent être entre 1 et 90');
        break;
      }
    }

    // Vérifier les doublons
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      errors.push('Les numéros ne peuvent pas être en double');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Valide une date
   */
  static validateDate(dateString: string): { valid: boolean; error?: string } {
    const sanitized = this.sanitizeString(dateString);
    
    if (!sanitized) {
      return { valid: false, error: 'Date requise' };
    }

    const date = new Date(sanitized);
    
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Format de date invalide' };
    }

    const now = new Date();
    const minDate = new Date('2020-01-01');
    const maxDate = new Date();
    maxDate.setFullYear(now.getFullYear() + 1);

    if (date < minDate || date > maxDate) {
      return { valid: false, error: 'Date hors de la plage autorisée' };
    }

    return { valid: true };
  }

  /**
   * Limite le taux de requêtes (rate limiting simple côté client)
   */
  static rateLimiter = (() => {
    const attempts = new Map<string, { count: number; resetTime: number }>();
    
    return {
      check: (key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean => {
        const now = Date.now();
        const attempt = attempts.get(key);
        
        if (!attempt || now > attempt.resetTime) {
          attempts.set(key, { count: 1, resetTime: now + windowMs });
          return true;
        }
        
        if (attempt.count >= maxAttempts) {
          return false;
        }
        
        attempt.count++;
        return true;
      },
      
      reset: (key: string): void => {
        attempts.delete(key);
      }
    };
  })();

  /**
   * Valide et nettoie un nom de tirage
   */
  static validateDrawName(drawName: string): { valid: boolean; sanitized: string; error?: string } {
    const sanitized = this.sanitizeString(drawName);
    
    if (!sanitized) {
      return { valid: false, sanitized: '', error: 'Nom de tirage requis' };
    }

    if (sanitized.length > 50) {
      return { valid: false, sanitized, error: 'Nom de tirage trop long' };
    }

    // Vérifier que le nom ne contient que des caractères autorisés
    if (!/^[a-zA-Z0-9\s\-_àâäéèêëïîôöùûüÿç]+$/.test(sanitized)) {
      return { valid: false, sanitized, error: 'Caractères non autorisés dans le nom' };
    }

    return { valid: true, sanitized };
  }

  /**
   * Génère un token CSRF sécurisé
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Valide un token CSRF
   */
  static validateCSRFToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken) {
      return false;
    }
    
    // Utiliser une comparaison à temps constant pour éviter les attaques de timing
    if (token.length !== storedToken.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Détecte les tentatives d'injection SQL basiques
   */
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
      /(UNION|OR|AND)\s+\d+\s*=\s*\d+/i,
      /['"]\s*(OR|AND)\s+['"]\w+['"]\s*=\s*['"]\w+['"]*/i,
      /-{2,}/, // Commentaires SQL
      /\/\*.*\*\//s, // Commentaires multilignes
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Nettoie et valide les paramètres de requête
   */
  static sanitizeQueryParams(params: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        const cleanKey = this.sanitizeString(key);
        const cleanValue = this.sanitizeString(value);
        
        // Vérifier les injections
        if (!this.detectSQLInjection(cleanValue)) {
          sanitized[cleanKey] = cleanValue;
        }
      }
    }
    
    return sanitized;
  }
}

export default SecurityValidator;