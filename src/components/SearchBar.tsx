import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string, filters: SearchFilters) => void;
  className?: string;
}

export interface SearchFilters {
  drawNames: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  numberRange: {
    min?: number;
    max?: number;
  };
}

const DRAW_NAMES = ['Cash', 'Or', 'Diamant', 'Emeraude', 'Soutra', 'Morning', 'Midi'];

export function SearchBar({ placeholder = "Rechercher...", onSearch, className = "" }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    drawNames: [],
    dateRange: {},
    numberRange: {}
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    onSearch(query, filters);
  };

  const handleClearSearch = () => {
    setQuery('');
    setFilters({
      drawNames: [],
      dateRange: {},
      numberRange: {}
    });
    onSearch('', {
      drawNames: [],
      dateRange: {},
      numberRange: {}
    });
  };

  const toggleDrawName = (drawName: string) => {
    setFilters(prev => ({
      ...prev,
      drawNames: prev.drawNames.includes(drawName)
        ? prev.drawNames.filter(name => name !== drawName)
        : [...prev.drawNames, drawName]
    }));
  };

  const activeFiltersCount = filters.drawNames.length + 
    (filters.dateRange.start ? 1 : 0) + 
    (filters.numberRange.min ? 1 : 0);

  return (
    <div className={`relative w-full max-w-md ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-9 pr-20 animate-fade-in"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(query || activeFiltersCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="h-6 w-6 p-0 hover:bg-destructive/10"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 relative"
              >
                <Filter className="h-3 w-3" />
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs rounded-full"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 animate-scale-in">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Filtres de recherche</h4>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Tirages</label>
                  <div className="space-y-2">
                    {DRAW_NAMES.map((drawName) => (
                      <div key={drawName} className="flex items-center space-x-2">
                        <Checkbox
                          id={drawName}
                          checked={filters.drawNames.includes(drawName)}
                          onCheckedChange={() => toggleDrawName(drawName)}
                        />
                        <label htmlFor={drawName} className="text-sm">
                          {drawName}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Plage de numéros</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      min="1"
                      max="90"
                      value={filters.numberRange.min || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        numberRange: { ...prev.numberRange, min: parseInt(e.target.value) || undefined }
                      }))}
                      className="w-20"
                    />
                    <span className="text-muted-foreground self-center">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      min="1"
                      max="90"
                      value={filters.numberRange.max || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        numberRange: { ...prev.numberRange, max: parseInt(e.target.value) || undefined }
                      }))}
                      className="w-20"
                    />
                  </div>
                </div>

                <Button onClick={handleSearch} className="w-full">
                  Appliquer les filtres
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}