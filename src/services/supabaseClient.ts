import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Types pour la base de données
export interface DrawResult {
  id?: string;
  draw_date: string;
  numbers: number[];
  bonus_numbers?: number[];
  lottery_type: string;
  jackpot_amount?: number;
  winners_count?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface DrawResultHistory {
  id: string;
  draw_result_id: string;
  action: 'created' | 'updated' | 'deleted';
  old_data?: any;
  new_data?: any;
  changed_by: string;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ImportSession {
  id: string;
  filename: string;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors?: any[];
  created_at: string;
  created_by: string;
}

// Client Supabase
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Classe de gestion de la connexion Supabase
export class SupabaseManager {
  private static instance: SupabaseManager;
  private client: SupabaseClient;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  private constructor() {
    this.client = supabase;
    this.initializeConnection();
  }

  static getInstance(): SupabaseManager {
    if (!SupabaseManager.instance) {
      SupabaseManager.instance = new SupabaseManager();
    }
    return SupabaseManager.instance;
  }

  private async initializeConnection(): Promise<void> {
    try {
      // Tester la connexion
      const { data, error } = await this.client.from('draw_results').select('count').limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist, which is ok for setup
        throw error;
      }
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ Connexion Supabase établie');
      
    } catch (error) {
      console.error('❌ Erreur de connexion Supabase:', error);
      this.isConnected = false;
      await this.attemptReconnect();
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts));
    await this.initializeConnection();
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  isConnectionHealthy(): boolean {
    return this.isConnected;
  }

  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client.from('draw_results').select('count').limit(1);
      return !error || error.code === 'PGRST116';
    } catch {
      return false;
    }
  }

  // Méthodes utilitaires pour les requêtes avec gestion d'erreur
  async safeQuery<T>(
    queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> {
    try {
      if (!this.isConnected) {
        await this.initializeConnection();
      }
      
      const result = await queryFn(this.client);
      
      if (result.error) {
        console.error('Erreur de requête Supabase:', result.error);
        
        // Tentative de reconnexion si erreur de connexion
        if (this.isConnectionError(result.error)) {
          this.isConnected = false;
          await this.attemptReconnect();
          
          if (this.isConnected) {
            return await queryFn(this.client);
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la requête:', error);
      return { data: null, error };
    }
  }

  private isConnectionError(error: any): boolean {
    return error?.code === 'PGRST301' || // Connection error
           error?.message?.includes('connection') ||
           error?.message?.includes('network') ||
           error?.message?.includes('timeout');
  }
}

// Instance globale
export const supabaseManager = SupabaseManager.getInstance();

// Fonctions utilitaires pour les types
export const validateDrawResult = (data: Partial<DrawResult>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.draw_date) {
    errors.push('La date du tirage est requise');
  } else {
    const date = new Date(data.draw_date);
    if (isNaN(date.getTime())) {
      errors.push('Format de date invalide');
    }
  }

  if (!data.numbers || !Array.isArray(data.numbers)) {
    errors.push('Les numéros du tirage sont requis');
  } else {
    if (data.numbers.length === 0) {
      errors.push('Au moins un numéro est requis');
    }
    
    // Validation des numéros selon le type de loterie
    const invalidNumbers = data.numbers.filter(num => 
      !Number.isInteger(num) || num < 1 || num > 49
    );
    
    if (invalidNumbers.length > 0) {
      errors.push(`Numéros invalides: ${invalidNumbers.join(', ')} (doivent être entre 1 et 49)`);
    }

    // Vérifier les doublons
    const uniqueNumbers = new Set(data.numbers);
    if (uniqueNumbers.size !== data.numbers.length) {
      errors.push('Les numéros ne peuvent pas être dupliqués');
    }
  }

  if (!data.lottery_type) {
    errors.push('Le type de loterie est requis');
  }

  if (data.bonus_numbers && Array.isArray(data.bonus_numbers)) {
    const invalidBonusNumbers = data.bonus_numbers.filter(num => 
      !Number.isInteger(num) || num < 1 || num > 10
    );
    
    if (invalidBonusNumbers.length > 0) {
      errors.push(`Numéros bonus invalides: ${invalidBonusNumbers.join(', ')} (doivent être entre 1 et 10)`);
    }
  }

  if (data.jackpot_amount && (typeof data.jackpot_amount !== 'number' || data.jackpot_amount < 0)) {
    errors.push('Le montant du jackpot doit être un nombre positif');
  }

  if (data.winners_count && (typeof data.winners_count !== 'number' || data.winners_count < 0)) {
    errors.push('Le nombre de gagnants doit être un nombre positif');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Fonction pour formater les données avant insertion
export const formatDrawResultForDB = (data: Partial<DrawResult>): DrawResult => {
  return {
    ...data,
    draw_date: data.draw_date ? new Date(data.draw_date).toISOString().split('T')[0] : '',
    numbers: data.numbers || [],
    bonus_numbers: data.bonus_numbers || null,
    lottery_type: data.lottery_type || 'loto',
    jackpot_amount: data.jackpot_amount || null,
    winners_count: data.winners_count || null,
    updated_at: new Date().toISOString()
  };
};

// Script SQL pour créer les tables (à exécuter dans Supabase)
export const createTablesSQL = `
-- Table des résultats de tirage
CREATE TABLE IF NOT EXISTS draw_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_date DATE NOT NULL,
  numbers INTEGER[] NOT NULL,
  bonus_numbers INTEGER[],
  lottery_type VARCHAR(50) NOT NULL DEFAULT 'loto',
  jackpot_amount BIGINT,
  winners_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(draw_date, lottery_type)
);

-- Table d'historique des modifications
CREATE TABLE IF NOT EXISTS draw_results_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_result_id UUID REFERENCES draw_results(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Table des sessions d'import
CREATE TABLE IF NOT EXISTS import_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  total_rows INTEGER NOT NULL,
  processed_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  errors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_draw_results_date ON draw_results(draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_draw_results_type ON draw_results(lottery_type);
CREATE INDEX IF NOT EXISTS idx_draw_results_numbers ON draw_results USING GIN(numbers);
CREATE INDEX IF NOT EXISTS idx_draw_history_result_id ON draw_results_history(draw_result_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_draw_results_updated_at 
  BEFORE UPDATE ON draw_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour l'audit trail
CREATE OR REPLACE FUNCTION audit_draw_results()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO draw_results_history (draw_result_id, action, new_data, changed_by)
    VALUES (NEW.id, 'created', to_jsonb(NEW), NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO draw_results_history (draw_result_id, action, old_data, new_data, changed_by)
    VALUES (NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), NEW.updated_by);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO draw_results_history (draw_result_id, action, old_data, changed_by)
    VALUES (OLD.id, 'deleted', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER audit_draw_results_trigger
  AFTER INSERT OR UPDATE OR DELETE ON draw_results
  FOR EACH ROW EXECUTE FUNCTION audit_draw_results();

-- RLS (Row Level Security) policies
ALTER TABLE draw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_results_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY "Allow read access to authenticated users" ON draw_results
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique pour permettre l'insertion/modification aux utilisateurs autorisés
CREATE POLICY "Allow insert/update to authorized users" ON draw_results
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      auth.jwt() ->> 'role' = 'admin' OR
      auth.jwt() ->> 'role' = 'analyst'
    )
  );

-- Politique similaire pour l'historique
CREATE POLICY "Allow read history to authenticated users" ON draw_results_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique pour les sessions d'import
CREATE POLICY "Allow import sessions to authorized users" ON import_sessions
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      auth.jwt() ->> 'role' = 'admin' OR
      auth.jwt() ->> 'role' = 'analyst'
    )
  );
`;

export default supabase;
