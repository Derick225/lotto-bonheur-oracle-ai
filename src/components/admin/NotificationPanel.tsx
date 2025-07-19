import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Send,
  Edit,
  Trash2,
  Plus,
  Settings,
  Users,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { 
  NotificationService, 
  NotificationType, 
  NotificationChannel, 
  NotificationStatus,
  Notification,
  UserSubscription
} from '@/services/notificationService';
import { SystemConfigService, NotificationTemplate } from '@/services/systemConfig';

export const NotificationPanel: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const notificationList = NotificationService.getAllNotifications({ limit: 100 });
      setNotifications(notificationList);

      const templateList = SystemConfigService.getNotificationTemplates();
      setTemplates(templateList);

      const stats = NotificationService.getNotificationStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  const sendNotification = async (data: {
    type: NotificationType;
    title: string;
    message: string;
    channels: NotificationChannel[];
    recipients: string[];
    templateId?: string;
  }) => {
    try {
      await NotificationService.sendNotification({
        type: data.type,
        title: data.title,
        message: data.message,
        recipients: data.recipients,
        channels: data.channels,
        templateId: data.templateId
      });
      loadData();
      setIsSendDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    }
  };

  const saveTemplate = (template: Partial<NotificationTemplate>) => {
    try {
      SystemConfigService.saveNotificationTemplate(template);
      loadData();
      setIsTemplateDialogOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du template:', error);
    }
  };

  const deleteTemplate = (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;
    
    try {
      SystemConfigService.deleteNotificationTemplate(templateId);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const getStatusIcon = (status: NotificationStatus) => {
    switch (status) {
      case NotificationStatus.DELIVERED: return <CheckCircle className="h-4 w-4 text-green-500" />;
      case NotificationStatus.FAILED: return <XCircle className="h-4 w-4 text-red-500" />;
      case NotificationStatus.SENT: return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case NotificationStatus.PENDING: return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: NotificationStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case NotificationStatus.DELIVERED: return 'default';
      case NotificationStatus.FAILED: return 'destructive';
      case NotificationStatus.SENT: return 'default';
      case NotificationStatus.PENDING: return 'outline';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.CRITICAL: return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case NotificationType.ERROR: return <XCircle className="h-4 w-4 text-red-500" />;
      case NotificationType.WARNING: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case NotificationType.SUCCESS: return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case NotificationChannel.EMAIL: return <Mail className="h-4 w-4" />;
      case NotificationChannel.SMS: return <MessageSquare className="h-4 w-4" />;
      case NotificationChannel.PUSH: return <Smartphone className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Notifications</h2>
          <p className="text-muted-foreground">
            Configuration et envoi des notifications système
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Envoyer Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Envoyer une Notification</DialogTitle>
              </DialogHeader>
              <SendNotificationForm onSubmit={sendNotification} templates={templates} />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouveau Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedTemplate ? 'Modifier le Template' : 'Nouveau Template'}
                </DialogTitle>
              </DialogHeader>
              <TemplateForm 
                template={selectedTemplate} 
                onSubmit={saveTemplate} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistiques */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Total Notifications</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Taux de Livraison</p>
                  <p className="text-2xl font-bold">{(statistics.deliveryRate * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Temps Moyen</p>
                  <p className="text-2xl font-bold">{(statistics.averageDeliveryTime / 1000).toFixed(1)}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <XCircle className="h-4 w-4 text-red-500" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Taux d'Échec</p>
                  <p className="text-2xl font-bold">{(statistics.failureRate * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onglets principaux */}
      <Tabs defaultValue="notifications" className="w-full">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Notifications ({notifications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(notification.status)}
                      {getTypeIcon(notification.type)}
                      {getChannelIcon(notification.channel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{notification.title}</p>
                        <Badge variant={getStatusBadge(notification.status)}>
                          {notification.status}
                        </Badge>
                        <Badge variant="outline">
                          {notification.type}
                        </Badge>
                        <Badge variant="secondary">
                          {notification.channel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {notification.message}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <span>Destinataires: {notification.recipients.length} | </span>
                        <span>Créé: {notification.createdAt.toLocaleString('fr-FR')} | </span>
                        {notification.sentAt && (
                          <span>Envoyé: {notification.sentAt.toLocaleString('fr-FR')} | </span>
                        )}
                        <span>Priorité: {notification.priority}</span>
                      </div>
                      {notification.error && (
                        <p className="text-xs text-red-600 mt-1">
                          Erreur: {notification.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune notification trouvée
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Notification ({templates.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{template.name}</p>
                        <Badge variant="outline">{template.type}</Badge>
                        {!template.isActive && <Badge variant="secondary">Inactif</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {template.subject && `Sujet: ${template.subject}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Variables: {template.variables.join(', ')} | 
                        Modifié: {template.updatedAt.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          setSelectedTemplate(template);
                          setIsTemplateDialogOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => deleteTemplate(template.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun template trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Paramètres de Notification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Configuration Email</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtpServer">Serveur SMTP</Label>
                      <Input id="smtpServer" placeholder="smtp.example.com" />
                    </div>
                    <div>
                      <Label htmlFor="smtpPort">Port</Label>
                      <Input id="smtpPort" type="number" placeholder="587" />
                    </div>
                    <div>
                      <Label htmlFor="smtpUsername">Nom d'utilisateur</Label>
                      <Input id="smtpUsername" placeholder="user@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="smtpPassword">Mot de passe</Label>
                      <Input id="smtpPassword" type="password" placeholder="••••••••" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Configuration SMS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smsProvider">Fournisseur</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un fournisseur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="twilio">Twilio</SelectItem>
                          <SelectItem value="aws-sns">AWS SNS</SelectItem>
                          <SelectItem value="nexmo">Nexmo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="smsApiKey">Clé API</Label>
                      <Input id="smsApiKey" placeholder="Clé API du fournisseur" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Paramètres Généraux</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="enableNotifications" />
                      <Label htmlFor="enableNotifications">Activer les notifications</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="enableRetries" />
                      <Label htmlFor="enableRetries">Réessayer en cas d'échec</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="enableBatching" />
                      <Label htmlFor="enableBatching">Regrouper les notifications</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Composant de formulaire d'envoi de notification
interface SendNotificationFormProps {
  onSubmit: (data: any) => void;
  templates: NotificationTemplate[];
}

const SendNotificationForm: React.FC<SendNotificationFormProps> = ({ onSubmit, templates }) => {
  const [formData, setFormData] = useState({
    type: NotificationType.INFO,
    title: '',
    message: '',
    channels: [NotificationChannel.IN_APP],
    recipients: ['all'],
    templateId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as NotificationType })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NotificationType.INFO}>Information</SelectItem>
              <SelectItem value={NotificationType.WARNING}>Avertissement</SelectItem>
              <SelectItem value={NotificationType.ERROR}>Erreur</SelectItem>
              <SelectItem value={NotificationType.SUCCESS}>Succès</SelectItem>
              <SelectItem value={NotificationType.CRITICAL}>Critique</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="template">Template (optionnel)</Label>
          <Select value={formData.templateId} onValueChange={(value) => setFormData({ ...formData, templateId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Aucun template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Aucun template</SelectItem>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={4}
          required
        />
      </div>
      
      <Button type="submit" className="w-full">
        Envoyer Notification
      </Button>
    </form>
  );
};

// Composant de formulaire de template
interface TemplateFormProps {
  template?: NotificationTemplate | null;
  onSubmit: (template: Partial<NotificationTemplate>) => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ template, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'email' as const,
    subject: template?.subject || '',
    body: template?.body || '',
    variables: template?.variables?.join(', ') || '',
    isActive: template?.isActive !== undefined ? template.isActive : true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...template,
      ...formData,
      variables: formData.variables.split(',').map(v => v.trim()).filter(v => v)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="push">Push</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {formData.type === 'email' && (
        <div>
          <Label htmlFor="subject">Sujet</Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          />
        </div>
      )}
      
      <div>
        <Label htmlFor="body">Corps du message</Label>
        <Textarea
          id="body"
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          rows={6}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="variables">Variables (séparées par des virgules)</Label>
        <Input
          id="variables"
          value={formData.variables}
          onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
          placeholder="appName, username, timestamp"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label htmlFor="isActive">Template actif</Label>
      </div>
      
      <Button type="submit" className="w-full">
        {template ? 'Mettre à jour' : 'Créer'} Template
      </Button>
    </form>
  );
};
