import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { LotteryNumber } from '@/components/LotteryNumber';
import { FrequencyChart, NumberDistributionChart } from '@/components/ChartComponents';
import { DrawResult, LotteryAPIService } from '@/services/lotteryAPI';
import { IndexedDBService } from '@/services/indexedDBService';
import { ArrowLeft, Filter, Download, Calendar, Loader2, Database } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

export function HistoryPage() {
  const { drawName } = useParams<{ drawName: string }>();
  const [results, setResults] = useState<DrawResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [numberInput, setNumberInput] = useState('');
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc'>('date-desc');

  // Données d'analyse
  const [frequencyData, setFrequencyData] = useState<{ [key: number]: number }>({});
  const [storageStats, setStorageStats] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!drawName) return;
      
      try {
        setLoading(true);
        
        // Récupérer les données depuis l'API et IndexedDB
        const [apiData, cachedData, stats] = await Promise.all([
          LotteryAPIService.getDrawResults(drawName, 200),
          IndexedDBService.getDrawResults(drawName, 200),
          IndexedDBService.getStorageStats()
        ]);
        
        // Combiner et dédupliquer les données
        const allResults = [...apiData, ...cachedData];
        const uniqueResults = allResults.filter((result, index, self) => 
          index === self.findIndex(r => r.date === result.date && r.draw_name === result.draw_name)
        );
        
        setResults(uniqueResults);
        setFilteredResults(uniqueResults);
        setStorageStats(stats);
        
        // Calculer les fréquences
        const frequency: { [key: number]: number } = {};
        uniqueResults.forEach(result => {
          result.gagnants.forEach(num => {
            frequency[num] = (frequency[num] || 0) + 1;
          });
        });
        setFrequencyData(frequency);
        
        // Sauvegarder en cache si nécessaire
        if (apiData.length > 0) {
          await IndexedDBService.saveDrawResults(apiData);
        }
        
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [drawName]);

  // Appliquer les filtres
  useEffect(() => {
    let filtered = [...results];

    // Filtre par date
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(result => {
        const resultDate = new Date(result.date);
        return resultDate >= dateRange.from! && resultDate <= dateRange.to!;
      });
    }

    // Filtre par numéros
    if (selectedNumbers.length > 0) {
      filtered = filtered.filter(result => 
        selectedNumbers.some(num => result.gagnants.includes(num))
      );
    }

    // Tri
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'date-desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredResults(filtered);
  }, [results, dateRange, selectedNumbers, sortOrder]);

  const handleNumberFilter = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const handleNumberInputAdd = () => {
    const num = parseInt(numberInput);
    if (num >= 1 && num <= 90 && !selectedNumbers.includes(num)) {
      setSelectedNumbers([...selectedNumbers, num]);
      setNumberInput('');
    }
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setSelectedNumbers([]);
    setNumberInput('');
    setSortOrder('date-desc');
  };

  const exportData = () => {
    const dataStr = JSON.stringify(filteredResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${drawName}_historique_${format(new Date(), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de l'historique...</p>
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
              <p className="text-muted-foreground">Historique complet des tirages</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <Database className="h-4 w-4" />
              {filteredResults.length} résultats
            </Badge>
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Menu de navigation */}
        <div className="flex gap-2 mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/data`}>Données</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/stats`}>Statistiques</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/prediction`}>Prédiction</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/draw/${drawName}/consult`}>Consulter</Link>
          </Button>
          <Button variant="default" size="sm">Historique</Button>
        </div>

        <div className="grid gap-8">
          {/* Panneau de filtres */}
          <Card className="gradient-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Filter className="h-5 w-5" />
                  Filtres et recherche
                </CardTitle>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Effacer les filtres
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Filtre par date */}
                <div className="space-y-3">
                  <Label>Période</Label>
                  <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                </div>

                {/* Filtre par numéro */}
                <div className="space-y-3">
                  <Label>Ajouter un numéro</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={numberInput}
                      onChange={(e) => setNumberInput(e.target.value)}
                      placeholder="1-90"
                    />
                    <Button onClick={handleNumberInputAdd} disabled={!numberInput}>
                      Ajouter
                    </Button>
                  </div>
                </div>

                {/* Tri */}
                <div className="space-y-3">
                  <Label>Tri</Label>
                  <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Plus récent d'abord</SelectItem>
                      <SelectItem value="date-asc">Plus ancien d'abord</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Numéros sélectionnés */}
              {selectedNumbers.length > 0 && (
                <div className="space-y-3">
                  <Label>Numéros sélectionnés</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedNumbers.map(num => (
                      <div key={num} className="relative">
                        <LotteryNumber number={num} className="scale-75" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-destructive text-destructive-foreground rounded-full"
                          onClick={() => handleNumberFilter(num)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistiques visuelles */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="gradient-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Fréquence des numéros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <FrequencyChart data={frequencyData} />
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Distribution par plage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <NumberDistributionChart data={frequencyData} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistiques de stockage */}
          {storageStats && (
            <Card className="gradient-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Informations de stockage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{storageStats.drawResults}</div>
                    <div className="text-sm text-muted-foreground">Résultats stockés</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{storageStats.predictions}</div>
                    <div className="text-sm text-muted-foreground">Prédictions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{storageStats.statistics}</div>
                    <div className="text-sm text-muted-foreground">Statistiques</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{storageStats.totalSize}</div>
                    <div className="text-sm text-muted-foreground">Total éléments</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des résultats */}
          <Card className="gradient-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">
                Résultats ({filteredResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Aucun résultat ne correspond aux critères de recherche.
                    </p>
                  </div>
                ) : (
                  filteredResults.map((result, index) => (
                    <div 
                      key={`${result.date}-${index}`} 
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <div className="font-semibold text-foreground">
                            {format(new Date(result.date), 'EEEE d MMMM yyyy', { locale: fr })}
                          </div>
                          <div className="text-muted-foreground">{result.time}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="text-muted-foreground mb-1">Numéros gagnants</div>
                          <div className="flex gap-1">
                            {result.gagnants.map((number, idx) => (
                              <LotteryNumber 
                                key={idx} 
                                number={number} 
                                className="scale-75"
                                isWinning={selectedNumbers.includes(number)}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {result.machine && (
                          <div className="text-right text-sm">
                            <div className="text-muted-foreground mb-1">Machine</div>
                            <div className="flex gap-1">
                              {result.machine.map((number, idx) => (
                                <LotteryNumber 
                                  key={idx} 
                                  number={number} 
                                  className="scale-75"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}