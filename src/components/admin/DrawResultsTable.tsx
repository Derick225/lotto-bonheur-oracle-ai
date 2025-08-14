// No React import needed for functional components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DrawResult } from '@/services/supabaseClient';

interface DrawResultsTableProps {
  results: DrawResult[];
  onEdit?: (result: DrawResult) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export const DrawResultsTable: React.FC<DrawResultsTableProps> = ({
  results,
  onEdit,
  onDelete,
  loading = false
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="ml-2">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Aucun résultat à afficher</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultats des Tirages</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={result.lottery_type === 'loto' ? 'default' : 'secondary'}>
                    {result.lottery_type.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{result.draw_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Numéros:</span>
                  {result.numbers.map((num, index) => (
                    <Badge key={index} variant="outline" className="min-w-8 justify-center">
                      {num}
                    </Badge>
                  ))}
                  {result.bonus_numbers && result.bonus_numbers.length > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground ml-2">Bonus:</span>
                      {result.bonus_numbers.map((num, index) => (
                        <Badge key={index} variant="secondary" className="min-w-8 justify-center">
                          {num}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>
                {(result.jackpot_amount || result.winners_count !== undefined) && (
                  <div className="text-sm text-muted-foreground">
                    {result.jackpot_amount && `Jackpot: ${result.jackpot_amount.toLocaleString()} €`}
                    {result.jackpot_amount && result.winners_count !== undefined && ' • '}
                    {result.winners_count !== undefined && `${result.winners_count} gagnant(s)`}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {onEdit && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEdit(result)}
                  >
                    Modifier
                  </Button>
                )}
                {onDelete && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onDelete(result.id!)}
                  >
                    Supprimer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};