# Guide d'Utilisation - Service API et Synchronisation Améliorés

## 🚀 Démarrage Rapide

### Lancement de l'Application
```bash
npm install
npm run dev
```

L'application sera disponible sur `http://localhost:8080`

### Premier Lancement
Au premier démarrage, l'application va automatiquement :
1. 🔄 Initialiser la base de données locale (IndexedDB)
2. 📥 Récupérer l'historique complet depuis janvier 2024
3. 💾 Mettre en cache les données pour l'accès hors ligne
4. ⚡ Démarrer la synchronisation automatique

## 🧪 Tests et Validation

### Tests Rapides dans la Console
Ouvrez la console du navigateur (F12) et exécutez :

```javascript
// Test rapide de l'API
await window.lotteryTests.quickAPITest();

// Test détaillé avec métriques
await window.lotteryTests.detailedAPITest();

// Afficher les statistiques de la base de données
await window.lotteryTests.showDatabaseStats();

// Test de récupération historique (peut prendre du temps)
await window.lotteryTests.testHistoricalData();
```

### Résultats Attendus
```
🧪 Test rapide de l'API...

1️⃣ Test de récupération des données récentes...
✅ 28 résultats récupérés
📊 Exemple: Cash - 2025-07-18
🎯 Numéros: [35, 2, 5, 12, 36]

2️⃣ Test pour un tirage spécifique...
✅ 4 résultats pour "Cash"

3️⃣ Test de synchronisation...
✅ Sync: Succès
📈 0 nouveaux, 28 total

🎉 Tous les tests réussis !
```

## 📱 Utilisation de l'Interface

### Page d'Accueil
- **Navigation par tirages** : Cliquez sur un tirage pour accéder à ses données
- **Indicateur de statut** : Badge en haut à droite indiquant le statut de connexion

### Pages de Tirages
Chaque tirage dispose de 5 sections :

1. **📊 Données** : Résultats récents avec indicateurs de synchronisation
2. **🔍 Consulter** : Analyse de régularité des numéros
3. **📈 Statistiques** : Fréquences et tendances
4. **🎯 Prédiction** : Algorithmes de prédiction IA
5. **📚 Historique** : Données complètes avec filtres

### Interface Administrateur
Accessible via `/admin` avec 3 onglets :

1. **🗄️ Gestion des Données**
   - Ajouter/modifier/supprimer des résultats
   - Export des données en JSON
   - Validation automatique des saisies

2. **🔄 Synchronisation**
   - Statut détaillé de la synchronisation
   - Synchronisation manuelle
   - Métriques de performance

3. **📊 Statistiques**
   - Nombre total d'enregistrements
   - Répartition par tirages
   - Statistiques de couverture

## 🔧 Fonctionnalités Avancées

### Synchronisation Automatique
- **Intervalle** : Toutes les 10 minutes
- **Intelligent** : Uniquement si en ligne et pas déjà en cours
- **Incrémental** : Récupère seulement les nouvelles données

### Mode Hors Ligne
- **Cache persistant** : Données disponibles sans connexion
- **Indicateurs visuels** : Badge "Hors ligne" clairement visible
- **Synchronisation différée** : Mise à jour automatique au retour en ligne

### Gestion d'Erreurs
- **Fallback automatique** : Basculement vers le cache local
- **Messages informatifs** : Alertes utilisateur en cas de problème
- **Retry intelligent** : Nouvelle tentative automatique

## 🛠️ Utilisation Programmatique

### Service API
```typescript
import { LotteryAPIService } from '@/services/lotteryAPI';

// Récupérer les données récentes
const recentData = await LotteryAPIService.fetchResults();

// Récupérer pour un tirage spécifique
const cashResults = await LotteryAPIService.getDrawResults('Cash', 50);

// Récupérer l'historique complet
const historical = await LotteryAPIService.fetchHistoricalData(2024);
```

### Service de Synchronisation
```typescript
import { SyncService } from '@/services/syncService';

// Synchronisation incrémentale
const syncResult = await SyncService.performIncrementalSync();

// Récupération avec fallback automatique
const results = await SyncService.getDrawResults('Réveil', 20);

// Statut de synchronisation
const status = await SyncService.getSyncStatus();
```

### Hook Personnalisé
```typescript
import { useSync, useDrawResults } from '@/hooks/useSync';

// Dans un composant React
function MyComponent() {
  const { status, sync, error } = useSync({
    autoSync: true,
    onSyncComplete: (result) => console.log('Sync terminée:', result)
  });

  // Ou plus simplement pour un tirage
  const { results, loading, error } = useDrawResults('Cash', 10);
  
  return (
    <div>
      {loading ? 'Chargement...' : `${results.length} résultats`}
    </div>
  );
}
```

## 📊 Monitoring et Debug

### Console de Debug
L'application affiche des logs détaillés dans la console :

```
Récupéré 28 résultats pour juillet 2025
Sauvegardé 0 nouveaux résultats dans IndexedDB
Synchronisation terminée: 0 nouveaux résultats
```

### Métriques Disponibles
- **Temps de réponse API** : Durée des requêtes
- **Taille du cache** : Nombre d'enregistrements locaux
- **Taux de succès** : Pourcentage de synchronisations réussies
- **Dernière synchronisation** : Horodatage précis

### Indicateurs Visuels
- 🟢 **Vert** : En ligne et synchronisé
- 🟡 **Jaune** : Synchronisation en cours
- 🔴 **Rouge** : Erreur ou hors ligne
- ⚪ **Gris** : Données en cache uniquement

## 🔍 Dépannage

### Problèmes Courants

#### "Aucune donnée disponible"
1. Vérifiez la connexion internet
2. Ouvrez la console pour voir les erreurs
3. Essayez une synchronisation manuelle
4. Vérifiez que l'API `lotobonheur.ci` est accessible

#### "Erreur de synchronisation"
1. Attendez quelques minutes (limite de taux API)
2. Vérifiez la console pour les détails
3. Essayez de recharger la page
4. Utilisez les données en cache en attendant

#### Performance lente
1. Vérifiez la taille du cache (onglet Statistiques)
2. Nettoyez les anciennes données si nécessaire
3. Réduisez la limite de résultats demandés

### Commandes de Debug
```javascript
// Forcer une synchronisation complète
await SyncService.performInitialSync();

// Nettoyer les anciennes données
await SyncService.cleanupOldData();

// Vérifier l'état de la base de données
const { db } = await import('./src/services/indexedDBService');
console.log('Nombre total:', await db.drawResults.count());
```

## 📈 Optimisations

### Performance
- **Cache intelligent** : 5 minutes de cache pour les requêtes API
- **Déduplication** : Élimination automatique des doublons
- **Lazy loading** : Chargement à la demande des données
- **Bulk operations** : Insertion en lot pour de meilleures performances

### Réseau
- **Compression** : Headers optimisés pour réduire la bande passante
- **Retry automatique** : Nouvelle tentative en cas d'échec temporaire
- **Timeout configuré** : 15 secondes maximum par requête

### Stockage
- **IndexedDB** : Base de données locale performante
- **Compression des données** : Optimisation de l'espace de stockage
- **Nettoyage automatique** : Suppression des données anciennes

## 🎯 Bonnes Pratiques

### Développement
1. **Toujours tester** avec les fonctions de test fournies
2. **Vérifier la console** pour les messages d'erreur
3. **Utiliser les hooks** plutôt que les services directement
4. **Gérer les états de chargement** dans l'interface

### Production
1. **Monitorer les performances** via les métriques
2. **Surveiller les erreurs** dans la console
3. **Tester régulièrement** la synchronisation
4. **Maintenir le cache** en nettoyant les anciennes données

---

**💡 Conseil** : Gardez la console ouverte pendant le développement pour voir les logs de synchronisation et détecter rapidement les problèmes.

**🔗 Support** : En cas de problème, vérifiez d'abord les logs de la console et testez avec les fonctions de debug fournies.
