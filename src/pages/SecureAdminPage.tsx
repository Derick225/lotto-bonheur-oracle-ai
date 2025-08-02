import React, { useState, useEffect } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { SecureAdminLogin } from '@/components/admin/SecureAdminLogin';
import { SecurityMiddleware } from '@/components/SecurityMiddleware';
import { SecureAuthService } from '@/services/secureAuth';
import { Permission } from '@/services/userManagement';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SecureAdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await SecureAuthService.initialize();
        const authenticated = SecureAuthService.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Erreur d\'initialisation auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await SecureAuthService.logout();
      setIsAuthenticated(false);
      toast({
        title: 'Déconnexion réussie',
        description: 'Vous avez été déconnecté en toute sécurité',
      });
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      toast({
        title: 'Erreur de déconnexion',
        description: 'Une erreur s\'est produite lors de la déconnexion',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Initialisation sécurisée...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SecureAdminLogin onSuccess={handleLoginSuccess} />;
  }

  return (
    <SecurityMiddleware 
      requireAuth={true} 
      requiredPermissions={[Permission.SYSTEM_CONFIG]}
    >
      <div className="min-h-screen bg-background">
        {/* Header avec déconnexion */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-semibold">Administration Sécurisée</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {SecureAuthService.getCurrentUser()?.email}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AdminDashboard />
      </div>
    </SecurityMiddleware>
  );
};

export default SecureAdminPage;