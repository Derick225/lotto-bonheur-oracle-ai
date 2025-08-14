import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  X, 
  Plus, 
  Calendar, 
  Hash, 
  Filter,
  RotateCcw,
  Search
} from 'lucide-react';
import { DrawResultsFilter } from '@/services/drawResultsService';

interface DrawResultsFiltersProps {
  filters: DrawResultsFilter;
  onFiltersChange: (filters: DrawResultsFilter) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export const DrawResultsFilters: React.FC<DrawResultsFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  hasActiveFilters
}) => {
  // État local pour les filtres
  const [localFilters, setLocalFilters] = useState<DrawResultsFilter>(filters);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [newNumber, setNewNumber] = useState('');

  // Synchroniser avec les props
  useEffect(() => {
    setLocalFilters(filters);
    setSelectedNumbers(filters.numbers || []);
  }, [filters]);

  // Gestion des changements de filtres
  const handleFilterChange = (key: keyof DrawResultsFilter, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  // Appliquer les filtres
  const applyFilters = () => {
    const filtersToApply = {
      ...localFilters,
      numbers: selectedNumbers.length > 0 ? selectedNumbers : undefined
    };
    onFiltersChange(filtersToApply);
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setLocalFilters({});
    setSelectedNumbers([]);
    setNewNumber('');
    onReset();
  };

  // Gestion des numéros
  const addNumber = () => {
    const num = parseInt(newNumber);
    if (isNaN(num) || num < 1 || num > 49 || selectedNumbers.includes(num)) {
      return;
    }
    
    const newNumbers = [...selectedNumbers, num].sort((a, b) => a - b);
    setSelectedNumbers(newNumbers);
    setNewNumber('');
  };

  const removeNumber = (num: number) => {
    setSelectedNumbers(prev => prev.filter(n => n !== num));
  };

  // Options de tri
  const sortOptions = [
    { value: 'draw_date', label: 'Date du tirage' },
    { value: 'created_at', label: 'Date de création' },
    { value: 'lottery_type', label: 'Type de loterie' }
  ];

  const orderOptions = [
    { value: 'desc', label: 'Décroissant' },
    { value: 'asc', label: 'Croissant' }
  ];

  const lotteryTypes = [
    { value: 'loto', label: 'Loto' },
    { value: 'euromillions', label: 'EuroMillions' },
    { value: 'keno', label: 'Keno' },
    { value: 'amigo', label: 'Amigo' }
  ];

  const limitOptions = [
    { value: '10', label: '10 par page' },
    { value: '20', label: '20 par page' },
    { value: '50', label: '50 par page' },
    { value: '100', label: '100 par page' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtres Avancés
          {hasActiveFilters && (
            <Badge variant="secondary">
              Filtres actifs
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtres de date */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Période</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                Date de début
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={localFilters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                Date de fin
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={localFilters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Type de loterie */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Type de Loterie</Label>
          <Select
            value={localFilters.lotteryType || ''}
            onValueChange={(value) => handleFilterChange('lotteryType', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les types</SelectItem>
              {lotteryTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtrage par numéros */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Numéros (tirages contenant au moins un de ces numéros)
          </Label>
          
          {/* Numéros sélectionnés */}
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedNumbers.map(num => (
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
            {selectedNumbers.length === 0 && (
              <span className="text-muted-foreground text-sm">
                Aucun numéro sélectionné
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
              disabled={!newNumber}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tri et pagination */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Trier par</Label>
            <Select
              value={localFilters.sortBy || 'draw_date'}
              onValueChange={(value) => handleFilterChange('sortBy', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-2 block">Ordre</Label>
            <Select
              value={localFilters.sortOrder || 'desc'}
              onValueChange={(value) => handleFilterChange('sortOrder', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orderOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-2 block">Résultats par page</Label>
            <Select
              value={localFilters.limit?.toString() || '20'}
              onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {limitOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Recherche textuelle */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Recherche textuelle</Label>
          <Input
            placeholder="Rechercher dans les types, dates..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {hasActiveFilters ? 'Filtres appliqués' : 'Aucun filtre actif'}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={resetFilters}
              variant="outline"
              size="sm"
              disabled={!hasActiveFilters}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
            <Button
              onClick={applyFilters}
              size="sm"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Appliquer
            </Button>
          </div>
        </div>

        {/* Résumé des filtres actifs */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-2 block">Filtres actifs :</Label>
            <div className="flex flex-wrap gap-2">
              {localFilters.dateFrom && (
                <Badge variant="outline">
                  Depuis: {new Date(localFilters.dateFrom).toLocaleDateString('fr-FR')}
                </Badge>
              )}
              {localFilters.dateTo && (
                <Badge variant="outline">
                  Jusqu'à: {new Date(localFilters.dateTo).toLocaleDateString('fr-FR')}
                </Badge>
              )}
              {localFilters.lotteryType && (
                <Badge variant="outline">
                  Type: {lotteryTypes.find(t => t.value === localFilters.lotteryType)?.label}
                </Badge>
              )}
              {selectedNumbers.length > 0 && (
                <Badge variant="outline">
                  Numéros: {selectedNumbers.join(', ')}
                </Badge>
              )}
              {localFilters.search && (
                <Badge variant="outline">
                  Recherche: "{localFilters.search}"
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
