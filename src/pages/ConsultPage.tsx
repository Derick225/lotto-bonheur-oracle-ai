import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LotteryNumber } from '@/components/LotteryNumber';
import { TrendChart, CoOccurrenceHeatmap } from '@/components/ChartComponents';
import { DrawResult, LotteryAPIService } from '@/services/lotteryAPI';
import { ArrowLeft, Search, TrendingUp, Users, Loader2 } from 'lucide-react';

export function ConsultPage() {
  const { drawName } = useParams<{ drawName: string }>();
  const [results, setResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [analysisType, setAnalysisType] = useState<'frequency' | 'cooccurrence' | 'sequence'>('frequency');
  const [numberInput, setNumberInput] = useState('');

  // Données d'analyse
  const [frequencyData, setFrequencyData] = useState<{ [key: number]: number }>({});
  const [coOccurrenceData, setCoOccurrenceData] = useState<{ [key: string]: number }>({});
  const [sequenceData, setSequenceData] = useState<Array<{ date: string; numbers: number[] }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!drawName) return;
      
      try {
        setLoading(true);
        const data = await LotteryAPIService.getDrawResults(drawName, 100);
        setResults(data);
        
        // Calculer les données d'analyse
        calculateAnalysisData(data);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [drawName]);

  const calculateAnalysisData = (data: DrawResult[]) => {
    // Fréquence
    const frequency: { [key: number]: number } = {};
    data.forEach(result => {
      result.gagnants.forEach(num => {
        frequency[num] = (frequency[num] || 0) + 1;
      });
    });
    setFrequencyData(frequency);

    // Co-occurrences
    const coOccurrences: { [key: string]: number } = {};
    data.forEach(result => {
      const numbers = result.gagnants.sort((a, b) => a - b);
      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          const pair = `${numbers[i]}-${numbers[j]}`;
          coOccurrences[pair] = (coOccurrences[pair] || 0) + 1;
        }
      }
    });
    setCoOccurrenceData(coOccurrences);

    // Séquences temporelles
    const sequences = data.map(result => ({
      date: result.date,
      numbers: result.gagnants
    }));
    setSequenceData(sequences);
  };

  const handleNumberSelect = (num: number) => {
    setSelectedNumber(num);
    setNumberInput(num.toString());
  };

  const handleNumberInputChange = (value: string) => {
    setNumberInput(value);
    const num = parseInt(value);
    if (num >= 1 && num <= 90) {
      setSelectedNumber(num);
    } else {
      setSelectedNumber(null);
    }
  };

  const getNumberAnalysis = (number: number) => {
    const frequency = frequencyData[number] || 0;
    const percentage = results.length > 0 ? (frequency / results.length) * 100 : 0;
    
    // Dernière apparition
    const lastAppearance = results.find(result => result.gagnants.includes(number));
    
    // Co-occurrences avec ce numéro
    const relatedNumbers = Object.entries(coOccurrenceData)
      .filter(([pair]) => pair.includes(number.toString()))
      .map(([pair, count]) => {
        const [num1, num2] = pair.split('-').map(Number);
        const relatedNum = num1 === number ? num2 : num1;
        return { number: relatedNum, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Position dans le classement
    const sortedFrequency = Object.entries(frequencyData)
      .sort(([, a], [, b]) => b - a);
    const rank = sortedFrequency.findIndex(([num]) => parseInt(num) === number) + 1;

    return {
      frequency,
      percentage,
      lastAppearance,
      relatedNumbers,
      rank,
      totalNumbers: sortedFrequency.length
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Analyse des régularités...</p>
        </div>
      </div>
    );
  }

  const analysis = selectedNumber ? getNumberAnalysis(selectedNumber) : null;

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
              <p className="text-muted-foreground">Consulter les régularités</p>
            </div>
          </div>
          
          <Badge variant="secondary" className="gap-1">
            <Search className="h-4 w-4" />
            Analyse avancée
          </Badge>
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
          <Button variant="default" size="sm">Consulter</Button>
        </div>

        <div className="grid gap-8">
          {/* Interface de recherche */}
          <Card className="gradient-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Recherche de numéro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="number-input">Numéro à analyser (1-90)</Label>
                  <Input
                    id="number-input"
                    type="number"
                    min="1"
                    max="90"
                    value={numberInput}
                    onChange={(e) => handleNumberInputChange(e.target.value)}
                    placeholder="Entrez un numéro..."
                    className="text-lg"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label>Type d'analyse</Label>
                  <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frequency">Fréquence d'apparition</SelectItem>
                      <SelectItem value="cooccurrence">Co-occurrences</SelectItem>
                      <SelectItem value="sequence">Tendances temporelles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Grille de sélection rapide */}
              <div>
                <h4 className="font-semibold mb-3 text-foreground">Sélection rapide</h4>
                <div className="grid grid-cols-10 gap-2">
                  {Array.from({ length: 90 }, (_, i) => i + 1).map(num => (
                    <Button
                      key={num}
                      variant={selectedNumber === num ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleNumberSelect(num)}
                      className="h-8 w-8 p-0 text-xs"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Résultats de l'analyse */}
          {selectedNumber && analysis && (
            <div className="grid gap-6">
              {/* Statistiques principales */}
              <Card className="gradient-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-foreground">
                      <LotteryNumber number={selectedNumber} />
                      Analyse du numéro {selectedNumber}
                    </CardTitle>
                    <Badge variant="outline" className="text-primary border-primary">
                      Rang #{analysis.rank} / {analysis.totalNumbers}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {analysis.frequency}
                      </div>
                      <div className="text-sm text-muted-foreground">Apparitions</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {analysis.percentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Fréquence</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {analysis.lastAppearance 
                          ? new Date(analysis.lastAppearance.date).toLocaleDateString('fr-FR')
                          : 'Jamais'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Dernière apparition</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {analysis.relatedNumbers.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Associations</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Numéros associés */}
              {analysis.relatedNumbers.length > 0 && (
                <Card className="gradient-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Users className="h-5 w-5" />
                      Numéros fréquemment associés
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {analysis.relatedNumbers.map(({ number, count }) => (
                        <div key={number} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <LotteryNumber number={number} className="scale-75" />
                            <span className="font-medium text-foreground">Numéro {number}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-primary">{count} fois</div>
                            <div className="text-xs text-muted-foreground">
                              {((count / results.length) * 100).toFixed(1)}% des tirages
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Graphiques d'analyse */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="gradient-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Tendance temporelle</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <TrendChart data={sequenceData} selectedNumber={selectedNumber} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Associations principales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <CoOccurrenceHeatmap coOccurrences={coOccurrenceData} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Message si aucun numéro sélectionné */}
          {!selectedNumber && (
            <Card className="gradient-card border-border">
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Sélectionnez un numéro pour commencer l'analyse
                </h3>
                <p className="text-muted-foreground">
                  Entrez un numéro entre 1 et 90 ou cliquez sur un numéro dans la grille ci-dessus.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}