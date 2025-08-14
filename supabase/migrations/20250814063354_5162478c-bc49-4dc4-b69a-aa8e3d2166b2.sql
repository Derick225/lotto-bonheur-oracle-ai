-- Sécuriser les tables statistiques avec des politiques RLS appropriées

-- Activer RLS sur toutes les tables statistiques
ALTER TABLE public.draw_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.number_frequencies ENABLE ROW LEVEL SECURITY;

-- Politiques pour draw_statistics (lecture publique, modification admin uniquement)
CREATE POLICY "draw_statistics_public_read"
ON public.draw_statistics
FOR SELECT
USING (true);

CREATE POLICY "draw_statistics_admin_write"
ON public.draw_statistics
FOR ALL
USING (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = auth.email() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- Politiques pour model_performance (lecture publique, modification admin uniquement)
CREATE POLICY "model_performance_public_read"
ON public.model_performance
FOR SELECT
USING (true);

CREATE POLICY "model_performance_admin_write"
ON public.model_performance
FOR ALL
USING (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = auth.email() 
    AND role = 'admin' 
    AND is_active = true
  )
);

-- Politiques pour number_frequencies (lecture publique, modification admin uniquement)
CREATE POLICY "number_frequencies_public_read"
ON public.number_frequencies
FOR SELECT
USING (true);

CREATE POLICY "number_frequencies_admin_write"
ON public.number_frequencies
FOR ALL
USING (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = auth.email() 
    AND role = 'admin' 
    AND is_active = true
  )
);