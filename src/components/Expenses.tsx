import { useState, useMemo } from 'react';
import { Wallet, Filter, Calendar, PiggyBank, Info } from 'lucide-react';
import { useData } from '../lib/DataContext';
import { formatMYR, formatKm, formatDate, getCurrentMileage, parseDate, addMonths, startOfToday, roundMoney } from '../lib/utils';
import { serviceTypeLabel, forecast } from '../lib/maintenance';
import { PageHeader } from './ui';
import { ColumnChart, BarList, MONTHS } from './charts';

const sumBy = <T,>(items: T[], key: (item: T) => string, value: (item: T) => number) => {
  const totals = new Map<string, number>();
  items.forEach(item => totals.set(key(item), (totals.get(key(item)) ?? 0) + value(item)));
  return [...totals.entries()].map(([label, v]) => ({ label, value: roundMoney(v) })).sort((a, b) => b.value - a.value);
};

export default function Expenses() {
  const { vehicles, services, schedules } = useData();
  const thisYear = new Date().getFullYear();
  const [vehicleId, setVehicleId] = useState('');
  const [year, setYear] = useState<string>(String(thisYear));

  const scoped = services.filter(s => !vehicleId || s.vehicleId === vehicleId);
  const years = useMemo(() => {
    const set = new Set<number>([thisYear]);
    services.forEach(s => { const d = parseDate(s.date); if (d) set.add(d.getFullYear()); });
    return [...set].sort((a, b) => b - a);
  }, [services, thisYear]);

  const inPeriod = year === 'all' ? scoped : scoped.filter(s => parseDate(s.date)?.getFullYear() === Number(year));
  const total = roundMoney(inPeriod.reduce((sum, s) => sum + s.cost, 0));
  const repairs = roundMoney(inPeriod.filter(s => s.serviceType === 'repair').reduce((sum, s) => sum + s.cost, 0));

  let monthsInPeriod = 12;
  if (year === String(thisYear)) monthsInPeriod = new Date().getMonth() + 1;
  if (year === 'all') {
    const dates = scoped.map(s => parseDate(s.date)).filter((d): d is Date => !!d);
    const first = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const now = new Date();
    monthsInPeriod = Math.max(1, (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth() + 1);
  }

  const chartData = year === 'all'
    ? [...years].reverse().map(y => ({
        label: String(y).slice(2), full: String(y),
        value: roundMoney(scoped.filter(s => parseDate(s.date)?.getFullYear() === y).reduce((sum, s) => sum + s.cost, 0))
      }))
    : MONTHS.map((m, i) => ({
        label: m.slice(0, 1), full: `${m} ${year}`,
        value: roundMoney(inPeriod.filter(s => parseDate(s.date)?.getMonth() === i).reduce((sum, s) => sum + s.cost, 0))
      }));

  const byType = sumBy(inPeriod, s => serviceTypeLabel(s.serviceType), s => s.cost);
  const byVehicle = sumBy(inPeriod, s => vehicles.find(v => v.id === s.vehicleId)?.name ?? 'Unknown Vehicle', s => s.cost);
  const withLines = inPeriod.filter(s => s.lineItems?.length);
  const byKind = sumBy(withLines.flatMap(s => s.lineItems!), l => ({ part: 'Parts', labour: 'Labour', other: 'Other' })[l.kind], l => l.quantity * l.unitPrice);

  const costPerKm = vehicles.filter(v => !vehicleId || v.id === vehicleId).map(v => {
    const list = services.filter(s => s.vehicleId === v.id);
    const spent = list.reduce((sum, s) => sum + s.cost, 0);
    const current = getCurrentMileage(v, services);
    const readings = list.map(s => s.mileage).concat(v.purchaseMileage ?? []).filter(Number.isFinite);
    const km = current !== null && readings.length ? current - Math.min(...readings) : 0;
    return { vehicle: v, spent, km };
  });

  const scopeVehicles = vehicles.filter(v => !vehicleId || v.id === vehicleId);
  const f3 = forecast(scopeVehicles, services, schedules, 3);
  const f6 = forecast(scopeVehicles, services, schedules, 6);
  const f12 = forecast(scopeVehicles, services, schedules, 12);
  const yearAgo = addMonths(startOfToday(), -12);
  const repairsLast12 = scoped
    .filter(s => s.serviceType === 'repair' && (parseDate(s.date) ?? new Date(0)) >= yearAgo)
    .reduce((sum, s) => sum + s.cost, 0);
  const monthlySetAside = roundMoney((f12.total + repairsLast12) / 12);

  const selectClass = 'bg-surface-dark border border-white/5 rounded-xl pl-12 pr-10 py-3 appearance-none focus:outline-none focus:border-racing-red transition-colors w-full md:min-w-[200px]';

  return (
    <div className="space-y-8">
      <PageHeader kicker="Finance" title="Expenses" />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select aria-label="Vehicle" value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={selectClass}>
            <option value="">All Vehicles</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select aria-label="Period" value={year} onChange={e => setYear(e.target.value)} className={selectClass}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Spent', value: formatMYR(total) },
          { label: 'Services Logged', value: String(inPeriod.length) },
          { label: 'Average per Month', value: formatMYR(roundMoney(total / monthsInPeriod)) },
          { label: 'Repairs (Unplanned)', value: formatMYR(repairs) },
        ].map(stat => (
          <div key={stat.label} className="racing-panel p-4 md:p-6 rounded-xl">
            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-lg md:text-2xl font-bold font-mono tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="racing-panel p-5 md:p-8 rounded-2xl">
        <h3 className="text-lg md:text-xl font-bold italic uppercase tracking-tight mb-6">
          {year === 'all' ? 'Spending by Year' : `Monthly Spending ${year}`}
        </h3>
        <ColumnChart data={chartData} label={year === 'all' ? 'Spending by year' : `Monthly spending in ${year}`} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="racing-panel p-5 md:p-8 rounded-2xl">
          <h3 className="text-lg font-bold italic uppercase tracking-tight mb-6">By Type of Work</h3>
          <BarList rows={byType} empty="No spending in this period." />
          {byType.some(r => r.label === 'Uncategorised') && (
            <p className="mt-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">Tip: edit older services to set their type.</p>
          )}
        </section>
        {!vehicleId ? (
          <section className="racing-panel p-5 md:p-8 rounded-2xl">
            <h3 className="text-lg font-bold italic uppercase tracking-tight mb-6">By Vehicle</h3>
            <BarList rows={byVehicle} empty="No spending in this period." />
          </section>
        ) : (
          <section className="racing-panel p-5 md:p-8 rounded-2xl">
            <h3 className="text-lg font-bold italic uppercase tracking-tight mb-6">Parts vs Labour</h3>
            <BarList rows={byKind} empty="Add cost lines when logging services to see this." />
          </section>
        )}
      </div>

      {!vehicleId && (
        <section className="racing-panel p-5 md:p-8 rounded-2xl">
          <h3 className="text-lg font-bold italic uppercase tracking-tight mb-2">Parts vs Labour</h3>
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-6">From {withLines.length} of {inPeriod.length} services that have a cost breakdown</p>
          <BarList rows={byKind} empty="Add cost lines when logging services to see this." />
        </section>
      )}

      <section className="racing-panel p-5 md:p-8 rounded-2xl">
        <h3 className="text-lg font-bold italic uppercase tracking-tight mb-6">Running Cost per KM (All Time)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-[10px] font-mono text-gray-500 uppercase tracking-widest text-left">
                <th className="pb-3 font-normal">Vehicle</th>
                <th className="pb-3 font-normal text-right">Spent</th>
                <th className="pb-3 font-normal text-right">Distance Logged</th>
                <th className="pb-3 font-normal text-right">RM / KM</th>
              </tr>
            </thead>
            <tbody>
              {costPerKm.map(({ vehicle, spent, km }) => (
                <tr key={vehicle.id} className="border-t border-white/5">
                  <td className="py-3">{vehicle.name}</td>
                  <td className="py-3 text-right font-mono">{formatMYR(spent)}</td>
                  <td className="py-3 text-right font-mono">{km > 0 ? formatKm(km) : '—'}</td>
                  <td className="py-3 text-right font-mono font-bold">{km > 0 ? (spent / km).toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="racing-panel p-5 md:p-8 rounded-2xl bg-gradient-to-br from-racing-red/10 to-transparent">
        <h3 className="text-lg md:text-xl font-bold italic uppercase tracking-tight mb-6 flex items-center gap-3">
          <PiggyBank className="w-5 h-5 text-racing-red" /> Maintenance Budget Planner
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="md:col-span-1 p-5 bg-black/40 rounded-xl border border-racing-red/30">
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">Set Aside Monthly</p>
            <p className="text-2xl md:text-3xl font-bold font-mono tracking-tighter">{formatMYR(monthlySetAside)}</p>
          </div>
          {[{ label: 'Next 3 Months', f: f3 }, { label: 'Next 6 Months', f: f6 }, { label: 'Next 12 Months', f: f12 }].map(({ label, f }) => (
            <div key={label} className="p-5 bg-black/40 rounded-xl border border-white/5">
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-xl font-bold font-mono tracking-tighter">{formatMYR(f.total)}</p>
              <p className="text-[10px] font-mono text-gray-600 uppercase">{f.entries.length} scheduled job{f.entries.length === 1 ? '' : 's'}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-400 mb-6 flex gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
          <span>
            Set-aside = (scheduled maintenance expected in the next 12 months {formatMYR(f12.total)} + unplanned repairs in the last 12 months {formatMYR(roundMoney(repairsLast12))}) ÷ 12.
            Saving this each month means routine servicing and surprise repairs are already paid for when they come.
          </span>
        </p>
        {f12.missingCost > 0 && (
          <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-6">
            {f12.missingCost} upcoming schedule item(s) have no estimated cost, so they're not counted. Add costs on each car's schedule.
          </p>
        )}

        <h4 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Upcoming Scheduled Costs</h4>
        <ul className="divide-y divide-white/5">
          {f12.entries.slice(0, 12).map((e, i) => (
            <li key={i} className="flex justify-between gap-4 py-2 text-sm">
              <span className="text-gray-300">{e.itemName} <span className="text-gray-500">· {e.vehicleName}</span></span>
              <span className="font-mono text-gray-400 whitespace-nowrap">{formatDate(e.date)} · {formatMYR(e.cost)}</span>
            </li>
          ))}
          {f12.entries.length === 0 && (
            <li className="text-gray-500 text-sm italic py-2 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Nothing forecast yet. Set up schedules with estimated costs on each car's page.
            </li>
          )}
        </ul>
        <p className="mt-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">Dates for KM-based items are estimates from your average driving.</p>
      </section>
    </div>
  );
}
