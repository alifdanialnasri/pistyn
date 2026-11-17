import { Vehicle, ServiceRecord, Attachment } from '../types';

export const formatAmount = (amount: number) =>
  amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatMYR = (amount: number) => `RM ${formatAmount(amount)}`;

export const formatKm = (km: number) => `${Math.round(km).toLocaleString('en-MY')} KM`;

// Highest odometer reading known for the car: the one entered on the vehicle, or the latest service log.
export function getCurrentMileage(vehicle: Vehicle, services: ServiceRecord[]): number | null {
  const readings = [
    vehicle.currentMileage,
    vehicle.purchaseMileage,
    ...services.filter(s => s.vehicleId === vehicle.id).map(s => s.mileage)
  ].filter((m): m is number => Number.isFinite(m));
  return readings.length ? Math.max(...readings) : null;
}

export const formatMileage = (mileage: number | null) =>
  mileage === null ? 'Mileage not set' : formatKm(mileage);

// --- Dates ---
// Dates are stored as local calendar days ("YYYY-MM-DD"). Parsing them with new Date("YYYY-MM-DD")
// would treat them as UTC midnight, which shows the wrong day in some timezones.

const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISODate(new Date());

export function parseDate(value?: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match ? new Date(+match[1], +match[2] - 1, +match[3]) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addMonths(date: Date, months: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / 86_400_000);

export function formatDate(value?: string) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

// --- Form helpers ---

// Empty text inputs become undefined so the field is left out (or removed) instead of saved as ""
export const optionalText = (value: string) => value.trim() || undefined;

export function optionalNumber(value: string) {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export const numberInput = (value?: number) =>
  value !== undefined && value !== null && Number.isFinite(value) ? String(value) : '';

export const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

export function getAttachments(service: ServiceRecord): Attachment[] {
  if (service.attachments?.length) return service.attachments;
  return service.receiptUrl ? [{ name: 'Receipt', url: service.receiptUrl }] : [];
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Something went wrong. Please try again.';
