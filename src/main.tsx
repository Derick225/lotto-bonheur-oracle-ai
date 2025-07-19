import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Importer les tests pour les rendre disponibles en développement
if (import.meta.env.DEV) {
  import('./utils/testAPI.ts');
  import('./test/predictionTest.ts');
}

// Initialiser le service PWA
import('./services/pwaService.ts').then(({ PWAService }) => {
  PWAService.initialize().catch(console.error);
});

createRoot(document.getElementById("root")!).render(<App />);
