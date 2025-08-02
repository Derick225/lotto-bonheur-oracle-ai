import { useEffect, useState } from 'react';
import { SecureAuthService } from '@/services/secureAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

interface SecurityMiddlewareProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredPermissions?: string[];
}

/**
 * Middleware de sécurité pour protéger les composants
 */
export const SecurityMiddleware: React.FC<SecurityMiddlewareProps> = ({
  children,
  requireAuth = false,
  requiredPermissions = []
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialiser le service d'authentification
        await SecureAuthService.initialize();

        // Vérifier l'authentification si requise
        if (requireAuth) {
          const authenticated = SecureAuthService.isAuthenticated();
          setIsAuthenticated(authenticated);

          if (!authenticated) {
            setError('Authentification requise');
            setIsLoading(false);
            return;
          }

          // Vérifier les permissions si spécifiées
          if (requiredPermissions.length > 0) {
            const hasAllPermissions = requiredPermissions.every(permission =>
              SecureAuthService.hasPermission(permission as any)
            );
            setHasPermissions(hasAllPermissions);

            if (!hasAllPermissions) {
              setError('Permissions insuffisantes');
              setIsLoading(false);
              return;
            }
          } else {
            setHasPermissions(true);
          }
        } else {
          setIsAuthenticated(true);
          setHasPermissions(true);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Erreur de vérification de sécurité:', err);
        setError('Erreur de vérification de sécurité');
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [requireAuth, requiredPermissions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Vérification de sécurité en cours...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Accès refusé
            </CardTitle>
            <CardDescription>
              Vous n'avez pas les autorisations nécessaires pour accéder à cette page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requireAuth && (!isAuthenticated || !hasPermissions)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Accès protégé
            </CardTitle>
            <CardDescription>
              Cette page nécessite une authentification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Veuillez vous connecter pour accéder à cette fonctionnalité.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default SecurityMiddleware;