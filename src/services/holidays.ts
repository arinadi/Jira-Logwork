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

/**
 * Hardcoded Indonesian national holidays (libur nasional) as fallback.
 * Used when libur.deno.dev API is unavailable.
 */
function getIdFallbackHolidays(year: number): PublicHoliday[] {
  // Eid al-Fitr dates change each year — these are approximations
  const eidAlFitr: Record<number, string[]> = {
    2024: ['2024-04-10', '2024-04-11', '2024-04-12'],
    2025: ['2025-03-30', '2025-03-31', '2025-04-01'],
    2026: ['2026-03-20', '2026-03-21', '2026-03-22'],
    2027: ['2027-03-09', '2027-03-10', '2027-03-11'],
  };

  // Eid al-Adha dates change each year
  const eidAlAdha: Record<number, string[]> = {
    2024: ['2024-06-17'],
    2025: ['2025-06-06'],
    2026: ['2026-05-27'],
    2027: ['2027-05-16'],
  };

  // Islamic New Year (1 Muharram)
  const islamicNewYear: Record<number, string> = {
    2024: '2024-07-07',
    2025: '2025-06-26',
    2026: '2026-06-16',
    2027: '2027-06-05',
  };

  // Prophet's Birthday (Maulid Nabi)
  const maulidNabi: Record<number, string> = {
    2024: '2024-09-16',
    2025: '2025-09-05',
    2026: '2026-08-25',
    2027: '2027-08-14',
  };

  // Isra Mi'raj
  const israMraj: Record<number, string> = {
    2024: '2024-02-08',
    2025: '2025-01-27',
    2026: '2026-01-17',
    2027: '2027-01-06',
  };

  // Nyepi (Balinese New Year) — roughly 1 day after spring equinox
  const nyepi: Record<number, string> = {
    2024: '2024-03-11',
    2025: '2025-03-29',
    2026: '2026-03-19',
    2027: '2027-03-08',
  };

  const fixedHolidays: Array<{ date: string; name: string }> = [
    { date: `${year}-01-01`, name: 'Tahun Baru Masehi' },
    { date: `${year}-01-29`, name: 'Tahun Baru Imlek' },
    { date: `${year}-02-29`, name: 'Tahun Baru Imlek' }, // only in leap years, but keep
    { date: `${year}-05-01`, name: 'Hari Buruh Internasional' },
    { date: `${year}-05-14`, name: 'Kenaikan Yesus Kristus' },
    { date: `${year}-05-26`, name: 'Hari Raya Waisak' },
    { date: `${year}-06-01`, name: 'Hari Lahir Pancasila' },
    { date: `${year}-08-17`, name: 'Hari Kemerdekaan Republik Indonesia' },
    { date: `${year}-12-25`, name: 'Hari Raya Natal' },
    { date: `${year}-12-26`, name: 'Hari Raya Natal (Cuti Bersama)' },
  ];

  // Add Islamic holidays for this year
  const eidFitrDates = eidAlFitr[year] || [];
  eidFitrDates.forEach(d => fixedHolidays.push({ date: d, name: 'Hari Raya Idul Fitri' }));

  const eidAdhaDates = eidAlAdha[year] || [];
  eidAdhaDates.forEach(d => fixedHolidays.push({ date: d, name: 'Hari Raya Idul Adha' }));

  if (islamicNewYear[year]) fixedHolidays.push({ date: islamicNewYear[year], name: 'Tahun Baru Islam' });
  if (maulidNabi[year]) fixedHolidays.push({ date: maulidNabi[year], name: 'Maulid Nabi Muhammad SAW' });
  if (israMraj[year]) fixedHolidays.push({ date: israMraj[year], name: 'Isra Mi\'raj Nabi Muhammad SAW' });
  if (nyepi[year]) fixedHolidays.push({ date: nyepi[year], name: 'Hari Suci Nyepi' });

  // Filter out invalid dates (e.g. Feb 29 in non-leap years) and sort
  return fixedHolidays
    .filter(h => {
      const d = new Date(h.date);
      return d.getFullYear() === year && !isNaN(d.getTime());
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(h => ({
      date: h.date,
      localName: h.name,
      name: h.name,
      countryCode: 'ID',
      fixed: true,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public'] as string[],
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
    let fromApi = false;

    if (countryCode === 'ID') {
      // Fallback chain: libur.deno.dev → Nager.at → hardcoded list
      try {
        const response = await fetch(`${LIBUR_ID_URL}?year=${year}`);
        if (response.ok) {
          const raw: LiburEntry[] = await response.json();
          data = mapLiburToPublicHoliday(raw);
          fromApi = true;
        } else {
          console.warn(`libur.deno.dev returned ${response.status}, trying Nager.at...`);
          try {
            const res2 = await fetch(`${BASE_URL}/PublicHolidays/${year}/${countryCode}`);
            if (res2.ok) {
              data = await res2.json();
              fromApi = true;
            } else {
              console.warn('Nager.at also unavailable, using hardcoded holidays');
              data = getIdFallbackHolidays(year);
            }
          } catch {
            data = getIdFallbackHolidays(year);
          }
        }
      } catch {
        console.warn('libur.deno.dev unavailable, trying Nager.at...');
        try {
          const res2 = await fetch(`${BASE_URL}/PublicHolidays/${year}/${countryCode}`);
          if (res2.ok) {
            data = await res2.json();
            fromApi = true;
          } else {
            data = getIdFallbackHolidays(year);
          }
        } catch {
          data = getIdFallbackHolidays(year);
        }
      }
    } else {
      const response = await fetch(`${BASE_URL}/PublicHolidays/${year}/${countryCode}`);
      if (!response.ok) throw new Error(`Failed to fetch holidays for ${countryCode} ${year}`);
      data = await response.json();
      fromApi = true;
    }

    // Only cache successful API results — fallback data should retry next session
    if (fromApi) {
      setCache(cacheKey, data);
    }
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
