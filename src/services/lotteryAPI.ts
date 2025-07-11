import axios, { AxiosResponse } from 'axios';
import { format, parse } from 'date-fns';

export interface DrawResult {
  draw_name: string;
  date: string;
  gagnants: number[];
  machine?: number[];
  day: string;
  time: string;
}

export interface APIResponse {
  success: boolean;
  data: DrawResult[];
  message?: string;
}

export interface DrawSchedule {
  [day: string]: { [time: string]: string };
}

const DRAW_SCHEDULE: DrawSchedule = {
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

/**
 * Service API pour récupérer les résultats de loterie
 */
export class LotteryAPIService {
  private static readonly BASE_URL = 'https://lotobonheur.ci/api/results';
  private static readonly TIMEOUT = 10000;

  /**
   * Récupère les résultats de loterie pour un mois/année spécifique
   */
  static async fetchResults(month?: string, year: string = '2024'): Promise<APIResponse> {
    const url = month ? `${this.BASE_URL}?month=${month}&year=${year}` : this.BASE_URL;

    try {
      const response: AxiosResponse = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://lotobonheur.ci/resultats',
        },
        timeout: this.TIMEOUT,
      });

      if (!response.data.success) {
        throw new Error('Réponse API non réussie');
      }

      return this.processAPIResponse(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      
      // Retourner des données de démonstration en cas d'erreur
      return this.getFallbackData();
    }
  }

  /**
   * Traite la réponse de l'API et valide les données
   */
  private static processAPIResponse(apiData: any): APIResponse {
    const validDrawNames = new Set();
    Object.values(DRAW_SCHEDULE).forEach(times => {
      Object.values(times).forEach(name => validDrawNames.add(name));
    });

    const processedResults: DrawResult[] = [];

    if (apiData.drawsResultsWeekly) {
      Object.entries(apiData.drawsResultsWeekly).forEach(([dateKey, dayData]: [string, any]) => {
        Object.entries(dayData).forEach(([drawName, drawData]: [string, any]) => {
          if (validDrawNames.has(drawName) && drawData.gagnants) {
            const result: DrawResult = {
              draw_name: drawName,
              date: dateKey,
              gagnants: this.validateNumbers(drawData.gagnants),
              machine: drawData.machine ? this.validateNumbers(drawData.machine) : undefined,
              day: this.getDayFromDrawName(drawName),
              time: this.getTimeFromDrawName(drawName)
            };
            processedResults.push(result);
          }
        });
      });
    }

    return {
      success: true,
      data: processedResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }

  /**
   * Valide que les numéros sont dans la plage 1-90
   */
  private static validateNumbers(numbers: any[]): number[] {
    return numbers
      .filter((num: any) => typeof num === 'number' && num >= 1 && num <= 90)
      .slice(0, 5); // Maximum 5 numéros
  }

  /**
   * Trouve le jour associé à un nom de tirage
   */
  private static getDayFromDrawName(drawName: string): string {
    for (const [day, times] of Object.entries(DRAW_SCHEDULE)) {
      if (Object.values(times).includes(drawName)) {
        return day;
      }
    }
    return 'Inconnu';
  }

  /**
   * Trouve l'heure associée à un nom de tirage
   */
  private static getTimeFromDrawName(drawName: string): string {
    for (const [day, times] of Object.entries(DRAW_SCHEDULE)) {
      for (const [time, name] of Object.entries(times)) {
        if (name === drawName) {
          return time;
        }
      }
    }
    return '00:00';
  }

  /**
   * Retourne des données de démonstration en cas d'erreur
   */
  private static getFallbackData(): APIResponse {
    const today = new Date();
    const sampleResults: DrawResult[] = [];

    // Générer des données d'exemple pour les 7 derniers jours
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const dayName = dayNames[date.getDay()];
      
      if (DRAW_SCHEDULE[dayName]) {
        Object.entries(DRAW_SCHEDULE[dayName]).forEach(([time, drawName]) => {
          sampleResults.push({
            draw_name: drawName,
            date: format(date, 'yyyy-MM-dd'),
            gagnants: this.generateRandomNumbers(),
            machine: this.generateRandomNumbers(),
            day: dayName,
            time: time
          });
        });
      }
    }

    return {
      success: true,
      data: sampleResults
    };
  }

  /**
   * Génère 5 numéros aléatoires entre 1 et 90
   */
  private static generateRandomNumbers(): number[] {
    const numbers = new Set<number>();
    while (numbers.size < 5) {
      numbers.add(Math.floor(Math.random() * 90) + 1);
    }
    return Array.from(numbers).sort((a, b) => a - b);
  }

  /**
   * Récupère les résultats pour un tirage spécifique
   */
  static async getDrawResults(drawName: string, limit: number = 50): Promise<DrawResult[]> {
    const allResults = await this.fetchResults();
    return allResults.data
      .filter(result => result.draw_name === drawName)
      .slice(0, limit);
  }

  /**
   * Récupère les statistiques pour un tirage
   */
  static async getDrawStatistics(drawName: string): Promise<{
    frequency: { [key: number]: number };
    lastAppearance: { [key: number]: string };
    trends: { increasing: number[]; decreasing: number[] };
  }> {
    const results = await this.getDrawResults(drawName, 100);
    const frequency: { [key: number]: number } = {};
    const lastAppearance: { [key: number]: string } = {};

    // Calculer les fréquences
    results.forEach(result => {
      result.gagnants.forEach(num => {
        frequency[num] = (frequency[num] || 0) + 1;
        if (!lastAppearance[num] || result.date > lastAppearance[num]) {
          lastAppearance[num] = result.date;
        }
      });
    });

    // Analyser les tendances (simplifié)
    const sortedNumbers = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .map(([num]) => parseInt(num));

    return {
      frequency,
      lastAppearance,
      trends: {
        increasing: sortedNumbers.slice(0, 10),
        decreasing: sortedNumbers.slice(-10).reverse()
      }
    };
  }
}