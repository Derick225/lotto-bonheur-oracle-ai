import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LotteryNumber } from "@/components/LotteryNumber";
import { Clock, BarChart3, Brain, Eye, History, TrendingUp, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { IndexedDBService } from "@/services/indexedDBService";

interface EnhancedDrawCardProps {
  name: string;
  time: string;
  day: string;
  numbers?: number[];
  isToday?: boolean;
  showPrediction?: boolean;
}

export function EnhancedDrawCard({
  name,
  time,
  day,
  numbers,
  isToday = false,
  showPrediction = false
}: EnhancedDrawCardProps) {
  const [hasLocalData, setHasLocalData] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const [prediction, setPrediction] = useState<number[]>([]);

  useEffect(() => {
    checkLocalData();
    if (showPrediction) {
      loadLatestPrediction();
    }
  }, [name, showPrediction]);

  const checkLocalData = async () => {
    try {
      const results = await IndexedDBService.getDrawResults(name, 10);
      setHasLocalData(results.length > 0);
      setLocalCount(results.length);
    } catch (error) {
      console.error('Erreur lors de la vérification des données locales:', error);
    }
  };

  const loadLatestPrediction = async () => {
    try {
      const latestPrediction = await IndexedDBService.getLatestPrediction(name);
      if (latestPrediction && latestPrediction.numbers.length > 0) {
        setPrediction(latestPrediction.numbers.slice(0, 5).map(n => n.number));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la prédiction:', error);
    }
  };

  const getNextDrawTime = () => {
    if (!isToday) return null;
    
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const drawTime = new Date();
    drawTime.setHours(hours, minutes, 0, 0);
    
    if (drawTime > now) {
      const diffMs = drawTime.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `dans ${diffHours}h ${diffMins}m`;
    }
    
    return 'Terminé';
  };

  const nextDrawInfo = getNextDrawTime();

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 ${
      isToday ? 'ring-2 ring-primary/20 bg-gradient-to-br from-primary/5 to-accent/5' : ''
    }`}>
      <CardContent className="p-6">
        {/* En-tête */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{day} • {time}</span>
              {isToday && nextDrawInfo && (
                <Badge variant="secondary" className="text-xs">
                  {nextDrawInfo}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            {isToday && (
              <Badge variant="default" className="bg-primary/90">
                Aujourd'hui
              </Badge>
            )}
            {hasLocalData && (
              <Badge variant="outline" className="text-xs">
                {localCount} résultats
              </Badge>
            )}
          </div>
        </div>

        {/* Numéros gagnants */}
        {numbers && numbers.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Dernier tirage
            </div>
            <div className="flex gap-1 justify-center">
              {numbers.map((num, index) => (
                <LotteryNumber
                  key={`${num}-${index}`}
                  number={num}
                  className="scale-90"
                />
              ))}
            </div>
          </div>
        )}

        {/* Prédiction */}
        {showPrediction && prediction.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Brain className="h-3 w-3" />
              Prédiction IA
            </div>
            <div className="flex gap-1 justify-center">
              {prediction.map((num, index) => (
                <LotteryNumber
                  key={`pred-${num}-${index}`}
                  number={num}
                  className="scale-75 opacity-80"
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions rapides */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link to={`/draw/${encodeURIComponent(name)}/data`}>
              <BarChart3 className="h-3 w-3 mr-1" />
              Données
            </Link>
          </Button>
          
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link to={`/draw/${encodeURIComponent(name)}/consulter`}>
              <Eye className="h-3 w-3 mr-1" />
              Consulter
            </Link>
          </Button>
          
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link to={`/draw/${encodeURIComponent(name)}/stats`}>
              <BarChart3 className="h-3 w-3 mr-1" />
              Stats
            </Link>
          </Button>
          
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link to={`/draw/${encodeURIComponent(name)}/prediction`}>
              <Brain className="h-3 w-3 mr-1" />
              Prédire
            </Link>
          </Button>
        </div>

        {/* Actions avancées */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link to={`/draw/${encodeURIComponent(name)}/history`}>
              <History className="h-3 w-3 mr-1" />
              Historique
            </Link>
          </Button>
          
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link to={`/draw/${encodeURIComponent(name)}/advanced-prediction`}>
              <Brain className="h-3 w-3 mr-1" />
              IA Avancée
            </Link>
          </Button>
        </div>

        {/* Indicateur de statut */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                hasLocalData ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              {hasLocalData ? 'Données synchronisées' : 'Aucune donnée locale'}
            </span>
            
            {isToday && (
              <div className="flex items-center gap-1 text-primary">
                <Calendar className="h-3 w-3" />
                <span className="font-medium">Actif</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}