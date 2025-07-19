import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Edit, Trash2, Plus, Save, X, Download, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { LotteryNumber } from "@/components/LotteryNumber";
import { SyncStatusDetailed } from "@/components/SyncStatus";
import { ModelOptimizationPanel } from "@/components/ModelOptimizationPanel";
import { MonitoringDashboard } from "@/components/MonitoringDashboard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";
import { AuditLogsPanel } from "@/components/admin/AuditLogsPanel";
import { SystemConfigPanel } from "@/components/admin/SystemConfigPanel";
import { MaintenancePanel } from "@/components/admin/MaintenancePanel";
import { NotificationPanel } from "@/components/admin/NotificationPanel";
import { SecurityPanel } from "@/components/admin/SecurityPanel";
import { InitializationStatus } from "@/components/admin/InitializationStatus";
import { DrawResultsManager } from "@/components/admin/DrawResultsManager";
import { IndexedDBService } from "@/services/indexedDBService";
import { SyncService } from "@/services/syncService";
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
  const [isAdminInitialized, setIsAdminInitialized] = useState<boolean | null>(null);
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

    // Vérifier et initialiser les services d'administration
    checkAndInitializeAdmin();
  }, []);

  const checkAndInitializeAdmin = async () => {
    try {
      const { isAdminSystemInitialized } = await import('@/scripts/initializeAdmin');
      const initialized = isAdminSystemInitialized();
      setIsAdminInitialized(initialized);

      if (initialized) {
        await initializeAdminServices();
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'initialisation:', error);
      setIsAdminInitialized(false);
    }
  };

  const initializeAdminServices = async () => {
    try {
      // Vérifier si le système est déjà initialisé
      const { isAdminSystemInitialized, initializeAdminSystem } = await import('@/scripts/initializeAdmin');

      if (!isAdminSystemInitialized()) {
        console.log('🚀 Première initialisation du système d\'administration...');
        await initializeAdminSystem();
        console.log('✅ Système d\'administration initialisé avec succès');
      } else {
        // Initialiser seulement les services
        const { UserManagementService } = await import('@/services/userManagement');
        const { AuditService } = await import('@/services/auditService');
        const { SystemConfigService } = await import('@/services/systemConfig');
        const { BackupService } = await import('@/services/backupService');
        const { NotificationService } = await import('@/services/notificationService');
        const { SecurityService } = await import('@/services/securityService');

        await UserManagementService.initialize();
        AuditService.initialize();
        SecurityService.initialize();
        await SystemConfigService.initialize();
        await BackupService.initialize();
        await NotificationService.initialize();

        console.log('✅ Services d\'administration rechargés');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des services admin:', error);
    }
  };

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

  // Afficher l'écran d'initialisation si nécessaire
  if (isAdminInitialized === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <InitializationStatus onComplete={() => {
            setIsAdminInitialized(true);
            initializeAdminServices();
          }} />
        </div>
      </div>
    );
  }

  // Afficher un loader pendant la vérification
  if (isAdminInitialized === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Vérification du système d'administration...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Tabs defaultValue="data" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-10">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="draws" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Tirages
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Utilisateurs
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Sécurité
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Audit & Logs
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Maintenance
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Monitoring
              </TabsTrigger>
              <TabsTrigger value="optimization" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Optimisation IA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <AdminDashboard />
            </TabsContent>

            <TabsContent value="draws">
              <DrawResultsManager />
            </TabsContent>

            <TabsContent value="users">
              <UserManagementPanel />
            </TabsContent>

            <TabsContent value="security">
              <SecurityPanel />
            </TabsContent>

            <TabsContent value="config">
              <SystemConfigPanel />
            </TabsContent>

            <TabsContent value="audit">
              <AuditLogsPanel />
            </TabsContent>

            <TabsContent value="maintenance">
              <MaintenancePanel />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationPanel />
            </TabsContent>

            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Gestion des Données
                      </CardTitle>
                      <CardDescription>
                        Ajouter, modifier et supprimer des résultats de tirages
                      </CardDescription>
                    </div>
                <div className="flex gap-2">
                  <Button onClick={handleExportData} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
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
            </TabsContent>

            <TabsContent value="sync">
              <SyncStatusDetailed />
            </TabsContent>

            <TabsContent value="optimization">
              <ModelOptimizationPanel />
            </TabsContent>

            <TabsContent value="monitoring">
              <MonitoringDashboard />
            </TabsContent>

            <TabsContent value="stats">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Statistiques de la Base de Données
                  </CardTitle>
                  <CardDescription>
                    Informations sur les données stockées et leur répartition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{drawResults.length}</div>
                        <p className="text-xs text-muted-foreground">
                          Résultats totaux
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {new Set(drawResults.map(r => r.draw_name)).size}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tirages différents
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {new Set(drawResults.map(r => r.date)).size}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Jours couverts
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Répartition par tirage</h4>
                    <div className="space-y-2">
                      {Object.entries(
                        drawResults.reduce((acc, result) => {
                          acc[result.draw_name] = (acc[result.draw_name] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      )
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([drawName, count]) => (
                          <div key={drawName} className="flex justify-between items-center">
                            <span className="text-sm">{drawName}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}