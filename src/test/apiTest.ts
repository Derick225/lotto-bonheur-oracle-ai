import { LotteryAPIService } from '../services/lotteryAPI';
import { SyncService } from '../services/syncService';

/**
 * Test du service API amélioré
 */
async function testAPIService() {
  console.log('=== Test du Service API Loterie ===\n');

  try {
    // Test 1: Récupération des données récentes
    console.log('1. Test de récupération des données récentes...');
    const recentData = await LotteryAPIService.fetchResults();
    console.log(`✅ Succès: ${recentData.data.length} résultats récupérés`);
    console.log(`   Status: ${recentData.success}`);
    console.log(`   Total: ${recentData.totalCount || 'N/A'}`);
    
    if (recentData.data.length > 0) {
      const sample = recentData.data[0];
      console.log(`   Exemple: ${sample.draw_name} - ${sample.date} - [${sample.gagnants.join(', ')}]`);
    }
    console.log('');

    // Test 2: Récupération pour un tirage spécifique
    console.log('2. Test de récupération pour un tirage spécifique...');
    const drawResults = await LotteryAPIService.getDrawResults('Cash', 10);
    console.log(`✅ Succès: ${drawResults.length} résultats pour "Cash"`);
    
    if (drawResults.length > 0) {
      drawResults.slice(0, 3).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.date}: [${result.gagnants.join(', ')}]${result.machine ? ` | Machine: [${result.machine.join(', ')}]` : ''}`);
      });
    }
    console.log('');

    // Test 3: Test de récupération historique (limité pour le test)
    console.log('3. Test de récupération historique...');
    const historicalData = await LotteryAPIService.fetchHistoricalData(2024);
    console.log(`✅ Succès: ${historicalData.data.length} résultats historiques`);
    console.log(`   Status: ${historicalData.success}`);
    console.log(`   Total: ${historicalData.totalCount || 'N/A'}`);
    console.log('');

    // Test 4: Validation des données
    console.log('4. Validation des données...');
    let validCount = 0;
    let invalidCount = 0;
    
    recentData.data.forEach(result => {
      const isValid = 
        result.draw_name && 
        result.date && 
        Array.isArray(result.gagnants) && 
        result.gagnants.length === 5 &&
        result.gagnants.every(num => num >= 1 && num <= 90);
      
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
        console.log(`   ⚠️ Données invalides: ${result.draw_name} - ${result.date}`);
      }
    });
    
    console.log(`✅ Validation: ${validCount} valides, ${invalidCount} invalides`);
    console.log('');

    // Test 5: Test des tirages par jour
    console.log('5. Test de répartition par jour...');
    const dayStats: { [key: string]: number } = {};
    
    recentData.data.forEach(result => {
      dayStats[result.day] = (dayStats[result.day] || 0) + 1;
    });
    
    Object.entries(dayStats).forEach(([day, count]) => {
      console.log(`   ${day}: ${count} tirages`);
    });
    console.log('');

    console.log('=== Tous les tests API réussis! ===');
    return true;

  } catch (error) {
    console.error('❌ Erreur lors des tests API:', error);
    return false;
  }
}

/**
 * Test du service de synchronisation
 */
async function testSyncService() {
  console.log('\n=== Test du Service de Synchronisation ===\n');

  try {
    // Test 1: Statut initial
    console.log('1. Test du statut initial...');
    const initialStatus = await SyncService.getSyncStatus();
    console.log(`✅ Statut: En ligne: ${initialStatus.isOnline}, Enregistrements: ${initialStatus.totalRecords}`);
    console.log('');

    // Test 2: Synchronisation incrémentale
    console.log('2. Test de synchronisation incrémentale...');
    const syncResult = await SyncService.performIncrementalSync();
    console.log(`✅ Résultat: ${syncResult.success ? 'Succès' : 'Échec'}`);
    console.log(`   Message: ${syncResult.message}`);
    console.log(`   Nouveaux: ${syncResult.newRecords}, Total: ${syncResult.totalRecords}`);
    console.log(`   Durée: ${syncResult.duration}ms`);
    console.log('');

    // Test 3: Récupération avec fallback
    console.log('3. Test de récupération avec fallback...');
    const fallbackResults = await SyncService.getDrawResults('Réveil', 5);
    console.log(`✅ Récupéré: ${fallbackResults.length} résultats pour "Réveil"`);
    
    if (fallbackResults.length > 0) {
      fallbackResults.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.date}: [${result.gagnants.join(', ')}]`);
      });
    }
    console.log('');

    // Test 4: Statut final
    console.log('4. Test du statut final...');
    const finalStatus = await SyncService.getSyncStatus();
    console.log(`✅ Statut final: Enregistrements: ${finalStatus.totalRecords}`);
    console.log(`   Dernière sync: ${finalStatus.lastSync?.toLocaleString() || 'Jamais'}`);
    console.log('');

    console.log('=== Tous les tests de synchronisation réussis! ===');
    return true;

  } catch (error) {
    console.error('❌ Erreur lors des tests de synchronisation:', error);
    return false;
  }
}

/**
 * Fonction principale de test
 */
async function runAllTests() {
  console.log('🚀 Démarrage des tests des services améliorés...\n');
  
  const apiSuccess = await testAPIService();
  const syncSuccess = await testSyncService();
  
  console.log('\n=== RÉSUMÉ DES TESTS ===');
  console.log(`API Service: ${apiSuccess ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
  console.log(`Sync Service: ${syncSuccess ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
  console.log(`Global: ${apiSuccess && syncSuccess ? '✅ TOUS LES TESTS RÉUSSIS' : '❌ CERTAINS TESTS ONT ÉCHOUÉ'}`);
}

// Exporter pour utilisation
export { testAPIService, testSyncService, runAllTests };

// Si exécuté directement
if (typeof window !== 'undefined') {
  // Dans le navigateur, attacher à window pour debug
  (window as any).testLotteryServices = { testAPIService, testSyncService, runAllTests };
}
