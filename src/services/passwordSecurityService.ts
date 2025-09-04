import { supabase } from "@/integrations/supabase/client";

export interface PasswordBreachResult {
  pwned: boolean;
  count: number;
}

/**
 * Service pour vérifier la sécurité des mots de passe
 */
export class PasswordSecurityService {
  
  /**
   * Vérifie si un mot de passe a été compromis dans des fuites de données
   */
  static async checkPasswordBreach(password: string): Promise<PasswordBreachResult> {
    try {
      const { data, error } = await supabase.functions.invoke('password-breach-check', {
        body: { password }
      });

      if (error) {
        console.error('Erreur lors de la vérification du mot de passe:', error);
        // En cas d'erreur, on considère que le mot de passe n'est pas compromis
        return { pwned: false, count: 0 };
      }

      return data;
    } catch (error) {
      console.error('Erreur réseau lors de la vérification du mot de passe:', error);
      return { pwned: false, count: 0 };
    }
  }

  /**
   * Valide la force d'un mot de passe
   */
  static validatePasswordStrength(password: string): {
    isStrong: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // Longueur minimale
    if (password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    } else {
      score += 1;
    }

    // Majuscules
    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    } else {
      score += 1;
    }

    // Minuscules
    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    } else {
      score += 1;
    }

    // Chiffres
    if (!/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    } else {
      score += 1;
    }

    // Caractères spéciaux
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    } else {
      score += 1;
    }

    // Vérifications supplémentaires
    if (password.length >= 12) score += 1;
    if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) score += 1;

    return {
      isStrong: errors.length === 0 && score >= 4,
      errors,
      score
    };
  }

  /**
   * Vérifie complètement un mot de passe (force + fuites)
   */
  static async validatePasswordSecurity(password: string): Promise<{
    isSecure: boolean;
    strengthErrors: string[];
    isPwned: boolean;
    pwnedCount: number;
    score: number;
  }> {
    const strengthValidation = this.validatePasswordStrength(password);
    const breachCheck = await this.checkPasswordBreach(password);

    return {
      isSecure: strengthValidation.isStrong && !breachCheck.pwned,
      strengthErrors: strengthValidation.errors,
      isPwned: breachCheck.pwned,
      pwnedCount: breachCheck.count,
      score: strengthValidation.score
    };
  }
}