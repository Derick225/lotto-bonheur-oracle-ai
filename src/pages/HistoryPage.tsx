import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { LotteryNumber } from '@/components/LotteryNumber';
import { FrequencyChart, NumberDistributionChart } from '@/components/ChartComponents';
import { DrawResult, LotteryAPIService } from '@/services/lotteryAPI';
import { IndexedDBService } from '@/services/indexedDBService';
import { ArrowLeft, Download, Filter, Calendar, BarChart3, Loader2, FileText, Search, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoryPageProps {}

export function HistoryPage() {
  const { name: drawName } = useParams<{ name: string }>();
  const [results, setResults] = useState<DrawResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [numberInput, setNumberInput] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showOnlyWithMachine, setShowOnlyWithMachine] = useState(false);
  
  // Statistiques calculées
  const [numberFrequency, setNumberFrequency] = useState<{ [key: number]: number }>({});
  const [storageInfo, setStorageInfo] = useState({ local: 0, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      if (!drawName) return;
      
      try {
        setLoading(true);
        
        // Récupérer les données depuis l'API et IndexedDB
        const [apiData, localData] = await Promise.all([
          LotteryAPIService.getDrawHistoricalResults(drawName, 500).catch(() => []),
          IndexedDBService.getDrawResults(drawName, 500).catch(() => [])
        ]);
        
        // Combiner et dédupliquer
        const combinedResults = [...apiData, ...localData];
        const uniqueResults = Array.from(
          new Map(combinedResults.map(r => [`${r.draw_name}-${r.date}`, r])).values()
        );
        
        setResults(uniqueResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        // Calculer les fréquences
        const frequencies: { [key: number]: number } = {};
        uniqueResults.forEach(result => {
          result.gagnants.forEach(num => {
            frequencies[num] = (frequencies[num] || 0) + 1;
          });
        });
        setNumberFrequency(frequencies);
        
        // Sauvegarder les nouvelles données dans le cache local
        if (apiData.length > 0) {
          await IndexedDBService.saveDrawResults(apiData);
        }
        
        // Informations de stockage
        const stats = await IndexedDBService.getStorageStats();
        setStorageInfo({ local: localData.length, total: stats.drawResults });
        
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
    if (dateRange.from) {
      filtered = filtered.filter(result => new Date(result.date) >= dateRange.from!);
    }
    if (dateRange.to) {
      filtered = filtered.filter(result => new Date(result.date) <= dateRange.to!);
    }
    
    // Filtre par numéros sélectionnés
    if (selectedNumbers.length > 0) {
      filtered = filtered.filter(result =>
        selectedNumbers.every(num => result.gagnants.includes(num))
      );
    }
    
    // Filtre pour les résultats avec numéros machine
    if (showOnlyWithMachine) {
      filtered = filtered.filter(result => result.machine && result.machine.length > 0);
    }
    
    // Tri
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredResults(filtered);
  }, [results, dateRange, selectedNumbers, sortOrder, showOnlyWithMachine]);

  const handleNumberFilter = (num: number) => {
    setSelectedNumbers(prev => 
      prev.includes(num) 
        ? prev.filter(n => n !== num)
        : [...prev, num]
    );
  };

  const handleNumberInputAdd = () => {
    const num = parseInt(numberInput);
    if (num >= 1 && num <= 90 && !selectedNumbers.includes(num)) {
      setSelectedNumbers(prev => [...prev, num]);
      setNumberInput('');
    }
  };

  const clearFilters = () => {
    setDateRange({});
    setSelectedNumbers([]);
    setNumberInput('');
    setSortOrder('desc');
    setShowOnlyWithMachine(false);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(filteredResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `historique_${drawName}_${format(new Date(), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getMostFrequentNumbers = (limit: number = 10) => {
    return Object.entries(numberFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }));
  };

  const getLeastFrequentNumbers = (limit: number = 10) => {
    return Object.entries(numberFrequency)
      .sort(([,a], [,b]) => a - b)
      .slice(0, limit)
      .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de l'historique...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Récupération des données depuis 2020...
          </p>
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
              <h1 className="text-3xl font-bold text-foreground">
                Historique {drawName ? `• ${drawName}` : ''}
              </h1>
              <p className="text-muted-foreground">
                {filteredResults.length} résultats trouvés • Données depuis 2020
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-4 w-4" />
              {storageInfo.local} en local
            </Badge>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Menu de navigation */}
        {drawName && (
          <div className="flex gap-2 mb-8">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/draw/${drawName}/data`}>Données</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/draw/${drawName}/consulter`}>Consulter</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/draw/${drawName}/stats`}>Statistiques</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/draw/${drawName}/prediction`}>Prédiction</Link>
            </Button>
            <Button variant="default" size="sm">Historique</Button>
          </div>
        )}

        {/* Panneau de filtres */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres et recherche
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Réinitialiser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Plage de dates */}
              <div className="space-y-2">
                <Label>Période</Label>
                <DatePickerWithRange
                  date={dateRange}
                  onDateChange={setDateRange}
                  placeholder="Sélectionner une période"
                />
              </div>
              
              {/* Ordre de tri */}
              <div className="space-y-2">
                <Label>Ordre</Label>
                <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Plus récent en premier</SelectItem>
                    <SelectItem value="asc">Plus ancien en premier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Ajouter un numéro */}
              <div className="space-y-2">
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
                  <Button onClick={handleNumberInputAdd} size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Option pour numéros machine */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="machine-numbers"
                checked={showOnlyWithMachine}
                onCheckedChange={(checked) => setShowOnlyWithMachine(checked === true)}
              />
              <Label htmlFor="machine-numbers">
                Afficher seulement les résultats avec numéros machine
              </Label>
            </div>
            
            {/* Numéros sélectionnés */}
            {selectedNumbers.length > 0 && (
              <div>
                <Label className="mb-2 block">Filtrer par numéros:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedNumbers.map(num => (
                    <Badge 
                      key={num} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleNumberFilter(num)}
                    >
                      <LotteryNumber number={num} className="scale-75" />
                      {num} ✕
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graphiques et analyses */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Fréquence des numéros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FrequencyChart data={numberFrequency} />
            </CardContent>
          </Card>

          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Distribution par plage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NumberDistributionChart data={numberFrequency} />
            </CardContent>
          </Card>
        </div>

        {/* Statistiques de stockage et numéros fréquents */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informations de stockage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Données locales:</span>
                  <span className="font-mono">{storageInfo.local}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total en cache:</span>
                  <span className="font-mono">{storageInfo.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Période:</span>
                  <span className="text-xs">Depuis 2020</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Numéros les plus fréquents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getMostFrequentNumbers(5).map(({ number, frequency }) => (
                  <div key={number} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <LotteryNumber number={number} className="scale-75" />
                      <span>{number}</span>
                    </div>
                    <span className="font-mono text-xs">{frequency}×</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Numéros les moins fréquents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getLeastFrequentNumbers(5).map(({ number, frequency }) => (
                  <div key={number} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <LotteryNumber number={number} className="scale-75" />
                      <span>{number}</span>
                    </div>
                    <span className="font-mono text-xs">{frequency}×</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des résultats */}
        <Card>
          <CardHeader>
            <CardTitle>
              Historique des tirages ({filteredResults.length} résultats)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredResults.slice(0, 50).map((result, index) => (
                <div key={`${result.draw_name}-${result.date}-${index}`} 
                     className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-muted-foreground min-w-[100px]">
                      {format(new Date(result.date), 'dd/MM/yyyy', { locale: fr })}
                    </div>
                    <div className="flex gap-1">
                      {result.gagnants.map((num, i) => (
                        <LotteryNumber key={`${num}-${i}`} number={num} />
                      ))}
                    </div>
                  </div>
                  
                  {result.machine && result.machine.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Machine:</span>
                      <div className="flex gap-1">
                        {result.machine.map((num, i) => (
                          <LotteryNumber key={`machine-${num}-${i}`} number={num} className="scale-75" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredResults.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun résultat trouvé avec les filtres sélectionnés</p>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
              
              {filteredResults.length > 50 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Affichage des 50 premiers résultats sur {filteredResults.length}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}