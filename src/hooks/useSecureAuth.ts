import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PasswordSecurityService } from '@/services/passwordSecurityService';
import { toast } from 'sonner';

interface SignUpData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

export function useSecureAuth() {
  const [isLoading, setIsLoading] = useState(false);

  const signUp = async ({ email, password, confirmPassword }: SignUpData): Promise<AuthResult> => {
    if (password !== confirmPassword) {
      return { success: false, error: 'Les mots de passe ne correspondent pas' };
    }

    setIsLoading(true);

    try {
      // Vérification de la sécurité du mot de passe
      toast.info('Vérification de la sécurité du mot de passe...');
      
      const passwordValidation = await PasswordSecurityService.validatePasswordSecurity(password);
      
      if (!passwordValidation.isSecure) {
        let errorMessage = 'Mot de passe non sécurisé:\n';
        
        if (passwordValidation.strengthErrors.length > 0) {
          errorMessage += passwordValidation.strengthErrors.join('\n');
        }
        
        if (passwordValidation.isPwned) {
          errorMessage += `\nCe mot de passe a été trouvé dans ${passwordValidation.pwnedCount} fuites de données.`;
        }
        
        return { success: false, error: errorMessage };
      }

      if (passwordValidation.isPwned) {
        toast.error(`Ce mot de passe a été compromis dans ${passwordValidation.pwnedCount} fuites de données`);
        return { 
          success: false, 
          error: `Ce mot de passe a été trouvé dans ${passwordValidation.pwnedCount} fuites de données connues. Choisissez un autre mot de passe.`
        };
      }

      // Inscription avec Supabase
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        let friendlyError = 'Erreur lors de l\'inscription';
        
        if (error.message.includes('already registered')) {
          friendlyError = 'Cette adresse email est déjà utilisée';
        } else if (error.message.includes('invalid email')) {
          friendlyError = 'Adresse email invalide';
        } else if (error.message.includes('weak password')) {
          friendlyError = 'Le mot de passe est trop faible';
        }
        
        return { success: false, error: friendlyError };
      }

      toast.success('Inscription réussie ! Vérifiez vos emails pour confirmer votre compte.');
      return { success: true };

    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      return { success: false, error: 'Erreur technique lors de l\'inscription' };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        let friendlyError = 'Erreur de connexion';
        
        if (error.message.includes('invalid credentials') || error.message.includes('Invalid login')) {
          friendlyError = 'Email ou mot de passe incorrect';
        } else if (error.message.includes('email not confirmed')) {
          friendlyError = 'Veuillez confirmer votre email avant de vous connecter';
        }
        
        return { success: false, error: friendlyError };
      }

      toast.success('Connexion réussie !');
      return { success: true };

    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return { success: false, error: 'Erreur technique lors de la connexion' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<AuthResult> => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { success: false, error: 'Erreur lors de la déconnexion' };
      }

      toast.success('Déconnexion réussie');
      return { success: true };

    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      return { success: false, error: 'Erreur technique lors de la déconnexion' };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signUp,
    signIn,
    signOut,
    isLoading
  };
}