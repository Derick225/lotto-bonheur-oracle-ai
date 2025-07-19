# 🎯 Système de Gestion des Tirages - Loterie Oracle AI

## Vue d'ensemble

Le système de gestion des tirages de Loterie Oracle AI offre une interface complète et intuitive pour gérer les résultats de tirage de loterie avec des fonctionnalités avancées d'import/export, de recherche et de validation.

## 🚀 Fonctionnalités Principales

### ✅ Gestion CRUD Complète
- **Création** : Formulaire intuitif avec validation en temps réel
- **Lecture** : Tableau avec pagination et tri personnalisable
- **Modification** : Édition en ligne et formulaire complet
- **Suppression** : Suppression sécurisée avec confirmation

### 📊 Interface Utilisateur Avancée
- **Édition en ligne** : Cliquez directement sur les cellules pour modifier
- **Sélection multiple** : Gestion par lots avec actions groupées
- **Filtres avancés** : Recherche par date, type, numéros
- **Pagination intelligente** : Navigation fluide dans les données

### 📁 Import/Export par Lots
- **Formats supportés** : CSV, Excel, JSON
- **Validation automatique** : Vérification des données avant import
- **Prévisualisation** : Aperçu des données avant confirmation
- **Gestion des erreurs** : Rapport détaillé des problèmes

### 🔍 Recherche et Filtrage
- **Recherche textuelle** : Dans tous les champs
- **Filtres par date** : Période personnalisable
- **Filtres par numéros** : Recherche de tirages contenant des numéros spécifiques
- **Combinaison de filtres** : Recherches complexes

## 🛠️ Configuration et Installation

### Prérequis
- Node.js 18+
- Compte Supabase
- Navigateur moderne

### Configuration Supabase

1. **Créer un projet Supabase**
   ```bash
   # Aller sur https://supabase.com
   # Créer un nouveau projet
   ```

2. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   # Modifier les valeurs dans .env
   ```

3. **Exécuter les scripts SQL**
   ```sql
   -- Copier le contenu de createTablesSQL depuis supabaseClient.ts
   -- L'exécuter dans l'éditeur SQL de Supabase
   ```

### Installation des Dépendances

```bash
npm install @supabase/supabase-js
npm install lucide-react
npm install @radix-ui/react-dialog
npm install @radix-ui/react-select
npm install @radix-ui/react-checkbox
```

## 📋 Guide d'Utilisation

### Accès au Système

1. **Navigation** : Aller dans Administration → Tirages
2. **Permissions** : Nécessite un rôle Admin ou Analyste
3. **Initialisation** : Le système s'initialise automatiquement

### Gestion des Tirages

#### Créer un Nouveau Tirage

1. **Cliquer** sur "Nouveau Tirage"
2. **Remplir** les informations :
   - Date du tirage (obligatoire)
   - Type de loterie (obligatoire)
   - Numéros principaux (5-7 numéros entre 1-49)
   - Numéros bonus (optionnel, 1-2 numéros entre 1-10)
   - Montant du jackpot (optionnel)
   - Nombre de gagnants (optionnel)
3. **Valider** : Le système vérifie automatiquement les données
4. **Sauvegarder** : Ctrl+Entrée ou bouton "Créer"

#### Modifier un Tirage

**Méthode 1 : Édition en ligne**
- Cliquer directement sur une cellule modifiable
- Modifier la valeur
- Valider avec Entrée ou annuler avec Échap

**Méthode 2 : Formulaire complet**
- Double-cliquer sur une ligne
- Ou utiliser le menu contextuel → "Modifier"
- Modifier dans le formulaire complet

#### Supprimer des Tirages

**Suppression simple**
- Sélectionner un tirage
- Cliquer sur l'icône de suppression
- Confirmer la suppression

**Suppression multiple**
- Sélectionner plusieurs tirages (Ctrl+clic)
- Cliquer sur "Supprimer" dans la barre d'actions
- Confirmer la suppression groupée

### Import par Lots

#### Préparer les Données

1. **Télécharger le template** : Bouton "Télécharger le template CSV"
2. **Format CSV attendu** :
   ```csv
   date,numbers,bonus,type,jackpot,winners
   2024-01-15,1-5-12-23-45,7,loto,15000000,3
   2024-01-12,3-8-15-27-42,2,loto,12000000,1
   ```

3. **Colonnes supportées** :
   - `date` : Date du tirage (YYYY-MM-DD)
   - `numbers` : Numéros séparés par des tirets
   - `bonus` : Numéros bonus séparés par des tirets
   - `type` : Type de loterie (loto, euromillions, keno, amigo)
   - `jackpot` : Montant en euros
   - `winners` : Nombre de gagnants

#### Processus d'Import

1. **Sélectionner le fichier** : Formats CSV, JSON supportés
2. **Prévisualisation** : Vérifier les données détectées
3. **Options d'import** :
   - Ignorer les doublons
   - Mettre à jour les existants
   - Validation uniquement
4. **Lancer l'import** : Suivi en temps réel
5. **Résultats** : Rapport détaillé des succès/erreurs

### Export de Données

#### Options d'Export

1. **Format** :
   - CSV : Compatible Excel/Google Sheets
   - Excel : Fichier .xlsx natif
   - JSON : Format structuré

2. **Filtres** :
   - Utiliser les filtres actuels
   - Exporter toutes les données

3. **Options avancées** :
   - Inclure l'historique des modifications
   - Données complètes ou résumé

#### Lancer un Export

1. **Cliquer** sur "Exporter"
2. **Configurer** les options
3. **Télécharger** : Le fichier se télécharge automatiquement

### Recherche et Filtrage

#### Recherche Simple

- **Barre de recherche** : Recherche dans tous les champs
- **Recherche par numéros** : Taper un numéro pour trouver les tirages
- **Recherche par date** : Format YYYY-MM-DD

#### Filtres Avancés

1. **Ouvrir les filtres** : Bouton "Filtres" ou Ctrl+Shift+F
2. **Configurer** :
   - Période (date de début/fin)
   - Type de loterie
   - Numéros spécifiques
   - Options de tri
3. **Appliquer** : Les résultats se mettent à jour automatiquement

## ⌨️ Raccourcis Clavier

### Navigation
- `F1` : Ouvrir l'aide
- `Ctrl+R` : Actualiser les données
- `Échap` : Fermer les dialogs

### Gestion des Tirages
- `Ctrl+N` : Nouveau tirage
- `Ctrl+E` : Modifier le tirage sélectionné
- `Suppr` : Supprimer le tirage sélectionné
- `Ctrl+A` : Sélectionner tout
- `Ctrl+D` : Désélectionner tout

### Import/Export
- `Ctrl+I` : Importer des tirages
- `Ctrl+Shift+E` : Exporter des tirages

### Filtres
- `Ctrl+F` : Rechercher
- `Ctrl+Shift+F` : Filtres avancés
- `Ctrl+Shift+R` : Réinitialiser les filtres

## 🔧 Validation des Données

### Règles de Validation

#### Numéros Principaux
- **Quantité** : 5 à 7 numéros
- **Plage** : 1 à 49
- **Unicité** : Pas de doublons

#### Numéros Bonus
- **Quantité** : 0 à 2 numéros
- **Plage** : 1 à 10
- **Unicité** : Pas de doublons

#### Autres Champs
- **Date** : Format valide, pas dans le futur
- **Type** : Valeurs prédéfinies
- **Jackpot** : Nombre positif
- **Gagnants** : Nombre entier positif

### Gestion des Erreurs

- **Validation en temps réel** : Erreurs affichées immédiatement
- **Messages explicites** : Description claire des problèmes
- **Blocage de sauvegarde** : Impossible de sauvegarder avec des erreurs

## 📱 Interface Responsive

### Adaptations Mobile
- **Navigation tactile** : Optimisée pour le touch
- **Colonnes adaptatives** : Masquage intelligent sur petits écrans
- **Menus contextuels** : Adaptés aux interactions tactiles

### Adaptations Tablette
- **Disposition hybride** : Optimisation pour les écrans moyens
- **Édition facilitée** : Formulaires adaptés
- **Navigation améliorée** : Utilisation optimale de l'espace

## 🔒 Sécurité et Permissions

### Contrôle d'Accès
- **Authentification** : Connexion Supabase requise
- **Rôles** : Admin (complet), Analyste (lecture/écriture), Utilisateur (lecture)
- **RLS** : Row Level Security activé

### Audit Trail
- **Historique complet** : Toutes les modifications enregistrées
- **Métadonnées** : Utilisateur, date, IP, user-agent
- **Export d'audit** : Possibilité d'exporter l'historique

## 🚨 Dépannage

### Problèmes Courants

#### Erreur de Connexion Supabase
```
Solution :
1. Vérifier les variables d'environnement
2. Contrôler la connectivité réseau
3. Vérifier les permissions Supabase
```

#### Import Échoué
```
Solution :
1. Vérifier le format du fichier
2. Contrôler les données (doublons, format)
3. Réduire la taille du fichier
```

#### Performance Lente
```
Solution :
1. Utiliser les filtres pour réduire les données
2. Augmenter la pagination
3. Vérifier la connexion réseau
```

### Support Technique

- **Logs détaillés** : Console du navigateur
- **Messages d'erreur** : Notifications explicites
- **Documentation** : Aide intégrée (F1)

## 🔄 Mises à Jour et Maintenance

### Sauvegarde des Données
- **Export régulier** : Recommandé hebdomadaire
- **Format JSON** : Pour sauvegarde complète
- **Historique inclus** : Pour audit complet

### Maintenance Préventive
- **Nettoyage périodique** : Suppression des anciens logs
- **Optimisation** : Réindexation automatique
- **Monitoring** : Surveillance des performances

---

## 📞 Support

Pour toute question ou problème :
- **Aide intégrée** : Appuyez sur F1
- **Documentation** : `/docs/DRAW_MANAGEMENT.md`
- **Logs système** : Console du navigateur

Le système de gestion des tirages de Loterie Oracle AI offre une solution complète et professionnelle pour la gestion des données de loterie avec une interface moderne et des fonctionnalités avancées.
