import { useState } from "react";
import { ChevronDown, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DRAW_SCHEDULE, getAllDraws, getCurrentDay } from "@/data/drawSchedule";
import { useNavigate } from "react-router-dom";

interface DrawSelectorProps {
  currentDraw?: string;
  currentPage?: 'data' | 'consulter' | 'stats' | 'prediction';
  onDrawSelect?: (drawName: string) => void;
}

export function DrawSelector({ 
  currentDraw, 
  currentPage = 'data', 
  onDrawSelect 
}: DrawSelectorProps) {
  const navigate = useNavigate();
  const currentDay = getCurrentDay();
  const allDraws = getAllDraws();
  const todayDraws = allDraws.filter(draw => draw.day === currentDay);

  const handleDrawSelection = (drawName: string) => {
    if (onDrawSelect) {
      onDrawSelect(drawName);
    } else {
      // Navigation automatique vers la page appropriée
      const route = `/draw/${encodeURIComponent(drawName)}/${currentPage}`;
      navigate(route);
    }
  };

  const getDrawInfo = (drawName: string) => {
    const draw = allDraws.find(d => d.name === drawName);
    return draw ? { day: draw.day, time: draw.time } : null;
  };

  const currentDrawInfo = currentDraw ? getDrawInfo(currentDraw) : null;
  const isToday = currentDrawInfo?.day === currentDay;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">
              {currentDraw || "Sélectionner un tirage"}
            </span>
            {currentDrawInfo && (
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {currentDrawInfo.time}
                {isToday && (
                  <Badge variant="secondary" className="text-xs">
                    Aujourd'hui
                  </Badge>
                )}
              </div>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto" align="start">
        {/* Tirages d'aujourd'hui */}
        {todayDraws.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Tirages d'aujourd'hui - {currentDay}
            </DropdownMenuLabel>
            {todayDraws.map((draw) => (
              <DropdownMenuItem
                key={`today-${draw.name}`}
                onClick={() => handleDrawSelection(draw.name)}
                className={`cursor-pointer flex items-center justify-between ${
                  currentDraw === draw.name ? 'bg-accent' : ''
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{draw.name}</span>
                  <span className="text-xs text-muted-foreground">{draw.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Aujourd'hui
                  </Badge>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Tous les tirages par jour */}
        <DropdownMenuLabel>Tous les tirages</DropdownMenuLabel>
        {Object.entries(DRAW_SCHEDULE).map(([day, draws]) => {
          const dayDraws = Object.entries(draws);
          
          return (
            <div key={day} className="mb-2">
              <DropdownMenuLabel className="text-sm font-medium text-muted-foreground px-2 py-1">
                {day}
                {day === currentDay && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Aujourd'hui
                  </Badge>
                )}
              </DropdownMenuLabel>
              {dayDraws.map(([time, drawName]) => (
                <DropdownMenuItem
                  key={`${day}-${drawName}`}
                  onClick={() => handleDrawSelection(drawName)}
                  className={`cursor-pointer flex items-center justify-between ml-2 ${
                    currentDraw === drawName ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{drawName}</span>
                    <span className="text-xs text-muted-foreground">{time}</span>
                  </div>
                  {day === currentDay && (
                    <Badge variant="secondary" className="text-xs">
                      Aujourd'hui
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          );
        })}

        {/* Option pour voir tous les tirages */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/draw-data')}
          className="cursor-pointer text-primary font-medium"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Voir tous les tirages
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}