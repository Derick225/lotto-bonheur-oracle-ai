import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  Database, 
  Calendar,
  Filter,
  Info,
  CheckCircle
} from 'lucide-react';
import { DrawResultsFilter, ExportOptions } from '@/services/drawResultsService';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => Promise<void>;
  filters: DrawResultsFilter;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  filters
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    filters: filters,
    includeHistory: false
  });
  const [isExporting, setIsExporting] = useState(false);

  // Options de format
  const formatOptions = [
    {
      value: 'csv',
      label: 'CSV',
      description: 'Format tableur compatible Excel',
      icon: <FileText className="h-4 w-4" />
    },
    {
      value: 'excel',
      label: 'Excel',
      description: 'Fichier Excel natif (.xlsx)',
      icon: <FileText className="h-4 w-4" />
    },
    {
      value: 'json',
      label: 'JSON',
      description: 'Format de données structurées',
      icon: <Database className="h-4 w-4" />
    }
  ];

  // Gestion des changements d'options
  const handleOptionChange = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Lancer l'export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(exportOptions);
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Réinitialiser les options
  const resetOptions = () => {
    setExportOptions({
      format: 'csv',
      filters: filters,
      includeHistory: false
    });
  };

  // Calculer le nombre estimé de lignes
  const getEstimatedRows = (): string => {
    // Estimation basée sur les filtres
    if (filters.dateFrom && filters.dateTo) {
      const start = new Date(filters.dateFrom);
      const end = new Date(filters.dateTo);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return `~${Math.min(days * 2, 1000)} lignes`; // Estimation: 2 tirages par jour max
    }
    return 'Toutes les données';
  };

  // Vérifier si des filtres sont appliqués
  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof DrawResultsFilter];
    return value !== undefined && value !== null && value !== '';
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter les Tirages
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format d'export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Format d'Export</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {formatOptions.map((format) => (
                  <div
                    key={format.value}
                    className={`
                      p-3 border rounded-lg cursor-pointer transition-colors
                      ${exportOptions.format === format.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                      }
                    `}
                    onClick={() => handleOptionChange('format', format.value)}
                  >
                    <div className="flex items-center gap-3">
                      {format.icon}
                      <div className="flex-1">
                        <div className="font-medium">{format.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {format.description}
                        </div>
                      </div>
                      {exportOptions.format === format.value && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Options d'export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Options d'Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeHistory"
                  checked={exportOptions.includeHistory}
                  onCheckedChange={(checked) => 
                    handleOptionChange('includeHistory', checked as boolean)
                  }
                />
                <Label htmlFor="includeHistory" className="text-sm">
                  Inclure l'historique des modifications
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useCurrentFilters"
                  checked={exportOptions.filters === filters}
                  onCheckedChange={(checked) => 
                    handleOptionChange('filters', checked ? filters : {})
                  }
                />
                <Label htmlFor="useCurrentFilters" className="text-sm">
                  Appliquer les filtres actuels
                </Label>
              </div>

              {exportOptions.includeHistory && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    L'inclusion de l'historique peut considérablement augmenter la taille du fichier.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Aperçu des filtres */}
          {hasActiveFilters && exportOptions.filters === filters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtres Appliqués
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {filters.dateFrom && (
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      Depuis: {new Date(filters.dateFrom).toLocaleDateString('fr-FR')}
                    </Badge>
                  )}
                  {filters.dateTo && (
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      Jusqu'à: {new Date(filters.dateTo).toLocaleDateString('fr-FR')}
                    </Badge>
                  )}
                  {filters.lotteryType && (
                    <Badge variant="outline">
                      Type: {filters.lotteryType}
                    </Badge>
                  )}
                  {filters.numbers && filters.numbers.length > 0 && (
                    <Badge variant="outline">
                      Numéros: {filters.numbers.join(', ')}
                    </Badge>
                  )}
                  {filters.search && (
                    <Badge variant="outline">
                      Recherche: "{filters.search}"
                    </Badge>
                  )}
                </div>
                
                <div className="mt-3 text-sm text-muted-foreground">
                  Estimation: {getEstimatedRows()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informations sur l'export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">
                    {formatOptions.find(f => f.value === exportOptions.format)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Données:</span>
                  <span className="font-medium">
                    {exportOptions.filters === filters && hasActiveFilters 
                      ? 'Filtrées' 
                      : 'Toutes'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Historique:</span>
                  <span className="font-medium">
                    {exportOptions.includeHistory ? 'Inclus' : 'Exclu'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimation:</span>
                  <span className="font-medium">{getEstimatedRows()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                onClick={resetOptions}
                variant="outline"
                size="sm"
              >
                Réinitialiser
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                disabled={isExporting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Exporter
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Aide */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Formats disponibles:</strong>
              <ul className="mt-1 ml-4 list-disc text-xs space-y-1">
                <li><strong>CSV:</strong> Compatible avec Excel, Google Sheets</li>
                <li><strong>Excel:</strong> Fichier .xlsx natif avec formatage</li>
                <li><strong>JSON:</strong> Format structuré pour développeurs</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};
