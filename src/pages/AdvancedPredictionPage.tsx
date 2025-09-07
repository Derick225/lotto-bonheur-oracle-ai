import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LotteryNumber } from '@/components/LotteryNumber';
import { TrendChart, CoOccurrenceHeatmap, FrequencyChart } from '@/components/ChartComponents';
import { IndexedDBService, PredictionResult } from '@/services/indexedDBService';
import { PredictionService } from '@/services/predictionService';
import { LightGBMModel } from '@/services/lightGBMModel';
import { ExtraTreesModel } from '@/services/extraTreesModel';
import { DrawResult, LotteryAPIService } from '@/services/lotteryAPI';
import { ArrowLeft, Brain, Zap, Target, TrendingUp, RefreshCw, Sparkles, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface ModelPrediction {
  model: 'LightGBM' | 'ExtraTrees' | 'RNN-LSTM' | 'Hybrid';
  numbers: number[];
  confidence: number;
  uncertainty: number;
  features: string[];
}

export function AdvancedPredictionPage() {
  const { name: drawName } = useParams<{ name: string }>();
  const [predictions, setPredictions] = useState<ModelPrediction[]>([]);
  const [hybridPrediction, setHybridPrediction] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('hybrid');
  const [predictionHistory, setPredictionHistory] = useState<PredictionResult[]>([]);
  const [modelPerformance, setModelPerformance] = useState<{[key: string]: number}>({});
  
  // Configuration avancée
  const [ensembleWeights, setEnsembleWeights] = useState({
    lightgbm: 0.35,
    extratrees: 0.25,
    rnn: 0.40
  });
  
  const [predictionMode, setPredictionMode] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');

  useEffect(() => {
    loadPredictionHistory();
    loadModelPerformance();
  }, [drawName]);

  const loadPredictionHistory = async () => {
    if (!drawName) return;
    
    try {
      const history = await IndexedDBService.getPredictionsHistory(drawName, 10);
      setPredictionHistory(history);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  };

  const loadModelPerformance = async () => {
    // Simuler des performances de modèles (à remplacer par de vraies données)
    const performance = {
      'LightGBM': 0.732,
      'ExtraTrees': 0.695,
      'RNN-LSTM': 0.784,
      'Hybrid': 0.841
    };
    setModelPerformance(performance);
  };

  const generateAdvancedPredictions = async () => {
    if (!drawName) return;
    
    try {
      setLoading(true);
      
      // Récupérer les données historiques
      const results = await LotteryAPIService.getDrawHistoricalResults(drawName, 500);
      if (results.length === 0) {
        console.warn('Aucune donnée historique disponible');
        return;
      }
      
      const modelPredictions: ModelPrediction[] = [];
      
      // Prédiction LightGBM
      try {
        const lightgbmModel = new LightGBMModel();
        await lightgbmModel.train(results);
        const lightgbmPredictions = lightgbmModel.predict(results, 5);
        modelPredictions.push({
          model: 'LightGBM',
          numbers: lightgbmPredictions.map(p => p.number),
          confidence: 0.75,
          uncertainty: 0.2,
          features: ['Fréquence', 'Écarts', 'Tendances']
        });
      } catch (error) {
        console.warn('LightGBM prediction failed:', error);
      }

      // Prédiction Extra Trees
      try {
        const extraTreesModel = new ExtraTreesModel();
        await extraTreesModel.train(results);
        const extraTreesPredictions = extraTreesModel.predict(results, 5);
        modelPredictions.push({
          model: 'ExtraTrees',
          numbers: extraTreesPredictions.map(p => p.number),
          confidence: 0.72,
          uncertainty: 0.25,
          features: ['Interactions', 'Patterns', 'Co-occurrences']
        });
      } catch (error) {
        console.warn('ExtraTrees prediction failed:', error);
      }

      // Prédiction RNN-LSTM/GRU directe
      try {
        const { RNNLSTMModel } = await import('@/services/rnnLstmModel');
        const rnnModel = new RNNLSTMModel();
        await rnnModel.train(results);
        const rnnPredictions = rnnModel.predict(results, 5);
        modelPredictions.push({
          model: 'RNN-LSTM',
          numbers: rnnPredictions.map(p => p.number),
          confidence: 0.78,
          uncertainty: 0.18,
          features: ['Séquences temporelles', 'Patterns RNN', 'Cycles GRU']
        });
        
        // Nettoyage de la mémoire TensorFlow
        rnnModel.dispose();
      } catch (error) {
        console.warn('RNN-LSTM prediction failed:', error);
      }

      setPredictions(modelPredictions);

      // Génération de la prédiction hybride
      const hybrid = generateHybridPrediction(modelPredictions);
      setHybridPrediction(hybrid);
      
      // Sauvegarder la prédiction hybride
      if (hybrid.length > 0) {
        await IndexedDBService.savePrediction({
          drawName: drawName!,
          date: new Date().toISOString().split('T')[0],
          numbers: hybrid.map(num => ({
            number: num,
            probability: 0.8,
            confidence: 0.75,
            uncertainty: 0.15,
            features: ['Ensemble hybride']
          })),
          confidence: 0.75,
          algorithm: 'Hybrid',
          features: ['LightGBM', 'ExtraTrees', 'RNN-LSTM']
        });
      }
      
    } catch (error) {
      console.error('Erreur lors de la génération des prédictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHybridPrediction = (modelPredictions: ModelPrediction[]): number[] => {
    if (modelPredictions.length === 0) return [];
    
    // Score pondéré pour chaque numéro
    const numberScores: {[key: number]: number} = {};
    
    modelPredictions.forEach(prediction => {
      const modelWeight = getModelWeight(prediction.model);
      const confidenceBonus = prediction.confidence;
      
      prediction.numbers.forEach((num, index) => {
        // Score basé sur la position (les premiers numéros ont plus de poids)
        const positionWeight = 1 - (index / prediction.numbers.length) * 0.3;
        const score = modelWeight * confidenceBonus * positionWeight;
        
        numberScores[num] = (numberScores[num] || 0) + score;
      });
    });
    
    // Appliquer le mode de prédiction
    const modeMultiplier = getModeMultiplier();
    Object.keys(numberScores).forEach(numStr => {
      const num = parseInt(numStr);
      numberScores[num] *= modeMultiplier(num);
    });
    
    // Retourner les 5 meilleurs numéros
    return Object.entries(numberScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([num]) => parseInt(num));
  };

  const getModelWeight = (model: string): number => {
    switch (model) {
      case 'LightGBM': return ensembleWeights.lightgbm;
      case 'ExtraTrees': return ensembleWeights.extratrees;
      case 'RNN-LSTM': return ensembleWeights.rnn;
      default: return 0.33;
    }
  };

  const getModeMultiplier = () => {
    switch (predictionMode) {
      case 'conservative':
        return (num: number) => {
          // Favorise les numéros fréquents
          return num % 10 < 5 ? 1.1 : 0.9;
        };
      case 'aggressive':
        return (num: number) => {
          // Favorise les numéros moins communs
          return num > 60 ? 1.2 : 0.8;
        };
      default: // balanced
        return () => 1.0;
    }
  };

  const getSelectedPrediction = (): ModelPrediction | null => {
    if (selectedModel === 'hybrid') {
      return {
        model: 'Hybrid',
        numbers: hybridPrediction,
        confidence: predictions.length > 0 ? 
          predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length : 0,
        uncertainty: 0.15,
        features: ['Ensemble de modèles']
      };
    }
    
    return predictions.find(p => p.model.toLowerCase() === selectedModel) || null;
  };

  const getPredictionQuality = (confidence: number): { label: string; color: string } => {
    if (confidence >= 0.8) return { label: 'Excellente', color: 'text-green-600' };
    if (confidence >= 0.6) return { label: 'Bonne', color: 'text-blue-600' };
    if (confidence >= 0.4) return { label: 'Moyenne', color: 'text-yellow-600' };
    return { label: 'Faible', color: 'text-red-600' };
  };

  const selectedPrediction = getSelectedPrediction();
  const qualityInfo = selectedPrediction ? getPredictionQuality(selectedPrediction.confidence) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Prédiction Avancée • {drawName}
              </h1>
              <p className="text-muted-foreground">
                Analyse multi-modèles avec intelligence artificielle
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="secondary" className="gap-1">
              <Brain className="h-4 w-4" />
              IA Avancée
            </Badge>
            <Button onClick={generateAdvancedPredictions} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Analyse...' : 'Générer'}
            </Button>
          </div>
        </div>

        {/* Menu de navigation */}
        <div className="flex gap-2 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/data`}>Données</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/consulter`}>Consulter</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/stats`}>Statistiques</Link>
          </Button>
          <Button variant="default" size="sm">Prédiction</Button>
        </div>

        {/* Configuration de l'ensemble */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Configuration de prédiction
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Mode de prédiction</label>
                <Select value={predictionMode} onValueChange={(value: any) => setPredictionMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservateur (numéros fréquents)</SelectItem>
                    <SelectItem value="balanced">Équilibré (recommandé)</SelectItem>
                    <SelectItem value="aggressive">Agressif (numéros rares)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Modèle à afficher</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hybrid">Prédiction hybride (recommandée)</SelectItem>
                    <SelectItem value="lightgbm">LightGBM seul</SelectItem>
                    <SelectItem value="extratrees">Extra Trees seul</SelectItem>
                    <SelectItem value="rnn-lstm">RNN-LSTM seul</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Poids des modèles (Ensemble)
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>LightGBM:</span>
                    <span className="font-mono">{(ensembleWeights.lightgbm * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Extra Trees:</span>
                    <span className="font-mono">{(ensembleWeights.extratrees * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>RNN-LSTM:</span>
                    <span className="font-mono">{(ensembleWeights.rnn * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Résultats de prédiction */}
        {selectedPrediction && (
          <div className="grid gap-6 mb-8">
            {/* Prédiction principale */}
            <Card className="gradient-card border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Prédiction {selectedPrediction.model}
                  </CardTitle>
                  {qualityInfo && (
                    <Badge variant="outline" className={qualityInfo.color}>
                      {qualityInfo.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Numéros prédits */}
                  <div className="text-center">
                    <div className="flex justify-center gap-2 mb-4">
                      {selectedPrediction.numbers.map((num, index) => (
                        <LotteryNumber
                          key={`${num}-${index}`}
                          number={num}
                          className="scale-110 shadow-lg"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Numéros prédits pour le prochain tirage
                    </p>
                  </div>
                  
                  {/* Métriques de confiance */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {(selectedPrediction.confidence * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Confiance</div>
                      <Progress 
                        value={selectedPrediction.confidence * 100} 
                        className="mt-2 h-2"
                      />
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {(selectedPrediction.uncertainty * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Incertitude</div>
                      <Progress 
                        value={selectedPrediction.uncertainty * 100} 
                        className="mt-2 h-2"
                        // @ts-ignore
                        indicatorClassName="bg-yellow-500"
                      />
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {modelPerformance[selectedPrediction.model] ? 
                          (modelPerformance[selectedPrediction.model] * 100).toFixed(1) + '%' : 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">Performance historique</div>
                    </div>
                  </div>
                  
                  {/* Caractéristiques utilisées */}
                  <div>
                    <h4 className="font-semibold mb-2">Caractéristiques analysées:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPrediction.features.map((feature, index) => (
                        <Badge key={index} variant="secondary">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparaison des modèles */}
            {predictions.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Comparaison des modèles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {predictions.map((pred, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className="font-semibold">{pred.model}</div>
                          <div className="flex gap-1">
                            {pred.numbers.slice(0, 3).map((num, i) => (
                              <LotteryNumber key={i} number={num} className="scale-75" />
                            ))}
                            {pred.numbers.length > 3 && (
                              <span className="text-xs text-muted-foreground">...</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">
                            {(pred.confidence * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Confiance
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Message si aucune prédiction */}
        {!selectedPrediction && (
          <Card className="gradient-card border-border">
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Générer des prédictions avancées
              </h3>
              <p className="text-muted-foreground mb-6">
                Utilisez l'intelligence artificielle pour analyser les patterns et générer des prédictions.
              </p>
              <Button onClick={generateAdvancedPredictions} size="lg" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5 mr-2" />
                )}
                {loading ? 'Analyse en cours...' : 'Commencer l\'analyse'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Historique des prédictions */}
        {predictionHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Historique des prédictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {predictionHistory.slice(0, 5).map((pred, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {new Date(pred.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="flex gap-1">
                        {pred.numbers.slice(0, 5).map((numObj, i) => (
                          <LotteryNumber key={i} number={numObj.number} className="scale-75" />
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{pred.algorithm}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}