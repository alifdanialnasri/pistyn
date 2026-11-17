import { Attachment, CollectionName } from '../types';
import { toISODate, addDays, startOfToday } from './utils';
import type { DataApi } from './firestoreService';

// Demo data lives in this browser's localStorage so it survives a refresh
const STORAGE_KEY = 'pistyn-demo-data-v1';

type Store = Record<CollectionName, Record<string, any>[]>;

const daysAgo = (n: number) => toISODate(addDays(startOfToday(), -n));
const stamp = (n: number) => addDays(startOfToday(), -n).toISOString();

function seed(): Store {
  const base = { ownerId: 'demo' };
  return {
    vehicles: [
      {
        ...base, id: 'v1', name: 'Nissan Skyline R34 GT-R', plateNumber: 'BNR34-01', make: 'Nissan', model: 'Skyline GT-R V-Spec',
        year: 1999, notes: 'Bayside Blue, RB26DETT', roadTaxExpiry: toISODate(addDays(startOfToday(), 18)),
        insuranceExpiry: toISODate(addDays(startOfToday(), 200)), status: 'active', createdAt: stamp(400)
      },
      {
        ...base, id: 'v2', name: 'Mazda RX-7 FD3S', plateNumber: 'FD3S-99', make: 'Mazda', model: 'RX-7 Type RS', year: 1997,
        currentMileage: 112300, mileageUpdatedAt: daysAgo(3), notes: 'Vintage Red, 13B-REW', status: 'active', createdAt: stamp(390)
      }
    ],
    services: [
      {
        ...base, id: 's1', vehicleId: 'v1', date: daysAgo(150), mileage: 81200, description: 'Engine Oil & Filter',
        serviceType: 'maintenance', scheduleIds: ['sc1', 'sc2'], cost: 150, workshop: 'Performance Lab',
        lineItems: [
          { description: 'Motul 300V 10W40 (5L)', kind: 'part', quantity: 1, unitPrice: 110 },
          { description: 'Oil filter', kind: 'part', quantity: 1, unitPrice: 20 },
          { description: 'Labour', kind: 'labour', quantity: 1, unitPrice: 20 }
        ],
        notes: 'Motul 300V 10W40 used', partIds: [], createdAt: stamp(150)
      },
      {
        ...base, id: 's2', vehicleId: 'v1', date: daysAgo(40), mileage: 85200, description: 'Front brake pads replaced',
        serviceType: 'repair', scheduleIds: ['sc3'], cost: 380, workshop: 'Performance Lab',
        lineItems: [
          { description: 'Brembo brake pads (front)', kind: 'part', quantity: 1, unitPrice: 200, warrantyUntil: toISODate(addDays(startOfToday(), 325)) },
          { description: 'Disc skim', kind: 'labour', quantity: 2, unitPrice: 60 },
          { description: 'Labour', kind: 'labour', quantity: 1, unitPrice: 60 }
        ],
        partIds: ['p1'], createdAt: stamp(40)
      },
      {
        ...base, id: 's3', vehicleId: 'v2', date: daysAgo(90), mileage: 109800, description: 'Coil packs upgrade',
        serviceType: 'upgrade', cost: 1450, workshop: 'Rotary Garage', partIds: [], createdAt: stamp(90)
      }
    ],
    parts: [
      { ...base, id: 'p1', name: 'Brembo Brake Pads', category: 'Brakes', status: 'preferred', price: 200, createdAt: stamp(60) }
    ],
    schedules: [
      { ...base, id: 'sc1', vehicleId: 'v1', name: 'Engine Oil', category: 'Engine', intervalKm: 5000, intervalMonths: 6, estimatedCost: 150, createdAt: stamp(150) },
      { ...base, id: 'sc2', vehicleId: 'v1', name: 'Oil Filter', category: 'Engine', intervalKm: 5000, intervalMonths: 6, estimatedCost: 20, createdAt: stamp(150) },
      { ...base, id: 'sc3', vehicleId: 'v1', name: 'Brake Pads Check', category: 'Brakes', intervalKm: 10000, intervalMonths: 6, createdAt: stamp(150) },
      {
        ...base, id: 'sc4', vehicleId: 'v1', name: 'Spark Plugs', category: 'Engine', intervalKm: 40000, intervalMonths: 24,
        lastDoneDate: daysAgo(700), lastDoneMileage: 60000, estimatedCost: 480, createdAt: stamp(150)
      }
    ],
    issues: [
      {
        ...base, id: 'i1', vehicleId: 'v1', title: 'Rear tyres at 3mm tread', details: 'Workshop recommends replacing within 5,000 km',
        source: 'workshop', severity: 'medium', status: 'open', reportedDate: daysAgo(40), reportedMileage: 85200, dueMileage: 90200,
        createdAt: stamp(40)
      }
    ]
  };
}

function load(): Store {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...seed(), ...JSON.parse(saved) };
  } catch {
    // Storage blocked or corrupt: fall back to fresh demo data
  }
  return seed();
}

let store = load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked: data stays for this session only
  }
}

const wait = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

export function resetDemoData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  store = seed();
}

export const MockFirestoreService: DataApi = {
  async list<T>(col: CollectionName): Promise<T[]> {
    await wait();
    return structuredClone(store[col]) as T[];
  },

  async add(col: CollectionName, data: Record<string, unknown>) {
    await wait();
    const id = `m-${col}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    store[col].push({ ...structuredClone(record), id, ownerId: 'demo', createdAt: new Date().toISOString() });
    persist();
    return id;
  },

  async update(col: CollectionName, id: string, data: Record<string, unknown>) {
    await wait();
    const idx = store[col].findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Record not found.');
    const next = { ...store[col][idx], ...structuredClone(data), updatedAt: new Date().toISOString() };
    Object.keys(data).forEach(k => { if (data[k] === undefined) delete next[k]; });
    store[col][idx] = next;
    persist();
  },

  async remove(items: { col: CollectionName; id: string }[]) {
    await wait();
    items.forEach(({ col, id }) => { store[col] = store[col].filter(r => r.id !== id); });
    persist();
  },

  async uploadFile(file: File): Promise<Attachment> {
    await wait();
    // Demo files are only viewable during this browser session
    return { name: file.name, url: URL.createObjectURL(file), contentType: file.type || undefined };
  }
};
