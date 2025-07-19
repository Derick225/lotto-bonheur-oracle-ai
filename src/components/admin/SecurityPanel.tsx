import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Unlock,
  Eye,
  EyeOff,
  Key,
  Smartphone,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Globe
} from 'lucide-react';
import { 
  SecurityService, 
  SecurityEventType, 
  SecurityEvent,
  RiskAssessment
} from '@/services/securityService';

export const SecurityPanel: React.FC = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [filters, setFilters] = useState({
    types: [] as SecurityEventType[],
    riskLevels: [] as string[],
    resolved: undefined as boolean | undefined,
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  });

  useEffect(() => {
    loadSecurityData();
  }, [filters]);

  const loadSecurityData = () => {
    try {
      const events = SecurityService.getSecurityEvents({
        types: filters.types.length > 0 ? filters.types : undefined,
        riskLevels: filters.riskLevels.length > 0 ? filters.riskLevels : undefined,
        resolved: filters.resolved,
        dateRange: filters.dateRange,
        limit: 500
      });
      setSecurityEvents(events);

      const stats = SecurityService.getSecurityStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des données de sécurité:', error);
    }
  };

  const resolveEvent = async (eventId: string) => {
    try {
      SecurityService.resolveSecurityEvent(eventId, 'admin'); // Dans un vrai environnement, utiliser l'ID de l'utilisateur actuel
      loadSecurityData();
    } catch (error) {
      console.error('Erreur lors de la résolution de l\'événement:', error);
    }
  };

  const assessUserRisk = (userId: string) => {
    try {
      const assessment = SecurityService.assessUserRisk(userId, {});
      setRiskAssessment(assessment);
    } catch (error) {
      console.error('Erreur lors de l\'évaluation du risque:', error);
    }
  };

  const getEventIcon = (type: SecurityEventType) => {
    switch (type) {
      case SecurityEventType.LOGIN_FAILURE: return <XCircle className="h-4 w-4 text-red-500" />;
      case SecurityEventType.LOGIN_SUCCESS: return <CheckCircle className="h-4 w-4 text-green-500" />;
      case SecurityEventType.ACCOUNT_LOCKED: return <Lock className="h-4 w-4 text-red-500" />;
      case SecurityEventType.SUSPICIOUS_ACTIVITY: return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case SecurityEventType.PERMISSION_DENIED: return <Ban className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getRiskBadge = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      default: return 'secondary';
    }
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Centre de Sécurité</h2>
          <p className="text-muted-foreground">
            Surveillance et gestion de la sécurité système
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statistics?.unresolvedEvents > 10 ? "destructive" : "default"}>
            {statistics?.unresolvedEvents || 0} événements non résolus
          </Badge>
        </div>
      </div>

      {/* Alertes critiques */}
      {statistics?.eventsByRisk?.critical > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {statistics.eventsByRisk.critical} événement(s) critique(s) nécessitent une attention immédiate
          </AlertDescription>
        </Alert>
      )}

      {/* Métriques de sécurité */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Événements Totaux</p>
                  <p className="text-2xl font-bold">{statistics.totalEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Risque Élevé</p>
                  <p className="text-2xl font-bold">
                    {(statistics.eventsByRisk.high || 0) + (statistics.eventsByRisk.critical || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Ban className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">IPs Bloquées</p>
                  <p className="text-2xl font-bold">{statistics.blockedIPs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <XCircle className="h-4 w-4 text-red-500" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Échecs de Connexion</p>
                  <p className="text-2xl font-bold">
                    {statistics.eventsByType[SecurityEventType.LOGIN_FAILURE] || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onglets principaux */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Événements</TabsTrigger>
          <TabsTrigger value="threats">Menaces</TabsTrigger>
          <TabsTrigger value="users">Analyse Utilisateurs</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {/* Filtres */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Type d'événement</Label>
                  <Select 
                    value={filters.types[0] || 'all'} 
                    onValueChange={(value) => 
                      setFilters({ 
                        ...filters, 
                        types: value === 'all' ? [] : [value as SecurityEventType] 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {Object.values(SecurityEventType).map(type => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Niveau de risque</Label>
                  <Select 
                    value={filters.riskLevels[0] || 'all'} 
                    onValueChange={(value) => 
                      setFilters({ 
                        ...filters, 
                        riskLevels: value === 'all' ? [] : [value] 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les niveaux" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les niveaux</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                      <SelectItem value="high">Élevé</SelectItem>
                      <SelectItem value="medium">Moyen</SelectItem>
                      <SelectItem value="low">Faible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select 
                    value={filters.resolved === undefined ? 'all' : filters.resolved.toString()} 
                    onValueChange={(value) => 
                      setFilters({ 
                        ...filters, 
                        resolved: value === 'all' ? undefined : value === 'true' 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="false">Non résolus</SelectItem>
                      <SelectItem value="true">Résolus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button onClick={loadSecurityData} className="mt-6">
                    Actualiser
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des événements */}
          <Card>
            <CardHeader>
              <CardTitle>Événements de Sécurité ({securityEvents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {securityEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getEventIcon(event.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{event.type.replace('_', ' ')}</p>
                        <Badge variant={getRiskBadge(event.riskLevel)}>
                          {event.riskLevel}
                        </Badge>
                        {event.resolved && <Badge variant="default">Résolu</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {event.username && `Utilisateur: ${event.username} | `}
                        IP: {event.ipAddress} | {event.timestamp.toLocaleString('fr-FR')}
                      </p>
                      {event.details && (
                        <p className="text-xs text-muted-foreground">
                          Détails: {JSON.stringify(event.details)}
                        </p>
                      )}
                      {event.resolvedBy && (
                        <p className="text-xs text-green-600">
                          Résolu par {event.resolvedBy} le {event.resolvedAt?.toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!event.resolved && (
                        <Button
                          onClick={() => resolveEvent(event.id)}
                          variant="outline"
                          size="sm"
                        >
                          Résoudre
                        </Button>
                      )}
                      <Button
                        onClick={() => setSelectedEvent(event)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {securityEvents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun événement trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse des Menaces</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Tendances de sécurité */}
                <div>
                  <h4 className="font-medium mb-3">Tendances des 7 derniers jours</h4>
                  {statistics?.recentTrends && (
                    <div className="space-y-2">
                      {statistics.recentTrends.map((trend: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{trend.date}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm">Total: {trend.total}</span>
                            <span className="text-sm text-red-500">Risque élevé: {trend.high_risk}</span>
                            <span className="text-sm text-orange-500">Échecs: {trend.login_failures}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top des menaces */}
                <div>
                  <h4 className="font-medium mb-3">Types d'événements les plus fréquents</h4>
                  <div className="space-y-2">
                    {statistics && Object.entries(statistics.eventsByType)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .slice(0, 5)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{type.replace('_', ' ')}</span>
                          <Badge variant="outline">{count as number}</Badge>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse de Risque Utilisateur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="userId">ID Utilisateur</Label>
                  <div className="flex gap-2">
                    <Input
                      id="userId"
                      placeholder="Entrez l'ID de l'utilisateur"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          assessUserRisk((e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        const input = document.getElementById('userId') as HTMLInputElement;
                        if (input.value) assessUserRisk(input.value);
                      }}
                    >
                      Analyser
                    </Button>
                  </div>
                </div>

                {riskAssessment && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Score de Risque</p>
                        <p className={`text-2xl font-bold ${getRiskColor(riskAssessment.level)}`}>
                          {riskAssessment.score}/100
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Niveau</p>
                        <Badge variant={getRiskBadge(riskAssessment.level)}>
                          {riskAssessment.level}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Progress value={riskAssessment.score} className="h-3" />
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Facteurs de Risque</h5>
                      <div className="space-y-2">
                        {riskAssessment.factors.map((factor, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{factor.description}</span>
                            <Badge variant="outline">+{factor.weight}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Recommandations</h5>
                      <ul className="space-y-1">
                        {riskAssessment.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            • {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration de Sécurité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Politique de Mot de Passe</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Longueur minimale</Label>
                      <Input type="number" defaultValue="8" />
                    </div>
                    <div>
                      <Label>Âge maximum (jours)</Label>
                      <Input type="number" defaultValue="90" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Verrouillage de Compte</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Tentatives max</Label>
                      <Input type="number" defaultValue="5" />
                    </div>
                    <div>
                      <Label>Durée de verrouillage (min)</Label>
                      <Input type="number" defaultValue="30" />
                    </div>
                    <div>
                      <Label>Réinitialisation après (h)</Label>
                      <Input type="number" defaultValue="24" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Surveillance</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Détection de force brute</span>
                      <Badge variant="default">Activé</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Détection de connexions anormales</span>
                      <Badge variant="default">Activé</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Surveillance des privilèges</span>
                      <Badge variant="default">Activé</Badge>
                    </div>
                  </div>
                </div>

                <Button>Sauvegarder la Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
