import { createRoot } from 'react-dom/client'
import './index.css'

// Application ultra-minimale pour résoudre l'erreur React
const App = () => (
  <div className="min-h-screen bg-background p-8">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8">
        Lotto Bonheur Oracle AI
      </h1>
      <div className="text-center text-muted-foreground">
        <p className="text-xl mb-4">Application en cours de maintenance</p>
        <p>Nous travaillons sur l'amélioration de l'interface. Merci de votre patience.</p>
      </div>
    </div>
  </div>
);

createRoot(document.getElementById("root")!).render(<App />);