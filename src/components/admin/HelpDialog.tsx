import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HelpCircle, 
  Keyboard, 
  Mouse, 
  Lightbulb,
  Zap,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Filter,
  RefreshCw
} from 'lucide-react';

interface HelpDialogProps {
  trigger?: React.ReactNode;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);

  // Raccourcis clavier globaux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ouvrir l'aide avec F1 ou Ctrl+?
      if (e.key === 'F1' || (e.ctrlKey && e.key === '?')) {
        e.preventDefault();
        setOpen(true);
      }
      
      // Fermer avec Échap
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const keyboardShortcuts = [
    {
      category: 'Navigation',
      shortcuts: [
        { keys: ['F1'], description: 'Ouvrir l\'aide' },
        { keys: ['Échap'], description: 'Fermer les dialogs' },
        { keys: ['Ctrl', 'R'], description: 'Actualiser les données' },
        { keys: ['Ctrl', 'F'], description: 'Rechercher' }
      ]
    },
    {
      category: 'Gestion des tirages',
      shortcuts: [
        { keys: ['Ctrl', 'N'], description: 'Nouveau tirage' },
        { keys: ['Ctrl', 'E'], description: 'Modifier le tirage sélectionné' },
        { keys: ['Suppr'], description: 'Supprimer le tirage sélectionné' },
        { keys: ['Ctrl', 'A'], description: 'Sélectionner tout' },
        { keys: ['Ctrl', 'D'], description: 'Désélectionner tout' }
      ]
    },
    {
      category: 'Import/Export',
      shortcuts: [
        { keys: ['Ctrl', 'I'], description: 'Importer des tirages' },
        { keys: ['Ctrl', 'Shift', 'E'], description: 'Exporter des tirages' },
        { keys: ['Ctrl', 'S'], description: 'Sauvegarder (dans les formulaires)' }
      ]
    },
    {
      category: 'Filtres et recherche',
      shortcuts: [
        { keys: ['Ctrl', 'Shift', 'F'], description: 'Ouvrir les filtres avancés' },
        { keys: ['Ctrl', 'Shift', 'R'], description: 'Réinitialiser les filtres' },
        { keys: ['Entrée'], description: 'Appliquer la recherche' }
      ]
    }
  ];

  const mouseActions = [
    {
      action: 'Clic simple',
      description: 'Sélectionner un tirage',
      icon: <Mouse className="h-4 w-4" />
    },
    {
      action: 'Double-clic',
      description: 'Modifier un tirage',
      icon: <Edit className="h-4 w-4" />
    },
    {
      action: 'Clic droit',
      description: 'Menu contextuel',
      icon: <Mouse className="h-4 w-4" />
    },
    {
      action: 'Clic sur cellule',
      description: 'Édition en ligne (certaines colonnes)',
      icon: <Edit className="h-4 w-4" />
    }
  ];

  const tips = [
    {
      title: 'Import par lots',
      description: 'Utilisez le template CSV pour importer plusieurs tirages en une fois. Le système détecte automatiquement les doublons.',
      icon: <Upload className="h-4 w-4 text-blue-500" />
    },
    {
      title: 'Édition rapide',
      description: 'Cliquez directement sur certaines cellules du tableau pour les modifier sans ouvrir le formulaire complet.',
      icon: <Zap className="h-4 w-4 text-yellow-500" />
    },
    {
      title: 'Filtres intelligents',
      description: 'Combinez plusieurs filtres pour des recherches précises. Les filtres par numéros trouvent tous les tirages contenant au moins un des numéros.',
      icon: <Filter className="h-4 w-4 text-green-500" />
    },
    {
      title: 'Sélection multiple',
      description: 'Utilisez Ctrl+clic pour sélectionner plusieurs tirages, ou la case à cocher en en-tête pour tout sélectionner.',
      icon: <Mouse className="h-4 w-4 text-purple-500" />
    },
    {
      title: 'Export personnalisé',
      description: 'L\'export respecte vos filtres actuels. Vous pouvez inclure l\'historique des modifications pour un audit complet.',
      icon: <Download className="h-4 w-4 text-orange-500" />
    },
    {
      title: 'Validation automatique',
      description: 'Le système valide automatiquement les numéros selon les règles de chaque type de loterie.',
      icon: <Lightbulb className="h-4 w-4 text-red-500" />
    }
  ];

  const features = [
    {
      title: 'Gestion CRUD complète',
      description: 'Créer, lire, modifier et supprimer des tirages avec validation complète',
      features: ['Formulaires intuitifs', 'Validation en temps réel', 'Édition en ligne', 'Suppression sécurisée']
    },
    {
      title: 'Import/Export avancé',
      description: 'Import par lots avec prévisualisation et export personnalisé',
      features: ['Support CSV/Excel/JSON', 'Validation des données', 'Gestion des doublons', 'Prévisualisation']
    },
    {
      title: 'Recherche et filtrage',
      description: 'Outils de recherche puissants pour trouver rapidement les tirages',
      features: ['Filtres par date', 'Recherche par numéros', 'Filtres combinés', 'Tri personnalisé']
    },
    {
      title: 'Interface responsive',
      description: 'Optimisé pour tous les appareils et tailles d\'écran',
      features: ['Design adaptatif', 'Navigation tactile', 'Raccourcis clavier', 'Aide contextuelle']
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Aide
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Guide d'Utilisation - Gestion des Tirages
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="shortcuts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="shortcuts">Raccourcis</TabsTrigger>
            <TabsTrigger value="features">Fonctionnalités</TabsTrigger>
            <TabsTrigger value="tips">Astuces</TabsTrigger>
            <TabsTrigger value="mouse">Souris</TabsTrigger>
          </TabsList>

          <TabsContent value="shortcuts" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keyboardShortcuts.map((category) => (
                <Card key={category.category}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Keyboard className="h-4 w-4" />
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.shortcuts.map((shortcut, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{shortcut.description}</span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, keyIndex) => (
                              <React.Fragment key={keyIndex}>
                                <Badge variant="outline" className="text-xs">
                                  {key}
                                </Badge>
                                {keyIndex < shortcut.keys.length - 1 && (
                                  <span className="text-xs text-muted-foreground">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {feature.features.map((item, index) => (
                        <li key={index} className="text-sm flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {tips.map((tip) => (
                <Card key={tip.title}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      {tip.icon}
                      <div>
                        <h4 className="font-medium mb-1">{tip.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mouse" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mouse className="h-4 w-4" />
                  Actions de la Souris
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mouseActions.map((action, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      {action.icon}
                      <div>
                        <div className="font-medium text-sm">{action.action}</div>
                        <div className="text-sm text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Navigation au Clavier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Tab / Shift+Tab</span>
                    <span className="text-muted-foreground">Navigation entre les éléments</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Flèches ↑↓</span>
                    <span className="text-muted-foreground">Navigation dans les listes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entrée / Espace</span>
                    <span className="text-muted-foreground">Activer l'élément sélectionné</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Échap</span>
                    <span className="text-muted-foreground">Fermer les menus/dialogs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Appuyez sur <Badge variant="outline" className="text-xs">F1</Badge> pour ouvrir cette aide
          </div>
          <Button onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
