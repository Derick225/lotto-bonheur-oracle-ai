import { PredictionService } from '../services/predictionService';
import { SyncService } from '../services/syncService';
import { XGBoostModel } from '../services/xgboostModel';
import { RNNLSTMModel } from '../services/rnnLstmModel';
import { FeatureEngineering } from '../services/mlModels';

/**
 * Tests pour le système de prédiction avancé
 */
export class PredictionTestSuite {
  
  /**
   * Test de base du service de prédiction
   */
  static async testBasicPrediction(): Promise<boolean> {
    console.log('🧪 Test de base du service de prédiction...');
    
    try {
      // Récupérer des données de test
      const results = await SyncService.getDrawResults('Cash', 100);
      
      if (results.length < 30) {
        console.warn('⚠️ Données insuffisantes pour le test');
        return false;
      }
      
      // Tester la prédiction hybride
      const prediction = await PredictionService.generatePrediction(
        'Cash',
        results,
        'Hybrid'
      );
      
      // Vérifications
      const isValid = 
        prediction.numbers.length === 5 &&
        prediction.confidence > 0 &&
        prediction.confidence <= 1 &&
        prediction.numbers.every(num => 
          num.number >= 1 && 
          num.number <= 90 && 
          num.probability > 0 && 
          num.probability <= 1
        );
      
      console.log(`✅ Prédiction générée: ${prediction.numbers.map(n => n.number).join(', ')}`);
      console.log(`📊 Confiance: ${(prediction.confidence * 100).toFixed(1)}%`);
      console.log(`🤖 Algorithme: ${prediction.algorithm}`);
      
      return isValid;
      
    } catch (error) {
      console.error('❌ Erreur lors du test de prédiction:', error);
      return false;
    }
  }

  /**
   * Test de l'ingénierie des features
   */
  static async testFeatureEngineering(): Promise<boolean> {
    console.log('🔬 Test de l\'ingénierie des features...');
    
    try {
      const results = await SyncService.getDrawResults('Réveil', 50);
      
      if (results.length < 20) {
        console.warn('⚠️ Données insuffisantes pour le test des features');
        return false;
      }
      
      // Extraire les features
      const features = FeatureEngineering.extractFeatures(results, 20);
      
      // Vérifications
      const isValid = 
        features.frequencies.length === 90 &&
        features.gaps.length === 90 &&
        features.momentum.length === 90 &&
        features.volatility.length === 90 &&
        features.temporalTrends.length === 90 &&
        features.cyclicalFeatures.length === 90 &&
        features.seasonality.length === 90;
      
      console.log('✅ Features extraites:');
      console.log(`  - Fréquences: ${features.frequencies.filter(f => f > 0).length} numéros actifs`);
      console.log(`  - Écarts: ${features.gaps.filter(g => g > 0).length} numéros avec écarts`);
      console.log(`  - Momentum: ${features.momentum.filter(m => m > 0.1).length} numéros avec momentum élevé`);
      
      return isValid;
      
    } catch (error) {
      console.error('❌ Erreur lors du test des features:', error);
      return false;
    }
  }

  /**
   * Test du modèle XGBoost
   */
  static async testXGBoostModel(): Promise<boolean> {
    console.log('🌳 Test du modèle XGBoost...');
    
    try {
      const results = await SyncService.getDrawResults('Cash', 100);
      
      if (results.length < 50) {
        console.warn('⚠️ Données insuffisantes pour l\'entraînement XGBoost');
        return false;
      }
      
      // Créer et entraîner le modèle
      const model = new XGBoostModel({
        epochs: 20, // Réduit pour le test
        batchSize: 16,
        hiddenUnits: 64
      });
      
      console.log('🎯 Entraînement du modèle XGBoost...');
      const metrics = await model.train(results);
      
      console.log(`📈 Métriques d'entraînement:`);
      console.log(`  - Précision: ${(metrics.accuracy * 100).toFixed(1)}%`);
      console.log(`  - F1-Score: ${(metrics.f1Score * 100).toFixed(1)}%`);
      
      // Test de prédiction
      const predictions = await model.predict(results);
      
      const isValid = 
        predictions.length > 0 &&
        predictions.every(pred => 
          pred.number >= 1 && 
          pred.number <= 90 && 
          pred.probability > 0 && 
          pred.probability <= 1
        );
      
      console.log(`🎯 Prédictions XGBoost: ${predictions.slice(0, 5).map(p => `${p.number}(${(p.probability * 100).toFixed(1)}%)`).join(', ')}`);
      
      // Nettoyer
      model.dispose();
      
      return isValid && metrics.accuracy > 0;
      
    } catch (error) {
      console.error('❌ Erreur lors du test XGBoost:', error);
      return false;
    }
  }

  /**
   * Test du modèle RNN-LSTM
   */
  static async testRNNLSTMModel(): Promise<boolean> {
    console.log('🧠 Test du modèle RNN-LSTM...');
    
    try {
      const results = await SyncService.getDrawResults('Réveil', 80);
      
      if (results.length < 40) {
        console.warn('⚠️ Données insuffisantes pour l\'entraînement LSTM');
        return false;
      }
      
      // Créer et entraîner le modèle
      const model = new RNNLSTMModel({
        epochs: 15, // Réduit pour le test
        batchSize: 8,
        hiddenUnits: 128,
        sequenceLength: 15
      });
      
      console.log('🎯 Entraînement du modèle RNN-LSTM...');
      const metrics = await model.train(results);
      
      console.log(`📈 Métriques d'entraînement:`);
      console.log(`  - Précision: ${(metrics.accuracy * 100).toFixed(1)}%`);
      console.log(`  - F1-Score: ${(metrics.f1Score * 100).toFixed(1)}%`);
      
      // Test de prédiction
      const predictions = await model.predict(results);
      
      const isValid = 
        predictions.length > 0 &&
        predictions.every(pred => 
          pred.number >= 1 && 
          pred.number <= 90 && 
          pred.probability > 0 && 
          pred.probability <= 1
        );
      
      console.log(`🎯 Prédictions LSTM: ${predictions.slice(0, 5).map(p => `${p.number}(${(p.probability * 100).toFixed(1)}%)`).join(', ')}`);
      
      // Nettoyer
      model.dispose();
      
      return isValid && metrics.accuracy > 0;
      
    } catch (error) {
      console.error('❌ Erreur lors du test LSTM:', error);
      return false;
    }
  }

  /**
   * Test de comparaison des algorithmes
   */
  static async testAlgorithmComparison(): Promise<boolean> {
    console.log('⚖️ Test de comparaison des algorithmes...');
    
    try {
      const results = await SyncService.getDrawResults('Cash', 100);
      
      if (results.length < 50) {
        console.warn('⚠️ Données insuffisantes pour la comparaison');
        return false;
      }
      
      // Tester chaque algorithme
      const algorithms: Array<'XGBoost' | 'RNN-LSTM' | 'Hybrid'> = ['XGBoost', 'RNN-LSTM', 'Hybrid'];
      const results_comparison: Array<{ algorithm: string; confidence: number; time: number }> = [];
      
      for (const algorithm of algorithms) {
        const startTime = Date.now();
        
        try {
          const prediction = await PredictionService.generatePrediction(
            'Cash',
            results,
            algorithm
          );
          
          const time = Date.now() - startTime;
          
          results_comparison.push({
            algorithm,
            confidence: prediction.confidence,
            time
          });
          
          console.log(`${algorithm}: Confiance=${(prediction.confidence * 100).toFixed(1)}%, Temps=${time}ms`);
          
        } catch (error) {
          console.warn(`⚠️ Erreur avec ${algorithm}:`, error);
        }
      }
      
      // Afficher les résultats
      console.log('\n📊 Résultats de comparaison:');
      results_comparison
        .sort((a, b) => b.confidence - a.confidence)
        .forEach((result, index) => {
          console.log(`${index + 1}. ${result.algorithm}: ${(result.confidence * 100).toFixed(1)}% (${result.time}ms)`);
        });
      
      return results_comparison.length > 0;
      
    } catch (error) {
      console.error('❌ Erreur lors de la comparaison:', error);
      return false;
    }
  }

  /**
   * Test de performance et de mémoire
   */
  static async testPerformance(): Promise<boolean> {
    console.log('⚡ Test de performance et mémoire...');
    
    try {
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const startTime = Date.now();
      
      // Test avec plusieurs tirages
      const drawNames = ['Cash', 'Réveil', 'Fortune'];
      let totalPredictions = 0;
      
      for (const drawName of drawNames) {
        const results = await SyncService.getDrawResults(drawName, 50);
        
        if (results.length >= 30) {
          const prediction = await PredictionService.generatePrediction(
            drawName,
            results,
            'Hybrid'
          );
          totalPredictions++;
          console.log(`✅ ${drawName}: ${prediction.numbers.length} prédictions`);
        }
      }
      
      const endTime = Date.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      const totalTime = endTime - startTime;
      const memoryUsed = endMemory - startMemory;
      
      console.log(`📊 Performance:`);
      console.log(`  - Prédictions générées: ${totalPredictions}`);
      console.log(`  - Temps total: ${totalTime}ms`);
      console.log(`  - Temps moyen: ${(totalTime / totalPredictions).toFixed(0)}ms/prédiction`);
      
      if (memoryUsed > 0) {
        console.log(`  - Mémoire utilisée: ${(memoryUsed / 1024 / 1024).toFixed(1)}MB`);
      }
      
      return totalPredictions > 0 && totalTime < 30000; // Moins de 30 secondes
      
    } catch (error) {
      console.error('❌ Erreur lors du test de performance:', error);
      return false;
    }
  }

  /**
   * Lance tous les tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Démarrage de la suite de tests de prédiction...\n');
    
    const tests = [
      { name: 'Test de base', fn: this.testBasicPrediction },
      { name: 'Ingénierie des features', fn: this.testFeatureEngineering },
      { name: 'Modèle XGBoost', fn: this.testXGBoostModel },
      { name: 'Modèle RNN-LSTM', fn: this.testRNNLSTMModel },
      { name: 'Comparaison algorithmes', fn: this.testAlgorithmComparison },
      { name: 'Performance', fn: this.testPerformance }
    ];
    
    const results: Array<{ name: string; success: boolean; duration: number }> = [];
    
    for (const test of tests) {
      console.log(`\n🧪 ${test.name}...`);
      const startTime = Date.now();
      
      try {
        const success = await test.fn();
        const duration = Date.now() - startTime;
        
        results.push({ name: test.name, success, duration });
        console.log(`${success ? '✅' : '❌'} ${test.name}: ${success ? 'SUCCÈS' : 'ÉCHEC'} (${duration}ms)`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({ name: test.name, success: false, duration });
        console.error(`❌ ${test.name}: ERREUR (${duration}ms)`, error);
      }
    }
    
    // Résumé final
    console.log('\n📋 RÉSUMÉ DES TESTS:');
    console.log('='.repeat(50));
    
    results.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.name}: ${result.success ? 'SUCCÈS' : 'ÉCHEC'} (${result.duration}ms)`);
    });
    
    const successCount = results.filter(r => r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('='.repeat(50));
    console.log(`🏆 RÉSULTAT GLOBAL: ${successCount}/${results.length} tests réussis`);
    console.log(`⏱️ Temps total: ${totalTime}ms`);
    console.log(`${successCount === results.length ? '🎉 TOUS LES TESTS RÉUSSIS!' : '⚠️ CERTAINS TESTS ONT ÉCHOUÉ'}`);
  }
}

// Exporter pour utilisation dans la console
if (typeof window !== 'undefined') {
  (window as any).PredictionTests = PredictionTestSuite;
  
  console.log('🧪 Tests de prédiction disponibles:');
  console.log('  - window.PredictionTests.runAllTests(): Lance tous les tests');
  console.log('  - window.PredictionTests.testBasicPrediction(): Test de base');
  console.log('  - window.PredictionTests.testXGBoostModel(): Test XGBoost');
  console.log('  - window.PredictionTests.testRNNLSTMModel(): Test LSTM');
}
