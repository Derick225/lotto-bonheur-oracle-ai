import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LotteryNumber } from '@/components/LotteryNumber';
import { ArrowLeft, Brain, TrendingUp, Target, Zap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DrawPredictionPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const drawName = name ? decodeURIComponent(name) : "Tirage";

  // Données de démonstration pour les prédictions
  const predictions = {
    recommended: [7, 14, 23, 31, 42],
    confidence: 78,
    nextDraw: "Mardi 20h30",
    analysis: {
      hotNumbers: [7, 14, 23],
      coldNumbers: [1, 8, 15],
      patterns: ["Séquence croissante", "Écart de 7"]
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prédictions IA</h1>
          <p className="text-muted-foreground">{drawName}</p>
        </div>
      </div>

      {/* Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Les prédictions sont basées sur l'analyse statistique et l'IA. Elles ne garantissent pas un gain.
        </AlertDescription>
      </Alert>

      {/* Prédiction principale */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Numéros Recommandés
            <Badge variant="secondary" className="ml-auto">
              Confiance: {predictions.confidence}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center gap-3">
            {predictions.recommended.map((number, index) => (
              <LotteryNumber key={index} number={number} size="lg" />
            ))}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Niveau de confiance</span>
              <span className="font-medium">{predictions.confidence}%</span>
            </div>
            <Progress value={predictions.confidence} className="h-2" />
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Prochain tirage: <span className="font-medium text-foreground">{predictions.nextDraw}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Analyse détaillée */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              Numéros Chauds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 justify-center">
              {predictions.analysis.hotNumbers.map((number, index) => (
                <LotteryNumber key={index} number={number} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Sortis fréquemment récemment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Numéros Froids
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 justify-center">
              {predictions.analysis.coldNumbers.map((number, index) => (
                <LotteryNumber key={index} number={number} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              En retard de sortie
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Patterns Détectés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {predictions.analysis.patterns.map((pattern, index) => (
                <Badge key={index} variant="outline" className="block text-center">
                  {pattern}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Button asChild>
          <Link to={`/draw/${encodeURIComponent(drawName)}/stats`}>
            Voir les Statistiques
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/draw/${encodeURIComponent(drawName)}/data`}>
            Historique des Données
          </Link>
        </Button>
      </div>
    </div>
  );
};

export { DrawPredictionPage };
export default DrawPredictionPage;