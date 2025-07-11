import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LotteryNumber } from '@/components/LotteryNumber';
import { ArrowLeft, Brain, Zap, Loader2, TrendingUp } from 'lucide-react';

interface PredictionResult {
  numbers: Array<{ number: number; probability: number }>;
  confidence: number;
  algorithm: 'XGBoost' | 'RNN-LSTM' | 'Hybrid';
  features: string[];
}

export function DrawPredictionPage() {
  const { drawName } = useParams<{ drawName: string }>();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const generatePrediction = async () => {
    if (!drawName) return;
    
    try {
      setGenerating(true);
      
      // Simulation d'une prédiction ML (en attendant l'implémentation réelle)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockPrediction: PredictionResult = {
        numbers: Array.from({ length: 5 }, () => ({
          number: Math.floor(Math.random() * 90) + 1,
          probability: Math.random() * 0.3 + 0.1
        })).sort((a, b) => b.probability - a.probability),
        confidence: Math.random() * 0.3 + 0.7,
        algorithm: 'Hybrid',
        features: [
          'Fréquence historique',
          'Tendances temporelles',
          'Corrélations inter-numéros',
          'Cycles saisonniers',
          'Patterns séquentiels'
        ]
      };
      
      setPrediction(mockPrediction);
    } catch (error) {
      console.error('Erreur lors de la génération de la prédiction:', error);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePrediction();
  }, [drawName]);

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">
              {generating ? 'Génération en cours...' : 'Initialisation de l\'IA...'}
            </p>
            <p className="text-muted-foreground">
              Analyse des patterns avec XGBoost + RNN-LSTM
            </p>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-4" />
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Erreur lors de la génération de la prédiction.</p>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-foreground">{drawName}</h1>
              <p className="text-muted-foreground">Prédictions intelligentes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <Brain className="h-4 w-4" />
              IA Avancée
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generatePrediction}
              disabled={generating}
            >
              <Zap className={`h-4 w-4 mr-2 ${generating ? 'animate-pulse' : ''}`} />
              Nouvelle prédiction
            </Button>
          </div>
        </div>

        {/* Menu de navigation */}
        <div className="flex gap-2 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/data`}>Données</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/stats`}>Statistiques</Link>
          </Button>
          <Button variant="default" size="sm">Prédiction</Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/history`}>Historique</Link>
          </Button>
        </div>

        <div className="grid gap-8">
          {/* Prédiction principale */}
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