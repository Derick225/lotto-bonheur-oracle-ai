import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  MoreHorizontal,
  Calendar,
  Hash,
  TrendingUp,
  RefreshCw,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useDrawResults } from '@/hooks/useDrawResults';
import { DrawResult } from '@/services/drawResultsService';
import { DrawResultForm } from './DrawResultForm';
import { DrawResultsTable } from './DrawResultsTable';
import { DrawResultsFilters } from './DrawResultsFilters';
import { ImportDialog } from './ImportDialog';
import { ExportDialog } from './ExportDialog';
import { HelpDialog } from './HelpDialog';

export const DrawResultsManager: React.FC = () => {
  const {
    drawResults,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    loadDrawResults,
    createDrawResult,
    updateDrawResult,
    deleteDrawResult,
    deleteMultipleDrawResults,
    searchDrawResults,
    setFilters,
    resetFilters,
    importDrawResults,
    exportDrawResults,
    refreshData,
    filters,
    hasActiveFilters
  } = useDrawResults({ autoLoad: true });

  // État local
  const [selectedDraws, setSelectedDraws] = useState<string[]>([]);
  const [editingDraw, setEditingDraw] = useState<DrawResult | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Gestion de la sélection
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedDraws(drawResults.map(draw => draw.id!));
    } else {
      setSelectedDraws([]);
    }
  }, [drawResults]);

  const handleSelectDraw = useCallback((drawId: string, checked: boolean) => {
    if (checked) {
      setSelectedDraws(prev => [...prev, drawId]);
    } else {
      setSelectedDraws(prev => prev.filter(id => id !== drawId));
    }
  }, []);

  // Actions CRUD
  const handleCreateDraw = async (data: Partial<DrawResult>) => {
    const result = await createDrawResult(data);
    if (result) {
      setShowAddDialog(false);
    }
  };

  const handleUpdateDraw = async (data: Partial<DrawResult>) => {
    if (editingDraw) {
      const result = await updateDrawResult(editingDraw.id!, data);
      if (result) {
        setEditingDraw(null);
      }
    }
  };

  const handleDeleteDraw = async (drawId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce tirage ?')) {
      await deleteDrawResult(drawId);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDraws.length === 0) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedDraws.length} tirage(s) ?`)) {
      const success = await deleteMultipleDrawResults(selectedDraws);
      if (success) {
        setSelectedDraws([]);
      }
    }
  };

  // Recherche
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchDrawResults(searchQuery.trim());
    } else {
      await refreshData();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    refreshData();
  };

  // Statistiques rapides
  const stats = {
    total,
    selected: selectedDraws.length,
    filtered: hasActiveFilters
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Tirages</h2>
          <p className="text-muted-foreground">
            Gérez les résultats de tirage de loterie
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HelpDialog />
          <Button
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importer
          </Button>
          <Button
            onClick={() => setShowExportDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouveau Tirage
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Total Tirages</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Sélectionnés</p>
                <p className="text-2xl font-bold">{stats.selected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Filtres</p>
                <p className="text-2xl font-bold">
                  {stats.filtered ? 'Actifs' : 'Aucun'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Pages</p>
                <p className="text-2xl font-bold">{currentPage}/{totalPages}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre d'outils */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Ligne 1: Recherche et filtres */}
            <div className="flex items-center gap-4">
              <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par date, type, numéros..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button type="submit" variant="outline">
                  Rechercher
                </Button>
              </form>
              
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={hasActiveFilters ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtres
                {hasActiveFilters && <Badge variant="secondary">Actifs</Badge>}
              </Button>
              
              <Button
                onClick={refreshData}
                variant="outline"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>

            {/* Ligne 2: Actions sur la sélection */}
            {selectedDraws.length > 0 && (
              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedDraws.length} tirage(s) sélectionné(s)
                </span>
                <Button
                  onClick={handleDeleteSelected}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
                <Button
                  onClick={() => setSelectedDraws([])}
                  variant="outline"
                  size="sm"
                >
                  Désélectionner
                </Button>
              </div>
            )}

            {/* Filtres avancés */}
            {showFilters && (
              <DrawResultsFilters
                filters={filters}
                onFiltersChange={setFilters}
                onReset={resetFilters}
                hasActiveFilters={hasActiveFilters}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Messages d'erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table des résultats */}
      <DrawResultsTable
        drawResults={drawResults}
        loading={loading}
        selectedDraws={selectedDraws}
        onSelectAll={handleSelectAll}
        onSelectDraw={handleSelectDraw}
        onEditDraw={setEditingDraw}
        onDeleteDraw={handleDeleteDraw}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setFilters({ ...filters, page })}
      />

      {/* Dialogs */}
      
      {/* Dialog d'ajout */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau Tirage</DialogTitle>
          </DialogHeader>
          <DrawResultForm
            onSubmit={handleCreateDraw}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition */}
      <Dialog open={!!editingDraw} onOpenChange={(open) => !open && setEditingDraw(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le Tirage</DialogTitle>
          </DialogHeader>
          {editingDraw && (
            <DrawResultForm
              initialData={editingDraw}
              onSubmit={handleUpdateDraw}
              onCancel={() => setEditingDraw(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog d'import */}
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={importDrawResults}
      />

      {/* Dialog d'export */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={exportDrawResults}
        filters={filters}
      />
    </div>
  );
};
