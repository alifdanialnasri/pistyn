import { useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
import { RefreshCw, Users, Wallet, TrendingUp, CalendarClock, Search, Plus, Pencil, Trash2, Info } from 'lucide-react';
import { Payment, Plan, UserProfile, CollectionName } from '../types';
import {
  listUsers, listPayments, countRecords, countForUser, recordPayment, updatePlan, deletePayment, nextExpiry
} from '../lib/adminService';
import { PLANS, PAYMENT_PLANS, PAYMENT_METHODS, planLabel, planStatus } from '../lib/adminConfig';
import {
  formatMYR, formatDate, todayISO, toISODate, addDays, addMonths, parseDate, startOfToday, roundMoney,
  optionalText, errorMessage
} from '../lib/utils';
import { PageHeader, Modal, ConfirmDialog, Label, FormError, StatusBadge, LoadingBar, inputClass } from './ui';
import { ColumnChart, BarList, MONTHS, formatCount } from './charts';

type Counts = Record<CollectionName, number | null>;

// The last 12 calendar months, oldest first, as "YYYY-MM"
function lastMonths() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTHS[d.getMonth()], full: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  });
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="racing-panel p-4 md:p-6 rounded-xl">
      <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg md:text-2xl font-bold font-mono tracking-tighter">{value}</p>
      {sub && <p className="text-[10px] font-mono text-gray-600 uppercase mt-1">{sub}</p>}
    </div>
  );
}

function PlanBadge({ profile }: { profile: UserProfile }) {
  const { state } = planStatus(profile);
  if (state === 'free') return <StatusBadge status="unknown" label="Free" />;
  if (state === 'expired') return <StatusBadge status="overdue" label={`${planLabel(profile.plan)} expired`} />;
  return <StatusBadge status="ok" label={planLabel(profile.plan)} />;
}

function PaymentForm({ open, onClose, users, defaultUser, onSaved }: {
  open: boolean; onClose: () => void; users: UserProfile[]; defaultUser: UserProfile | null; onSaved: () => void;
}) {
  const [form, setForm] = useState({ uid: '', plan: 'pro', months: '12', amount: '49', method: 'duitnow', paidDate: todayISO(), reference: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({ uid: defaultUser?.id ?? '', plan: 'pro', months: '12', amount: '49', method: 'duitnow', paidDate: todayISO(), reference: '', notes: '' });
  }, [open, defaultUser]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value }));

  // Fill the usual price when the plan or period changes
  const applyPreset = (plan: string, monthsInput: string) => {
    const months = plan === 'other' ? '0' : Number(monthsInput) > 0 ? monthsInput : '12';
    const p = PLANS.find(x => x.value === plan);
    const m = Number(months);
    let amount = '';
    if (p && m > 0) amount = String(roundMoney(p.yearly && m === 12 ? p.yearly : p.monthly * m));
    setForm(f => ({ ...f, plan, months, amount: amount || f.amount }));
  };

  const changeMonths = (value: string) => {
    const p = PLANS.find(x => x.value === form.plan);
    const m = Number(value);
    const amount = p && m > 0 ? String(roundMoney(p.yearly && m === 12 ? p.yearly : p.monthly * m)) : null;
    setForm(f => ({ ...f, months: value, amount: amount ?? f.amount }));
  };

  const user = users.find(u => u.id === form.uid);
  const months = form.plan === 'other' ? 0 : Number(form.months);
  const preview = user && months > 0 ? nextExpiry(user, months) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!user) return setError('Choose a user.');
    if (!Number.isFinite(amount) || amount < 0) return setError('Enter the amount received.');
    if (form.plan !== 'other' && !(months > 0)) return setError('Enter how many months this payment covers.');
    setSaving(true);
    setError(null);
    try {
      await recordPayment({
        user, plan: form.plan as Payment['plan'], amount: roundMoney(amount), periodMonths: months,
        method: form.method as Payment['method'], paidDate: form.paidDate,
        reference: optionalText(form.reference), notes: optionalText(form.notes)
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">
        <div className="col-span-2">
          <Label htmlFor="pay-user">User *</Label>
          <select id="pay-user" required value={form.uid} onChange={set('uid')} className={inputClass}>
            <option value="">Select a user</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.email}{u.displayName ? ` (${u.displayName})` : ''}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="pay-plan">Plan *</Label>
          <select id="pay-plan" value={form.plan} onChange={e => applyPreset(e.target.value, form.months)} className={inputClass}>
            {PAYMENT_PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="pay-months">Months Covered *</Label>
          <input id="pay-months" type="number" inputMode="numeric" min="0" step="1" disabled={form.plan === 'other'} value={form.months}
            onChange={e => changeMonths(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <Label htmlFor="pay-amount">Amount Received (RM) *</Label>
          <input id="pay-amount" type="number" inputMode="decimal" required min="0" step="0.01" value={form.amount} onChange={set('amount')} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <Label htmlFor="pay-date">Paid On *</Label>
          <input id="pay-date" type="date" required value={form.paidDate} onChange={set('paidDate')} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="pay-method">Method</Label>
          <select id="pay-method" value={form.method} onChange={set('method')} className={inputClass}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="pay-ref">Reference No.</Label>
          <input id="pay-ref" maxLength={100} value={form.reference} onChange={set('reference')} placeholder="Bank / DuitNow ref" className={`${inputClass} font-mono`} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="pay-notes">Notes</Label>
          <input id="pay-notes" maxLength={500} value={form.notes} onChange={set('notes')} className={inputClass} />
        </div>
        {preview && (
          <p className="col-span-2 text-[10px] font-mono text-green-500 uppercase tracking-widest">
            {user!.email} will be on {planLabel(form.plan)} until {formatDate(preview)}
          </p>
        )}
        <div className="col-span-2">
          <FormError message={error} />
          <button type="submit" disabled={saving} className="racing-button w-full py-4 text-lg disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PlanForm({ open, onClose, user, onSaved }: { open: boolean; onClose: () => void; user: UserProfile | null; onSaved: () => void }) {
  const [form, setForm] = useState({ plan: 'free', expires: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setError(null);
    setForm({ plan: user.plan ?? 'free', expires: user.planExpiresAt ?? '', notes: user.adminNotes ?? '' });
  }, [open, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.plan !== 'free' && !form.expires) return setError('Paid plans need an expiry date.');
    setSaving(true);
    setError(null);
    try {
      await updatePlan(user.id, form.plan as Plan, form.plan === 'free' ? undefined : form.expires, optionalText(form.notes));
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change Plan">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-gray-400 break-all">{user?.email}</p>
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
          For corrections, trials or refunds. To give paid access after receiving money, use Record Payment instead so it counts as income.
        </p>
        <div>
          <Label htmlFor="plan-plan">Plan</Label>
          <select id="plan-plan" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} className={inputClass}>
            {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {form.plan !== 'free' && (
          <div>
            <Label htmlFor="plan-expires">Paid Until *</Label>
            <input id="plan-expires" type="date" value={form.expires} onChange={e => setForm(f => ({ ...f, expires: e.target.value }))} className={inputClass} />
          </div>
        )}
        <div>
          <Label htmlFor="plan-notes">Admin Notes (only you see these)</Label>
          <textarea id="plan-notes" maxLength={1000} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputClass} h-20 resize-none`} />
        </div>
        <FormError message={error} />
        <button type="submit" disabled={saving} className="racing-button w-full py-4 text-lg disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Plan'}
        </button>
      </form>
    </Modal>
  );
}

export default function Admin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [perUser, setPerUser] = useState<Record<string, { vehicles: number | null; services: number | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [paymentFor, setPaymentFor] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [planFor, setPlanFor] = useState<UserProfile | null>(null);
  const [toDelete, setToDelete] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, p, c] = await Promise.all([listUsers(), listPayments(), countRecords()]);
      setUsers(u.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')));
      setPayments(p);
      setCounts(c);
      // Per-user usage costs two small count reads per user, so only for the first 200
      const entries = await Promise.all(u.slice(0, 200).map(async x => [x.id, await countForUser(x.id)] as const));
      setPerUser(Object.fromEntries(entries));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = todayISO();
  const months = useMemo(lastMonths, []);
  const thisMonth = today.slice(0, 7);
  const thisYear = today.slice(0, 4);

  const income = useMemo(() => {
    const sum = (list: Payment[]) => roundMoney(list.reduce((s, p) => s + p.amount, 0));
    // A subscription payment spread over the months it covers, counted while it is still running
    const mrr = roundMoney(payments.reduce((s, p) => {
      const start = parseDate(p.paidDate);
      if (!start || p.periodMonths <= 0) return s;
      const end = toISODate(addMonths(start, p.periodMonths));
      return p.paidDate <= today && today < end ? s + p.amount / p.periodMonths : s;
    }, 0));
    const byPlan = new Map<string, number>();
    payments.forEach(p => byPlan.set(planLabel(p.plan), (byPlan.get(planLabel(p.plan)) ?? 0) + p.amount));
    return {
      month: sum(payments.filter(p => p.paidDate.startsWith(thisMonth))),
      year: sum(payments.filter(p => p.paidDate.startsWith(thisYear))),
      all: sum(payments),
      mrr,
      chart: months.map(m => ({ label: m.label, full: m.full, value: sum(payments.filter(p => p.paidDate.startsWith(m.key))) })),
      byPlan: [...byPlan.entries()].map(([label, value]) => ({ label, value: roundMoney(value) })).sort((a, b) => b.value - a.value),
    };
  }, [payments, months, today, thisMonth, thisYear]);

  const subs = useMemo(() => {
    const active = { pro: 0, fleet: 0, workshop: 0 };
    let free = 0;
    let expired = 0;
    const soonLimit = toISODate(addDays(startOfToday(), 14));
    const expiringSoon: UserProfile[] = [];
    users.forEach(u => {
      const s = planStatus(u);
      if (s.state === 'active') {
        active[s.plan as keyof typeof active]++;
        if (u.planExpiresAt! <= soonLimit) expiringSoon.push(u);
      } else {
        free++;
        if (s.state === 'expired') expired++;
      }
    });
    return { active, free, expired, expiringSoon: expiringSoon.sort((a, b) => a.planExpiresAt!.localeCompare(b.planExpiresAt!)) };
  }, [users]);

  const usage = useMemo(() => {
    const since = (days: number) => toISODate(addDays(startOfToday(), -days));
    return {
      total: users.length,
      newThisMonth: users.filter(u => toISODate(new Date(u.createdAt)).startsWith(thisMonth)).length,
      active7: users.filter(u => (u.lastActiveAt ?? '') >= since(7)).length,
      active30: users.filter(u => (u.lastActiveAt ?? '') >= since(30)).length,
      signups: months.map(m => ({ label: m.label, full: m.full, value: users.filter(u => u.createdAt && toISODate(new Date(u.createdAt)).startsWith(m.key)).length })),
    };
  }, [users, months, thisMonth]);

  const term = search.trim().toLowerCase();
  const shownUsers = users.filter(u => !term || u.email.toLowerCase().includes(term) || (u.displayName ?? '').toLowerCase().includes(term));
  const paidUsers = subs.active.pro + subs.active.fleet + subs.active.workshop;
  const c = (n: number | null | undefined) => (n === null || n === undefined ? '—' : formatCount(n));

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await deletePayment(toDelete.id);
      setToDelete(null);
      await load();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !users.length && !error) return <LoadingBar />;

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Owner Console"
        title="Admin"
        action={
          <div className="flex gap-2">
            <button onClick={() => load()} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono uppercase tracking-widest disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => setPaymentFor({ open: true, user: null })} className="racing-button flex items-center gap-2 text-xs md:text-sm">
              <Plus className="w-4 h-4" /> Record Payment
            </button>
          </div>
        }
      />

      <FormError message={error} />

      <section className="space-y-4">
        <h3 className="text-lg font-bold italic uppercase tracking-tight flex items-center gap-3"><Wallet className="w-5 h-5 text-racing-red" /> Income</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Tile label="This Month" value={formatMYR(income.month)} />
          <Tile label={`Year ${thisYear}`} value={formatMYR(income.year)} />
          <Tile label="All Time" value={formatMYR(income.all)} sub={`${payments.length} payment${payments.length === 1 ? '' : 's'}`} />
          <Tile label="Monthly Recurring (est.)" value={formatMYR(income.mrr)} sub="Running subscriptions ÷ months" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 racing-panel p-5 md:p-8 rounded-2xl">
            <h4 className="font-bold italic uppercase tracking-tight mb-6">Income, Last 12 Months</h4>
            <ColumnChart data={income.chart} label="Income in the last 12 months" />
          </div>
          <div className="racing-panel p-5 md:p-8 rounded-2xl">
            <h4 className="font-bold italic uppercase tracking-tight mb-6">By Plan (All Time)</h4>
            <BarList rows={income.byPlan} empty="No payments recorded yet." />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold italic uppercase tracking-tight flex items-center gap-3"><TrendingUp className="w-5 h-5 text-racing-red" /> Subscriptions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Tile label="Paying Users" value={formatCount(paidUsers)} sub={users.length ? `${Math.round((paidUsers / users.length) * 100)}% of users` : undefined} />
          <Tile label="Pro" value={formatCount(subs.active.pro)} />
          <Tile label="Fleet" value={formatCount(subs.active.fleet)} />
          <Tile label="Workshop" value={formatCount(subs.active.workshop)} />
          <Tile label="Free" value={formatCount(subs.free)} sub={subs.expired ? `${subs.expired} expired paid` : undefined} />
        </div>
        <div className="racing-panel p-5 md:p-8 rounded-2xl">
          <h4 className="font-bold italic uppercase tracking-tight mb-4 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-amber-400" /> Expiring in 14 Days</h4>
          {subs.expiringSoon.length ? (
            <ul className="divide-y divide-white/5">
              {subs.expiringSoon.map(u => (
                <li key={u.id} className="flex flex-wrap justify-between items-center gap-3 py-2 text-sm">
                  <span className="break-all">{u.email} <span className="text-gray-500">· {planLabel(u.plan)} until {formatDate(u.planExpiresAt)}</span></span>
                  <button onClick={() => setPaymentFor({ open: true, user: u })} className="text-[10px] font-mono uppercase tracking-widest text-racing-red hover:underline">Record renewal</button>
                </li>
              ))}
            </ul>
          ) : <p className="text-gray-500 text-sm italic">No subscriptions expiring soon.</p>}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold italic uppercase tracking-tight flex items-center gap-3"><Users className="w-5 h-5 text-racing-red" /> Usage</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Tile label="Users" value={formatCount(usage.total)} />
          <Tile label="New This Month" value={formatCount(usage.newThisMonth)} />
          <Tile label="Active, 7 Days" value={formatCount(usage.active7)} />
          <Tile label="Active, 30 Days" value={formatCount(usage.active30)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Tile label="Vehicles" value={c(counts?.vehicles)} />
          <Tile label="Service Logs" value={c(counts?.services)} />
          <Tile label="Schedule Items" value={c(counts?.schedules)} />
          <Tile label="Issues" value={c(counts?.issues)} />
          <Tile label="Parts" value={c(counts?.parts)} />
        </div>
        <div className="racing-panel p-5 md:p-8 rounded-2xl">
          <h4 className="font-bold italic uppercase tracking-tight mb-6">New Users, Last 12 Months</h4>
          <ColumnChart data={usage.signups} label="New users in the last 12 months" format={formatCount} />
        </div>
      </section>

      <section className="racing-panel p-5 md:p-8 rounded-2xl">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h3 className="text-lg font-bold italic uppercase tracking-tight">Users</h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input aria-label="Search users" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email or name"
              className="w-full bg-black border border-white/10 rounded-xl pl-11 pr-4 py-2 focus:outline-none focus:border-racing-red text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-[10px] font-mono text-gray-500 uppercase tracking-widest text-left">
                <th className="pb-3 font-normal">User</th>
                <th className="pb-3 font-normal">Joined</th>
                <th className="pb-3 font-normal">Last Active</th>
                <th className="pb-3 font-normal">Plan</th>
                <th className="pb-3 font-normal text-right">Cars</th>
                <th className="pb-3 font-normal text-right">Services</th>
                <th className="pb-3 font-normal"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shownUsers.map(u => (
                <tr key={u.id} className="border-t border-white/5 align-top">
                  <td className="py-3 pr-3">
                    <div className="break-all">{u.email || '(no email)'}</div>
                    {u.displayName && <div className="text-[10px] font-mono text-gray-500">{u.displayName}</div>}
                    {u.adminNotes && <div className="text-[10px] text-amber-400/80 italic mt-1">{u.adminNotes}</div>}
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs text-gray-400 whitespace-nowrap">{u.createdAt ? formatDate(toISODate(new Date(u.createdAt))) : '—'}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-gray-400 whitespace-nowrap">{formatDate(u.lastActiveAt)}</td>
                  <td className="py-3 pr-3">
                    <PlanBadge profile={u} />
                    {u.planExpiresAt && u.plan !== 'free' && <div className="text-[10px] font-mono text-gray-500 mt-1">until {formatDate(u.planExpiresAt)}</div>}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono">{c(perUser[u.id]?.vehicles)}</td>
                  <td className="py-3 pr-3 text-right font-mono">{c(perUser[u.id]?.services)}</td>
                  <td className="py-3">
                    <div className="flex gap-3 justify-end">
                      <button aria-label={`Record payment for ${u.email}`} onClick={() => setPaymentFor({ open: true, user: u })} className="text-gray-500 hover:text-green-500"><Wallet className="w-4 h-4" /></button>
                      <button aria-label={`Change plan for ${u.email}`} onClick={() => setPlanFor(u)} className="text-gray-500 hover:text-white"><Pencil className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {shownUsers.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-gray-500 italic">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest flex gap-2">
          <Info className="w-3 h-3 shrink-0" /> Users appear here once they sign in to this version of the app.
        </p>
      </section>

      <section className="racing-panel p-5 md:p-8 rounded-2xl">
        <h3 className="text-lg font-bold italic uppercase tracking-tight mb-6">Payments</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-[10px] font-mono text-gray-500 uppercase tracking-widest text-left">
                <th className="pb-3 font-normal">Paid On</th>
                <th className="pb-3 font-normal">User</th>
                <th className="pb-3 font-normal">Plan</th>
                <th className="pb-3 font-normal">Method</th>
                <th className="pb-3 font-normal">Reference</th>
                <th className="pb-3 font-normal text-right">Amount</th>
                <th className="pb-3 font-normal"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="py-3 pr-3 font-mono text-xs whitespace-nowrap">{formatDate(p.paidDate)}</td>
                  <td className="py-3 pr-3 break-all">{p.email}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">{planLabel(p.plan)}{p.periodMonths > 0 && <span className="text-gray-500"> · {p.periodMonths} mo</span>}</td>
                  <td className="py-3 pr-3 text-gray-400 whitespace-nowrap">{PAYMENT_METHODS.find(m => m.value === p.method)?.label ?? p.method}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-gray-400">{p.reference ?? '—'}</td>
                  <td className="py-3 pr-3 text-right font-mono font-bold text-green-500 whitespace-nowrap">{formatMYR(p.amount)}</td>
                  <td className="py-3 text-right">
                    <button aria-label="Delete payment" onClick={() => { setDeleteError(null); setToDelete(p); }} className="text-gray-600 hover:text-racing-red"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-gray-500 italic">No payments yet. When someone pays you, use Record Payment.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <PaymentForm open={paymentFor.open} onClose={() => setPaymentFor(s => ({ ...s, open: false }))} users={users} defaultUser={paymentFor.user} onSaved={load} />
      <PlanForm open={!!planFor} onClose={() => setPlanFor(null)} user={planFor} onSaved={load} />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Payment?"
        message="Removes it from income totals. The user's plan is not changed; use Change Plan if needed."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        busy={busy}
        error={deleteError}
      />
    </div>
  );
}
