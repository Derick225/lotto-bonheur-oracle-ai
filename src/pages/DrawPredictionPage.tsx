import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DrawPredictionPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Prédictions (temporairement indisponible)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Cette fonctionnalité sera bientôt disponible.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DrawPredictionPage;