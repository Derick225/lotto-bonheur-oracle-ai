import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Upload, 
  Download,
  Shield,
  Database,
  Bell,
  Zap,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { SystemConfigService, AppConfig, NotificationTemplate } from '@/services/systemConfig';

export const SystemConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [changeHistory, setChangeHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfiguration();
    loadTemplates();
    loadChangeHistory();
  }, []);

  const loadConfiguration = () => {
    try {
      const currentConfig = SystemConfigService.getConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
  };

  const loadTemplates = () => {
    try {
      const templateList = SystemConfigService.getNotificationTemplates();
      setTemplates(templateList);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
    }
  };

  const loadChangeHistory = () => {
    try {
      const history = SystemConfigService.getChangeHistory(20);
      setChangeHistory(history);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };

  const handleConfigChange = (section: keyof AppConfig, key: string, value: any) => {
    if (!config) return;
    
    const newConfig = {
      ...config,
      [section]: {
        ...config[section],
        [key]: value
      }
    };
    
    setConfig(newConfig);
    setHasChanges(true);
  };

  const handleNestedConfigChange = (section: keyof AppConfig, parentKey: string, key: string, value: any) => {
    if (!config) return;
    
    const newConfig = {
      ...config,
      [section]: {
        ...config[section],
        [parentKey]: {
          ...(config[section] as any)[parentKey],
          [key]: value
        }
      }
    };
    
    setConfig(newConfig);
    setHasChanges(true);
  };

  const saveConfiguration = async () => {
    if (!config) return;
    
    setLoading(true);
    try {
      // Sauvegarder chaque section modifiée
      await SystemConfigService.updateConfigSection('general', config.general, 'Mise à jour via interface admin');
      await SystemConfigService.updateConfigSection('security', config.security, 'Mise à jour via interface admin');
      await SystemConfigService.updateConfigSection('predictions', config.predictions, 'Mise à jour via interface admin');
      await SystemConfigService.updateConfigSection('monitoring', config.monitoring, 'Mise à jour via interface admin');
      await SystemConfigService.updateConfigSection('backup', config.backup, 'Mise à jour via interface admin');
      await SystemConfigService.updateConfigSection('performance', config.performance, 'Mise à jour via interface admin');
      
      setHasChanges(false);
      loadChangeHistory();
      
      console.log('✅ Configuration sauvegardée avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser la configuration par défaut ?')) return;
    
    setLoading(true);
    try {
      await SystemConfigService.resetToDefaults();
      loadConfiguration();
      setHasChanges(false);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportConfiguration = () => {
    try {
      const blob = SystemConfigService.exportConfig();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `config_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  };

  const importConfiguration = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const configData = JSON.parse(text);
      await SystemConfigService.importConfig(configData);
      loadConfiguration();
      loadTemplates();
      setHasChanges(false);
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
    }
  };

  if (!config) {
    return <div>Chargement de la configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuration Système</h2>
          <p className="text-muted-foreground">
            Paramètres globaux de l'application
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Alert className="w-auto">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Modifications non sauvegardées
              </AlertDescription>
            </Alert>
          )}
          <Button
            onClick={saveConfiguration}
            disabled={!hasChanges || loading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Sauvegarder
          </Button>
          <Button
            onClick={resetToDefaults}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
          <Button
            onClick={exportConfiguration}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <div>
            <input
              type="file"
              accept=".json"
              onChange={importConfiguration}
              style={{ display: 'none' }}
              id="import-config"
            />
            <Button
              onClick={() => document.getElementById('import-config')?.click()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Importer
            </Button>
          </div>
        </div>
      </div>

      {/* Onglets de configuration */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
          <TabsTrigger value="predictions">Prédictions</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="backup">Sauvegarde</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Paramètres Généraux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="appName">Nom de l'application</Label>
                  <Input
                    id="appName"
                    value={config.general.appName}
                    onChange={(e) => handleConfigChange('general', 'appName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={config.general.version}
                    onChange={(e) => handleConfigChange('general', 'version', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="environment">Environnement</Label>
                  <Select 
                    value={config.general.environment} 
                    onValueChange={(value) => handleConfigChange('general', 'environment', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Développement</SelectItem>
                      <SelectItem value="staging">Test</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="maxUsers">Nombre max d'utilisateurs</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={config.general.maxUsers}
                    onChange={(e) => handleConfigChange('general', 'maxUsers', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="sessionTimeout">Timeout de session (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={config.general.sessionTimeout}
                    onChange={(e) => handleConfigChange('general', 'sessionTimeout', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Input
                    id="timezone"
                    value={config.general.timezone}
                    onChange={(e) => handleConfigChange('general', 'timezone', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="maintenanceMode"
                  checked={config.general.maintenanceMode}
                  onCheckedChange={(checked) => handleConfigChange('general', 'maintenanceMode', checked)}
                />
                <Label htmlFor="maintenanceMode">Mode maintenance</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Paramètres de Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Politique de mot de passe */}
              <div>
                <h4 className="font-medium mb-3">Politique de mot de passe</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minLength">Longueur minimale</Label>
                    <Input
                      id="minLength"
                      type="number"
                      value={config.security.passwordPolicy.minLength}
                      onChange={(e) => handleNestedConfigChange('security', 'passwordPolicy', 'minLength', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAge">Âge maximum (jours)</Label>
                    <Input
                      id="maxAge"
                      type="number"
                      value={config.security.passwordPolicy.maxAge}
                      onChange={(e) => handleNestedConfigChange('security', 'passwordPolicy', 'maxAge', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requireUppercase"
                      checked={config.security.passwordPolicy.requireUppercase}
                      onCheckedChange={(checked) => handleNestedConfigChange('security', 'passwordPolicy', 'requireUppercase', checked)}
                    />
                    <Label htmlFor="requireUppercase">Majuscules</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requireLowercase"
                      checked={config.security.passwordPolicy.requireLowercase}
                      onCheckedChange={(checked) => handleNestedConfigChange('security', 'passwordPolicy', 'requireLowercase', checked)}
                    />
                    <Label htmlFor="requireLowercase">Minuscules</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requireNumbers"
                      checked={config.security.passwordPolicy.requireNumbers}
                      onCheckedChange={(checked) => handleNestedConfigChange('security', 'passwordPolicy', 'requireNumbers', checked)}
                    />
                    <Label htmlFor="requireNumbers">Chiffres</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requireSpecialChars"
                      checked={config.security.passwordPolicy.requireSpecialChars}
                      onCheckedChange={(checked) => handleNestedConfigChange('security', 'passwordPolicy', 'requireSpecialChars', checked)}
                    />
                    <Label htmlFor="requireSpecialChars">Caractères spéciaux</Label>
                  </div>
                </div>
              </div>

              {/* Authentification */}
              <div>
                <h4 className="font-medium mb-3">Authentification</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="maxLoginAttempts">Tentatives max</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={config.security.maxLoginAttempts}
                      onChange={(e) => handleConfigChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lockoutDuration">Durée de verrouillage (min)</Label>
                    <Input
                      id="lockoutDuration"
                      type="number"
                      value={config.security.lockoutDuration}
                      onChange={(e) => handleConfigChange('security', 'lockoutDuration', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <Switch
                      id="twoFactorRequired"
                      checked={config.security.twoFactorRequired}
                      onCheckedChange={(checked) => handleConfigChange('security', 'twoFactorRequired', checked)}
                    />
                    <Label htmlFor="twoFactorRequired">2FA obligatoire</Label>
                  </div>
                </div>
              </div>

              {/* Limitation de taux */}
              <div>
                <h4 className="font-medium mb-3">Limitation de taux</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rateLimitingEnabled"
                      checked={config.security.rateLimiting.enabled}
                      onCheckedChange={(checked) => handleNestedConfigChange('security', 'rateLimiting', 'enabled', checked)}
                    />
                    <Label htmlFor="rateLimitingEnabled">Activé</Label>
                  </div>
                  <div>
                    <Label htmlFor="requestsPerMinute">Requêtes/minute</Label>
                    <Input
                      id="requestsPerMinute"
                      type="number"
                      value={config.security.rateLimiting.requestsPerMinute}
                      onChange={(e) => handleNestedConfigChange('security', 'rateLimiting', 'requestsPerMinute', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="burstLimit">Limite de rafale</Label>
                    <Input
                      id="burstLimit"
                      type="number"
                      value={config.security.rateLimiting.burstLimit}
                      onChange={(e) => handleNestedConfigChange('security', 'rateLimiting', 'burstLimit', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Configuration des Prédictions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Algorithmes */}
              <div>
                <h4 className="font-medium mb-3">Algorithmes</h4>
                <div className="space-y-4">
                  {Object.entries(config.predictions.algorithms).map(([key, algorithm]) => (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium capitalize">{key}</h5>
                        <Switch
                          checked={algorithm.enabled}
                          onCheckedChange={(checked) => 
                            handleNestedConfigChange('predictions', 'algorithms', key, { ...algorithm, enabled: checked })
                          }
                        />
                      </div>
                      {algorithm.enabled && (
                        <div>
                          <Label htmlFor={`${key}-weight`}>Poids</Label>
                          <Input
                            id={`${key}-weight`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={algorithm.weight}
                            onChange={(e) => 
                              handleNestedConfigChange('predictions', 'algorithms', key, { ...algorithm, weight: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rétention des données */}
              <div>
                <h4 className="font-medium mb-3">Rétention des données</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxHistoryDays">Historique max (jours)</Label>
                    <Input
                      id="maxHistoryDays"
                      type="number"
                      value={config.predictions.dataRetention.maxHistoryDays}
                      onChange={(e) => handleNestedConfigChange('predictions', 'dataRetention', 'maxHistoryDays', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cleanupFrequency">Fréquence de nettoyage (heures)</Label>
                    <Input
                      id="cleanupFrequency"
                      type="number"
                      value={config.predictions.dataRetention.cleanupFrequency}
                      onChange={(e) => handleNestedConfigChange('predictions', 'dataRetention', 'cleanupFrequency', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div>
                <h4 className="font-medium mb-3">Performance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="maxPredictionTime">Temps max (secondes)</Label>
                    <Input
                      id="maxPredictionTime"
                      type="number"
                      value={config.predictions.performance.maxPredictionTime}
                      onChange={(e) => handleNestedConfigChange('predictions', 'performance', 'maxPredictionTime', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cacheTTL">TTL du cache (minutes)</Label>
                    <Input
                      id="cacheTTL"
                      type="number"
                      value={config.predictions.performance.cacheTTL}
                      onChange={(e) => handleNestedConfigChange('predictions', 'performance', 'cacheTTL', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <Switch
                      id="cacheEnabled"
                      checked={config.predictions.performance.cacheEnabled}
                      onCheckedChange={(checked) => handleNestedConfigChange('predictions', 'performance', 'cacheEnabled', checked)}
                    />
                    <Label htmlFor="cacheEnabled">Cache activé</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Autres onglets similaires... */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configuration du Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configuration des alertes et notifications...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Configuration des Sauvegardes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configuration des sauvegardes automatiques...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configuration de Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configuration des paramètres de performance...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Historique des changements */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Modifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {changeHistory.map((change) => (
              <div key={change.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{change.section}.{change.key}</p>
                  <p className="text-sm text-muted-foreground">
                    Par {change.username} le {new Date(change.timestamp).toLocaleString('fr-FR')}
                  </p>
                  {change.reason && (
                    <p className="text-xs text-muted-foreground">Raison: {change.reason}</p>
                  )}
                </div>
                <Badge variant="outline">Modifié</Badge>
              </div>
            ))}
            {changeHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Aucune modification récente
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
