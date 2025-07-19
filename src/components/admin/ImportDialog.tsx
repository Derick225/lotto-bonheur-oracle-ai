import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';
import { ImportResult } from '@/services/drawResultsService';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any[], filename: string, options?: any) => Promise<ImportResult | null>;
}

interface ImportStep {
  id: 'upload' | 'preview' | 'options' | 'import' | 'result';
  title: string;
  completed: boolean;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onOpenChange,
  onImport
}) => {
  // État de l'import
  const [currentStep, setCurrentStep] = useState<ImportStep['id']>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    updateExisting: false,
    validateOnly: false
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Étapes de l'import
  const steps: ImportStep[] = [
    { id: 'upload', title: 'Sélection du fichier', completed: !!file },
    { id: 'preview', title: 'Prévisualisation', completed: parsedData.length > 0 },
    { id: 'options', title: 'Options d\'import', completed: false },
    { id: 'import', title: 'Import en cours', completed: false },
    { id: 'result', title: 'Résultats', completed: !!importResult }
  ];

  // Réinitialiser l'état
  const resetState = () => {
    setCurrentStep('upload');
    setFile(null);
    setParsedData([]);
    setValidationResults([]);
    setImportResult(null);
    setIsProcessing(false);
    setProgress(0);
  };

  // Gestion du fichier
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseFile(selectedFile);
  }, []);

  // Parsing du fichier
  const parseFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(10);

    try {
      const text = await file.text();
      setProgress(30);

      let data: any[] = [];

      if (file.name.endsWith('.csv')) {
        data = parseCSV(text);
      } else if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else {
        throw new Error('Format de fichier non supporté');
      }

      setProgress(60);
      setParsedData(data);
      
      // Validation des données
      const validation = validateImportData(data);
      setValidationResults(validation);
      
      setProgress(100);
      setCurrentStep('preview');

    } catch (error) {
      console.error('Erreur lors du parsing:', error);
      alert(`Erreur lors de la lecture du fichier: ${error}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Parser CSV simple
  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};

      headers.forEach((header, index) => {
        const value = values[index];
        
        // Mapping des colonnes
        switch (header.toLowerCase()) {
          case 'date':
          case 'draw_date':
          case 'date_tirage':
            row.draw_date = value;
            break;
          case 'numbers':
          case 'numeros':
          case 'numéros':
            row.numbers = value.split('-').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
            break;
          case 'bonus':
          case 'bonus_numbers':
          case 'numeros_bonus':
            row.bonus_numbers = value ? value.split('-').map(n => parseInt(n.trim())).filter(n => !isNaN(n)) : [];
            break;
          case 'type':
          case 'lottery_type':
          case 'type_loterie':
            row.lottery_type = value || 'loto';
            break;
          case 'jackpot':
          case 'jackpot_amount':
          case 'montant_jackpot':
            row.jackpot_amount = value ? parseInt(value.replace(/[^\d]/g, '')) : null;
            break;
          case 'winners':
          case 'winners_count':
          case 'nombre_gagnants':
            row.winners_count = value ? parseInt(value) : null;
            break;
        }
      });

      if (row.draw_date && row.numbers) {
        data.push(row);
      }
    }

    return data;
  };

  // Validation des données d'import
  const validateImportData = (data: any[]) => {
    return data.map((item, index) => {
      const errors: string[] = [];

      if (!item.draw_date) {
        errors.push('Date manquante');
      }

      if (!item.numbers || !Array.isArray(item.numbers) || item.numbers.length === 0) {
        errors.push('Numéros manquants');
      } else {
        const invalidNumbers = item.numbers.filter((n: any) => !Number.isInteger(n) || n < 1 || n > 49);
        if (invalidNumbers.length > 0) {
          errors.push(`Numéros invalides: ${invalidNumbers.join(', ')}`);
        }
      }

      if (!item.lottery_type) {
        errors.push('Type de loterie manquant');
      }

      return {
        row: index + 1,
        data: item,
        errors,
        valid: errors.length === 0
      };
    });
  };

  // Lancer l'import
  const startImport = async () => {
    if (!file || parsedData.length === 0) return;

    setCurrentStep('import');
    setIsProcessing(true);
    setProgress(0);

    try {
      const result = await onImport(parsedData, file.name, importOptions);
      setImportResult(result);
      setCurrentStep('result');
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // Télécharger le template CSV
  const downloadTemplate = () => {
    const csvContent = [
      'date,numbers,bonus,type,jackpot,winners',
      '2024-01-15,1-5-12-23-45,7,loto,15000000,3',
      '2024-01-12,3-8-15-27-42,2,loto,12000000,1'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_tirages.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Fermer le dialog
  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const validRows = validationResults.filter(r => r.valid).length;
  const invalidRows = validationResults.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import de Tirages par Lots
          </DialogTitle>
        </DialogHeader>

        {/* Indicateur de progression */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep === step.id ? 'bg-primary text-primary-foreground' :
                  step.completed ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}
              `}>
                {step.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  step.completed ? 'bg-green-500' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <Tabs value={currentStep} className="w-full">
          {/* Étape 1: Upload */}
          <TabsContent value="upload" className="space-y-4">
            <div className="text-center py-8">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Sélectionnez un fichier</h3>
              <p className="text-muted-foreground mb-4">
                Formats supportés: CSV, JSON
              </p>
              
              <Input
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                className="max-w-sm mx-auto"
              />
              
              <div className="mt-4">
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Télécharger le template CSV
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Analyse du fichier...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </TabsContent>

          {/* Étape 2: Prévisualisation */}
          <TabsContent value="preview" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Prévisualisation des données</h3>
              <div className="flex items-center gap-2">
                <Badge variant="default">{validRows} valides</Badge>
                {invalidRows > 0 && (
                  <Badge variant="destructive">{invalidRows} erreurs</Badge>
                )}
              </div>
            </div>

            {invalidRows > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {invalidRows} ligne(s) contiennent des erreurs et ne seront pas importées.
                </AlertDescription>
              </Alert>
            )}

            <div className="max-h-64 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Ligne</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Numéros</th>
                    <th className="p-2 text-left">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResults.slice(0, 10).map((result) => (
                    <tr key={result.row} className={result.valid ? '' : 'bg-red-50'}>
                      <td className="p-2">{result.row}</td>
                      <td className="p-2">{result.data.draw_date}</td>
                      <td className="p-2">{result.data.lottery_type}</td>
                      <td className="p-2">
                        {result.data.numbers?.join('-') || 'N/A'}
                      </td>
                      <td className="p-2">
                        {result.valid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-xs text-red-600">
                              {result.errors[0]}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep('upload')} variant="outline">
                Retour
              </Button>
              <Button 
                onClick={() => setCurrentStep('options')}
                disabled={validRows === 0}
              >
                Continuer
              </Button>
            </div>
          </TabsContent>

          {/* Étape 3: Options */}
          <TabsContent value="options" className="space-y-4">
            <h3 className="text-lg font-medium">Options d'import</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipDuplicates"
                  checked={importOptions.skipDuplicates}
                  onCheckedChange={(checked) => 
                    setImportOptions(prev => ({ ...prev, skipDuplicates: checked as boolean }))
                  }
                />
                <Label htmlFor="skipDuplicates">
                  Ignorer les doublons (tirages existants)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateExisting"
                  checked={importOptions.updateExisting}
                  onCheckedChange={(checked) => 
                    setImportOptions(prev => ({ ...prev, updateExisting: checked as boolean }))
                  }
                />
                <Label htmlFor="updateExisting">
                  Mettre à jour les tirages existants
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="validateOnly"
                  checked={importOptions.validateOnly}
                  onCheckedChange={(checked) => 
                    setImportOptions(prev => ({ ...prev, validateOnly: checked as boolean }))
                  }
                />
                <Label htmlFor="validateOnly">
                  Validation uniquement (ne pas importer)
                </Label>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {validRows} ligne(s) seront traitées lors de l'import.
                {importOptions.skipDuplicates && ' Les doublons seront ignorés.'}
                {importOptions.updateExisting && ' Les tirages existants seront mis à jour.'}
              </AlertDescription>
            </Alert>

            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep('preview')} variant="outline">
                Retour
              </Button>
              <Button onClick={startImport}>
                {importOptions.validateOnly ? 'Valider' : 'Importer'}
              </Button>
            </div>
          </TabsContent>

          {/* Étape 4: Import en cours */}
          <TabsContent value="import" className="space-y-4">
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <h3 className="text-lg font-medium mb-2">Import en cours...</h3>
              <p className="text-muted-foreground">
                Traitement de {parsedData.length} ligne(s)
              </p>
              
              <div className="mt-4 max-w-sm mx-auto">
                <Progress value={progress} />
              </div>
            </div>
          </TabsContent>

          {/* Étape 5: Résultats */}
          <TabsContent value="result" className="space-y-4">
            {importResult && (
              <div>
                <h3 className="text-lg font-medium mb-4">Résultats de l'import</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.successCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Succès</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {importResult.errorCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Erreurs</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold">
                      {importResult.totalRows}
                    </div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Erreurs détaillées:</h4>
                    <div className="max-h-32 overflow-y-auto border rounded p-2 bg-red-50">
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-sm text-red-600 mb-1">
                          Ligne {error.row}: {error.errors.join(', ')}
                        </div>
                      ))}
                      {importResult.errors.length > 5 && (
                        <div className="text-sm text-muted-foreground">
                          ... et {importResult.errors.length - 5} autres erreurs
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center">
              <Button onClick={handleClose}>
                Fermer
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
