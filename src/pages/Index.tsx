import { Header } from "@/components/Header";
import { DrawCard } from "@/components/DrawCard";
import { StatsCard } from "@/components/StatsCard";
import { DRAW_SCHEDULE, getCurrentDay } from "@/data/drawSchedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Clock, Zap } from "lucide-react";

const Index = () => {
  const currentDay = getCurrentDay();
  const todayDraws = DRAW_SCHEDULE[currentDay] || {};

  return (
    <div className="min-h-full">
      {/* Suppression du Header car il est maintenant global */}
      
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
          <Button size="lg" className="btn-hero gap-2">
            <Zap className="h-5 w-5" />
            Commencer l'analyse
          </Button>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatsCard
            title="Tirages Analysés"
            value="2,847"
            description="depuis janvier 2024"
            icon={Target}
            trend={12}
          />
          <StatsCard
            title="Prédictions"
            value="94.2%"
            description="de précision moyenne"
            icon={TrendingUp}
            trend={5}
          />
          <StatsCard
            title="Numéro Fréquent"
            value="42"
            description="le plus tiré ce mois"
            icon={Zap}
          />
          <StatsCard
            title="Prochain Tirage"
            value="2h 15m"
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
                isToday={true}
              />
            ))}
          </div>
        </div>

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
