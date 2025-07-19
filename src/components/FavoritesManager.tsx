import { useState, useEffect } from 'react';
import { Heart, Star, Trash2, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LotteryNumber } from '@/components/LotteryNumber';
import { PredictionResult } from '@/services/predictionService';

interface FavoritePrediction extends PredictionResult {
  id: string;
  savedAt: Date;
  drawName: string;
  label?: string;
}

export function FavoritesManager() {
  const [favorites, setFavorites] = useState<FavoritePrediction[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('lottery-favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFavorites(parsed.map((fav: any) => ({
          ...fav,
          savedAt: new Date(fav.savedAt)
        })));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  };

  const saveFavorites = (newFavorites: FavoritePrediction[]) => {
    try {
      localStorage.setItem('lottery-favorites', JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les favoris",
        variant: "destructive",
      });
    }
  };

  const addToFavorites = (prediction: PredictionResult, drawName: string, label?: string) => {
    const favorite: FavoritePrediction = {
      ...prediction,
      id: `${Date.now()}-${Math.random()}`,
      savedAt: new Date(),
      drawName,
      label
    };

    const newFavorites = [favorite, ...favorites].slice(0, 50); // Limiter à 50 favoris
    saveFavorites(newFavorites);

    toast({
      title: "Ajouté aux favoris",
      description: `Prédiction pour ${drawName} sauvegardée`,
    });
  };

  const removeFromFavorites = (id: string) => {
    const newFavorites = favorites.filter(fav => fav.id !== id);
    saveFavorites(newFavorites);

    toast({
      title: "Supprimé",
      description: "Prédiction supprimée des favoris",
    });
  };

  const exportFavorites = () => {
    try {
      const dataStr = JSON.stringify(favorites, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `favoris-loterie-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Vos favoris ont été exportés",
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les favoris",
        variant: "destructive",
      });
    }
  };

  const shareFavorite = async (favorite: FavoritePrediction) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Prédiction ${favorite.drawName}`,
          text: `Numéros prédits: ${favorite.numbers.map(n => n.number).join(', ')} - Confiance: ${(favorite.confidence * 100).toFixed(1)}%`,
          url: window.location.origin
        });
      } catch (error) {
        console.log('Partage annulé');
      }
    } else {
      // Fallback: copier dans le presse-papier
      const text = `Prédiction ${favorite.drawName}: ${favorite.numbers.map(n => n.number).join(', ')} (Confiance: ${(favorite.confidence * 100).toFixed(1)}%)`;
      navigator.clipboard.writeText(text);
      toast({
        title: "Copié",
        description: "Prédiction copiée dans le presse-papier",
      });
    }
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Heart className="h-4 w-4" />
            Favoris ({favorites.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Mes Prédictions Favorites
            </DialogTitle>
            <DialogDescription>
              Gérez vos prédictions sauvegardées et exportez-les
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {favorites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune prédiction favorite pour le moment</p>
                <p className="text-sm">Ajoutez vos meilleures prédictions pour les retrouver facilement</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {favorites.length} prédiction{favorites.length > 1 ? 's' : ''} sauvegardée{favorites.length > 1 ? 's' : ''}
                  </p>
                  <Button variant="outline" size="sm" onClick={exportFavorites} className="gap-2">
                    <Download className="h-3 w-3" />
                    Exporter
                  </Button>
                </div>

                <div className="grid gap-4">
                  {favorites.map((favorite) => (
                    <Card key={favorite.id} className="animate-fade-in">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{favorite.drawName}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Sauvegardé le {favorite.savedAt.toLocaleDateString('fr-FR')} à {favorite.savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {favorite.label && (
                              <Badge variant="outline" className="mt-1">
                                {favorite.label}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => shareFavorite(favorite)}
                              className="h-8 w-8 p-0"
                            >
                              <Share2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromFavorites(favorite.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2 justify-center">
                          {favorite.numbers.map((item, index) => (
                            <div key={index} className="text-center space-y-1">
                              <LotteryNumber number={item.number} className="h-8 w-8 text-sm" />
                              <div className="text-xs text-muted-foreground">
                                {(item.probability * 100).toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <span>Algorithme: <span className="font-medium">{favorite.algorithm}</span></span>
                          <Badge 
                            variant="outline"
                            className={`
                              ${favorite.confidence > 0.8 ? 'border-green-400 text-green-400' : 
                                favorite.confidence > 0.6 ? 'border-yellow-400 text-yellow-400' : 
                                'border-red-400 text-red-400'}
                            `}
                          >
                            Confiance: {(favorite.confidence * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hook pour utiliser le composant depuis l'extérieur */}
      <div className="hidden">
        {JSON.stringify({ addToFavorites })}
      </div>
    </>
  );
}

// Hook pour utiliser le manager de favoris
export function useFavoritesManager() {
  const addToFavorites = (prediction: PredictionResult, drawName: string, label?: string) => {
    try {
      const saved = localStorage.getItem('lottery-favorites');
      const favorites = saved ? JSON.parse(saved) : [];
      
      const favorite: FavoritePrediction = {
        ...prediction,
        id: `${Date.now()}-${Math.random()}`,
        savedAt: new Date(),
        drawName,
        label
      };

      const newFavorites = [favorite, ...favorites].slice(0, 50);
      localStorage.setItem('lottery-favorites', JSON.stringify(newFavorites));
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'ajout aux favoris:', error);
      return false;
    }
  };

  return { addToFavorites };
}