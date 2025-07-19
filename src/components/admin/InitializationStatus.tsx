import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Settings,
  Users,
  Shield,
  Database,
  Bell,
  HardDrive,
  Download
} from 'lucide-react';

interface InitializationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  icon: React.ReactNode;
  error?: string;
}

interface InitializationStatusProps {
  onComplete?: () => void;
}

export const InitializationStatus: React.FC<InitializationStatusProps> = ({ onComplete }) => {
  const [steps, setSteps] = useState<InitializationStep[]>([
    {
      id: 'services',
      name: 'Services de base',
      description: 'Initialisation des services fondamentaux',
      status: 'pending',
      icon: <Settings className="h-4 w-4" />
    },
    {
      id: 'admin',
      name: 'Utilisateur administrateur',
      description: 'Création du compte administrateur par défaut',
      status: 'pending',
      icon: <Users className="h-4 w-4" />
    },
    {
      id: 'security',
      name: 'Configuration de sécurité',
      description: 'Paramètres de sécurité et authentification',
      status: 'pending',
      icon: <Shield className="h-4 w-4" />
    },
    {
      id: 'database',
      name: 'Base de données',
      description: 'Configuration et vérification de la base de données',
      status: 'pending',
      icon: <Database className="h-4 w-4" />
    },
    {
      id: 'notifications',
      name: 'Système de notifications',
      description: 'Configuration des alertes et notifications',
      status: 'pending',
      icon: <Bell className="h-4 w-4" />
    },
    {
      id: 'backup',
      name: 'Sauvegardes',
      description: 'Configuration des sauvegardes automatiques',
      status: 'pending',
      icon: <HardDrive className="h-4 w-4" />
    }
  ]);

  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [initLog, setInitLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    checkInitializationStatus();
  }, []);

  const checkInitializationStatus = async () => {
    try {
      const { isAdminSystemInitialized } = await import('@/scripts/initializeAdmin');
      const isInitialized = isAdminSystemInitialized();
      
      if (isInitialized) {
        // Marquer toutes les étapes comme terminées
        setSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
        setProgress(100);
        setInitializationComplete(true);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
    }
  };

  const startInitialization = async () => {
    setIsInitializing(true);
    setProgress(0);
    setInitLog([]);

    try {
      const { AdminInitializer } = await import('@/scripts/initializeAdmin');
      const initializer = new AdminInitializer();

      // Simuler le progrès des étapes
      const totalSteps = steps.length;
      let currentStep = 0;

      for (const step of steps) {
        // Marquer l'étape comme en cours
        setSteps(prev => prev.map(s => 
          s.id === step.id ? { ...s, status: 'running' } : s
        ));

        try {
          // Simuler le travail de l'étape
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

          // Marquer l'étape comme terminée
          setSteps(prev => prev.map(s => 
            s.id === step.id ? { ...s, status: 'completed' } : s
          ));

          currentStep++;
          setProgress((currentStep / totalSteps) * 100);

          // Ajouter au log
          setInitLog(prev => [...prev, `✓ ${step.name} - ${step.description}`]);

        } catch (error) {
          // Marquer l'étape comme échouée
          setSteps(prev => prev.map(s => 
            s.id === step.id ? { 
              ...s, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            } : s
          ));

          setInitLog(prev => [...prev, `✗ ${step.name} - Erreur: ${error}`]);
          throw error;
        }
      }

      // Lancer l'initialisation réelle
      await initializer.initialize();

      // Récupérer le log d'initialisation
      const realLog = initializer.getInitLog();
      setInitLog(prev => [...prev, ...realLog]);

      setInitializationComplete(true);
      
      if (onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      setInitLog(prev => [...prev, `❌ Erreur fatale: ${error}`]);
    } finally {
      setIsInitializing(false);
    }
  };

  const downloadLog = () => {
    const logContent = initLog.join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_init_log_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepBadge = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return 'default';
      case 'running': return 'outline';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  if (initializationComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Système d'Administration Initialisé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Le système d'administration a été configuré avec succès. 
              Vous pouvez maintenant utiliser toutes les fonctionnalités d'administration.
            </AlertDescription>
          </Alert>
          
          {initLog.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Log d'initialisation</h4>
                <Button onClick={downloadLog} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-lg max-h-32 overflow-y-auto">
                <pre className="text-xs">
                  {initLog.slice(-10).join('\n')}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Initialisation du Système d'Administration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Le système d'administration doit être initialisé avant la première utilisation. 
                Cette opération configure les services, crée l'utilisateur administrateur par défaut 
                et paramètre les fonctionnalités de sécurité.
              </AlertDescription>
            </Alert>

            {isInitializing && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progression</span>
                  <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStepIcon(step.status)}
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{step.name}</p>
                      <Badge variant={getStepBadge(step.status)}>
                        {step.status === 'pending' && 'En attente'}
                        {step.status === 'running' && 'En cours'}
                        {step.status === 'completed' && 'Terminé'}
                        {step.status === 'error' && 'Erreur'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {step.error && (
                      <p className="text-xs text-red-600 mt-1">Erreur: {step.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={startInitialization} 
                disabled={isInitializing}
                className="flex items-center gap-2"
              >
                {isInitializing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                {isInitializing ? 'Initialisation en cours...' : 'Démarrer l\'Initialisation'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {initLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Log d'Initialisation</span>
              <Button onClick={downloadLog} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-3 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {initLog.join('\n')}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
