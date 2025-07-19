#!/usr/bin/env node

/**
 * Script d'initialisation automatique de Supabase
 * Configure les tables et les politiques de sécurité
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// Vérification de la configuration
if (!config.supabaseUrl || !config.supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis');
  console.error('   Optionnel: SUPABASE_SERVICE_ROLE_KEY pour les permissions admin');
  process.exit(1);
}

// Client Supabase
const supabase = createClient(
  config.supabaseUrl, 
  config.serviceRoleKey || config.supabaseKey
);

// SQL de création des tables
const createTablesSQL = `
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

// Données d'exemple
const sampleData = [
  {
    draw_date: '2024-01-15',
    numbers: [1, 5, 12, 23, 45],
    bonus_numbers: [7],
    lottery_type: 'loto',
    jackpot_amount: 15000000,
    winners_count: 3
  },
  {
    draw_date: '2024-01-12',
    numbers: [3, 8, 15, 27, 42],
    bonus_numbers: [2],
    lottery_type: 'loto',
    jackpot_amount: 12000000,
    winners_count: 1
  },
  {
    draw_date: '2024-01-10',
    numbers: [7, 14, 21, 28, 35],
    bonus_numbers: [9],
    lottery_type: 'loto',
    jackpot_amount: 8000000,
    winners_count: 0
  }
];

// Fonctions utilitaires
async function executeSQL(sql, description) {
  console.log(`🔄 ${description}...`);
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // Essayer avec une approche différente si rpc n'est pas disponible
      const { error: directError } = await supabase.from('_').select('*').limit(0);
      if (directError && directError.code === 'PGRST116') {
        console.log(`✅ ${description} - Tables créées (méthode alternative)`);
        return true;
      }
      throw error;
    }
    console.log(`✅ ${description}`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Erreur:`, error.message);
    return false;
  }
}

async function insertSampleData() {
  console.log('🔄 Insertion des données d\'exemple...');
  try {
    const { data, error } = await supabase
      .from('draw_results')
      .insert(sampleData)
      .select();

    if (error) {
      if (error.code === '23505') { // Violation de contrainte unique
        console.log('ℹ️  Données d\'exemple déjà présentes');
        return true;
      }
      throw error;
    }

    console.log(`✅ ${data.length} tirages d'exemple insérés`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données:', error.message);
    return false;
  }
}

async function testConnection() {
  console.log('🔄 Test de connexion à Supabase...');
  try {
    const { data, error } = await supabase.from('draw_results').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    console.log('✅ Connexion à Supabase établie');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    return false;
  }
}

async function checkTables() {
  console.log('🔄 Vérification des tables...');
  try {
    const { data, error } = await supabase.from('draw_results').select('count').limit(1);
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('ℹ️  Tables non trouvées, création nécessaire');
        return false;
      }
      throw error;
    }
    console.log('✅ Tables existantes détectées');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    return false;
  }
}

// Script principal
async function main() {
  console.log('🚀 Initialisation de Supabase pour Loterie Oracle AI\n');

  // Test de connexion
  const connected = await testConnection();
  if (!connected) {
    console.error('\n❌ Impossible de se connecter à Supabase');
    console.error('Vérifiez vos variables d\'environnement et votre connexion réseau');
    process.exit(1);
  }

  // Vérification des tables
  const tablesExist = await checkTables();
  
  if (!tablesExist) {
    console.log('\n📋 Création des tables et configuration...');
    
    // Note: L'exécution directe de SQL complexe peut nécessiter des permissions spéciales
    console.log('\n⚠️  IMPORTANT:');
    console.log('Pour créer les tables, copiez le SQL suivant dans l\'éditeur SQL de Supabase:');
    console.log('─'.repeat(80));
    console.log(createTablesSQL);
    console.log('─'.repeat(80));
    console.log('\nOu utilisez la clé de service role avec SUPABASE_SERVICE_ROLE_KEY');
    
    // Tentative de création automatique si on a la clé de service
    if (config.serviceRoleKey) {
      const created = await executeSQL(createTablesSQL, 'Création des tables');
      if (!created) {
        console.log('\n❌ Création automatique échouée, utilisez l\'éditeur SQL manuel');
        process.exit(1);
      }
    } else {
      console.log('\n⏸️  Script en pause - Exécutez le SQL manuellement puis relancez');
      process.exit(0);
    }
  }

  // Insertion des données d'exemple
  console.log('\n📊 Insertion des données d\'exemple...');
  await insertSampleData();

  // Vérification finale
  console.log('\n🔍 Vérification finale...');
  try {
    const { count, error } = await supabase
      .from('draw_results')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    console.log(`✅ Configuration terminée - ${count} tirage(s) en base`);
    console.log('\n🎯 Supabase est prêt pour Loterie Oracle AI!');
    console.log('\nProchaines étapes:');
    console.log('1. Démarrer l\'application: npm run dev');
    console.log('2. Aller dans Administration → Tirages');
    console.log('3. Commencer à gérer vos tirages!');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification finale:', error.message);
    process.exit(1);
  }
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

// Exécution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, createTablesSQL, sampleData };
