export interface DrawSchedule {
  [day: string]: { [time: string]: string };
}

export const DRAW_SCHEDULE: DrawSchedule = {
  Lundi: { 
    '10:00': 'Réveil', 
    '13:00': 'Étoile', 
    '16:00': 'Akwaba', 
    '18:15': 'Monday Special' 
  },
  Mardi: { 
    '10:00': 'La Matinale', 
    '13:00': 'Émergence', 
    '16:00': 'Sika', 
    '18:15': 'Lucky Tuesday' 
  },
  Mercredi: { 
    '10:00': 'Première Heure', 
    '13:00': 'Fortune', 
    '16:00': 'Baraka', 
    '18:15': 'Midweek' 
  },
  Jeudi: { 
    '10:00': 'Kado', 
    '13:00': 'Privilège', 
    '16:00': 'Monni', 
    '18:15': 'Fortune Thursday' 
  },
  Vendredi: { 
    '10:00': 'Cash', 
    '13:00': 'Solution', 
    '16:00': 'Wari', 
    '18:15': 'Friday Bonanza' 
  },
  Samedi: { 
    '10:00': 'Soutra', 
    '13:00': 'Diamant', 
    '16:00': 'Moaye', 
    '18:15': 'National' 
  },
  Dimanche: { 
    '10:00': 'Bénédiction', 
    '13:00': 'Prestige', 
    '16:00': 'Awalé', 
    '18:15': 'Espoir' 
  },
};

export const getDayDraws = (day: string) => {
  return DRAW_SCHEDULE[day] || {};
};

export const getCurrentDay = () => {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[new Date().getDay()];
};

export const getAllDraws = () => {
  const draws: Array<{ name: string; time: string; day: string }> = [];
  
  Object.entries(DRAW_SCHEDULE).forEach(([day, times]) => {
    Object.entries(times).forEach(([time, name]) => {
      draws.push({ name, time, day });
    });
  });
  
  return draws;
};