import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  Activity,
  Clock,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Lock,
  Unlock
} from 'lucide-react';
import { UserManagementService, User, UserRole, Permission, UserActivity } from '@/services/userManagement';

export const UserManagementPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    loadActivities();
  }, []);

  const loadUsers = () => {
    try {
      const userList = UserManagementService.getUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const loadActivities = () => {
    try {
      const activityList = UserManagementService.getUserActivities(undefined, 50);
      setActivities(activityList);
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.isActive) ||
                         (statusFilter === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateUser = async (userData: Partial<User>) => {
    setLoading(true);
    try {
      await UserManagementService.createUser(userData);
      loadUsers();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    setLoading(true);
    try {
      await UserManagementService.updateUser(userId, updates);
      loadUsers();
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    
    setLoading(true);
    try {
      await UserManagementService.deleteUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case UserRole.ADMIN: return 'destructive';
      case UserRole.ANALYST: return 'default';
      case UserRole.USER: return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN: return 'Administrateur';
      case UserRole.ANALYST: return 'Analyste';
      case UserRole.USER: return 'Utilisateur';
      default: return role;
    }
  };

  const formatLastLogin = (lastLogin?: Date): string => {
    if (!lastLogin) return 'Jamais';
    const now = new Date();
    const diff = now.getTime() - lastLogin.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Aujourd\'hui';
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return lastLogin.toLocaleDateString('fr-FR');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Utilisateurs</h2>
          <p className="text-muted-foreground">
            Gérez les utilisateurs, rôles et permissions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Nouvel Utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un Utilisateur</DialogTitle>
            </DialogHeader>
            <UserForm onSubmit={handleCreateUser} loading={loading} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Total Utilisateurs</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Administrateurs</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === UserRole.ADMIN).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Utilisateurs Actifs</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Connexions Récentes</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.lastLogin && 
                    new Date().getTime() - u.lastLogin.getTime() < 24 * 60 * 60 * 1000
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets principaux */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="activities">Activités</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Filtres et recherche */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom, email ou nom d'utilisateur..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrer par rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Administrateur</SelectItem>
                    <SelectItem value={UserRole.ANALYST}>Analyste</SelectItem>
                    <SelectItem value={UserRole.USER}>Utilisateur</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="inactive">Inactifs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Liste des utilisateurs */}
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                          {!user.isActive && (
                            <Badge variant="outline">Inactif</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Dernière connexion: {formatLastLogin(user.lastLogin)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.role === UserRole.ADMIN && 
                          users.filter(u => u.role === UserRole.ADMIN && u.isActive).length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activités Récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{activity.action}</span>
                        <Badge variant={activity.success ? "default" : "destructive"}>
                          {activity.success ? "Succès" : "Échec"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ressource: {activity.resource}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        IP: {activity.ipAddress} | {activity.timestamp.toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune activité récente
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sessions Actives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {UserManagementService.getActiveSessions().map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Session {session.id.slice(-8)}</p>
                      <p className="text-sm text-muted-foreground">
                        IP: {session.ipAddress} | Appareil: {session.deviceInfo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Créée: {session.createdAt.toLocaleString('fr-FR')} | 
                        Dernière activité: {session.lastActivity.toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'Utilisateur</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <UserForm 
              user={selectedUser}
              onSubmit={(updates) => handleUpdateUser(selectedUser.id, updates)}
              loading={loading}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Composant de formulaire utilisateur
interface UserFormProps {
  user?: User;
  onSubmit: (userData: Partial<User>) => void;
  loading: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    role: user?.role || UserRole.USER,
    isActive: user?.isActive !== undefined ? user.isActive : true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="username">Nom d'utilisateur</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="role">Rôle</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UserRole.USER}>Utilisateur</SelectItem>
            <SelectItem value={UserRole.ANALYST}>Analyste</SelectItem>
            <SelectItem value={UserRole.ADMIN}>Administrateur</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
        />
        <Label htmlFor="isActive">Compte actif</Label>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Enregistrement...' : user ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};
