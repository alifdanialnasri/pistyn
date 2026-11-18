import { useState, useMemo } from 'react';
import { PiggyBank, CalendarClock, Car } from 'lucide-react';
import { useData } from '../lib/DataContext';
import { formatMYR, formatKm, formatDate, getCurrentMileage, parseDate, addMonths, startOfToday, roundMoney } from '../lib/utils';
import { serviceTypeLabel, forecast } from '../lib/maintenance';
import { PageHeader, Chips, Card, SectionTitle, ListGroup, ListRow } from './ui';
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
  const byVehicle = sumBy(inPeriod, s => vehicles.find(v => v.id === s.vehicleId)?.name ?? 'Unknown car', s => s.cost);
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

  return (
    <div className="max-w-2xl lg:max-w-none mx-auto space-y-5">
      <PageHeader title="Costs" subtitle="What your cars really cost" />

      {vehicles.length > 1 && (
        <Chips label="Car" value={vehicleId} onChange={setVehicleId}
          options={[{ value: '', label: 'All cars' }, ...vehicles.map(v => ({ value: v.id, label: v.name }))]} />
      )}
      <Chips label="Period" value={year} onChange={setYear}
        options={[...years.map(y => ({ value: String(y), label: String(y) })), { value: 'all', label: 'All time' }]} />

      <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
      <div className="space-y-5">
      <Card className="p-5">
        <p className="text-[11px] text-gray-500 uppercase tracking-widest">{year === 'all' ? 'Spent, all time' : `Spent in ${year}`}</p>
        <p className="text-4xl font-bold font-mono tracking-tight">{formatMYR(total)}</p>
        <p className="text-sm text-gray-400 mt-1">
          {formatMYR(roundMoney(total / monthsInPeriod))} a month · {inPeriod.length} service{inPeriod.length === 1 ? '' : 's'}
          {repairs > 0 && <> · <span className="text-racing-red">{formatMYR(repairs)} repairs</span></>}
        </p>
        <div className="mt-5">
          <ColumnChart data={chartData} label={year === 'all' ? 'Spending by year' : `Monthly spending in ${year}`} />
        </div>
      </Card>

      <Card className="p-5 bg-gradient-to-br from-racing-red/20 via-surface-dark to-surface-dark border-racing-red/20">
        <div className="flex items-center gap-2 text-racing-red">
          <PiggyBank className="w-5 h-5" />
          <p className="text-[11px] font-semibold uppercase tracking-widest">Put aside each month</p>
        </div>
        <p className="text-4xl font-bold font-mono tracking-tight mt-1">{formatMYR(monthlySetAside)}</p>
        <p className="text-sm text-gray-400 mt-1">Covers upcoming servicing and surprise repairs.</p>
        <div className="grid grid-cols-3 gap-2 mt-5">
          {[{ label: '3 months', f: f3 }, { label: '6 months', f: f6 }, { label: '12 months', f: f12 }].map(({ label, f }) => (
            <div key={label} className="bg-black/30 rounded-2xl p-3">
              <p className="text-xs text-gray-500">Next {label}</p>
              <p className="font-bold font-mono text-sm sm:text-base truncate">{formatMYR(f.total)}</p>
            </div>
          ))}
        </div>
        <details className="mt-4 text-sm text-gray-500">
          <summary className="cursor-pointer select-none text-gray-400">How is this worked out?</summary>
          <p className="mt-2">
            Servicing expected in the next 12 months ({formatMYR(f12.total)}) plus repairs in the last 12 months ({formatMYR(roundMoney(repairsLast12))}), divided by 12.
            {f12.missingCost > 0 && ` ${f12.missingCost} reminder${f12.missingCost === 1 ? ' has' : 's have'} no usual cost, so ${f12.missingCost === 1 ? "it isn't" : "they aren't"} counted.`}
          </p>
        </details>
      </Card>

      </div>

      <div className="space-y-5">
      <section>
        <SectionTitle>Coming up</SectionTitle>
        {f12.entries.length > 0 ? (
          <ListGroup>
            {f12.entries.slice(0, 5).map((e, i) => (
              <ListRow key={i} icon={CalendarClock} tone="amber" title={e.itemName}
                subtitle={[!vehicleId && vehicles.length > 1 && e.vehicleName, formatDate(e.date)].filter(Boolean).join(' · ')}
                trailing={<span className="font-mono text-sm">{formatMYR(e.cost)}</span>} />
            ))}
          </ListGroup>
        ) : (
          <Card className="px-4 py-3.5 text-gray-400 text-sm">Add a usual cost to each car's reminders to see what's coming.</Card>
        )}
      </section>

      <section>
        <SectionTitle>Where it goes</SectionTitle>
        <Card className="p-5 space-y-6">
          <BarList rows={byType} empty="No spending in this period." />
          {!vehicleId && vehicles.length > 1 && byVehicle.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-400 mb-3">By car</p>
              <BarList rows={byVehicle} empty="" />
            </div>
          )}
          {byKind.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-400 mb-3">Parts vs labour</p>
              <BarList rows={byKind} empty="" />
            </div>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Cost per km</SectionTitle>
        <ListGroup>
          {costPerKm.map(({ vehicle, spent, km }) => (
            <ListRow key={vehicle.id} icon={Car} tone="gray" title={vehicle.name}
              subtitle={km > 0 ? `${formatMYR(spent)} over ${formatKm(km).toLowerCase()}` : 'Needs two odometer readings'}
              trailing={<span className="font-mono font-bold">{km > 0 ? `RM ${(spent / km).toFixed(2)}` : '—'}</span>} />
          ))}
        </ListGroup>
      </section>
      </div>
      </div>
    </div>
  );
}
