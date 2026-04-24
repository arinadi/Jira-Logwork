import type { PublicHoliday, AvailableCountry } from '../types/holiday';

const BASE_URL = 'https://date.nager.at/api/v3';
const LIBUR_ID_URL = 'https://libur.deno.dev/api';

interface LiburEntry {
  date: string;
  name: string;
}

/**
 * Maps libur.deno.dev response to our PublicHoliday format
 */
function mapLiburToPublicHoliday(entries: LiburEntry[]): PublicHoliday[] {
  return entries.map(e => ({
    date: e.date,
    localName: e.name,
    name: e.name,
    countryCode: 'ID',
    fixed: false,
    global: true,
    counties: null,
    launchYear: null,
    types: ['Public'],
  }));
}
const CACHE_PREFIX = 'nager_holidays_';
const COUNTRIES_CACHE_KEY = 'nager_countries';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  localStorage.setItem(key, JSON.stringify(entry));
}

export const holidayService = {
  /**
   * Fetches the list of available countries from Nager.at
   */
  async getAvailableCountries(): Promise<AvailableCountry[]> {
    const cached = getFromCache<AvailableCountry[]>(COUNTRIES_CACHE_KEY);
    if (cached) return cached;

    const response = await fetch(`${BASE_URL}/AvailableCountries`);
    if (!response.ok) throw new Error('Failed to fetch available countries');
    const data: AvailableCountry[] = await response.json();
    setCache(COUNTRIES_CACHE_KEY, data);
    return data;
  },

  /**
   * Fetches public holidays for a specific year and country
   */
  async getPublicHolidays(year: number, countryCode: string): Promise<PublicHoliday[]> {
    const cacheKey = `${CACHE_PREFIX}${year}_${countryCode}`;
    const cached = getFromCache<PublicHoliday[]>(cacheKey);
    if (cached) return cached;

    let data: PublicHoliday[];

    if (countryCode === 'ID') {
      // Use libur.deno.dev for Indonesia — more complete data
      const response = await fetch(`${LIBUR_ID_URL}?year=${year}`);
      if (!response.ok) throw new Error(`Failed to fetch ID holidays for ${year}`);
      const raw: LiburEntry[] = await response.json();
      data = mapLiburToPublicHoliday(raw);
    } else {
      const response = await fetch(`${BASE_URL}/PublicHolidays/${year}/${countryCode}`);
      if (!response.ok) throw new Error(`Failed to fetch holidays for ${countryCode} ${year}`);
      data = await response.json();
    }

    setCache(cacheKey, data);
    return data;
  },

  /**
   * Checks if today is a public holiday for a country
   */
  async isTodayPublicHoliday(countryCode: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/IsTodayPublicHoliday/${countryCode}`);
      // 200 = yes, 204 = no
      return response.status === 200;
    } catch {
      return false;
    }
  },
};

const COUNTRY_STORAGE_KEY = 'jira_logwork_country';

export function getSavedCountry(): string {
  return localStorage.getItem(COUNTRY_STORAGE_KEY) || 'ID';
}

export function saveCountry(countryCode: string): void {
  localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
}
