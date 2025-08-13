import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { LotteryNumber } from '@/components/LotteryNumber';
import { ArrowLeft, Brain, TrendingUp, Target, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PredictionService } from '@/services/predictionService';
import { toast } from 'sonner';

const DrawPredictionPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const drawName = name ? decodeURIComponent(name) : "Tirage";
  
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les prédictions ML
  useEffect(() => {
    const loadPredictions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await PredictionService.generatePrediction({ 
          drawName, 
          algorithm: 'hybrid', 
          topN: 5 
        });
        
        // Transformer le résultat pour l'interface
        const transformedPredictions = {
          recommended: result.numbers.slice(0, 5),
          confidence: Math.round(result.confidence * 100),
          nextDraw: "Prochain tirage",
          analysis: {
            hotNumbers: result.numbers.slice(0, 3),
            coldNumbers: result.metadata?.alternativePredictions?.[0] || result.numbers.slice(-3),
            patterns: [
              `${result.algorithm} Analysis`,
              `${result.metadata?.features?.totalDraws || 'N/A'} tirages analysés`,
              `Confiance: ${Math.round(result.confidence * 100)}%`
            ]
          },
          modelInfo: {
            modelUsed: result.algorithm,
            totalResults: result.metadata?.features?.totalDraws || 0,
            confidenceScore: result.confidence
          }
        };
        
        setPredictions(transformedPredictions);
        toast.success('Prédictions IA générées avec succès');
      } catch (err) {
        console.error('Erreur lors de la génération des prédictions:', err);
        setError('Impossible de générer les prédictions. Utilisation des données de fallback.');
        
        // Fallback avec données de démonstration
        setPredictions({
          recommended: [7, 14, 23, 31, 42],
          confidence: 65,
          nextDraw: "Prochain tirage",
          analysis: {
            hotNumbers: [7, 14, 23],
            coldNumbers: [1, 8, 15],
            patterns: ["Analyse statistique", "Tendances historiques", "Mode fallback"]
          },
          modelInfo: {
            modelUsed: 'Statistique (Fallback)',
            totalResults: 0,
            confidenceScore: 0.65
          }
        });
        toast.error('Mode fallback activé');
      } finally {
        setLoading(false);
      }
    };

    loadPredictions();
  }, [drawName]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prédictions IA</h1>
            <p className="text-muted-foreground">{drawName}</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Génération des prédictions IA...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-3">
              {[1,2,3,4,5].map(i => (
                <Skeleton key={i} className="w-12 h-12 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prédictions IA</h1>
          <p className="text-muted-foreground">{drawName}</p>
        </div>
      </div>

      {/* Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Les prédictions sont basées sur l'analyse ML des données historiques. Elles ne garantissent pas un gain.
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Prédiction principale */}
      {predictions && (
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Numéros Recommandés
              <Badge variant="secondary" className="ml-auto">
                Confiance: {predictions.confidence}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center gap-3">
              {predictions.recommended.map((number: number, index: number) => (
                <LotteryNumber key={index} number={number} size="lg" />
              ))}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Niveau de confiance IA</span>
                <span className="font-medium">{predictions.confidence}%</span>
              </div>
              <Progress value={predictions.confidence} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Modèle utilisé:</span>
                <span className="font-medium ml-2">{predictions.modelInfo?.modelUsed || 'IA Hybride'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Données analysées:</span>
                <span className="font-medium ml-2">{predictions.modelInfo?.totalResults || 'N/A'} tirages</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{predictions.nextDraw}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analyse détaillée */}
      {predictions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-red-500" />
                Numéros Chauds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 justify-center">
                {predictions.analysis.hotNumbers.map((number: number, index: number) => (
                  <LotteryNumber key={index} number={number} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Haute probabilité IA
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Numéros Alternatifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 justify-center">
                {predictions.analysis.coldNumbers.map((number: number, index: number) => (
                  <LotteryNumber key={index} number={number} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Options secondaires
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Insights IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {predictions.analysis.patterns.map((pattern: string, index: number) => (
                  <Badge key={index} variant="outline" className="block text-center">
                    {pattern}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Button asChild>
          <Link to={`/draw/${encodeURIComponent(drawName)}/stats`}>
            Voir les Statistiques
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/draw/${encodeURIComponent(drawName)}/data`}>
            Historique des Données
          </Link>
        </Button>
      </div>
    </div>
  );
};

export { DrawPredictionPage };
export default DrawPredictionPage;