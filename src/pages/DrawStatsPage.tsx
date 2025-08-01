import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress'; // Temporarily disabled
import { LotteryNumber } from '@/components/LotteryNumber';
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, BarChart3 } from 'lucide-react';

interface Statistics {
  frequency: { [key: number]: number };
  lastAppearance: { [key: number]: string };
  trends: { increasing: number[]; decreasing: number[] };
}

export function DrawStatsPage() {
  const { name: drawName } = useParams<{ name: string }>();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!drawName) return;
      
      try {
        setLoading(true);
        // Import dynamique pour éviter les erreurs de compilation
        const { LotteryAPIService } = await import('@/services/lotteryAPI');
        const statistics = await LotteryAPIService.getDrawStatistics(drawName);
        setStats(statistics);
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [drawName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Analyse des statistiques...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Erreur lors du chargement des statistiques.</p>
      </div>
    );
  }

  const frequencyEntries = Object.entries(stats.frequency)
    .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }))
    .sort((a, b) => b.frequency - a.frequency);

  const maxFrequency = Math.max(...Object.values(stats.frequency), 1); // Minimum 1 pour éviter division par 0

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
              <p className="text-muted-foreground">Statistiques et tendances</p>
            </div>
          </div>
          
          <Badge variant="secondary" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            Analyse complète
          </Badge>
        </div>

        {/* Menu de navigation */}
        <div className="flex gap-2 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/data`}>Données</Link>
          </Button>
          <Button variant="default" size="sm">Statistiques</Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/prediction`}>Prédiction</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/history`}>Historique</Link>
          </Button>
        </div>

        <div className="grid gap-8">
          {/* Tendances */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="gradient-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Numéros en hausse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.trends.increasing.slice(0, 10).map((number) => (
                    <LotteryNumber key={number} number={number} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                  Numéros en baisse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.trends.decreasing.slice(0, 10).map((number) => (
                    <LotteryNumber key={number} number={number} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fréquences détaillées */}
          <Card className="gradient-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Fréquence d'apparition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {frequencyEntries.slice(0, 20).map(({ number, frequency }) => (
                  <div key={number} className="flex items-center gap-4">
                    <LotteryNumber number={number} className="flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">Numéro {number}</span>
                        <span className="text-muted-foreground">{frequency} fois</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all" 
                          style={{ 
                            width: `${maxFrequency > 0 ? Math.min(100, (frequency / maxFrequency) * 100) : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-foreground font-medium">
                        {maxFrequency > 0 ? 
                          Math.min(100, (frequency / maxFrequency) * 100).toFixed(1) : 
                          '0.0'
                        }%
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {stats.lastAppearance[number] ? 
                          new Date(stats.lastAppearance[number]).toLocaleDateString('fr-FR') : 
                          'Jamais'
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Analyse par plage */}
          <Card className="gradient-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Analyse par plage de numéros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { range: '1-30', min: 1, max: 30, color: 'bg-blue-500' },
                  { range: '31-60', min: 31, max: 60, color: 'bg-green-500' },
                  { range: '61-90', min: 61, max: 90, color: 'bg-orange-500' }
                ].map(({ range, min, max, color }) => {
                  const rangeCount = frequencyEntries
                    .filter(({ number }) => number >= min && number <= max)
                    .reduce((sum, { frequency }) => sum + frequency, 0);
                  
                  const totalCount = frequencyEntries
                    .reduce((sum, { frequency }) => sum + frequency, 0);
                  
                  const percentage = totalCount > 0 ? (rangeCount / totalCount) * 100 : 0;

                  return (
                    <div key={range} className="text-center p-4 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold text-foreground">{range}</div>
                      <div className={`w-full h-2 rounded-full ${color} opacity-70 my-2`} 
                           style={{ width: `${percentage}%`, margin: '0 auto' }} />
                      <div className="text-sm text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}