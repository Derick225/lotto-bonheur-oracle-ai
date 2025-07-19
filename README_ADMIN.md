# 🔧 Guide d'Administration - Loterie Oracle AI

## 🚀 Démarrage Rapide

### Accès à l'Interface d'Administration

1. **Démarrer l'application** :
   ```bash
   npm run dev
   ```

2. **Accéder à l'interface** :
   - Ouvrir `http://localhost:5173`
   - Naviguer vers la page "Administration"

3. **Connexion administrateur** :
   - Utilisateur par défaut : `admin`
   - Mot de passe par défaut : `admin123`
   - **⚠️ Changez immédiatement ces identifiants en production !**

## 📊 Tableau de Bord Principal

Le tableau de bord administrateur offre une vue d'ensemble complète :

### Métriques Clés
- **Utilisateurs** : Total, actifs, nouvelles inscriptions
- **Prédictions** : Volume quotidien, taux de réussite
- **Système** : Performance, santé, alertes
- **Sécurité** : Événements, menaces, blocages

### Indicateurs de Santé
- 🟢 **Excellent** : Système optimal
- 🔵 **Bon** : Fonctionnement normal
- 🟡 **Attention** : Surveillance requise
- 🔴 **Critique** : Action immédiate nécessaire

## 👥 Gestion des Utilisateurs

### Création d'un Utilisateur

1. **Accéder au panneau** : Onglet "Utilisateurs"
2. **Cliquer** : "Nouvel Utilisateur"
3. **Remplir le formulaire** :
   - Prénom et nom
   - Email (unique)
   - Nom d'utilisateur (unique)
   - Rôle (Admin/Analyste/Utilisateur)
4. **Sauvegarder** : Le mot de passe temporaire sera généré

### Rôles et Permissions

#### 🔴 Administrateur
- **Accès complet** à toutes les fonctionnalités
- **Gestion des utilisateurs** et permissions
- **Configuration système** et sécurité
- **Maintenance** et sauvegardes

#### 🔵 Analyste
- **Accès aux données** et analyses
- **Génération de rapports**
- **Monitoring** des performances
- **Configuration limitée**

#### 🟢 Utilisateur
- **Fonctionnalités de base** uniquement
- **Prédictions** et historique personnel
- **Profil utilisateur**

### Surveillance des Sessions

- **Sessions actives** : Voir qui est connecté
- **Historique** : Dernières connexions
- **Sécurité** : Détecter les accès suspects

## 🔒 Centre de Sécurité

### Événements de Sécurité

Le système surveille automatiquement :
- **Tentatives de connexion** échouées
- **Accès non autorisés**
- **Modifications sensibles**
- **Activités suspectes**

### Niveaux de Risque

- 🟢 **Faible** : Activité normale
- 🟡 **Moyen** : Surveillance recommandée
- 🟠 **Élevé** : Attention requise
- 🔴 **Critique** : Action immédiate

### Analyse de Risque Utilisateur

1. **Accéder** : Onglet "Sécurité" → "Analyse Utilisateurs"
2. **Entrer l'ID utilisateur**
3. **Analyser** : Score de risque et recommandations
4. **Agir** : Suivre les recommandations de sécurité

### Configuration de Sécurité

#### Politique de Mot de Passe
- **Longueur minimale** : 8 caractères (recommandé)
- **Complexité** : Majuscules, minuscules, chiffres
- **Âge maximum** : 90 jours
- **Historique** : Éviter la réutilisation

#### Verrouillage de Compte
- **Tentatives max** : 5 échecs
- **Durée de verrouillage** : 30 minutes
- **Réinitialisation** : Après 24 heures

## ⚙️ Configuration Système

### Sections de Configuration

#### 🔧 Général
- **Nom de l'application**
- **Version** et environnement
- **Paramètres de session**
- **Mode maintenance**

#### 🛡️ Sécurité
- **Politique de mots de passe**
- **Authentification 2FA**
- **Limitation de taux**
- **Sécurité des sessions**

#### 🤖 Prédictions
- **Configuration des algorithmes**
- **Poids des modèles**
- **Rétention des données**
- **Performance et cache**

#### 📊 Monitoring
- **Seuils d'alerte**
- **Configuration des notifications**
- **Rétention des logs**

### Sauvegarde de Configuration

1. **Exporter** : Bouton "Exporter" → Fichier JSON
2. **Stocker** : Conserver en lieu sûr
3. **Documenter** : Noter les changements
4. **Importer** : Restaurer si nécessaire

## 💾 Maintenance et Sauvegardes

### Types de Sauvegarde

#### 🔵 Complète
- **Contenu** : Toutes les données
- **Fréquence** : Hebdomadaire
- **Durée** : Plus longue
- **Restauration** : Complète

#### 🟡 Incrémentale
- **Contenu** : Changements depuis la dernière
- **Fréquence** : Quotidienne
- **Durée** : Rapide
- **Restauration** : Séquentielle

#### 🟠 Différentielle
- **Contenu** : Changements depuis la complète
- **Fréquence** : Bi-quotidienne
- **Durée** : Moyenne
- **Restauration** : Deux fichiers

### Création de Sauvegarde

1. **Accéder** : Onglet "Maintenance"
2. **Choisir le type** : Complète/Incrémentale/Différentielle
3. **Options** :
   - ✅ Compression (recommandé)
   - ✅ Chiffrement (pour données sensibles)
4. **Lancer** : La sauvegarde démarre

### Tâches de Maintenance

#### 🧹 Nettoyage Automatique
- **Fréquence** : Quotidienne à 2h
- **Action** : Supprime les logs > 90 jours
- **Statut** : Surveillé automatiquement

#### ⚡ Optimisation Base de Données
- **Fréquence** : Hebdomadaire (dimanche 3h)
- **Action** : Optimise les index
- **Gain** : Améliore les performances

#### 🔍 Vérification d'Intégrité
- **Fréquence** : Hebdomadaire (lundi 1h)
- **Action** : Vérifie la cohérence des données
- **Rapport** : État de santé détaillé

### Restauration de Données

⚠️ **ATTENTION** : La restauration peut écraser les données actuelles

1. **Sélectionner** : Sauvegarde à restaurer
2. **Vérifier** : Intégrité (checksum)
3. **Configurer** :
   - Données à inclure/exclure
   - Mode écrasement
4. **Confirmer** : Double validation requise
5. **Surveiller** : Progression en temps réel

## 📢 Gestion des Notifications

### Canaux Disponibles

#### 📧 Email
- **Configuration** : SMTP requis
- **Usage** : Alertes importantes
- **Format** : HTML/Texte

#### 📱 SMS
- **Configuration** : Fournisseur API
- **Usage** : Alertes critiques
- **Coût** : Variable selon fournisseur

#### 🔔 Push
- **Configuration** : Service push
- **Usage** : Notifications temps réel
- **Compatibilité** : Navigateurs modernes

#### 🌐 Webhook
- **Configuration** : URL endpoint
- **Usage** : Intégrations externes
- **Format** : JSON

#### 📱 In-App
- **Configuration** : Aucune
- **Usage** : Notifications internes
- **Persistance** : Historique conservé

### Templates de Notification

#### Création d'un Template

1. **Accéder** : Onglet "Notifications" → "Templates"
2. **Nouveau Template** :
   - **Nom** : Identifiant unique
   - **Type** : Email/SMS/Push
   - **Sujet** : Pour emails uniquement
   - **Corps** : Message avec variables
   - **Variables** : {{appName}}, {{username}}, etc.
3. **Tester** : Envoi de test recommandé
4. **Activer** : Rendre disponible

#### Variables Disponibles
- `{{appName}}` : Nom de l'application
- `{{username}}` : Nom de l'utilisateur
- `{{timestamp}}` : Date/heure actuelle
- `{{ipAddress}}` : Adresse IP
- `{{eventType}}` : Type d'événement
- `{{details}}` : Détails spécifiques

### Envoi de Notifications

#### Notification Manuelle

1. **Accéder** : "Envoyer Notification"
2. **Configurer** :
   - **Type** : Info/Avertissement/Erreur/Succès/Critique
   - **Titre** : Objet du message
   - **Message** : Contenu
   - **Destinataires** : Utilisateurs cibles
   - **Canaux** : Méthodes d'envoi
3. **Template** : Optionnel, pré-remplit les champs
4. **Envoyer** : Traitement immédiat

#### Notifications Automatiques

Le système envoie automatiquement :
- **Alertes de sécurité** → Administrateurs
- **Erreurs système** → Équipe technique
- **Sauvegardes** → Responsables IT
- **Performance** → Analystes

## 📈 Audit et Logs

### Types de Logs

#### 🔍 Logs Système
- **Application** : Démarrage, arrêt, erreurs
- **Performance** : Temps de réponse, ressources
- **Sécurité** : Authentification, autorisations
- **Base de données** : Requêtes, connexions

#### 📋 Audit Trail
- **Actions utilisateur** : Connexions, modifications
- **Changements système** : Configuration, maintenance
- **Accès aux données** : Consultations, exports
- **Événements de sécurité** : Tentatives, blocages

### Filtrage et Recherche

#### Filtres Disponibles
- **Niveau** : Debug/Info/Warn/Error/Critical
- **Catégorie** : Système/Sécurité/Utilisateur/Performance
- **Période** : Date de début et fin
- **Utilisateur** : Actions d'un utilisateur spécifique
- **IP** : Activités depuis une adresse

#### Recherche Textuelle
- **Mots-clés** : Dans le message ou détails
- **Expressions** : Recherche exacte avec guillemets
- **Exclusion** : Préfixe avec "-" pour exclure

### Export des Données

#### Formats Supportés
- **JSON** : Structure complète, lisible par machine
- **CSV** : Tableur, analyse statistique

#### Configuration d'Export
1. **Période** : Sélectionner la plage de dates
2. **Filtres** : Appliquer les critères
3. **Format** : Choisir JSON ou CSV
4. **Détails** : Inclure/exclure les métadonnées
5. **Limite** : Maximum 100,000 enregistrements
6. **Télécharger** : Fichier généré automatiquement

## 🚨 Gestion des Alertes

### Types d'Alertes

#### ⚡ Performance
- **CPU** : > 90% pendant 5 minutes
- **Mémoire** : > 85% pendant 10 minutes
- **Disque** : > 90% d'utilisation
- **Réponse** : > 2 secondes en moyenne

#### 🔒 Sécurité
- **Tentatives** : > 10 échecs de connexion/heure
- **Blocages** : Nouvelles IPs bloquées
- **Privilèges** : Élévation de permissions
- **Accès** : Connexions inhabituelles

#### 🔧 Système
- **Erreurs** : Taux > 5% sur 15 minutes
- **Services** : Arrêt inattendu
- **Base de données** : Connexions échouées
- **Sauvegardes** : Échecs ou retards

### Configuration des Seuils

1. **Accéder** : Configuration → Monitoring → Alertes
2. **Modifier** : Valeurs des seuils
3. **Tester** : Déclencher une alerte test
4. **Valider** : Vérifier la réception
5. **Documenter** : Noter les changements

### Escalade des Alertes

#### Niveau 1 - Information
- **Notification** : In-app uniquement
- **Délai** : Immédiat
- **Action** : Surveillance

#### Niveau 2 - Avertissement
- **Notification** : In-app + Email
- **Délai** : 5 minutes
- **Action** : Investigation

#### Niveau 3 - Critique
- **Notification** : Tous les canaux
- **Délai** : Immédiat
- **Action** : Intervention urgente

## 🔧 Dépannage Courant

### Problèmes de Connexion

#### Symptôme : "Identifiants incorrects"
1. **Vérifier** : Nom d'utilisateur et mot de passe
2. **Contrôler** : Verrouillage de compte
3. **Examiner** : Logs de sécurité
4. **Réinitialiser** : Mot de passe si nécessaire

#### Symptôme : "Accès refusé"
1. **Vérifier** : Permissions utilisateur
2. **Contrôler** : Rôle assigné
3. **Examiner** : Audit trail
4. **Corriger** : Permissions si nécessaire

### Problèmes de Performance

#### Symptôme : Interface lente
1. **Vérifier** : Métriques système (CPU, mémoire)
2. **Analyser** : Logs de performance
3. **Optimiser** : Base de données si nécessaire
4. **Redémarrer** : Services si critique

#### Symptôme : Timeouts
1. **Augmenter** : Timeout de session temporairement
2. **Vérifier** : Charge système
3. **Analyser** : Requêtes lentes
4. **Optimiser** : Index de base de données

### Problèmes de Sauvegarde

#### Symptôme : Échec de sauvegarde
1. **Vérifier** : Espace disque disponible
2. **Contrôler** : Permissions d'écriture
3. **Examiner** : Logs d'erreur détaillés
4. **Tester** : Sauvegarde manuelle

#### Symptôme : Sauvegarde corrompue
1. **Vérifier** : Checksum d'intégrité
2. **Utiliser** : Sauvegarde précédente
3. **Analyser** : Cause de corruption
4. **Recréer** : Nouvelle sauvegarde

## 📞 Support et Assistance

### Ressources Disponibles

- **Documentation** : `/docs/ADMIN_SYSTEM.md`
- **Logs détaillés** : Interface d'audit
- **Diagnostic** : Outils intégrés
- **Export** : Données pour analyse

### Informations à Fournir

En cas de problème, rassembler :
1. **Description** : Symptômes observés
2. **Reproduction** : Étapes pour reproduire
3. **Logs** : Messages d'erreur pertinents
4. **Configuration** : Paramètres modifiés récemment
5. **Environnement** : Version, navigateur, OS

---

## ⚠️ Notes Importantes

- **Sauvegardez** régulièrement la configuration
- **Testez** les restaurations périodiquement
- **Surveillez** les alertes de sécurité
- **Mettez à jour** les mots de passe régulièrement
- **Documentez** tous les changements importants

Pour une assistance technique avancée, consultez la documentation complète dans `/docs/ADMIN_SYSTEM.md`.
