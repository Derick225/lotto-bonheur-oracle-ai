/**
 * Script de test simple pour vérifier le fonctionnement de l'API
 * Peut être exécuté dans la console du navigateur
 */

import { LotteryAPIService } from '../services/lotteryAPI';
import { SyncService } from '../services/syncService';

export async function quickAPITest() {
  console.log('🧪 Test rapide de l\'API...\n');
  
  try {
    // Test 1: Récupération des données récentes
    console.log('1️⃣ Test de récupération des données récentes...');
    const recentData = await LotteryAPIService.fetchResults();
    console.log(`✅ ${recentData.data.length} résultats récupérés`);
    
    if (recentData.data.length > 0) {
      const sample = recentData.data[0];
      console.log(`📊 Exemple: ${sample.draw_name} - ${sample.date}`);
      console.log(`🎯 Numéros: [${sample.gagnants.join(', ')}]`);
    }
    
    // Test 2: Test d'un tirage spécifique
    console.log('\n2️⃣ Test pour un tirage spécifique...');
    const cashResults = await LotteryAPIService.getDrawResults('Cash', 5);
    console.log(`✅ ${cashResults.length} résultats pour "Cash"`);
    
    // Test 3: Test de synchronisation
    console.log('\n3️⃣ Test de synchronisation...');
    const syncResult = await SyncService.performIncrementalSync();
    console.log(`✅ Sync: ${syncResult.success ? 'Succès' : 'Échec'}`);
    console.log(`📈 ${syncResult.newRecords} nouveaux, ${syncResult.totalRecords} total`);
    
    console.log('\n🎉 Tous les tests réussis !');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    return false;
  }
}

export async function detailedAPITest() {
  console.log('🔬 Test détaillé de l\'API...\n');
  
  const results = {
    apiTest: false,
    syncTest: false,
    dataValidation: false,
    performanceTest: false
  };
  
  try {
    // Test API
    console.log('🌐 Test du service API...');
    const startTime = Date.now();
    const apiData = await LotteryAPIService.fetchResults();
    const apiDuration = Date.now() - startTime;
    
    results.apiTest = apiData.success && apiData.data.length > 0;
    console.log(`${results.apiTest ? '✅' : '❌'} API: ${apiData.data.length} résultats en ${apiDuration}ms`);
    
    // Test de validation des données
    console.log('\n🔍 Validation des données...');
    let validCount = 0;
    let invalidCount = 0;
    
    apiData.data.forEach(result => {
      const isValid = 
        result.draw_name && 
        result.date && 
        Array.isArray(result.gagnants) && 
        result.gagnants.length === 5 &&
        result.gagnants.every(num => num >= 1 && num <= 90);
      
      if (isValid) validCount++;
      else invalidCount++;
    });
    
    results.dataValidation = invalidCount === 0;
    console.log(`${results.dataValidation ? '✅' : '❌'} Validation: ${validCount} valides, ${invalidCount} invalides`);
    
    // Test de synchronisation
    console.log('\n🔄 Test de synchronisation...');
    const syncStartTime = Date.now();
    const syncResult = await SyncService.performIncrementalSync();
    const syncDuration = Date.now() - syncStartTime;
    
    results.syncTest = syncResult.success;
    console.log(`${results.syncTest ? '✅' : '❌'} Sync: ${syncResult.message} en ${syncDuration}ms`);
    
    // Test de performance
    console.log('\n⚡ Test de performance...');
    const perfStartTime = Date.now();
    const perfResults = await SyncService.getDrawResults('Réveil', 10);
    const perfDuration = Date.now() - perfStartTime;
    
    results.performanceTest = perfDuration < 2000; // Moins de 2 secondes
    console.log(`${results.performanceTest ? '✅' : '❌'} Performance: ${perfResults.length} résultats en ${perfDuration}ms`);
    
    // Résumé
    console.log('\n📊 RÉSUMÉ DES TESTS:');
    Object.entries(results).forEach(([test, success]) => {
      console.log(`${success ? '✅' : '❌'} ${test}: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
    });
    
    const allSuccess = Object.values(results).every(Boolean);
    console.log(`\n🏆 RÉSULTAT GLOBAL: ${allSuccess ? '✅ TOUS LES TESTS RÉUSSIS' : '❌ CERTAINS TESTS ONT ÉCHOUÉ'}`);
    
    return allSuccess;
    
  } catch (error) {
    console.error('❌ Erreur lors des tests détaillés:', error);
    return false;
  }
}

// Fonction pour tester la récupération historique (attention: peut être long)
export async function testHistoricalData() {
  console.log('📚 Test de récupération historique (peut prendre du temps)...\n');
  
  try {
    console.log('⏳ Récupération de l\'historique depuis janvier 2024...');
    const startTime = Date.now();
    
    const historicalData = await LotteryAPIService.fetchHistoricalData(2024);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Historique récupéré: ${historicalData.data.length} résultats`);
    console.log(`⏱️ Durée: ${Math.round(duration / 1000)}s`);
    
    if (historicalData.data.length > 0) {
      // Analyser la répartition par mois
      const monthStats: { [key: string]: number } = {};
      historicalData.data.forEach(result => {
        const month = result.date.substring(0, 7); // YYYY-MM
        monthStats[month] = (monthStats[month] || 0) + 1;
      });
      
      console.log('\n📅 Répartition par mois:');
      Object.entries(monthStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, count]) => {
          console.log(`  ${month}: ${count} résultats`);
        });
      
      // Analyser la répartition par tirage
      const drawStats: { [key: string]: number } = {};
      historicalData.data.forEach(result => {
        drawStats[result.draw_name] = (drawStats[result.draw_name] || 0) + 1;
      });
      
      console.log('\n🎯 Top 5 des tirages:');
      Object.entries(drawStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([draw, count]) => {
          console.log(`  ${draw}: ${count} résultats`);
        });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test historique:', error);
    return false;
  }
}

// Fonction utilitaire pour afficher les statistiques de la base de données
export async function showDatabaseStats() {
  console.log('📊 Statistiques de la base de données...\n');
  
  try {
    const status = await SyncService.getSyncStatus();
    
    console.log(`📦 Total des enregistrements: ${status.totalRecords.toLocaleString()}`);
    console.log(`🌐 Statut: ${status.isOnline ? 'En ligne' : 'Hors ligne'}`);
    console.log(`🔄 Dernière sync: ${status.lastSync?.toLocaleString() || 'Jamais'}`);
    console.log(`⚡ Sync en cours: ${status.pendingSync ? 'Oui' : 'Non'}`);
    
    return status;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des stats:', error);
    return null;
  }
}

// Exporter toutes les fonctions pour utilisation dans la console
if (typeof window !== 'undefined') {
  (window as any).lotteryTests = {
    quickAPITest,
    detailedAPITest,
    testHistoricalData,
    showDatabaseStats
  };
  
  console.log('🧪 Tests disponibles dans window.lotteryTests:');
  console.log('  - quickAPITest(): Test rapide');
  console.log('  - detailedAPITest(): Test détaillé');
  console.log('  - testHistoricalData(): Test historique');
  console.log('  - showDatabaseStats(): Statistiques DB');
}
