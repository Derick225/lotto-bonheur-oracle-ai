import React from 'react';
import { DrawResultsManager } from './components/admin/DrawResultsManager';

// Composant de test pour vérifier que le système de gestion des tirages fonctionne
export const TestDrawSystem: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Test du Système de Gestion des Tirages</h1>
      <DrawResultsManager />
    </div>
  );
};

export default TestDrawSystem;
