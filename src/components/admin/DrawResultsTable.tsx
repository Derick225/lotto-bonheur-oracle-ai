import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Hash,
  DollarSign,
  Users,
  History
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DrawResult } from '@/services/drawResultsService';

interface DrawResultsTableProps {
  drawResults: DrawResult[];
  loading: boolean;
  selectedDraws: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectDraw: (drawId: string, checked: boolean) => void;
  onEditDraw: (draw: DrawResult) => void;
  onDeleteDraw: (drawId: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface InlineEditState {
  drawId: string | null;
  field: string | null;
  value: any;
}

export const DrawResultsTable: React.FC<DrawResultsTableProps> = ({
  drawResults,
  loading,
  selectedDraws,
  onSelectAll,
  onSelectDraw,
  onEditDraw,
  onDeleteDraw,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>({
    drawId: null,
    field: null,
    value: null
  });

  // Gestion de l'édition en ligne
  const startInlineEdit = (drawId: string, field: string, currentValue: any) => {
    setInlineEdit({
      drawId,
      field,
      value: currentValue
    });
  };

  const cancelInlineEdit = () => {
    setInlineEdit({
      drawId: null,
      field: null,
      value: null
    });
  };

  const saveInlineEdit = async () => {
    if (!inlineEdit.drawId || !inlineEdit.field) return;

    try {
      const draw = drawResults.find(d => d.id === inlineEdit.drawId);
      if (!draw) return;

      // Ici, on devrait appeler le service de mise à jour
      // Pour l'instant, on simule juste l'annulation
      cancelInlineEdit();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  // Formatage des données
  const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatNumbers = (numbers: number[]): React.ReactNode => {
    return (
      <div className="flex flex-wrap gap-1">
        {numbers.map(num => (
          <Badge key={num} variant="outline" className="text-xs">
            {num}
          </Badge>
        ))}
      </div>
    );
  };

  // Composant d'édition en ligne
  const InlineEditCell: React.FC<{
    drawId: string;
    field: string;
    value: any;
    type: 'text' | 'number' | 'date' | 'select';
    options?: Array<{ value: string; label: string }>;
    children: React.ReactNode;
  }> = ({ drawId, field, value, type, options, children }) => {
    const isEditing = inlineEdit.drawId === drawId && inlineEdit.field === field;

    if (!isEditing) {
      return (
        <div
          className="cursor-pointer hover:bg-muted/50 p-1 rounded"
          onClick={() => startInlineEdit(drawId, field, value)}
        >
          {children}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        {type === 'select' && options ? (
          <Select
            value={inlineEdit.value}
            onValueChange={(newValue) => setInlineEdit(prev => ({ ...prev, value: newValue }))}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={type}
            value={inlineEdit.value || ''}
            onChange={(e) => setInlineEdit(prev => ({ 
              ...prev, 
              value: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value 
            }))}
            className="h-8 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveInlineEdit();
              } else if (e.key === 'Escape') {
                cancelInlineEdit();
              }
            }}
          />
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={saveInlineEdit}
          className="h-6 w-6 p-0"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={cancelInlineEdit}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Pagination
  const PaginationControls = () => (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} sur {totalPages}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Numéros</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Jackpot</TableHead>
                <TableHead>Gagnants</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PaginationControls />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedDraws.length === drawResults.length && drawResults.length > 0}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </div>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Numéros
                </div>
              </TableHead>
              <TableHead>Bonus</TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Jackpot
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Gagnants
                </div>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drawResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Aucun tirage trouvé
                </TableCell>
              </TableRow>
            ) : (
              drawResults.map((draw) => (
                <TableRow key={draw.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedDraws.includes(draw.id!)}
                      onCheckedChange={(checked) => onSelectDraw(draw.id!, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditCell
                      drawId={draw.id!}
                      field="draw_date"
                      value={draw.draw_date}
                      type="date"
                    >
                      {formatDate(draw.draw_date)}
                    </InlineEditCell>
                  </TableCell>
                  <TableCell>
                    <InlineEditCell
                      drawId={draw.id!}
                      field="lottery_type"
                      value={draw.lottery_type}
                      type="select"
                      options={[
                        { value: 'loto', label: 'Loto' },
                        { value: 'euromillions', label: 'EuroMillions' },
                        { value: 'keno', label: 'Keno' },
                        { value: 'amigo', label: 'Amigo' }
                      ]}
                    >
                      <Badge variant="outline">
                        {draw.lottery_type}
                      </Badge>
                    </InlineEditCell>
                  </TableCell>
                  <TableCell>
                    {formatNumbers(draw.numbers)}
                  </TableCell>
                  <TableCell>
                    {draw.bonus_numbers && draw.bonus_numbers.length > 0 ? 
                      formatNumbers(draw.bonus_numbers) : 
                      <span className="text-muted-foreground">-</span>
                    }
                  </TableCell>
                  <TableCell>
                    <InlineEditCell
                      drawId={draw.id!}
                      field="jackpot_amount"
                      value={draw.jackpot_amount}
                      type="number"
                    >
                      {formatCurrency(draw.jackpot_amount)}
                    </InlineEditCell>
                  </TableCell>
                  <TableCell>
                    <InlineEditCell
                      drawId={draw.id!}
                      field="winners_count"
                      value={draw.winners_count}
                      type="number"
                    >
                      {draw.winners_count || '-'}
                    </InlineEditCell>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditDraw(draw)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <History className="h-4 w-4 mr-2" />
                          Historique
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteDraw(draw.id!)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <PaginationControls />
    </div>
  );
};
