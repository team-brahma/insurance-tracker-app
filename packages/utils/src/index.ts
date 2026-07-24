export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatCurrency(amount: number, currency = 'INR', locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = {} as Record<string, unknown>;
  const keysSet = new Set<string>(keys.map((k) => String(k)));
  for (const key of Object.keys(obj)) {
    if (!keysSet.has(key)) {
      result[key] = (obj as Record<string, unknown>)[key];
    }
  }
  return result as Omit<T, K>;
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${String(value)}`);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const cleanDate = dateStr.slice(0, 10);
  const dt = new Date(cleanDate + 'T00:00:00');
  if (isNaN(dt.getTime())) return 'Invalid Date';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return 'Invalid Date';
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function initials(name: string): string {
  if (!name) return '?';
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w: string) => w.length > 0 && w !== 'M/S' && w !== '&');
  if (words.length === 0) return '?';
  const first = words.shift();
  if (!first) return '?';
  if (words.length === 0) return first.slice(0, 2).toUpperCase();
  const second = words.shift();
  return (first.charAt(0) + (second ? second.charAt(0) : '')).toUpperCase();
}

export function daysToExpiry(endDateStr: string, fromDate = new Date()): number {
  if (!endDateStr) return 0;
  const cleanDate = endDateStr.slice(0, 10);
  const end = new Date(cleanDate + 'T00:00:00');
  if (isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - fromDate.getTime()) / 86400000);
}

export function urgencyBucket(days: number): 'overdue' | 'due7' | 'due30' | 'future' {
  if (days < 0) return 'overdue';
  if (days <= 7) return 'due7';
  if (days <= 30) return 'due30';
  return 'future';
}

export function isActionable(status: string): boolean {
  return status === 'PENDING' || status === 'REMINDED';
}

export function validateIndianMobile(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(digits);
}

export function validateEmail(raw: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(raw);
}

export function validatePan(raw: string): boolean {
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(raw.toUpperCase());
}

export function validateAadhaar(raw: string): boolean {
  const digits = raw.replace(/\s/g, '');
  return /^\d{12}$/.test(digits);
}

export function validatePincode(raw: string): boolean {
  return /^\d{6}$/.test(raw);
}

export function validateVehicleNumber(raw: string): boolean {
  return /^[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{1,4}$/.test(raw.toUpperCase());
}

export function isMotorPolicy(typeName?: string | null): boolean {
  if (!typeName) return false;
  const lower = typeName.toLowerCase().trim();
  return (
    lower === 'motor' ||
    lower.includes('motor') ||
    lower.includes('vehicle') ||
    lower.includes('car') ||
    lower.includes('bike') ||
    lower.includes('wheeler') ||
    lower.includes('auto') ||
    lower.includes('bus') ||
    lower.includes('truck') ||
    lower.includes('cab') ||
    lower.includes('tractor') ||
    lower.includes('taxi')
  );
}

export function validateGst(raw: string): boolean {
  return /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(raw.toUpperCase());
}

export function validateIfsc(raw: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(raw.toUpperCase());
}

export function normaliseMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 0) return null;
  return '+91' + digits.slice(-10);
}

export function daysLabel(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    return abs === 1 ? '1 day overdue' : `${String(abs)} days overdue`;
  }
  if (days === 0) return 'Due today';
  return days === 1 ? 'in 1 day' : `in ${String(days)} days`;
}

export function encodeWhatsAppText(text: string): string {
  return encodeURIComponent(text);
}

export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

export function camelCase(str: string): string {
  return str.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '');
  });
}

export function keysToSnakeCase<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return (obj as unknown[]).map((v) => keysToSnakeCase(v)) as unknown as T;
  } else if (obj !== null && typeof obj === 'object') {
    const proto = Object.getPrototypeOf(obj) as unknown;
    if (proto === Object.prototype || proto === null) {
      const rawObj = obj as Record<string, unknown>;
      return Object.keys(rawObj).reduce<Record<string, unknown>>((result, key) => {
        const snakeKey = snakeCase(key);
        result[snakeKey] = keysToSnakeCase(rawObj[key]);
        return result;
      }, {}) as unknown as T;
    }
  }
  return obj;
}

export function keysToCamelCase<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return (obj as unknown[]).map((v) => keysToCamelCase(v)) as unknown as T;
  } else if (obj !== null && typeof obj === 'object') {
    const proto = Object.getPrototypeOf(obj) as unknown;
    if (proto === Object.prototype || proto === null) {
      const rawObj = obj as Record<string, unknown>;
      return Object.keys(rawObj).reduce<Record<string, unknown>>((result, key) => {
        const camelKey = camelCase(key);
        result[camelKey] = keysToCamelCase(rawObj[key]);
        return result;
      }, {}) as unknown as T;
    }
  }
  return obj;
}

export function formatSmartClientName(name: string): string {
  if (!name) return name;
  const normalizedHyphens = name.replace(/\s*-\s*/g, ' - ');
  const clean = normalizedHyphens.trim().replace(/\s+/g, ' ');
  return clean
    .split(' ')
    .map((word) => {
      if (word === '-') return '-';
      const upper = word.toUpperCase();
      if (
        /^\d+[A-Z]+$/.test(upper) ||
        /^[A-Z]+\d+$/.test(upper) ||
        /^(MAF|GST|NCB|TP|OD|HP|PA|WC|RTO|IDV|II|III|IV|V)$/.test(upper) ||
        (/^[A-Z]\.?$/.test(upper) && word === upper)
      ) {
        return upper;
      }
      return word.replace(/([a-zA-Z0-9]+)/g, (match) => {
        const matchUpper = match.toUpperCase();
        if (/^\d+[A-Z]+$/.test(matchUpper) || /^(MAF|GST|NCB|TP|OD|HP|PA|WC)$/.test(matchUpper)) {
          return matchUpper;
        }
        return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
      });
    })
    .join(' ');
}
