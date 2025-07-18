import axios, { AxiosResponse } from 'axios';
import { format, parse, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface DrawResult {
  id?: number;
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
  totalCount?: number;
}

export interface DrawSchedule {
  [day: string]: { [time: string]: string };
}

// Mapping des noms de tirages de l'API vers nos noms standardisés
const API_DRAW_NAME_MAPPING: { [key: string]: string } = {
  'Reveil': 'Réveil',
  'Etoile': 'Étoile',
  'Akwaba': 'Akwaba',
  'Monday Special': 'Monday Special',
  'La Matinale': 'La Matinale',
  'Emergence': 'Émergence',
  'Sika': 'Sika',
  'Lucky Tuesday': 'Lucky Tuesday',
  'Premiere Heure': 'Première Heure',
  'Fortune': 'Fortune',
  'Baraka': 'Baraka',
  'Midweek': 'Midweek',
  'Kado': 'Kado',
  'Privilege': 'Privilège',
  'Monni': 'Monni',
  'Fortune Thursday': 'Fortune Thursday',
  'Cash': 'Cash',
  'Solution': 'Solution',
  'Wari': 'Wari',
  'Friday Bonanza': 'Friday Bonanza',
  'Soutra': 'Soutra',
  'Diamant': 'Diamant',
  'Moaye': 'Moaye',
  'National': 'National',
  'Benediction': 'Bénédiction',
  'Prestige': 'Prestige',
  'Awale': 'Awalé',
  'Espoir': 'Espoir'
};

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
  private static readonly TIMEOUT = 15000;
  private static cache = new Map<string, { data: APIResponse; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Récupère les résultats de loterie pour un mois/année spécifique
   */
  static async fetchResults(month?: string, year: string = '2024'): Promise<APIResponse> {
    const cacheKey = `${month || 'current'}-${year}`;
    const cached = this.cache.get(cacheKey);

    // Vérifier le cache
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const url = month ? `${this.BASE_URL}?month=${month}&year=${year}` : this.BASE_URL;

    try {
      const response: AxiosResponse = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Referer': 'https://lotobonheur.ci/resultats',
          'Origin': 'https://lotobonheur.ci',
        },
        timeout: this.TIMEOUT,
        validateStatus: (status) => status < 500, // Accepter les codes d'erreur client
      });

      if (response.status !== 200) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Format de réponse invalide');
      }

      const processedData = this.processAPIResponse(response.data);

      // Mettre en cache
      this.cache.set(cacheKey, { data: processedData, timestamp: Date.now() });

      return processedData;
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);

      // Essayer de retourner des données en cache si disponibles
      if (cached) {
        console.warn('Utilisation des données en cache expirées');
        return cached.data;
      }

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

    try {
      if (!apiData.drawsResultsWeekly || !Array.isArray(apiData.drawsResultsWeekly)) {
        throw new Error('Structure de données API invalide');
      }

      // Parcourir les semaines
      apiData.drawsResultsWeekly.forEach((week: any) => {
        if (!week.drawResultsDaily || !Array.isArray(week.drawResultsDaily)) {
          return;
        }

        // Parcourir les jours de la semaine
        week.drawResultsDaily.forEach((day: any) => {
          if (!day.date || !day.drawResults) {
            return;
          }

          const dateStr = this.parseAPIDate(day.date);
          if (!dateStr) return;

          // Traiter les tirages standards
          if (day.drawResults.standardDraws && Array.isArray(day.drawResults.standardDraws)) {
            day.drawResults.standardDraws.forEach((draw: any) => {
              const normalizedDrawName = API_DRAW_NAME_MAPPING[draw.drawName] || draw.drawName;

              if (validDrawNames.has(normalizedDrawName) && draw.winningNumbers) {
                const gagnants = this.parseNumbers(draw.winningNumbers);
                const machine = draw.machineNumbers ? this.parseNumbers(draw.machineNumbers) : undefined;

                if (gagnants.length === 5) {
                  const result: DrawResult = {
                    draw_name: normalizedDrawName,
                    date: dateStr,
                    gagnants: gagnants,
                    machine: machine,
                    day: this.getDayFromDrawName(normalizedDrawName),
                    time: this.getTimeFromDrawName(normalizedDrawName)
                  };
                  processedResults.push(result);
                }
              }
            });
          }
        });
      });

      return {
        success: true,
        data: processedResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        totalCount: processedResults.length
      };
    } catch (error) {
      console.error('Erreur lors du traitement des données API:', error);
      return {
        success: false,
        data: [],
        message: `Erreur de traitement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Parse une date au format de l'API (ex: "vendredi 18/07") vers le format ISO
   */
  private static parseAPIDate(dateStr: string): string | null {
    try {
      // Extraire la partie date (ex: "18/07" de "vendredi 18/07")
      const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
      if (!dateMatch) return null;

      const [, day, month] = dateMatch;
      const currentYear = new Date().getFullYear();

      // Construire la date au format ISO
      const isoDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Valider que la date est valide
      const parsedDate = new Date(isoDate);
      if (isNaN(parsedDate.getTime())) return null;

      return isoDate;
    } catch (error) {
      console.error('Erreur lors du parsing de la date:', dateStr, error);
      return null;
    }
  }

  /**
   * Parse les numéros depuis le format API (ex: "17 - 39 - 18 - 11 - 35")
   */
  private static parseNumbers(numbersStr: string): number[] {
    try {
      if (!numbersStr || numbersStr.includes('.')) {
        return []; // Pas de numéros disponibles
      }

      const numbers = numbersStr
        .split(' - ')
        .map(num => parseInt(num.trim(), 10))
        .filter(num => !isNaN(num) && num >= 1 && num <= 90);

      return numbers.slice(0, 5); // Maximum 5 numéros
    } catch (error) {
      console.error('Erreur lors du parsing des numéros:', numbersStr, error);
      return [];
    }
  }

  /**
   * Valide que les numéros sont dans la plage 1-90 (méthode legacy)
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
   * Récupère l'historique complet depuis janvier 2024
   */
  static async fetchHistoricalData(startYear: number = 2024): Promise<APIResponse> {
    const allResults: DrawResult[] = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    try {
      // Récupérer les données pour chaque mois depuis janvier 2024
      for (let year = startYear; year <= currentYear; year++) {
        const startMonth = year === startYear ? 1 : 1;
        const endMonth = year === currentYear ? currentMonth : 12;

        for (let month = startMonth; month <= endMonth; month++) {
          try {
            const monthName = this.getMonthName(month);
            const monthResults = await this.fetchResults(monthName, year.toString());

            if (monthResults.success && monthResults.data.length > 0) {
              allResults.push(...monthResults.data);
              console.log(`Récupéré ${monthResults.data.length} résultats pour ${monthName} ${year}`);
            }

            // Délai pour éviter de surcharger l'API
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.warn(`Erreur pour ${month}/${year}:`, error);
            continue;
          }
        }
      }

      // Dédupliquer et trier
      const uniqueResults = this.deduplicateResults(allResults);

      return {
        success: true,
        data: uniqueResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        totalCount: uniqueResults.length
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      return {
        success: false,
        data: [],
        message: `Erreur historique: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Déduplique les résultats basés sur draw_name et date
   */
  private static deduplicateResults(results: DrawResult[]): DrawResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.draw_name}-${result.date}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Convertit un numéro de mois en nom français
   */
  private static getMonthName(month: number): string {
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    return months[month - 1];
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
   * Récupère les résultats historiques pour un tirage spécifique
   */
  static async getDrawHistoricalResults(drawName: string, limit: number = 200): Promise<DrawResult[]> {
    const historicalData = await this.fetchHistoricalData();
    return historicalData.data
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