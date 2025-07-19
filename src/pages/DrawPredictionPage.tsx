import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LotteryNumber } from '@/components/LotteryNumber';
import { AdvancedPredictionDisplay } from '@/components/AdvancedPredictionDisplay';
import { PredictionService, PredictionResult } from '@/services/predictionService';
import { SyncService } from '@/services/syncService';
import { DrawResult } from '@/services/lotteryAPI';
import { ArrowLeft, Brain, Zap, Loader2, TrendingUp, Settings, BarChart3, Activity, Cpu } from 'lucide-react';

// Interface locale supprimée - utilisation de celle du service

export function DrawPredictionPage() {
  const { drawName } = useParams<{ drawName: string }>();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<'XGBoost' | 'RNN-LSTM' | 'Hybrid'>('Hybrid');
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [trainingInProgress, setTrainingInProgress] = useState(false);

  const generatePrediction = async (algorithm: 'XGBoost' | 'RNN-LSTM' | 'Hybrid' = selectedAlgorithm) => {
    if (!drawName) return;

    try {
      setLoading(true);
      setError('');

      console.log(`🎯 Génération de prédiction ${algorithm} pour ${drawName}...`);

      // Récupérer les données historiques via le service de synchronisation
      const results = await SyncService.getDrawResults(drawName, 200);

      if (results.length < 30) {
        throw new Error('Données insuffisantes pour générer une prédiction fiable (minimum 30 tirages)');
      }

      console.log(`📊 ${results.length} tirages récupérés pour l'analyse`);

      // Vérifier si les modèles sont initialisés
      const modelsInfo = PredictionService.getModelsInfo();
      setModelInfo(modelsInfo);

      if (!modelsInfo.isInitialized) {
        console.log('🤖 Initialisation des modèles...');
        await PredictionService.initializeModels();
      }

      // Générer la prédiction avec le nouveau système
      const predictionResult = await PredictionService.generatePrediction(
        drawName,
        results,
        algorithm
      );

      setPrediction(predictionResult);
      console.log('✅ Prédiction générée avec succès');

    } catch (err) {
      console.error('❌ Erreur lors de la génération:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération de la prédiction');
    } finally {
      setLoading(false);
    }
  };

  const handleAlgorithmChange = (algorithm: string) => {
    const alg = algorithm as 'XGBoost' | 'RNN-LSTM' | 'Hybrid';
    setSelectedAlgorithm(alg);
    generatePrediction(alg);
  };

  const handleTrainModels = async () => {
    if (!drawName) return;

    try {
      setTrainingInProgress(true);
      console.log('🎓 Début de l\'entraînement des modèles...');

      // Récupérer toutes les données disponibles pour l'entraînement
      const allResults = await SyncService.getDrawResults(drawName, 1000);

      if (allResults.length < 50) {
        throw new Error('Données insuffisantes pour l\'entraînement (minimum 50 tirages)');
      }

      // Entraîner les modèles
      const metrics = await PredictionService.trainModels(allResults);
      console.log('🏆 Entraînement terminé:', metrics);

      // Régénérer la prédiction avec les modèles entraînés
      await generatePrediction();

    } catch (err) {
      console.error('❌ Erreur lors de l\'entraînement:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'entraînement des modèles');
    } finally {
      setTrainingInProgress(false);
    }
  };

  useEffect(() => {
    generatePrediction();
  }, [drawName]);

  if (!drawName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Tirage non spécifié</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-2xl font-bold">Prédiction IA pour {drawName}</h1>
        </div>

        {/* Informations sur les modèles */}
        {modelInfo && (
          <Alert className="mb-6">
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Modèles: {modelInfo.isInitialized ? '✅ Initialisés' : '⚠️ Non initialisés'}
                  {modelInfo.xgboost?.isTrained && ' | XGBoost: Entraîné'}
                  {modelInfo.lstm?.isTrained && ' | LSTM: Entraîné'}
                </span>
                {!modelInfo.xgboost?.isTrained || !modelInfo.lstm?.isTrained ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTrainModels}
                    disabled={trainingInProgress}
                  >
                    {trainingInProgress ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Entraînement...
                      </>
                    ) : (
                      <>
                        <Brain className="h-3 w-3 mr-1" />
                        Entraîner les Modèles
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Composant de prédiction avancé */}
        <AdvancedPredictionDisplay
          prediction={prediction}
          loading={loading}
          error={error}
          onRefresh={() => generatePrediction()}
          onAlgorithmChange={handleAlgorithmChange}
        />

        <div className="grid gap-8">
          {/* Prédiction principale */}
          {prediction ? (
            <>
              <Card className="gradient-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Numéros prédits pour le prochain tirage
                    </CardTitle>
                    <Badge 
                      variant="outline" 
                      className={`
                        ${prediction.confidence > 0.8 ? 'border-green-400 text-green-400' : 
                          prediction.confidence > 0.6 ? 'border-yellow-400 text-yellow-400' : 
                          'border-red-400 text-red-400'}
                      `}
                    >
                      Confiance: {(prediction.confidence * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-3 justify-center">
                    {prediction.numbers.map((item, index) => (
                      <div key={index} className="text-center space-y-2">
                        <LotteryNumber number={item.number} />
                        <div className="text-xs text-muted-foreground">
                          {(item.probability * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Algorithme utilisé: <span className="text-primary font-medium">{prediction.algorithm}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Détails de l'algorithme */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="gradient-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Caractéristiques analysées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {prediction.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span className="text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Méthode hybride</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">XGBoost</span>
                        <Badge variant="outline">Patterns tabulaires</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">RNN-LSTM</span>
                        <Badge variant="outline">Séquences temporelles</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">Ensemble</span>
                        <Badge variant="outline">Fusion intelligente</Badge>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Les prédictions combinent l'analyse des patterns historiques 
                        avec les tendances temporelles pour optimiser la précision.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            !loading && !error && (
              <Card className="gradient-card border-border">
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Aucune prédiction disponible</h3>
                      <p className="text-sm text-muted-foreground">
                        Cliquez sur "Générer Prédiction" pour commencer l'analyse
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Avertissement */}
          <Card className="gradient-card border-border border-yellow-500/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Avertissement important</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ces prédictions sont générées par des algorithmes d'apprentissage automatique 
                    basés sur l'analyse de données historiques. Elles ne garantissent en aucun cas 
                    les résultats futurs. Les jeux de hasard comportent des risques. 
                    Jouez avec modération et de manière responsable.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}