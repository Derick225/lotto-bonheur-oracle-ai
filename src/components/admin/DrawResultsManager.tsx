import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { DrawResult } from '@/services/supabaseClient';

interface DrawResultsManagerProps {
  onClose?: () => void;
}

export const DrawResultsManager: React.FC<DrawResultsManagerProps> = ({ onClose }) => {
  const [results, setResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Simulation des données
  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        // Simulation de chargement
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Données simulées
        const mockResults: DrawResult[] = [
          {
            id: '1',
            draw_date: '2024-01-15',
            numbers: [12, 23, 34, 45, 49],
            bonus_numbers: [7],
            lottery_type: 'loto',
            jackpot_amount: 15000000,
            winners_count: 3,
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            draw_date: '2024-01-14',
            numbers: [8, 19, 27, 38, 42],
            bonus_numbers: [5],
            lottery_type: 'loto',
            jackpot_amount: 12000000,
            winners_count: 1,
            created_at: new Date().toISOString()
          },
          {
            id: '3',
            draw_date: '2024-01-13',
            numbers: [3, 14, 25, 36, 47],
            bonus_numbers: [9],
            lottery_type: 'euromillions',
            jackpot_amount: 180000000,
            winners_count: 0,
            created_at: new Date().toISOString()
          }
        ];
        
        setResults(mockResults);
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des résultats');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  const filteredResults = results.filter(result => 
    result.lottery_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.draw_date.includes(searchTerm) ||
    result.numbers.some(num => num.toString().includes(searchTerm))
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="ml-2">Chargement des résultats...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Gestion des Résultats de Tirage
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Résultat
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par type, date ou numéros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des résultats */}
      <div className="grid gap-4">
        {filteredResults.map((result) => (
          <Card key={result.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={result.lottery_type === 'loto' ? 'default' : 'secondary'}>
                      {result.lottery_type.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{result.draw_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Numéros:</span>
                    <div className="flex gap-1">
                      {result.numbers.map((num, index) => (
                        <Badge key={index} variant="outline" className="min-w-8 justify-center">
                          {num}
                        </Badge>
                      ))}
                    </div>
                    {result.bonus_numbers && result.bonus_numbers.length > 0 && (
                      <>
                        <span className="text-sm text-muted-foreground">Bonus:</span>
                        <div className="flex gap-1">
                          {result.bonus_numbers.map((num, index) => (
                            <Badge key={index} variant="secondary" className="min-w-8 justify-center">
                              {num}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {result.jackpot_amount && (
                    <div className="text-sm text-muted-foreground">
                      Jackpot: {result.jackpot_amount.toLocaleString()} €
                      {result.winners_count !== undefined && (
                        <span className="ml-2">• {result.winners_count} gagnant(s)</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Modifier
                  </Button>
                  <Button variant="outline" size="sm">
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResults.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Aucun résultat trouvé</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};