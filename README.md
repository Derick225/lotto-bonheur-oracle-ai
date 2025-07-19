# 🎯 Loterie Oracle AI - Système de Gestion des Tirages

Une application web moderne et complète pour la gestion intelligente des tirages de loterie avec des fonctionnalités avancées d'analyse, de prédiction et d'administration.

## 🚀 Fonctionnalités Principales

### ✅ **Système de Gestion des Tirages Complet**
- **Interface CRUD intuitive** : Création, lecture, modification, suppression
- **Édition en ligne** : Modification directe dans le tableau
- **Import/Export par lots** : CSV, Excel, JSON avec validation
- **Recherche et filtrage avancés** : Filtres multiples combinables
- **Pagination intelligente** : Navigation optimisée
- **Validation automatique** : Règles métier intégrées
- **Historique complet** : Audit trail de toutes les modifications

### 🔧 **Intégration Supabase**
- **Base de données temps réel** : Synchronisation automatique
- **Authentification sécurisée** : Gestion des permissions
- **RLS (Row Level Security)** : Sécurité au niveau des données
- **Reconnexion automatique** : Robustesse réseau

### 📊 **Interface Utilisateur Avancée**
- **Design responsive** : Optimisé mobile, tablette, desktop
- **Raccourcis clavier** : Navigation et actions rapides
- **Notifications toast** : Feedback utilisateur immédiat
- **Aide contextuelle** : Guide intégré (F1)
- **Thème adaptatif** : Mode sombre/clair

## 📋 Installation Rapide

### Prérequis
- Node.js 18+
- Compte Supabase (gratuit)

### Configuration Automatique
```bash
# 1. Cloner le projet
git clone <repository-url>
cd loterie-oracle-ai

# 2. Installer les dépendances
npm install

# 3. Configuration automatique
npm run setup

# 4. Démarrer l'application
npm run dev
```

### Configuration Manuelle
```bash
# 1. Copier le fichier d'environnement
cp .env.example .env

# 2. Configurer vos variables Supabase dans .env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme

# 3. Initialiser Supabase
npm run setup:supabase
```

## 🎯 Utilisation

### Accès au Système
1. Démarrer l'application : `npm run dev`
2. Ouvrir `http://localhost:5173`
3. Aller dans **Administration** → **Tirages**

### Fonctionnalités Clés
- **Gestion quotidienne** : Interface intuitive pour tous les besoins
- **Import massif** : Traitement par lots avec validation
- **Export personnalisé** : Tous formats avec filtres avancés
- **Recherche intelligente** : Filtres combinables et sauvegardés
- **Audit complet** : Traçabilité de toutes les actions

## 📚 Documentation

- **[Guide d'Installation Complet](docs/INSTALLATION_GUIDE.md)** : Instructions détaillées
- **[Guide Utilisateur](README_DRAW_MANAGEMENT.md)** : Utilisation rapide
- **[Documentation Technique](docs/DRAW_MANAGEMENT.md)** : Guide complet
- **Aide intégrée** : Appuyez sur F1 dans l'application

## 🛠️ Développement

### Scripts Disponibles
```bash
npm run dev          # Développement
npm run build        # Build de production
npm run preview      # Aperçu du build
npm run setup        # Configuration complète
npm run setup:env    # Configuration environnement
npm run setup:supabase # Initialisation Supabase
```

### Architecture
- **Frontend** : React + TypeScript + Vite
- **UI** : Shadcn/ui + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + RLS)
- **État** : React Hooks + Context
- **Validation** : Zod + React Hook Form

## 🔒 Sécurité

- **Authentification Supabase** : Sessions sécurisées
- **Permissions granulaires** : Admin/Analyste/Utilisateur
- **RLS activé** : Protection au niveau des données
- **Validation double** : Client et serveur
- **Audit trail** : Traçabilité complète

## 📱 Compatibilité

- **Navigateurs** : Chrome, Firefox, Safari, Edge (dernières versions)
- **Appareils** : Desktop, tablette, mobile
- **Résolution** : Responsive design adaptatif

**URL Lovable**: https://lovable.dev/projects/902d4d9f-72c3-451a-a020-35e2d3c06213

## 🔧 Comment Modifier le Code ?

### **Utiliser Lovable (Recommandé)**
Visitez le [Projet Lovable](https://lovable.dev/projects/902d4d9f-72c3-451a-a020-35e2d3c06213) et commencez à développer avec l'IA.

Les modifications via Lovable sont automatiquement commitées dans ce repo.

### **Développement Local**
```bash
# 1. Cloner le repository
git clone <YOUR_GIT_URL>

# 2. Naviguer dans le projet
cd <YOUR_PROJECT_NAME>

# 3. Installer les dépendances
npm install

# 4. Configuration (première fois)
npm run setup

# 5. Démarrer le serveur de développement
npm run dev
```

### **Édition Directe GitHub**
- Naviguer vers le fichier désiré
- Cliquer sur "Edit" (icône crayon)
- Faire les modifications et committer

### **GitHub Codespaces**
- Aller sur la page principale du repository
- Cliquer sur "Code" (bouton vert)
- Sélectionner l'onglet "Codespaces"
- Cliquer sur "New codespace"

## 🛠️ Technologies Utilisées

### **Frontend**
- **React 18** : Framework UI moderne
- **TypeScript** : Typage statique
- **Vite** : Build tool ultra-rapide
- **Tailwind CSS** : Framework CSS utilitaire

### **UI/UX**
- **Shadcn/ui** : Composants UI modernes
- **Radix UI** : Primitives accessibles
- **Lucide React** : Icônes cohérentes
- **React Hook Form** : Gestion des formulaires

### **Backend & Base de Données**
- **Supabase** : Backend-as-a-Service
- **PostgreSQL** : Base de données relationnelle
- **Row Level Security** : Sécurité granulaire
- **Real-time** : Synchronisation temps réel

### **État & Logique**
- **React Hooks** : Gestion d'état moderne
- **Context API** : État global
- **TanStack Query** : Cache et synchronisation
- **Zod** : Validation de schémas

## 🚀 Déploiement

### **Déploiement Rapide**
Ouvrir [Lovable](https://lovable.dev/projects/902d4d9f-72c3-451a-a020-35e2d3c06213) → Share → Publish

### **Déploiement Manuel**
```bash
# Build de production
npm run build

# Déployer le dossier dist/ sur votre plateforme
# (Vercel, Netlify, etc.)
```

### **Variables d'Environnement de Production**
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme
VITE_APP_ENV=production
```

## 🤝 Contribution

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/AmazingFeature`)
3. **Committer** les changements (`git commit -m 'Add AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

- **Documentation** : Guides dans `/docs/`
- **Issues** : GitHub Issues
- **Aide intégrée** : Appuyez sur F1 dans l'application

## 🔗 Domaine Personnalisé

Vous pouvez connecter un domaine personnalisé à votre projet Lovable :

Naviguer vers Project > Settings > Domains et cliquer sur Connect Domain.

Plus d'infos : [Configuration d'un domaine personnalisé](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

---

**🎯 Loterie Oracle AI** - *Système de gestion intelligent des tirages de loterie*
