import type { User } from 'firebase/auth';
import { Plan, PaymentMethod, PaymentPlan, UserProfile } from '../types';
import { todayISO } from './utils';

// Must match isAdmin() in firestore.rules. Changing it here only hides or shows the page;
// the rules are what actually protect the data.
export const ADMIN_EMAIL = 'alifdanialnasrii@gmail.com';

export const isAdminUser = (user: Pick<User, 'email' | 'emailVerified'> | null) =>
  !!user && user.email === ADMIN_EMAIL && user.emailVerified;

export const PLANS: { value: Plan; label: string; monthly: number; yearly?: number }[] = [
  { value: 'free', label: 'Free', monthly: 0 },
  { value: 'pro', label: 'Pro', monthly: 4.9, yearly: 49 },
  { value: 'fleet', label: 'Fleet', monthly: 19.9 },
  { value: 'workshop', label: 'Workshop', monthly: 49 },
];

export const PAYMENT_PLANS: { value: PaymentPlan; label: string }[] = [
  { value: 'pro', label: 'Pro' },
  { value: 'fleet', label: 'Fleet' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'other', label: 'One-off (e.g. verified report)' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'duitnow', label: 'DuitNow / QR' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'ewallet', label: 'E-wallet (TNG, Boost...)' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export const planLabel = (plan?: string) =>
  PLANS.find(p => p.value === plan)?.label ?? PAYMENT_PLANS.find(p => p.value === plan)?.label ?? 'Free';

// A paid plan counts only until it expires; after that the user is back on Free
export function planStatus(profile?: Pick<UserProfile, 'plan' | 'planExpiresAt'> | null): { plan: Plan; state: 'free' | 'active' | 'expired' } {
  const plan = profile?.plan ?? 'free';
  if (plan === 'free') return { plan: 'free', state: 'free' };
  if (profile?.planExpiresAt && profile.planExpiresAt >= todayISO()) return { plan, state: 'active' };
  return { plan: 'free', state: 'expired' };
}
