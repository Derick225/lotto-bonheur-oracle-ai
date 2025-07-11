import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LotteryNumber } from '@/components/LotteryNumber';
import { DrawResult, LotteryAPIService } from '@/services/lotteryAPI';
import { ArrowLeft, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function DrawDataPage() {
  const { drawName } = useParams<{ drawName: string }>();
  const [results, setResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!drawName) return;
    
    try {
      setLoading(true);
      const data = await LotteryAPIService.getDrawResults(drawName, 20);
      setResults(data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [drawName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
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
              <p className="text-muted-foreground">Données des tirages récents</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-4 w-4" />
              {results.length} résultats
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Menu de navigation */}
        <div className="flex gap-2 mb-8">
          <Button variant="default" size="sm">Données</Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/stats`}>Statistiques</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/prediction`}>Prédiction</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/history`}>Historique</Link>
          </Button>
        </div>

        {/* Grille des résultats */}
        <div className="grid gap-6">
          {results.length === 0 ? (
            <Card className="gradient-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucun résultat disponible pour ce tirage.</p>
              </CardContent>
            </Card>
          ) : (
            results.map((result, index) => (
              <Card key={`${result.date}-${index}`} className="gradient-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-foreground">
                      {format(new Date(result.date), 'EEEE d MMMM yyyy', { locale: fr })}
                    </CardTitle>
                    <Badge variant="outline" className="text-primary border-primary">
                      {result.time}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Numéros Gagnants</h4>
                    <div className="flex gap-2 justify-center">
                      {result.gagnants.map((number, idx) => (
                        <LotteryNumber 
                          key={idx} 
                          number={number} 
                          isWinning={true}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {result.machine && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Numéros Machine</h4>
                      <div className="flex gap-2 justify-center">
                        {result.machine.map((number, idx) => (
                          <LotteryNumber 
                            key={idx} 
                            number={number}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}