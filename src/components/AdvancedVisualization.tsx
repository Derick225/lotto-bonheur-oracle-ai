import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LotteryNumber, ColorLegend } from '@/components/LotteryNumber';
import { DrawResult } from '@/services/lotteryAPI';
import { 
  BarChart3, 
  TrendingUp, 
  Grid3X3, 
  Filter, 
  Download,
  Eye,
  EyeOff,
  Palette
} from 'lucide-react';

interface AdvancedVisualizationProps {
  results: DrawResult[];
  drawName: string;
}

interface FrequencyData {
  number: number;
  frequency: number;
  percentage: number;
  lastSeen: number;
  trend: 'up' | 'down' | 'stable';
}

interface HeatmapCell {
  number: number;
  value: number;
  intensity: number;
  color: string;
}

export function AdvancedVisualization({ results, drawName }: AdvancedVisualizationProps) {
  const [selectedView, setSelectedView] = useState<'frequency' | 'heatmap' | 'trends'>('frequency');
  const [timeRange, setTimeRange] = useState<'30' | '90' | 'all'>('90');
  const [showColorLegend, setShowColorLegend] = useState(true);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  // Calcul des données de fréquence
  const frequencyData = useMemo(() => {
    const filteredResults = timeRange === 'all' 
      ? results 
      : results.slice(0, parseInt(timeRange));

    const frequencies: { [key: number]: number } = {};
    const lastSeen: { [key: number]: number } = {};
    
    // Calculer les fréquences et dernières apparitions
    filteredResults.forEach((result, index) => {
      result.gagnants.forEach(num => {
        frequencies[num] = (frequencies[num] || 0) + 1;
        if (lastSeen[num] === undefined) {
          lastSeen[num] = index;
        }
      });
    });

    // Calculer les tendances (comparaison première vs seconde moitié)
    const midPoint = Math.floor(filteredResults.length / 2);
    const firstHalf = filteredResults.slice(0, midPoint);
    const secondHalf = filteredResults.slice(midPoint);

    const firstHalfFreq: { [key: number]: number } = {};
    const secondHalfFreq: { [key: number]: number } = {};

    firstHalf.forEach(result => {
      result.gagnants.forEach(num => {
        firstHalfFreq[num] = (firstHalfFreq[num] || 0) + 1;
      });
    });

    secondHalf.forEach(result => {
      result.gagnants.forEach(num => {
        secondHalfFreq[num] = (secondHalfFreq[num] || 0) + 1;
      });
    });

    const data: FrequencyData[] = [];
    for (let i = 1; i <= 90; i++) {
      const freq = frequencies[i] || 0;
      const firstFreq = firstHalfFreq[i] || 0;
      const secondFreq = secondHalfFreq[i] || 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (secondFreq > firstFreq) trend = 'up';
      else if (secondFreq < firstFreq) trend = 'down';

      data.push({
        number: i,
        frequency: freq,
        percentage: (freq / filteredResults.length) * 100,
        lastSeen: lastSeen[i] || filteredResults.length,
        trend
      });
    }

    return data.sort((a, b) => b.frequency - a.frequency);
  }, [results, timeRange]);

  // Données pour la carte thermique
  const heatmapData = useMemo(() => {
    const maxFreq = Math.max(...frequencyData.map(d => d.frequency));
    
    return frequencyData.map(data => ({
      number: data.number,
      value: data.frequency,
      intensity: maxFreq > 0 ? data.frequency / maxFreq : 0,
      color: getNumberColorClass(data.number)
    }));
  }, [frequencyData]);

  const getNumberColorClass = (num: number) => {
    if (num >= 1 && num <= 9) return "lottery-number-1-9";
    if (num >= 10 && num <= 19) return "lottery-number-10-19";
    if (num >= 20 && num <= 29) return "lottery-number-20-29";
    if (num >= 30 && num <= 39) return "lottery-number-30-39";
    if (num >= 40 && num <= 49) return "lottery-number-40-49";
    if (num >= 50 && num <= 59) return "lottery-number-50-59";
    if (num >= 60 && num <= 69) return "lottery-number-60-69";
    if (num >= 70 && num <= 79) return "lottery-number-70-79";
    if (num >= 80 && num <= 90) return "lottery-number-80-90";
    return "lottery-number-1-9";
  };

  const toggleNumberSelection = (number: number) => {
    setSelectedNumbers(prev => 
      prev.includes(number) 
        ? prev.filter(n => n !== number)
        : [...prev, number]
    );
  };

  const exportData = () => {
    const dataToExport = {
      drawName,
      timeRange,
      generatedAt: new Date().toISOString(),
      frequencyData,
      selectedNumbers
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${drawName}-analysis-${timeRange}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Visualisation Avancée - {drawName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColorLegend(!showColorLegend)}
              >
                <Palette className="h-4 w-4 mr-1" />
                {showColorLegend ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="h-4 w-4 mr-1" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 derniers tirages</SelectItem>
                  <SelectItem value="90">90 derniers tirages</SelectItem>
                  <SelectItem value="all">Tous les tirages</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Badge variant="secondary">
              {results.length} tirages analysés
            </Badge>
            
            {selectedNumbers.length > 0 && (
              <Badge variant="outline">
                {selectedNumbers.length} numéros sélectionnés
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Légende des couleurs */}
      {showColorLegend && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Codage Couleur des Numéros</CardTitle>
          </CardHeader>
          <CardContent>
            <ColorLegend />
          </CardContent>
        </Card>
      )}

      {/* Visualisations principales */}
      <Tabs value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="frequency">Fréquences</TabsTrigger>
          <TabsTrigger value="heatmap">Carte Thermique</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
        </TabsList>

        <TabsContent value="frequency" className="space-y-4">
          <FrequencyView 
            data={frequencyData} 
            selectedNumbers={selectedNumbers}
            onNumberClick={toggleNumberSelection}
          />
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <HeatmapView 
            data={heatmapData}
            selectedNumbers={selectedNumbers}
            onNumberClick={toggleNumberSelection}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <TrendsView 
            data={frequencyData}
            selectedNumbers={selectedNumbers}
            onNumberClick={toggleNumberSelection}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Composant pour la vue fréquences
function FrequencyView({ 
  data, 
  selectedNumbers, 
  onNumberClick 
}: { 
  data: FrequencyData[]; 
  selectedNumbers: number[];
  onNumberClick: (number: number) => void;
}) {
  const maxFrequency = Math.max(...data.map(d => d.frequency));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fréquences des Numéros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-15 gap-2">
          {data.map((item) => (
            <div key={item.number} className="text-center space-y-1">
              <LotteryNumber
                number={item.number}
                size="sm"
                className={selectedNumbers.includes(item.number) ? "ring-2 ring-primary" : ""}
                onClick={() => onNumberClick(item.number)}
                frequency={item.frequency > maxFrequency * 0.7 ? 'frequent' : 
                          item.frequency < maxFrequency * 0.3 ? 'rare' : 'normal'}
              />
              <div className="text-xs space-y-0.5">
                <div className="font-medium">{item.frequency}</div>
                <div className="text-muted-foreground">
                  {item.percentage.toFixed(1)}%
                </div>
                {item.trend !== 'stable' && (
                  <TrendingUp 
                    className={`h-3 w-3 mx-auto ${
                      item.trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'
                    }`} 
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour la carte thermique
function HeatmapView({ 
  data, 
  selectedNumbers, 
  onNumberClick 
}: { 
  data: HeatmapCell[]; 
  selectedNumbers: number[];
  onNumberClick: (number: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          Carte Thermique des Fréquences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-9 gap-1">
          {Array.from({ length: 90 }, (_, i) => i + 1).map((number) => {
            const cellData = data.find(d => d.number === number);
            const intensity = cellData?.intensity || 0;
            
            return (
              <div
                key={number}
                className={`
                  relative cursor-pointer transition-all duration-200 hover:scale-110
                  ${selectedNumbers.includes(number) ? 'ring-2 ring-primary' : ''}
                `}
                onClick={() => onNumberClick(number)}
                style={{
                  opacity: 0.3 + (intensity * 0.7)
                }}
              >
                <LotteryNumber
                  number={number}
                  size="sm"
                  className="relative"
                />
                <div 
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{
                    backgroundColor: `rgba(255, 255, 255, ${intensity * 0.3})`
                  }}
                />
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Moins fréquent</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${0.2 + (i * 0.2)})`
                }}
              />
            ))}
          </div>
          <span>Plus fréquent</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour les tendances
function TrendsView({ 
  data, 
  selectedNumbers, 
  onNumberClick 
}: { 
  data: FrequencyData[]; 
  selectedNumbers: number[];
  onNumberClick: (number: number) => void;
}) {
  const trendingUp = data.filter(d => d.trend === 'up').slice(0, 15);
  const trendingDown = data.filter(d => d.trend === 'down').slice(0, 15);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-green-600">
            Tendance Haussière
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {trendingUp.map((item) => (
              <div key={item.number} className="text-center space-y-1">
                <LotteryNumber
                  number={item.number}
                  size="sm"
                  variant={selectedNumbers.includes(item.number) ? "predicted" : "frequent"}
                  onClick={() => onNumberClick(item.number)}
                />
                <div className="text-xs">
                  <div className="font-medium">{item.frequency}</div>
                  <TrendingUp className="h-3 w-3 mx-auto text-green-500" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-red-600">
            Tendance Baissière
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {trendingDown.map((item) => (
              <div key={item.number} className="text-center space-y-1">
                <LotteryNumber
                  number={item.number}
                  size="sm"
                  variant={selectedNumbers.includes(item.number) ? "predicted" : "rare"}
                  onClick={() => onNumberClick(item.number)}
                />
                <div className="text-xs">
                  <div className="font-medium">{item.frequency}</div>
                  <TrendingUp className="h-3 w-3 mx-auto text-red-500 rotate-180" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
