import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Clock, Zap, Database, Calendar } from "lucide-react";

const Index = () => {
  const [stats, setStats] = useState({
    totalDraws: 0,
    recentDraws: 0,
    predictions: 0,
    accuracy: 94.2
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulation de chargement
    const timer = setTimeout(() => {
      setStats({
        totalDraws: 156,
        recentDraws: 12,
        predictions: 8934,
        accuracy: 94.2
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-full">
      <main className="container mx-auto px-6 py-8">
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
          <Button size="lg" className="gap-2">
            <Zap className="h-5 w-5" />
            Commencer l'analyse
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Tirages Analysés</p>
                  <p className="text-2xl font-bold">{loading ? '...' : stats.totalDraws}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Tirages Récents</p>
                  <p className="text-2xl font-bold">{loading ? '...' : stats.recentDraws}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Prédictions</p>
                  <p className="text-2xl font-bold">{loading ? '...' : stats.predictions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-sm font-medium">Précision IA</p>
                  <p className="text-2xl font-bold">{loading ? '...' : `${stats.accuracy}%`}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message temporaire */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Application en cours de maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Nous travaillons actuellement sur l'amélioration de l'interface d'administration 
              et l'intégration des données en temps réel. L'application sera bientôt entièrement fonctionnelle.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;