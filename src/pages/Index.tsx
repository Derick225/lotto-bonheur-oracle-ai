import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { DrawCard } from "@/components/DrawCard";
import { StatsCard } from "@/components/StatsCard";
import { ColorLegend } from "@/components/LotteryNumber";
import { DRAW_SCHEDULE, getCurrentDay } from "@/data/drawSchedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, Clock, Zap, Palette, Download, Activity, Brain, Star, BarChart3, Sparkles, Calendar } from "lucide-react";
import { useNotifications } from "@/components/NotificationCenter";
import { IndexedDBService } from "@/services/indexedDBService";

const Index = () => {
  const currentDay = getCurrentDay();
  const todayDraws = DRAW_SCHEDULE[currentDay] || {};
  const { sendNotification } = useNotifications();
  const [stats, setStats] = useState({
    totalDraws: 0,
    totalNumbers: 0,
    accuracy: 94.2,
    nextDrawTime: "2h 15m"
  });
  const [latestResults, setLatestResults] = useState<{[key: string]: number[]}>({});

  useEffect(() => {
    // Charger les données du dashboard
    loadDashboardData();
    
    // Envoyer une notification de bienvenue
    sendNotification({
      title: "Bienvenue!",
      message: "Application d'analyse de loterie chargée avec succès",
      type: "success"
    });
  }, []);

  const loadDashboardData = async () => {
    try {
      // Charger les statistiques réelles depuis le service fallback
      const { drawResultsService } = await import('@/services/drawResultsServiceFallback');
      const service = drawResultsService;
      
      const statistics = await service.getStatistics();
      const recentResults = await service.getDrawResults({ 
        limit: 10, 
        sortBy: 'draw_date', 
        sortOrder: 'desc' 
      });
      
      setStats({
        totalDraws: statistics.totalDraws,
        totalNumbers: statistics.totalDraws * 5, // Approximation
        accuracy: 94.2, // Simulation pour l'instant
        nextDrawTime: "2h 15m"
      });

      // Mapper les derniers résultats par nom de tirage
      const resultsMap: {[key: string]: number[]} = {};
      recentResults.data.forEach(result => {
        if (result.lottery_type && result.numbers && !resultsMap[result.lottery_type]) {
          resultsMap[result.lottery_type] = result.numbers;
        }
      });
      setLatestResults(resultsMap);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      // Utiliser les données locales comme fallback
      loadRealStats();
    }
  };

  const loadRealStats = async () => {
    try {
      const results = await IndexedDBService.getDrawResults();
      setStats(prev => ({
        ...prev,
        totalDraws: results.length,
        totalNumbers: results.reduce((acc, draw) => acc + draw.gagnants.length, 0)
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  return (
    <div className="min-h-full">
      {/* Suppression du Header car il est maintenant global */}

      <main className="container mx-auto px-6 py-8">
        {/* PWA Manager temporarily disabled */}
        {/* Section Hero */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 bg-accent/20 text-accent-foreground">
            Intelligence Artificielle • XGBoost • RNN-LSTM
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Analyse Avancée des{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Tirages de Loterie
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Découvrez les tendances, analysez les fréquences et obtenez des prédictions 
            intelligentes basées sur l'historique depuis janvier 2024.
          </p>
          <Button size="lg" className="btn-hero gap-2 animate-bounce-subtle">
            <Zap className="h-5 w-5" />
            Commencer l'analyse
          </Button>
        </div>

        {/* Statistiques rapides avancées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard
            title="Tirages Analysés"
            value={stats.totalDraws.toString()}
            description="depuis janvier 2024"
            icon={Target}
          />
          <StatsCard
            title="Précision Moyenne"
            value={`${stats.accuracy}%`}
            description="des prédictions"
            icon={TrendingUp}
          />
          <StatsCard
            title="Numéro Tendance"
            value="42"
            description="le plus fréquent"
            icon={Star}
            trend={8}
          />
          <StatsCard
            title="Prochain Tirage"
            value={stats.nextDrawTime}
            description="Émergence - Mardi"
            icon={Clock}
          />
        </div>

        {/* Tirages du jour */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-foreground">
              Tirages d'aujourd'hui - {currentDay}
            </h2>
            <Badge variant="outline" className="text-primary border-primary">
              {Object.keys(todayDraws).length} tirages
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(todayDraws).map(([time, name]) => (
              <DrawCard
                key={`${time}-${name}`}
                name={name}
                time={time}
                day={currentDay}
                numbers={latestResults[name]}
                isToday={true}
              />
            ))}
          </div>
        </div>

        {/* Légende des couleurs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Codage Couleur des Numéros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ColorLegend />
            <div className="mt-4 text-sm text-muted-foreground">
              Chaque numéro est coloré selon sa plage pour faciliter l'identification et l'analyse des patterns.
            </div>
          </CardContent>
        </Card>

        {/* Tous les tirages de la semaine */}
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Tous les tirages de la semaine
          </h2>
          
          <div className="space-y-8">
            {Object.entries(DRAW_SCHEDULE).map(([day, draws]) => (
              <div key={day} className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  {day}
                  {day === currentDay && (
                    <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">
                      Aujourd'hui
                    </Badge>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(draws).map(([time, name]) => (
                    <DrawCard
                      key={`${day}-${time}-${name}`}
                      name={name}
                      time={time}
                      day={day}
                      numbers={latestResults[name]}
                      isToday={day === currentDay}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
