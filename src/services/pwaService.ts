/**
 * Service de gestion PWA (Progressive Web App)
 * Gère l'installation, les mises à jour et les fonctionnalités hors ligne
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPrompt {
  canInstall: boolean;
  install: () => Promise<boolean>;
  isInstalled: boolean;
  platform: string;
}

export class PWAService {
  private static deferredPrompt: BeforeInstallPromptEvent | null = null;
  private static isInstalled = false;
  private static updateAvailable = false;
  private static registration: ServiceWorkerRegistration | null = null;

  /**
   * Initialise le service PWA
   */
  static async initialize(): Promise<void> {
    console.log('🚀 Initialisation du service PWA...');

    // Vérifier le support des Service Workers
    if ('serviceWorker' in navigator) {
      try {
        // Enregistrer le service worker
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('✅ Service Worker enregistré:', this.registration.scope);

        // Écouter les mises à jour
        this.registration.addEventListener('updatefound', () => {
          this.handleUpdateFound();
        });

        // Vérifier les mises à jour
        await this.checkForUpdates();

      } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement du Service Worker:', error);
      }
    }

    // Écouter l'événement d'installation
    this.setupInstallPrompt();

    // Vérifier si l'app est déjà installée
    this.checkInstallationStatus();

    // Écouter les changements de connectivité
    this.setupConnectivityListeners();
  }

  /**
   * Configure l'invite d'installation PWA
   */
  private static setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      console.log('📱 Invite d\'installation PWA disponible');
      
      // Déclencher un événement personnalisé
      window.dispatchEvent(new CustomEvent('pwa-install-available'));
    });

    // Écouter l'installation réussie
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA installée avec succès');
      this.isInstalled = true;
      this.deferredPrompt = null;
      
      // Déclencher un événement personnalisé
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    });
  }

  /**
   * Vérifie le statut d'installation
   */
  private static checkInstallationStatus(): void {
    // Vérifier si l'app est lancée en mode standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('📱 Application lancée en mode standalone');
    }

    // Vérifier sur iOS
    if ((navigator as any).standalone === true) {
      this.isInstalled = true;
      console.log('📱 Application installée sur iOS');
    }
  }

  /**
   * Configure les listeners de connectivité
   */
  private static setupConnectivityListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connexion rétablie');
      window.dispatchEvent(new CustomEvent('pwa-online'));
      
      // Synchroniser les données en attente
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Mode hors ligne activé');
      window.dispatchEvent(new CustomEvent('pwa-offline'));
    });
  }

  /**
   * Gère la découverte de mises à jour
   */
  private static handleUpdateFound(): void {
    if (!this.registration) return;

    const newWorker = this.registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('🔄 Mise à jour disponible');
        this.updateAvailable = true;
        
        // Déclencher un événement personnalisé
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
      }
    });
  }

  /**
   * Vérifie les mises à jour du service worker
   */
  static async checkForUpdates(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
      console.log('🔍 Vérification des mises à jour terminée');
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des mises à jour:', error);
    }
  }

  /**
   * Applique une mise à jour disponible
   */
  static async applyUpdate(): Promise<void> {
    if (!this.updateAvailable || !this.registration) return;

    const newWorker = this.registration.waiting;
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Recharger la page après activation
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }

  /**
   * Déclenche l'installation de la PWA
   */
  static async installPWA(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('⚠️ Invite d\'installation non disponible');
      return false;
    }

    try {
      // Afficher l'invite d'installation
      await this.deferredPrompt.prompt();
      
      // Attendre la réponse de l'utilisateur
      const choiceResult = await this.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ Utilisateur a accepté l\'installation');
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('❌ Utilisateur a refusé l\'installation');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'installation:', error);
      return false;
    }
  }

  /**
   * Retourne les informations d'installation
   */
  static getInstallPrompt(): PWAInstallPrompt {
    return {
      canInstall: !!this.deferredPrompt,
      install: () => this.installPWA(),
      isInstalled: this.isInstalled,
      platform: this.getPlatform()
    };
  }

  /**
   * Détecte la plateforme
   */
  private static getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/android/.test(userAgent)) return 'Android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'iOS';
    if (/windows/.test(userAgent)) return 'Windows';
    if (/macintosh|mac os x/.test(userAgent)) return 'macOS';
    if (/linux/.test(userAgent)) return 'Linux';
    
    return 'Unknown';
  }

  /**
   * Synchronise les données en attente
   */
  private static async syncPendingData(): Promise<void> {
    try {
      // Importer le service de synchronisation
      const { SyncService } = await import('./syncService');
      
      // Déclencher une synchronisation
      await SyncService.performIncrementalSync();
      console.log('🔄 Synchronisation des données terminée');
      
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
    }
  }

  /**
   * Retourne le statut de connectivité
   */
  static isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Retourne le statut d'installation
   */
  static isAppInstalled(): boolean {
    return this.isInstalled;
  }

  /**
   * Retourne si une mise à jour est disponible
   */
  static isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * Retourne les informations de la PWA
   */
  static getInfo(): {
    isInstalled: boolean;
    canInstall: boolean;
    isOnline: boolean;
    updateAvailable: boolean;
    platform: string;
    hasServiceWorker: boolean;
  } {
    return {
      isInstalled: this.isInstalled,
      canInstall: !!this.deferredPrompt,
      isOnline: navigator.onLine,
      updateAvailable: this.updateAvailable,
      platform: this.getPlatform(),
      hasServiceWorker: 'serviceWorker' in navigator
    };
  }

  /**
   * Affiche une notification (si supportée)
   */
  static async showNotification(
    title: string, 
    options: NotificationOptions = {}
  ): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications non supportées');
      return;
    }

    // Demander la permission si nécessaire
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      if (this.registration) {
        // Utiliser le service worker pour les notifications
        await this.registration.showNotification(title, {
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          ...options
        });
      } else {
        // Fallback vers les notifications normales
        new Notification(title, {
          icon: '/icon-192x192.png',
          ...options
        });
      }
    }
  }

  /**
   * Nettoie les ressources
   */
  static cleanup(): void {
    this.deferredPrompt = null;
    this.registration = null;
  }
}
