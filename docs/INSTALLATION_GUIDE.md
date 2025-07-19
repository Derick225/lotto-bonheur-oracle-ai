# 🚀 Guide d'Installation - Système de Gestion des Tirages

## Prérequis

- **Node.js** 18+ 
- **npm** ou **yarn**
- **Compte Supabase** (gratuit)
- **Navigateur moderne** (Chrome, Firefox, Safari, Edge)

## 📋 Installation Rapide

### 1. Cloner le Projet

```bash
git clone <repository-url>
cd loterie-oracle-ai
npm install
```

### 2. Configuration Automatique

```bash
# Copier le fichier d'environnement
npm run setup:env

# Configurer Supabase (après avoir créé votre projet)
npm run setup:supabase
```

### 3. Configuration Manuelle de Supabase

#### Créer un Projet Supabase

1. Aller sur [https://supabase.com](https://supabase.com)
2. Créer un compte (gratuit)
3. Créer un nouveau projet
4. Noter l'URL et la clé anonyme

#### Configurer les Variables d'Environnement

```bash
# Éditer le fichier .env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme
```

#### Créer les Tables

1. Aller dans l'éditeur SQL de Supabase
2. Copier le script SQL depuis `scripts/setup-supabase.js`
3. Exécuter le script

### 4. Démarrer l'Application

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

## 🔧 Configuration Avancée

### Variables d'Environnement Complètes

```env
# Supabase (obligatoire)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme

# Optionnel pour l'auto-setup
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service

# Configuration de l'application
VITE_APP_NAME=Loterie Oracle AI
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development

# Fonctionnalités
VITE_ENABLE_DEBUG=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_NOTIFICATIONS=true

# Limites
VITE_MAX_IMPORT_SIZE=10485760
VITE_DEFAULT_PAGE_SIZE=20
VITE_MAX_PAGE_SIZE=100
```

### Configuration Supabase Avancée

#### Authentification

```sql
-- Activer l'authentification par email
-- Dans Authentication > Settings
-- Activer "Enable email confirmations"
```

#### Politiques de Sécurité (RLS)

Les politiques sont créées automatiquement par le script, mais vous pouvez les personnaliser :

```sql
-- Exemple de politique personnalisée
CREATE POLICY "Custom policy" ON draw_results
  FOR ALL USING (
    auth.uid() = created_by OR
    auth.jwt() ->> 'role' = 'admin'
  );
```

## 🧪 Tests et Vérification

### Test de Connexion

```bash
# Tester la connexion Supabase
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
client.from('draw_results').select('count').then(console.log);
"
```

### Test des Fonctionnalités

1. **Accéder à l'application** : `http://localhost:5173`
2. **Aller dans Administration** → Tirages
3. **Tester les fonctions** :
   - Créer un tirage
   - Modifier un tirage
   - Importer des données (utiliser le template)
   - Exporter des données

## 🔒 Sécurité et Production

### Configuration de Production

```env
# Production
VITE_APP_ENV=production
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
```

### Sécurité Supabase

1. **Configurer les domaines autorisés** dans Supabase
2. **Activer RLS** sur toutes les tables
3. **Limiter les permissions** de la clé anonyme
4. **Configurer CORS** approprié

### Build de Production

```bash
npm run build
npm run preview
```

## 🚨 Dépannage

### Problèmes Courants

#### Erreur de Connexion Supabase

```
Erreur: Invalid API key
Solution: Vérifier VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
```

#### Tables Non Trouvées

```
Erreur: relation "draw_results" does not exist
Solution: Exécuter le script SQL de création des tables
```

#### Permissions Refusées

```
Erreur: permission denied for table draw_results
Solution: Vérifier les politiques RLS et l'authentification
```

### Logs de Débogage

```bash
# Activer les logs détaillés
VITE_ENABLE_DEBUG=true npm run dev

# Vérifier les logs dans la console du navigateur (F12)
```

### Réinitialisation Complète

```bash
# Supprimer les tables dans Supabase
DROP TABLE IF EXISTS import_sessions CASCADE;
DROP TABLE IF EXISTS draw_results_history CASCADE;
DROP TABLE IF EXISTS draw_results CASCADE;

# Relancer l'installation
npm run setup:supabase
```

## 📦 Déploiement

### Vercel (Recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Configurer les variables d'environnement dans Vercel
```

### Netlify

```bash
# Build
npm run build

# Déployer le dossier dist/
```

### Variables d'Environnement de Déploiement

Configurer dans votre plateforme de déploiement :

```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme
VITE_APP_ENV=production
```

## 🔄 Mises à Jour

### Mise à Jour du Code

```bash
git pull origin main
npm install
npm run build
```

### Mise à Jour de la Base de Données

```bash
# Sauvegarder les données
npm run export:data

# Appliquer les migrations
npm run migrate

# Vérifier l'intégrité
npm run verify:data
```

## 📞 Support

### Ressources

- **Documentation** : `/docs/DRAW_MANAGEMENT.md`
- **Guide utilisateur** : `README_DRAW_MANAGEMENT.md`
- **Aide intégrée** : Appuyer sur F1 dans l'application

### Problèmes Techniques

1. **Vérifier les logs** : Console du navigateur
2. **Tester la connexion** : Script de test fourni
3. **Consulter la documentation** : Supabase et React
4. **Réinitialiser** : Procédure de reset complète

---

## ✅ Checklist d'Installation

- [ ] Node.js 18+ installé
- [ ] Projet cloné et dépendances installées
- [ ] Compte Supabase créé
- [ ] Variables d'environnement configurées
- [ ] Tables Supabase créées
- [ ] Application démarrée (`npm run dev`)
- [ ] Test de connexion réussi
- [ ] Fonctionnalités de base testées
- [ ] Configuration de production (si applicable)

**🎯 Installation terminée ! Votre système de gestion des tirages est prêt à l'emploi.**
