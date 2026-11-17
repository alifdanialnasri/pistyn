import {
  collection, doc, getDocs, getCountFromServer, query, where, writeBatch, updateDoc, deleteDoc, deleteField
} from 'firebase/firestore';
import { db } from './firebase';
import { CollectionName, Payment, Plan, UserProfile } from '../types';
import { addMonths, parseDate, startOfToday, toISODate } from './utils';

// Admin-only reads and writes. Firestore rules allow these only for the admin account.

function requireOnline() {
  if (!navigator.onLine) throw new Error("You're offline. Connect to the internet to make changes.");
}

const friendly = (err: unknown) => {
  const code = (err as { code?: string })?.code;
  if (code === 'permission-denied') return new Error('Permission denied. Publish the latest Firestore rules and sign in with the admin account (verified email).');
  return err instanceof Error ? err : new Error('Something went wrong. Please try again.');
};

export async function listUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as UserProfile);
  } catch (err) { throw friendly(err); }
}

export async function listPayments(): Promise<Payment[]> {
  try {
    const snap = await getDocs(collection(db, 'payments'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Payment)
      .sort((a, b) => b.paidDate.localeCompare(a.paidDate) || b.recordedAt.localeCompare(a.recordedAt));
  } catch (err) { throw friendly(err); }
}

const COUNTED: CollectionName[] = ['vehicles', 'services', 'schedules', 'issues', 'parts'];

// Count queries are billed as one read per 1,000 records, so these stay cheap as the app grows
export async function countRecords(): Promise<Record<CollectionName, number | null>> {
  const results = await Promise.all(COUNTED.map(async col => {
    try { return (await getCountFromServer(collection(db, col))).data().count; }
    catch (err) { console.warn(`Count failed for ${col}:`, err); return null; }
  }));
  return Object.fromEntries(COUNTED.map((col, i) => [col, results[i]])) as Record<CollectionName, number | null>;
}

export async function countForUser(uid: string) {
  const count = async (col: CollectionName) => {
    try { return (await getCountFromServer(query(collection(db, col), where('ownerId', '==', uid)))).data().count; }
    catch { return null; }
  };
  const [vehicles, services] = await Promise.all([count('vehicles'), count('services')]);
  return { vehicles, services };
}

// New expiry: extend from the current expiry if it is still in the future, otherwise from today
export function nextExpiry(profile: UserProfile, months: number) {
  const current = parseDate(profile.planExpiresAt);
  const today = startOfToday();
  const base = current && current >= today ? current : today;
  return toISODate(addMonths(base, months));
}

export interface PaymentInput {
  user: UserProfile;
  plan: Payment['plan'];
  amount: number;
  periodMonths: number;
  method: Payment['method'];
  paidDate: string;
  reference?: string;
  notes?: string;
}

// Saves the payment and, for subscriptions, upgrades the user's plan in one atomic write
export async function recordPayment(input: PaymentInput) {
  requireOnline();
  const { user, plan, periodMonths } = input;
  const payment: Omit<Payment, 'id'> = {
    uid: user.id,
    email: user.email,
    plan,
    amount: input.amount,
    periodMonths,
    method: input.method,
    paidDate: input.paidDate,
    recordedAt: new Date().toISOString(),
  };
  if (input.reference) payment.reference = input.reference;
  if (input.notes) payment.notes = input.notes;

  try {
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'payments')), payment);
    if (plan !== 'other' && periodMonths > 0) {
      batch.update(doc(db, 'users', user.id), { plan, planExpiresAt: nextExpiry(user, periodMonths) });
    }
    await batch.commit();
  } catch (err) { throw friendly(err); }
}

export async function updatePlan(uid: string, plan: Plan, planExpiresAt?: string, adminNotes?: string) {
  requireOnline();
  try {
    await updateDoc(doc(db, 'users', uid), {
      plan,
      planExpiresAt: plan === 'free' || !planExpiresAt ? deleteField() : planExpiresAt,
      adminNotes: adminNotes ? adminNotes : deleteField(),
    });
  } catch (err) { throw friendly(err); }
}

export async function deletePayment(id: string) {
  requireOnline();
  try { await deleteDoc(doc(db, 'payments', id)); }
  catch (err) { throw friendly(err); }
}
