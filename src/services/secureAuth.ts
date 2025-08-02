import { supabase } from '@/integrations/supabase/client';
import { UserRole, Permission } from './userManagement';

export interface SecureUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  permissions: Permission[];
}

export interface AuthSession {
  user: SecureUser;
  token: string;
  expiresAt: Date;
}

/**
 * Service d'authentification sécurisé utilisant Supabase
 */
export class SecureAuthService {
  private static currentSession: AuthSession | null = null;

  /**
   * Définition des permissions par rôle
   */
  private static rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
      // Toutes les permissions
      ...Object.values(Permission)
    ],
    [UserRole.ANALYST]: [
      Permission.VIEW_DATA,
      Permission.EDIT_DATA,
      Permission.EXPORT_DATA,
      Permission.VIEW_PREDICTIONS,
      Permission.CREATE_PREDICTIONS,
      Permission.MANAGE_MODELS,
      Permission.VIEW_MONITORING,
      Permission.VIEW_LOGS
    ],
    [UserRole.USER]: [
      Permission.VIEW_DATA,
      Permission.VIEW_PREDICTIONS,
      Permission.VIEW_MONITORING
    ]
  };

  /**
   * Initialise le service et vérifie la session existante
   */
  static async initialize(): Promise<void> {
    const savedToken = localStorage.getItem('adminSession');
    if (savedToken) {
      const isValid = await this.validateSession(savedToken);
      if (!isValid) {
        localStorage.removeItem('adminSession');
        localStorage.removeItem('currentUser');
      }
    }
  }

  /**
   * Authentifie un utilisateur avec email/mot de passe
   */
  static async login(email: string, password: string): Promise<AuthSession | null> {
    try {
      // Obtenir l'adresse IP et user agent
      const ipAddress = await this.getClientIP();
      const userAgent = navigator.userAgent;

      // Utiliser la fonction d'authentification sécurisée
      const { data: authResult, error: authError } = await supabase.rpc('authenticate_admin', {
        p_email: email,
        p_password: password
      });

      if (authError) {
        console.error('Erreur d\'authentification:', authError);
        throw new Error('Erreur de connexion à la base de données');
      }

      const result = authResult as any;
      if (!result || !result.success) {
        console.warn('Échec de l\'authentification:', result?.error);
        return null;
      }

      const userData = result.user;

      // Créer une session sécurisée
      const { data: sessionToken, error: sessionError } = await supabase.rpc('create_admin_session', {
        p_user_id: userData.id,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

      if (sessionError || !sessionToken) {
        console.error('Erreur de création de session:', sessionError);
        throw new Error('Impossible de créer la session');
      }

      // Créer l'objet utilisateur sécurisé
      const user: SecureUser = {
        id: userData.id,
        email: userData.email,
        role: userData.role as UserRole,
        isActive: true,
        lastLogin: new Date(),
        permissions: this.rolePermissions[userData.role as UserRole] || []
      };

      // Créer la session
      const session: AuthSession = {
        user,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      };

      this.currentSession = session;

      // Sauvegarder dans le localStorage
      localStorage.setItem('adminSession', sessionToken);
      localStorage.setItem('currentUser', JSON.stringify(user));

      return session;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return null;
    }
  }

  /**
   * Valide une session existante
   */
  static async validateSession(token: string): Promise<boolean> {
    try {
      const { data: sessionData, error } = await supabase.rpc('validate_admin_session', {
        session_token: token
      });

      const result = sessionData as any;
      if (error || !result || !result.success) {
        return false;
      }

      const userData = result.user;
      const user: SecureUser = {
        id: userData.id,
        email: userData.email,
        role: userData.role as UserRole,
        isActive: true,
        lastLogin: new Date(),
        permissions: this.rolePermissions[userData.role as UserRole] || []
      };

      this.currentSession = {
        user,
        token,
        expiresAt: new Date(result.session.expires_at)
      };

      return true;
    } catch (error) {
      console.error('Erreur de validation de session:', error);
      return false;
    }
  }

  /**
   * Déconnecte l'utilisateur
   */
  static async logout(): Promise<void> {
    if (this.currentSession) {
      try {
        await supabase.rpc('invalidate_admin_session', {
          session_token: this.currentSession.token
        });
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    }

    this.currentSession = null;
    localStorage.removeItem('adminSession');
    localStorage.removeItem('currentUser');
  }

  /**
   * Obtient l'utilisateur actuel
   */
  static getCurrentUser(): SecureUser | null {
    return this.currentSession?.user || null;
  }

  /**
   * Obtient la session actuelle
   */
  static getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  /**
   * Vérifie si l'utilisateur a une permission
   */
  static hasPermission(permission: Permission): boolean {
    const user = this.getCurrentUser();
    return user?.permissions.includes(permission) || false;
  }

  /**
   * Vérifie si l'utilisateur est administrateur
   */
  static isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === UserRole.ADMIN || false;
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  static isAuthenticated(): boolean {
    return this.currentSession !== null && this.currentSession.expiresAt > new Date();
  }

  /**
   * Change le mot de passe de l'utilisateur actuel
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('Aucun utilisateur connecté');
    }

    try {
      // Valider d'abord avec l'ancien mot de passe
      const { data: authResult, error: authError } = await supabase.rpc('authenticate_admin', {
        p_email: user.email,
        p_password: currentPassword
      });

      const result = authResult as any;
      if (authError || !result?.success) {
        throw new Error('Mot de passe actuel incorrect');
      }

      // Hasher le nouveau mot de passe
      const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
        password: newPassword
      });

      if (hashError || !hashedPassword) {
        throw new Error('Impossible de sécuriser le nouveau mot de passe');
      }

      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password_hash: hashedPassword })
        .eq('id', user.id);

      if (updateError) {
        throw new Error('Impossible de mettre à jour le mot de passe');
      }

      return true;
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      throw error;
    }
  }

  /**
   * Obtient l'adresse IP du client
   */
  private static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || '127.0.0.1';
    } catch {
      return '127.0.0.1';
    }
  }

  /**
   * Hash un mot de passe
   */
  static async hashPassword(password: string): Promise<string> {
    const { data: hashedPassword, error } = await supabase.rpc('hash_password', {
      password
    });

    if (error || !hashedPassword) {
      throw new Error('Impossible de hasher le mot de passe');
    }

    return hashedPassword;
  }

  /**
   * Crée un nouvel utilisateur administrateur
   */
  static async createAdminUser(email: string, password: string, role: UserRole = UserRole.ADMIN): Promise<SecureUser> {
    if (!this.hasPermission(Permission.MANAGE_USERS)) {
      throw new Error('Permission insuffisante pour créer un utilisateur');
    }

    try {
      const hashedPassword = await this.hashPassword(password);

      const { data, error } = await supabase
        .from('admin_users')
        .insert({
          email,
          password_hash: hashedPassword,
          role,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Impossible de créer l'utilisateur: ${error.message}`);
      }

      return {
        id: data.id,
        email: data.email,
        role: data.role as UserRole,
        isActive: data.is_active,
        permissions: this.rolePermissions[data.role as UserRole] || []
      };
    } catch (error) {
      console.error('Erreur lors de la création d\'utilisateur:', error);
      throw error;
    }
  }
}