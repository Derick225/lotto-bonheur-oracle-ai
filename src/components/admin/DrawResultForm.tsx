import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  X, 
  Plus, 
  Calendar, 
  Hash, 
  DollarSign, 
  Users, 
  AlertTriangle,
  Info,
  Shuffle
} from 'lucide-react';
import { DrawResult, validateDrawResult } from '@/services/supabaseClient';

interface DrawResultFormProps {
  initialData?: DrawResult;
  onSubmit: (data: Partial<DrawResult>) => Promise<void>;
  onCancel: () => void;
}

export const DrawResultForm: React.FC<DrawResultFormProps> = ({
  initialData,
  onSubmit,
  onCancel
}) => {
  // État du formulaire
  const [formData, setFormData] = useState<Partial<DrawResult>>({
    draw_date: '',
    numbers: [],
    bonus_numbers: [],
    lottery_type: 'loto',
    jackpot_amount: undefined,
    winners_count: undefined
  });

  // État de validation
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // État pour l'ajout de numéros
  const [newNumber, setNewNumber] = useState('');
  const [newBonusNumber, setNewBonusNumber] = useState('');

  // Initialiser avec les données existantes
  useEffect(() => {
    if (initialData) {
      setFormData({
        draw_date: initialData.draw_date,
        numbers: [...(initialData.numbers || [])],
        bonus_numbers: [...(initialData.bonus_numbers || [])],
        lottery_type: initialData.lottery_type,
        jackpot_amount: initialData.jackpot_amount,
        winners_count: initialData.winners_count
      });
    }
  }, [initialData]);

  // Validation en temps réel
  useEffect(() => {
    const validation = validateDrawResult(formData);
    setErrors(validation.errors);
  }, [formData]);

  // Gestion des changements de champs
  const handleFieldChange = (field: keyof DrawResult, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Gestion des numéros principaux
  const addNumber = () => {
    const num = parseInt(newNumber);
    if (isNaN(num) || num < 1 || num > 49) {
      return;
    }
    
    if (formData.numbers?.includes(num)) {
      return; // Numéro déjà présent
    }

    setFormData(prev => ({
      ...prev,
      numbers: [...(prev.numbers || []), num].sort((a, b) => a - b)
    }));
    setNewNumber('');
  };

  const removeNumber = (num: number) => {
    setFormData(prev => ({
      ...prev,
      numbers: prev.numbers?.filter(n => n !== num) || []
    }));
  };

  // Gestion des numéros bonus
  const addBonusNumber = () => {
    const num = parseInt(newBonusNumber);
    if (isNaN(num) || num < 1 || num > 10) {
      return;
    }
    
    if (formData.bonus_numbers?.includes(num)) {
      return; // Numéro déjà présent
    }

    setFormData(prev => ({
      ...prev,
      bonus_numbers: [...(prev.bonus_numbers || []), num].sort((a, b) => a - b)
    }));
    setNewBonusNumber('');
  };

  const removeBonusNumber = (num: number) => {
    setFormData(prev => ({
      ...prev,
      bonus_numbers: prev.bonus_numbers?.filter(n => n !== num) || []
    }));
  };

  // Génération aléatoire de numéros
  const generateRandomNumbers = () => {
    const numbers: number[] = [];
    while (numbers.length < 5) {
      const num = Math.floor(Math.random() * 49) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      numbers: numbers.sort((a, b) => a - b)
    }));
  };

  const generateRandomBonusNumbers = () => {
    const bonusNumbers: number[] = [];
    while (bonusNumbers.length < 1) {
      const num = Math.floor(Math.random() * 10) + 1;
      if (!bonusNumbers.includes(num)) {
        bonusNumbers.push(num);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      bonus_numbers: bonusNumbers
    }));
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (errors.length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            if (errors.length === 0) {
              handleSubmit(e as any);
            }
            break;
          case 'Escape':
            e.preventDefault();
            onCancel();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [errors, formData, onCancel]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations de base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Informations de Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="draw_date">Date du tirage *</Label>
              <Input
                id="draw_date"
                type="date"
                value={formData.draw_date}
                onChange={(e) => handleFieldChange('draw_date', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lottery_type">Type de loterie *</Label>
              <Select
                value={formData.lottery_type}
                onValueChange={(value) => handleFieldChange('lottery_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loto">Loto</SelectItem>
                  <SelectItem value="euromillions">EuroMillions</SelectItem>
                  <SelectItem value="keno">Keno</SelectItem>
                  <SelectItem value="amigo">Amigo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Numéros principaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Numéros Principaux *
            <Button
              type="button"
              onClick={generateRandomNumbers}
              variant="outline"
              size="sm"
              className="ml-auto flex items-center gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Aléatoire
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Numéros actuels */}
          <div className="flex flex-wrap gap-2">
            {formData.numbers?.map(num => (
              <Badge
                key={num}
                variant="default"
                className="flex items-center gap-1 cursor-pointer hover:bg-destructive"
                onClick={() => removeNumber(num)}
              >
                {num}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            {formData.numbers?.length === 0 && (
              <span className="text-muted-foreground text-sm">
                Aucun numéro ajouté
              </span>
            )}
          </div>

          {/* Ajout de numéro */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="49"
              placeholder="Numéro (1-49)"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addNumber();
                }
              }}
              className="w-32"
            />
            <Button
              type="button"
              onClick={addNumber}
              variant="outline"
              size="sm"
              disabled={!newNumber || formData.numbers?.length >= 7}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Ajoutez entre 5 et 7 numéros principaux (1-49). 
              Cliquez sur un numéro pour le supprimer.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Numéros bonus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Numéros Bonus (optionnel)
            <Button
              type="button"
              onClick={generateRandomBonusNumbers}
              variant="outline"
              size="sm"
              className="ml-auto flex items-center gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Aléatoire
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Numéros bonus actuels */}
          <div className="flex flex-wrap gap-2">
            {formData.bonus_numbers?.map(num => (
              <Badge
                key={num}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-destructive"
                onClick={() => removeBonusNumber(num)}
              >
                {num}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            {formData.bonus_numbers?.length === 0 && (
              <span className="text-muted-foreground text-sm">
                Aucun numéro bonus ajouté
              </span>
            )}
          </div>

          {/* Ajout de numéro bonus */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="10"
              placeholder="Numéro bonus (1-10)"
              value={newBonusNumber}
              onChange={(e) => setNewBonusNumber(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addBonusNumber();
                }
              }}
              className="w-40"
            />
            <Button
              type="button"
              onClick={addBonusNumber}
              variant="outline"
              size="sm"
              disabled={!newBonusNumber || formData.bonus_numbers?.length >= 2}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informations complémentaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Informations Complémentaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jackpot_amount">Montant du jackpot (€)</Label>
              <Input
                id="jackpot_amount"
                type="number"
                min="0"
                step="1000"
                placeholder="Ex: 15000000"
                value={formData.jackpot_amount || ''}
                onChange={(e) => handleFieldChange('jackpot_amount', 
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
              />
            </div>
            <div>
              <Label htmlFor="winners_count">Nombre de gagnants</Label>
              <Input
                id="winners_count"
                type="number"
                min="0"
                placeholder="Ex: 3"
                value={formData.winners_count || ''}
                onChange={(e) => handleFieldChange('winners_count', 
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Erreurs de validation */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Enter</kbd> pour sauvegarder,{' '}
          <kbd className="px-2 py-1 bg-muted rounded text-xs">Échap</kbd> pour annuler
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={errors.length > 0 || isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sauvegarde...
              </>
            ) : (
              <>
                {initialData ? 'Mettre à jour' : 'Créer'}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
