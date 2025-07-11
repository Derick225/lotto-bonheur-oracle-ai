import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LotteryNumber } from "./LotteryNumber";
import { Calendar, BarChart3, TrendingUp, Database } from "lucide-react";

interface DrawCardProps {
  name: string;
  time: string;
  day: string;
  numbers?: number[];
  isToday?: boolean;
}

export function DrawCard({ name, time, day, numbers, isToday = false }: DrawCardProps) {
  const sampleNumbers = numbers || [12, 25, 34, 56, 78]; // Numéros d'exemple

  return (
    <Card className="gradient-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            {name}
          </CardTitle>
          {isToday && (
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              Aujourd'hui
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{day} - {time}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2 justify-center">
          {sampleNumbers.map((number, index) => (
            <LotteryNumber key={index} number={number} />
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <Link to={`/draw/${encodeURIComponent(name)}/data`}>
              <Database className="h-4 w-4" />
              Données
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <Link to={`/draw/${encodeURIComponent(name)}/stats`}>
              <BarChart3 className="h-4 w-4" />
              Stats
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <Link to={`/draw/${encodeURIComponent(name)}/prediction`}>
              <TrendingUp className="h-4 w-4" />
              Prédiction
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="gap-2" disabled>
            <Calendar className="h-4 w-4" />
            Historique
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}