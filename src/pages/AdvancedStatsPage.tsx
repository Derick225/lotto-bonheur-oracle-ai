import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LotteryNumber, ColorLegend } from '@/components/LotteryNumber';
import { AdvancedVisualization } from '@/components/AdvancedVisualization';
import { PWAManager } from '@/components/PWAManager';
import { SyncService } from '@/services/syncService';
import { DrawResult } from '@/services/lotteryAPI';
import { 
  ArrowLeft, 
  BarChart3, 
  TrendingUp, 
  Grid3X3, 
  Palette, 
  Loader2,
  Calendar,
  Target
} from 'lucide-react';

export function AdvancedStatsPage() {
  const { drawName } = useParams<{ drawName: string }>();
  const [results, setResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (!drawName) return;
      
      try {
        setLoading(true);
        setError('');
        
        console.log(`📊 Chargement des statistiques avancées pour ${drawName}...`);
        
        // Récupérer les données via le service de synchronisation
        const drawResults = await SyncService.getDrawResults(drawName, 300);
        
        if (drawResults.length === 0) {
          throw new Error('Aucune donnée disponible pour ce tirage');
        }
        
        setResults(drawResults);
        console.log(`✅ ${drawResults.length} résultats chargés pour l'analyse`);
        
      } catch (err) {
        console.error('❌ Erreur lors du chargement:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [drawName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <h2 className="text-xl font-semibold">Analyse en cours...</h2>
            <p className="text-muted-foreground">
              Chargement des statistiques avancées pour {drawName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">
              <Target className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!drawName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Tirage non spécifié</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Gestionnaire PWA */}
      <PWAManager className="container mx-auto px-4 pt-4" />
      
      <div className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Statistiques Avancées
              </h1>
              <p className="text-muted-foreground">
                {drawName} • {results.length} tirages analysés
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <BarChart3 className="h-3 w-3" />
              Analyse complète
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {new Date().toLocaleDateString('fr-FR')}
            </Badge>
          </div>
        </div>

        {/* Navigation par onglets */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="advanced">Visualisations</TabsTrigger>
            <TabsTrigger value="colors">Couleurs</TabsTrigger>
            <TabsTrigger value="analysis">Analyse</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Résumé</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total tirages:</span>
                      <span className="font-medium">{results.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Numéros uniques:</span>
                      <span className="font-medium">
                        {new Set(results.flatMap(r => r.gagnants)).size}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Période:</span>
                      <span className="font-medium">
                        {results.length > 0 ? 
                          `${results[results.length - 1].date} - ${results[0].date}` : 
                          'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Top 5 Fréquents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(() => {
                      const frequencies: { [key: number]: number } = {};
                      results.forEach(result => {
                        result.gagnants.forEach(num => {
                          frequencies[num] = (frequencies[num] || 0) + 1;
                        });
                      });
                      
                      return Object.entries(frequencies)
                        .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }))
                        .sort((a, b) => b.frequency - a.frequency)
                        .slice(0, 5)
                        .map((item, index) => (
                          <div key={item.number} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4">
                                #{index + 1}
                              </span>
                              <LotteryNumber number={item.number} size="xs" />
                            </div>
                            <span className="text-sm font-medium">
                              {item.frequency}x
                            </span>
                          </div>
                        ));
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tendances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Numéros en hausse</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                      <span className="text-sm">Numéros en baisse</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Basé sur la comparaison des 50 derniers tirages
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Visualisations avancées */}
          <TabsContent value="advanced" className="space-y-6">
            <AdvancedVisualization results={results} drawName={drawName} />
          </TabsContent>

          {/* Analyse des couleurs */}
          <TabsContent value="colors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Analyse par Couleurs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ColorLegend />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(() => {
                    const colorRanges = [
                      { name: "Blanc", range: [1, 9], color: "lottery-number-1-9" },
                      { name: "Bleu", range: [10, 19], color: "lottery-number-10-19" },
                      { name: "Orange", range: [20, 29], color: "lottery-number-20-29" },
                      { name: "Vert", range: [30, 39], color: "lottery-number-30-39" },
                      { name: "Jaune", range: [40, 49], color: "lottery-number-40-49" },
                      { name: "Rose", range: [50, 59], color: "lottery-number-50-59" },
                      { name: "Indigo", range: [60, 69], color: "lottery-number-60-69" },
                      { name: "Brun", range: [70, 79], color: "lottery-number-70-79" },
                      { name: "Rouge", range: [80, 90], color: "lottery-number-80-90" }
                    ];

                    return colorRanges.map(colorRange => {
                      const count = results.reduce((total, result) => {
                        return total + result.gagnants.filter(num => 
                          num >= colorRange.range[0] && num <= colorRange.range[1]
                        ).length;
                      }, 0);

                      const percentage = results.length > 0 ? (count / (results.length * 5)) * 100 : 0;

                      return (
                        <Card key={colorRange.name}>
                          <CardContent className="pt-4">
                            <div className="text-center space-y-2">
                              <div className={`lottery-number w-12 h-12 text-lg mx-auto ${colorRange.color}`}>
                                {colorRange.range[0]}
                              </div>
                              <div className="font-medium">{colorRange.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {colorRange.range[0]}-{colorRange.range[1]}
                              </div>
                              <div className="text-lg font-bold">{count}</div>
                              <div className="text-xs text-muted-foreground">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analyse détaillée */}
          <TabsContent value="analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  Analyse Détaillée
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Fonctionnalités d'analyse avancée en cours de développement...
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Prochainement : Corrélations, patterns temporels, et plus encore.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
