# 🎯 Système de Gestion des Tirages - Guide Rapide

## 🚀 Démarrage Rapide

### 1. Configuration Supabase

```bash
# 1. Créer un projet sur https://supabase.com
# 2. Copier l'URL et la clé anonyme
# 3. Configurer les variables d'environnement
cp .env.example .env
```

### 2. Variables d'Environnement

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anonyme
```

### 3. Installation

```bash
npm install
npm run dev
```

### 4. Initialisation de la Base de Données

1. Aller dans l'éditeur SQL de Supabase
2. Copier le script SQL depuis `src/services/supabaseClient.ts` (variable `createTablesSQL`)
3. Exécuter le script

## 📋 Utilisation Rapide

### Accès au Système
- **URL** : `http://localhost:5173`
- **Navigation** : Administration → Tirages
- **Permissions** : Rôle Admin ou Analyste requis

### Actions Principales

#### ➕ Créer un Tirage
1. Cliquer "Nouveau Tirage"
2. Remplir les champs obligatoires :
   - Date du tirage
   - Type de loterie
   - Numéros (5-7 numéros entre 1-49)
3. Sauvegarder (Ctrl+Entrée)

#### ✏️ Modifier un Tirage
- **Édition rapide** : Cliquer sur une cellule
- **Édition complète** : Double-cliquer sur la ligne

#### 🗑️ Supprimer des Tirages
- **Simple** : Sélectionner + icône suppression
- **Multiple** : Sélectionner plusieurs + bouton "Supprimer"

#### 📁 Import par Lots
1. Cliquer "Importer"
2. Télécharger le template CSV
3. Préparer vos données
4. Sélectionner le fichier
5. Suivre l'assistant

#### 📤 Export de Données
1. Cliquer "Exporter"
2. Choisir le format (CSV/Excel/JSON)
3. Configurer les options
4. Télécharger

## ⌨️ Raccourcis Essentiels

| Raccourci | Action |
|-----------|--------|
| `F1` | Aide |
| `Ctrl+N` | Nouveau tirage |
| `Ctrl+R` | Actualiser |
| `Ctrl+F` | Rechercher |
| `Ctrl+I` | Importer |
| `Ctrl+Shift+E` | Exporter |
| `Échap` | Fermer |

## 📊 Format d'Import CSV

```csv
date,numbers,bonus,type,jackpot,winners
2024-01-15,1-5-12-23-45,7,loto,15000000,3
2024-01-12,3-8-15-27-42,2,loto,12000000,1
```

### Colonnes Supportées
- **date** : YYYY-MM-DD
- **numbers** : Numéros séparés par tirets (1-5-12-23-45)
- **bonus** : Numéros bonus séparés par tirets
- **type** : loto, euromillions, keno, amigo
- **jackpot** : Montant en euros
- **winners** : Nombre de gagnants

## 🔍 Recherche et Filtres

### Recherche Simple
- Tapez dans la barre de recherche
- Recherche dans tous les champs
- Appuyez sur Entrée pour valider

### Filtres Avancés
1. Cliquer "Filtres" ou `Ctrl+Shift+F`
2. Configurer :
   - **Période** : Date début/fin
   - **Type** : Sélectionner le type de loterie
   - **Numéros** : Ajouter des numéros spécifiques
   - **Tri** : Personnaliser l'ordre
3. Cliquer "Appliquer"

## ✅ Validation des Données

### Règles Automatiques
- **Numéros principaux** : 5-7 numéros entre 1-49, pas de doublons
- **Numéros bonus** : 0-2 numéros entre 1-10, pas de doublons
- **Date** : Format valide, pas dans le futur
- **Type** : Valeurs prédéfinies uniquement

### Messages d'Erreur
- Affichage en temps réel
- Messages explicites
- Blocage de sauvegarde si erreurs

## 🔧 Fonctionnalités Avancées

### Édition en Ligne
- Cliquez directement sur les cellules modifiables
- Validez avec Entrée, annulez avec Échap
- Disponible pour : date, type, jackpot, gagnants

### Sélection Multiple
- `Ctrl+clic` pour sélectionner plusieurs lignes
- Case à cocher en en-tête pour tout sélectionner
- Actions groupées disponibles

### Pagination Intelligente
- Navigation avec les flèches
- Saut direct à la première/dernière page
- Taille de page configurable (10-100)

## 📱 Interface Responsive

### Mobile
- Navigation tactile optimisée
- Colonnes adaptatives
- Menus contextuels simplifiés

### Tablette
- Disposition hybride
- Édition facilitée
- Utilisation optimale de l'espace

## 🔒 Sécurité

### Authentification
- Connexion Supabase requise
- Sessions sécurisées
- Déconnexion automatique

### Permissions
- **Admin** : Accès complet
- **Analyste** : Lecture/écriture
- **Utilisateur** : Lecture seule

### Audit Trail
- Historique complet des modifications
- Métadonnées : utilisateur, date, IP
- Export possible pour audit

## 🚨 Dépannage Rapide

### Problème de Connexion
```bash
# Vérifier les variables d'environnement
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Tester la connectivité
curl -I https://votre-projet.supabase.co
```

### Import Échoué
1. Vérifier le format du fichier
2. Contrôler les données (pas de doublons)
3. Réduire la taille si nécessaire
4. Utiliser le template fourni

### Performance Lente
1. Utiliser les filtres pour réduire les données
2. Augmenter la taille de page
3. Vérifier la connexion réseau
4. Vider le cache du navigateur

## 📞 Support

### Aide Intégrée
- Appuyez sur `F1` pour l'aide complète
- Tooltips sur les éléments complexes
- Messages d'erreur explicites

### Logs de Débogage
- Ouvrir la console du navigateur (F12)
- Vérifier les erreurs réseau
- Examiner les requêtes Supabase

### Documentation
- **Guide complet** : `/docs/DRAW_MANAGEMENT.md`
- **Configuration** : `/docs/ADMIN_SYSTEM.md`
- **API** : Code source commenté

## 🎯 Bonnes Pratiques

### Import de Données
1. Toujours utiliser le template fourni
2. Valider les données avant import
3. Faire des imports par petits lots (< 1000 lignes)
4. Sauvegarder avant import massif

### Gestion Quotidienne
1. Utiliser les filtres pour naviguer efficacement
2. Exporter régulièrement pour sauvegarde
3. Vérifier l'historique en cas de doute
4. Utiliser les raccourcis clavier

### Performance
1. Limiter les résultats avec les filtres
2. Utiliser la pagination appropriée
3. Éviter les exports trop volumineux
4. Nettoyer régulièrement les anciennes données

---

## 🔄 Mises à Jour

### Version Actuelle : 1.0.0

#### Fonctionnalités Récentes
- ✅ Gestion CRUD complète
- ✅ Import/Export par lots
- ✅ Recherche et filtrage avancés
- ✅ Interface responsive
- ✅ Validation automatique
- ✅ Audit trail complet

#### Prochaines Améliorations
- 🔄 Support Excel natif
- 🔄 API REST publique
- 🔄 Notifications en temps réel
- 🔄 Statistiques avancées
- 🔄 Intégration IA pour prédictions

---

**🎯 Loterie Oracle AI - Système de Gestion des Tirages**
*Interface moderne et intuitive pour la gestion professionnelle des données de loterie*
