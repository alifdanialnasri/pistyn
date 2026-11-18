import { Vehicle, ServiceRecord, ScheduleItem, Issue, Part, ServiceType } from '../types';
import {
  getCurrentMileage, parseDate, toISODate, startOfToday, addMonths, addDays, daysBetween, roundMoney
} from './utils';

export const SOON_KM = 1000;
export const SOON_DAYS = 30;

export const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
];

export const serviceTypeLabel = (type?: ServiceType) =>
  SERVICE_TYPES.find(t => t.value === type)?.label ?? 'Uncategorised';

// General guide only; the owner's manual for each car takes priority
export const RECOMMENDED_SCHEDULE: Omit<ScheduleItem, 'id' | 'ownerId' | 'vehicleId' | 'createdAt'>[] = [
  { name: 'Engine Oil', category: 'Engine', intervalKm: 5000, intervalMonths: 6 },
  { name: 'Oil Filter', category: 'Engine', intervalKm: 5000, intervalMonths: 6 },
  { name: 'Air Filter', category: 'Engine', intervalKm: 20000, intervalMonths: 12 },
  { name: 'Cabin / Aircond Filter', category: 'Aircond', intervalKm: 20000, intervalMonths: 12 },
  { name: 'Spark Plugs', category: 'Engine', intervalKm: 40000, intervalMonths: 24 },
  { name: 'Brake Fluid', category: 'Brakes', intervalKm: 40000, intervalMonths: 24 },
  { name: 'Brake Pads Check', category: 'Brakes', intervalKm: 10000, intervalMonths: 6 },
  { name: 'Coolant', category: 'Cooling', intervalKm: 40000, intervalMonths: 24 },
  { name: 'Transmission Fluid (ATF/CVT)', category: 'Transmission', intervalKm: 40000, intervalMonths: 24 },
  { name: 'Tyre Rotation', category: 'Tyres', intervalKm: 10000, intervalMonths: 6 },
  { name: 'Wheel Alignment & Balancing', category: 'Tyres', intervalKm: 10000, intervalMonths: 12 },
  { name: 'Battery Check', category: 'Electrical', intervalMonths: 12 },
];

export type DueStatus = 'overdue' | 'soon' | 'ok' | 'unknown';

export const isActive = (v: Vehicle) => v.status !== 'sold';

interface Reading { date: Date; mileage: number }

function readings(vehicle: Vehicle, services: ServiceRecord[]): Reading[] {
  const list: Reading[] = [];
  const push = (date?: string, mileage?: number) => {
    const d = parseDate(date);
    if (d && mileage !== undefined && Number.isFinite(mileage)) list.push({ date: d, mileage });
  };
  services.filter(s => s.vehicleId === vehicle.id).forEach(s => push(s.date, s.mileage));
  push(vehicle.purchaseDate, vehicle.purchaseMileage);
  push(vehicle.mileageUpdatedAt, vehicle.currentMileage);
  return list.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Average daily distance from the earliest and latest dated odometer readings (needs at least 30 days of history)
export function kmPerDay(vehicle: Vehicle, services: ServiceRecord[]): number | null {
  const r = readings(vehicle, services);
  if (r.length < 2) return null;
  const first = r[0];
  const last = r[r.length - 1];
  const days = daysBetween(first.date, last.date);
  if (days < 30) return null;
  const rate = (last.mileage - first.mileage) / days;
  return rate > 0 ? rate : null;
}

export interface ScheduleState {
  item: ScheduleItem;
  status: DueStatus;
  lastDate?: string;
  lastMileage?: number;
  dueDate?: string;
  dueMileage?: number;
  daysLeft?: number;
  kmLeft?: number;
  estimatedDate?: string;
}

function lastDone(item: ScheduleItem, services: ServiceRecord[]) {
  const done: { date?: string; mileage?: number }[] = services
    .filter(s => s.vehicleId === item.vehicleId && s.scheduleIds?.includes(item.id))
    .map(s => ({ date: s.date, mileage: s.mileage }));
  if (item.lastDoneDate || item.lastDoneMileage !== undefined) {
    done.push({ date: item.lastDoneDate, mileage: item.lastDoneMileage });
  }
  if (!done.length) return null;
  return done.sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '') || (b.mileage ?? 0) - (a.mileage ?? 0)
  )[0];
}

export function getScheduleState(item: ScheduleItem, vehicle: Vehicle, services: ServiceRecord[]): ScheduleState {
  const last = lastDone(item, services);
  const state: ScheduleState = { item, status: 'unknown', lastDate: last?.date, lastMileage: last?.mileage };
  if (!last) return state;

  const today = startOfToday();
  const current = getCurrentMileage(vehicle, services);
  const rate = kmPerDay(vehicle, services);
  const estimates: Date[] = [];
  let known = false;

  const lastDate = parseDate(last.date);
  if (item.intervalMonths && lastDate) {
    const due = addMonths(lastDate, item.intervalMonths);
    state.dueDate = toISODate(due);
    state.daysLeft = daysBetween(today, due);
    estimates.push(due);
    known = true;
  }
  if (item.intervalKm && last.mileage !== undefined) {
    state.dueMileage = last.mileage + item.intervalKm;
    if (current !== null) {
      state.kmLeft = state.dueMileage - current;
      known = true;
      if (rate) estimates.push(addDays(today, Math.max(0, Math.round(state.kmLeft / rate))));
    }
  }
  if (!known) return state;

  if (estimates.length) {
    state.estimatedDate = toISODate(new Date(Math.min(...estimates.map(d => d.getTime()))));
  }
  const overdue = (state.daysLeft !== undefined && state.daysLeft < 0) || (state.kmLeft !== undefined && state.kmLeft <= 0);
  const soon = (state.daysLeft !== undefined && state.daysLeft <= SOON_DAYS) || (state.kmLeft !== undefined && state.kmLeft <= SOON_KM);
  state.status = overdue ? 'overdue' : soon ? 'soon' : 'ok';
  return state;
}

function dateStatus(date?: string): { status: DueStatus; daysLeft?: number } {
  const d = parseDate(date);
  if (!d) return { status: 'unknown' };
  const daysLeft = daysBetween(startOfToday(), d);
  return { status: daysLeft < 0 ? 'overdue' : daysLeft <= SOON_DAYS ? 'soon' : 'ok', daysLeft };
}

export interface Renewal { label: string; date: string; status: DueStatus; daysLeft?: number }

export function getRenewals(vehicle: Vehicle): Renewal[] {
  return [
    { label: 'Road Tax', date: vehicle.roadTaxExpiry },
    { label: 'Insurance', date: vehicle.insuranceExpiry },
  ]
    .filter((r): r is { label: string; date: string } => !!r.date)
    .map(r => ({ ...r, ...dateStatus(r.date) }));
}

export function getIssueDue(issue: Issue, vehicle: Vehicle | undefined, services: ServiceRecord[]): DueStatus {
  if (issue.status !== 'open') return 'ok';
  const byDate = dateStatus(issue.dueDate).status;
  let byKm: DueStatus = 'unknown';
  if (issue.dueMileage !== undefined && vehicle) {
    const current = getCurrentMileage(vehicle, services);
    if (current !== null) {
      const left = issue.dueMileage - current;
      byKm = left <= 0 ? 'overdue' : left <= SOON_KM ? 'soon' : 'ok';
    }
  }
  if (byDate === 'overdue' || byKm === 'overdue') return 'overdue';
  if (byDate === 'soon' || byKm === 'soon') return 'soon';
  if (byDate === 'ok' || byKm === 'ok') return 'ok';
  return 'unknown';
}

export interface Alert {
  key: string;
  vehicleId: string;
  vehicleName: string;
  title: string;
  detail: string;
  status: 'overdue' | 'soon';
  /** Set for schedule items, so the alert can be logged as done */
  scheduleId?: string;
}

export function describeDue(state: ScheduleState) {
  const parts: string[] = [];
  if (state.kmLeft !== undefined) {
    parts.push(state.kmLeft <= 0 ? `${Math.abs(state.kmLeft).toLocaleString('en-MY')} km over` : `${state.kmLeft.toLocaleString('en-MY')} km left`);
  }
  if (state.daysLeft !== undefined) {
    parts.push(state.daysLeft < 0 ? `${Math.abs(state.daysLeft)} days late` : state.daysLeft === 0 ? 'due today' : `${state.daysLeft} days left`);
  }
  return parts.join(' · ');
}

export function getAlerts(vehicles: Vehicle[], services: ServiceRecord[], schedules: ScheduleItem[], issues: Issue[]): Alert[] {
  const alerts: Alert[] = [];
  vehicles.filter(isActive).forEach(vehicle => {
    schedules.filter(s => s.vehicleId === vehicle.id).forEach(item => {
      const state = getScheduleState(item, vehicle, services);
      if (state.status === 'overdue' || state.status === 'soon') {
        alerts.push({ key: `s-${item.id}`, vehicleId: vehicle.id, vehicleName: vehicle.name, title: item.name, detail: describeDue(state), status: state.status, scheduleId: item.id });
      }
    });
    getRenewals(vehicle).forEach(r => {
      if (r.status === 'overdue' || r.status === 'soon') {
        const detail = r.daysLeft! < 0 ? `Expired ${Math.abs(r.daysLeft!)} days ago` : r.daysLeft === 0 ? 'Expires today' : `Expires in ${r.daysLeft} days`;
        alerts.push({ key: `r-${vehicle.id}-${r.label}`, vehicleId: vehicle.id, vehicleName: vehicle.name, title: `${r.label} renewal`, detail, status: r.status });
      }
    });
    issues.filter(i => i.vehicleId === vehicle.id && i.status === 'open').forEach(issue => {
      const due = getIssueDue(issue, vehicle, services);
      if (due === 'overdue' || due === 'soon' || issue.severity === 'high') {
        alerts.push({
          key: `i-${issue.id}`, vehicleId: vehicle.id, vehicleName: vehicle.name,
          title: issue.title,
          detail: `${issue.severity === 'high' ? 'High severity issue' : 'Open issue'}${due === 'overdue' ? ' · past fix-by' : due === 'soon' ? ' · fix soon' : ''}`,
          status: due === 'overdue' || issue.severity === 'high' ? 'overdue' : 'soon'
        });
      }
    });
  });
  return alerts.sort((a, b) => (a.status === b.status ? 0 : a.status === 'overdue' ? -1 : 1));
}

export function vehicleHealth(vehicle: Vehicle, services: ServiceRecord[], schedules: ScheduleItem[], issues: Issue[]) {
  let overdue = 0;
  let soon = 0;
  schedules.filter(s => s.vehicleId === vehicle.id).forEach(item => {
    const { status } = getScheduleState(item, vehicle, services);
    if (status === 'overdue') overdue++;
    if (status === 'soon') soon++;
  });
  getRenewals(vehicle).forEach(r => {
    if (r.status === 'overdue') overdue++;
    if (r.status === 'soon') soon++;
  });
  const openIssues = issues.filter(i => i.vehicleId === vehicle.id && i.status === 'open').length;
  return { overdue, soon, openIssues, hasSchedule: schedules.some(s => s.vehicleId === vehicle.id) };
}

export interface ForecastEntry { vehicleName: string; itemName: string; date: string; cost: number }

// Expected scheduled-maintenance spend in the next `months`, from each item's estimated cost and due date.
// Items that repeat inside the window (e.g. oil every 6 months) are counted each time.
export function forecast(vehicles: Vehicle[], services: ServiceRecord[], schedules: ScheduleItem[], months: number) {
  const today = startOfToday();
  const end = addMonths(today, months);
  const entries: ForecastEntry[] = [];
  let missingCost = 0;

  vehicles.filter(isActive).forEach(vehicle => {
    const rate = kmPerDay(vehicle, services);
    schedules.filter(s => s.vehicleId === vehicle.id).forEach(item => {
      const state = getScheduleState(item, vehicle, services);
      if (state.status === 'unknown') return;
      let first = parseDate(state.estimatedDate) ?? (state.status === 'overdue' ? today : null);
      if (!first) return;
      if (first < today) first = today;
      if (first > end) return;
      if (!item.estimatedCost) { missingCost++; return; }

      const periods = [
        item.intervalMonths ? item.intervalMonths * 30.44 : Infinity,
        item.intervalKm && rate ? item.intervalKm / rate : Infinity,
      ];
      const periodDays = Math.max(1, Math.min(...periods));
      for (let d = first, n = 0; d <= end && n < 60; d = addDays(d, Math.round(periodDays)), n++) {
        entries.push({ vehicleName: vehicle.name, itemName: item.name, date: toISODate(d), cost: item.estimatedCost });
        if (periodDays === Infinity) break;
      }
    });
  });

  entries.sort((a, b) => a.date.localeCompare(b.date));
  return { entries, total: roundMoney(entries.reduce((sum, e) => sum + e.cost, 0)), missingCost };
}

// Kilometres each fitted part lasted, judged by when a part of the same category (or the same part)
// was next fitted to the same car.
export function partLifespan(part: Part, parts: Part[], services: ServiceRecord[]) {
  const category = part.category?.trim().toLowerCase();
  const sameKind = (id: string) => {
    if (id === part.id) return true;
    const other = parts.find(p => p.id === id);
    return !!category && other?.category?.trim().toLowerCase() === category;
  };
  const lifespans: number[] = [];
  const inUse: { vehicleId: string; since: number }[] = [];

  const byVehicle = new Map<string, ServiceRecord[]>();
  services.forEach(s => byVehicle.set(s.vehicleId, [...(byVehicle.get(s.vehicleId) ?? []), s]));

  byVehicle.forEach((list, vehicleId) => {
    const sorted = [...list].sort((a, b) => a.mileage - b.mileage);
    sorted.forEach((s, i) => {
      if (!s.partIds?.includes(part.id)) return;
      const next = sorted.slice(i + 1).find(n => n.mileage > s.mileage && n.partIds?.some(sameKind));
      if (next) lifespans.push(next.mileage - s.mileage);
      else inUse.push({ vehicleId, since: s.mileage });
    });
  });

  const average = lifespans.length ? Math.round(lifespans.reduce((a, b) => a + b, 0) / lifespans.length) : null;
  return { lifespans, average, inUse };
}
