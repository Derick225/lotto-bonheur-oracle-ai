// No React import needed for functional components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const FavoritesManager: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Favoris (temporairement indisponible)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Cette fonctionnalité sera bientôt disponible.
        </p>
      </CardContent>
    </Card>
  );
};