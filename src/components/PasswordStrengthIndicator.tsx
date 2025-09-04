import { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, Shield } from 'lucide-react';
import { PasswordSecurityService } from '@/services/passwordSecurityService';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PasswordStrengthIndicatorProps {
  password: string;
  onValidationChange?: (isValid: boolean) => void;
}

export function PasswordStrengthIndicator({ 
  password, 
  onValidationChange 
}: PasswordStrengthIndicatorProps) {
  const [validation, setValidation] = useState({
    isSecure: false,
    strengthErrors: [] as string[],
    isPwned: false,
    pwnedCount: 0,
    score: 0
  });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!password) {
      setValidation({
        isSecure: false,
        strengthErrors: [],
        isPwned: false,
        pwnedCount: 0,
        score: 0
      });
      onValidationChange?.(false);
      return;
    }

    const checkPassword = async () => {
      setIsChecking(true);
      try {
        const result = await PasswordSecurityService.validatePasswordSecurity(password);
        setValidation(result);
        onValidationChange?.(result.isSecure);
      } catch (error) {
        console.error('Erreur lors de la validation du mot de passe:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Debounce la vérification pour éviter trop d'appels API
    const timeoutId = setTimeout(checkPassword, 500);
    return () => clearTimeout(timeoutId);
  }, [password, onValidationChange]);

  if (!password) return null;

  const progressValue = (validation.score / 7) * 100;
  
  const getStrengthColor = () => {
    if (validation.score <= 2) return 'bg-red-500';
    if (validation.score <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (validation.score <= 2) return 'Faible';
    if (validation.score <= 4) return 'Moyen';
    if (validation.score <= 5) return 'Fort';
    return 'Très fort';
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Force du mot de passe</span>
          <span className={`font-medium ${
            validation.score <= 2 ? 'text-red-600' :
            validation.score <= 4 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {getStrengthText()}
          </span>
        </div>
        <Progress 
          value={progressValue} 
          className="h-2"
        />
      </div>

      {/* Critères de validation */}
      {validation.strengthErrors.length > 0 && (
        <div className="space-y-1">
          {validation.strengthErrors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-red-600">
              <X className="h-3 w-3" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Indicateur de vérification des fuites */}
      {isChecking && password.length >= 8 && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full" />
          <span>Vérification des fuites de données...</span>
        </div>
      )}

      {/* Alerte si mot de passe compromis */}
      {validation.isPwned && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ce mot de passe a été trouvé dans {validation.pwnedCount.toLocaleString()} 
            fuites de données connues. Choisissez un autre mot de passe pour votre sécurité.
          </AlertDescription>
        </Alert>
      )}

      {/* Indicateur de sécurité */}
      {validation.isSecure && !isChecking && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Shield className="h-3 w-3" />
          <span>Mot de passe sécurisé ✓</span>
        </div>
      )}
    </div>
  );
}