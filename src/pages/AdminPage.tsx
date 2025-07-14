import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Edit, Trash2, Plus, Save, X, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { LotteryNumber } from "@/components/LotteryNumber";
import { IndexedDBService } from "@/services/indexedDBService";
import { DrawResult } from "@/services/lotteryAPI";
import { DRAW_SCHEDULE } from "@/data/drawSchedule";

const drawResultSchema = z.object({
  draw_name: z.string().min(1, "Le nom du tirage est requis"),
  date: z.string().min(1, "La date est requise"),
  gagnants: z.array(z.number().min(1).max(90)).length(5, "5 numéros gagnants requis"),
  machine: z.array(z.number().min(1).max(90)).length(5, "5 numéros machine requis").optional(),
});

type DrawResultForm = z.infer<typeof drawResultSchema>;

export function AdminPage() {
  const [drawResults, setDrawResults] = useState<DrawResult[]>([]);
  const [editingResult, setEditingResult] = useState<DrawResult | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<DrawResultForm>({
    resolver: zodResolver(drawResultSchema),
    defaultValues: {
      draw_name: "",
      date: "",
      gagnants: [0, 0, 0, 0, 0],
      machine: [0, 0, 0, 0, 0],
    },
  });

  const getAllDrawNames = () => {
    const draws: string[] = [];
    Object.values(DRAW_SCHEDULE).forEach(day => {
      Object.values(day).forEach(drawName => {
        if (!draws.includes(drawName)) {
          draws.push(drawName);
        }
      });
    });
    return draws.sort();
  };

  const loadDrawResults = async () => {
    setIsLoading(true);
    try {
      const results = await IndexedDBService.getDrawResults();
      setDrawResults(results);
    } catch (error) {
      console.error("Erreur lors du chargement des résultats:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les résultats de tirages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrawResults();
  }, []);

  const handleEdit = (result: DrawResult) => {
    setEditingResult(result);
    form.reset({
      draw_name: result.draw_name,
      date: result.date,
      gagnants: result.gagnants,
      machine: result.machine || [0, 0, 0, 0, 0],
    });
  };

  const handleDelete = async (result: DrawResult) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce résultat ?")) {
      return;
    }

    try {
      // Pour IndexedDB, nous devons implémenter la suppression
      await IndexedDBService.deleteDrawResult(result.id!);
      await loadDrawResults();
      toast({
        title: "Succès",
        description: "Résultat supprimé avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le résultat",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: DrawResultForm) => {
    try {
      const resultData: Omit<DrawResult, 'id'> = {
        draw_name: data.draw_name,
        date: data.date,
        gagnants: data.gagnants,
        machine: data.machine?.every(n => n > 0) ? data.machine : undefined,
        day: new Date(data.date).toLocaleDateString('fr-FR', { weekday: 'long' }),
        time: "Manual", // Valeur par défaut pour les entrées manuelles
      };

      if (editingResult) {
        await IndexedDBService.updateDrawResult(editingResult.id!, resultData);
        toast({
          title: "Succès",
          description: "Résultat modifié avec succès",
        });
      } else {
        await IndexedDBService.addDrawResult(resultData);
        toast({
          title: "Succès",
          description: "Résultat ajouté avec succès",
        });
      }

      await loadDrawResults();
      setEditingResult(null);
      setShowAddDialog(false);
      form.reset();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le résultat",
        variant: "destructive",
      });
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(drawResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lottery_results_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderNumberInputs = (field: any, label: string) => (
    <div className="space-y-2">
      <FormLabel>{label}</FormLabel>
      <div className="grid grid-cols-5 gap-2">
        {[0, 1, 2, 3, 4].map((index) => (
          <Input
            key={index}
            type="number"
            min="1"
            max="90"
            value={field.value[index] || ""}
            onChange={(e) => {
              const newValue = [...field.value];
              newValue[index] = parseInt(e.target.value) || 0;
              field.onChange(newValue);
            }}
            placeholder={`N°${index + 1}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Interface Administrateur
                  </CardTitle>
                  <CardDescription>
                    Gérer les résultats de tirages - Ajouter, modifier et supprimer des données
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleExportData} variant="outline">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Exporter JSON
                  </Button>
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un résultat
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Ajouter un nouveau résultat</DialogTitle>
                        <DialogDescription>
                          Saisissez les informations du tirage
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="draw_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nom du tirage</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner un tirage" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {getAllDrawNames().map((name) => (
                                      <SelectItem key={name} value={name}>
                                        {name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="gagnants"
                            render={({ field }) => (
                              <FormItem>
                                {renderNumberInputs(field, "Numéros Gagnants")}
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="machine"
                            render={({ field }) => (
                              <FormItem>
                                {renderNumberInputs(field, "Numéros Machine (optionnel)")}
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                              <X className="h-4 w-4 mr-2" />
                              Annuler
                            </Button>
                            <Button type="submit">
                              <Save className="h-4 w-4 mr-2" />
                              Ajouter
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Chargement des données...</div>
              ) : drawResults.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Aucun résultat de tirage trouvé. Commencez par ajouter des données.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tirage</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Numéros Gagnants</TableHead>
                        <TableHead>Numéros Machine</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drawResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline">{result.draw_name}</Badge>
                          </TableCell>
                          <TableCell>{new Date(result.date).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {result.gagnants.map((num, i) => (
                                <LotteryNumber key={i} number={num} className="h-6 w-6 text-xs" />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {result.machine ? (
                                result.machine.map((num, i) => (
                                  <LotteryNumber key={i} number={num} className="h-6 w-6 text-xs" />
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">Non disponible</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(result)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(result)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {editingResult && (
            <Card>
              <CardHeader>
                <CardTitle>Modifier le résultat</CardTitle>
                <CardDescription>
                  Modification du tirage {editingResult.draw_name} du {new Date(editingResult.date).toLocaleDateString('fr-FR')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="draw_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom du tirage</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getAllDrawNames().map((name) => (
                                  <SelectItem key={name} value={name}>
                                    {name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="gagnants"
                      render={({ field }) => (
                        <FormItem>
                          {renderNumberInputs(field, "Numéros Gagnants")}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="machine"
                      render={({ field }) => (
                        <FormItem>
                          {renderNumberInputs(field, "Numéros Machine (optionnel)")}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditingResult(null)}>
                        <X className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                      <Button type="submit">
                        <Save className="h-4 w-4 mr-2" />
                        Sauvegarder
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}