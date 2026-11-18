import { useState } from 'react';
import { Car, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Clock, Wallet, Wrench, Plus, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../lib/DataContext';
import { formatMYR, formatMileage, getCurrentMileage, parseDate, startOfToday, daysBetween } from '../lib/utils';
import { getAlerts, getScheduleState, describeDue, isActive, Alert } from '../lib/maintenance';
import { ServiceRecord } from '../types';
import { StatTile, SectionTitle, TextButton, ListGroup, ListRow, PageHeader } from './ui';
import { ServiceRow } from './Services';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenVehicle: (id: string) => void;
  onLogService: (vehicleId?: string, scheduleId?: string) => void;
}

function timeAgo(date?: string) {
  const d = parseDate(date);
  if (!d) return '—';
  const days = daysBetween(d, startOfToday());
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months < 12 ? `${months} mo ago` : `${Math.round(months / 12)} yr ago`;
}

const latest = (list: ServiceRecord[]) =>
  [...list].sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0))[0];

export default function Dashboard({ setActiveTab, onOpenVehicle, onLogService }: DashboardProps) {
  const { vehicles, services, schedules, issues } = useData();
  const cars = vehicles.filter(isActive);
  const alerts = getAlerts(vehicles, services, schedules, issues);

  // Open on the car that needs attention most
  const [carId, setCarId] = useState<string | undefined>(() => alerts[0]?.vehicleId ?? cars[0]?.id);
  const index = Math.max(0, cars.findIndex(c => c.id === carId));
  const car = cars[index];

  if (!car) {
    return (
      <div className="max-w-xl mx-auto pt-6 text-center">
        <div className="racing-panel rounded-3xl p-10">
          <Car className="w-16 h-16 text-racing-red mx-auto mb-6" />
          <h1 className="text-2xl font-bold italic uppercase tracking-tighter mb-2">Add your first car</h1>
          <p className="text-gray-400 mb-8">Pistyn tells you what it needs, and when.</p>
          <button onClick={() => setActiveTab('vehicles')} className="racing-button inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add car
          </button>
        </div>
      </div>
    );
  }

  const go = (step: number) => setCarId(cars[(index + step + cars.length) % cars.length].id);

  const carAlerts = alerts.filter(a => a.vehicleId === car.id);
  const next: Alert | undefined = carAlerts[0];
  const upcoming = schedules
    .filter(s => s.vehicleId === car.id)
    .map(s => getScheduleState(s, car, services))
    .filter(s => s.status === 'ok' && s.estimatedDate)
    .sort((a, b) => a.estimatedDate!.localeCompare(b.estimatedDate!))[0];

  const carServices = services.filter(s => s.vehicleId === car.id);
  const thisYear = new Date().getFullYear();
  const spent = carServices
    .filter(s => parseDate(s.date)?.getFullYear() === thisYear)
    .reduce((sum, s) => sum + s.cost, 0);
  const last = latest(carServices);
  const overdue = carAlerts.filter(a => a.status === 'overdue').length;

  const recent = [...carServices].sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0)).slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-xl lg:max-w-none mx-auto">
      {/* Desktop only: the sidebar has no page title, so greet here */}
      <div className="hidden lg:block mb-6">
        <PageHeader title={greeting} subtitle={`${cars.length} car${cars.length === 1 ? '' : 's'} · ${alerts.length ? `${alerts.length} thing${alerts.length === 1 ? '' : 's'} need attention` : 'everything on track'}`} />
      </div>

      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
      <div className="space-y-4">
      {/* Car switcher */}
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-surface-light via-surface-dark to-black p-5">
        <Car className="absolute -right-6 -bottom-8 w-48 h-48 text-white/[0.04] pointer-events-none" strokeWidth={1} />
        <div className="relative flex items-center gap-3">
          {cars.length > 1 && (
            <button onClick={() => go(-1)} aria-label="Previous car" className="w-10 h-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-gray-400 active:bg-white/10">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.button
              key={car.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={() => onOpenVehicle(car.id)}
              className="flex-1 min-w-0 text-center"
            >
              <p className="text-lg font-bold italic uppercase tracking-tighter leading-tight line-clamp-2 text-balance">{car.name}</p>
              <p className="text-[11px] font-mono text-racing-red font-bold tracking-widest">{car.plateNumber}</p>
            </motion.button>
          </AnimatePresence>
          {cars.length > 1 && (
            <button onClick={() => go(1)} aria-label="Next car" className="w-10 h-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-gray-400 active:bg-white/10">
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="relative mt-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest">Odometer</p>
            <p className="text-3xl font-bold font-mono tracking-tighter">{formatMileage(getCurrentMileage(car, services))}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            overdue ? 'bg-racing-red text-white' : carAlerts.length ? 'bg-amber-400 text-black' : 'bg-green-500/15 text-green-400'
          }`}>
            {overdue ? <AlertTriangle className="w-3.5 h-3.5" /> : carAlerts.length ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {overdue ? `${overdue} overdue` : carAlerts.length ? `${carAlerts.length} due soon` : 'All good'}
          </span>
        </div>

        {cars.length > 1 && (
          <div className="relative mt-4 flex justify-center gap-1.5">
            {cars.map(c => (
              <button
                key={c.id}
                onClick={() => setCarId(c.id)}
                aria-label={`Show ${c.name}`}
                className={`h-1.5 rounded-full transition-all ${c.id === car.id ? 'w-5 bg-racing-red' : 'w-1.5 bg-white/20'}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* The one thing to do next */}
      {next ? (
        <section className={`rounded-3xl p-5 ${next.status === 'overdue' ? 'bg-racing-red text-white' : 'bg-amber-400 text-black'}`}>
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-70">
            {next.status === 'overdue' ? 'Overdue' : 'Due soon'}
          </p>
          <p className="mt-1 text-2xl font-bold leading-tight">{next.title}</p>
          <p className="mt-1 text-sm font-medium opacity-80">{next.detail}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {next.scheduleId ? (
              <button
                onClick={() => onLogService(car.id, next.scheduleId)}
                className={`py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform ${next.status === 'overdue' ? 'bg-white text-racing-red' : 'bg-black text-amber-400'}`}
              >
                Mark as done
              </button>
            ) : (
              <button
                onClick={() => onOpenVehicle(car.id)}
                className={`py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform ${next.status === 'overdue' ? 'bg-white text-racing-red' : 'bg-black text-amber-400'}`}
              >
                Sort it out
              </button>
            )}
            <button
              onClick={() => onOpenVehicle(car.id)}
              className="py-3 rounded-2xl font-bold text-sm bg-black/15 active:scale-[0.97] transition-transform"
            >
              {carAlerts.length > 1 ? `+${carAlerts.length - 1} more` : 'Details'}
            </button>
          </div>
        </section>
      ) : upcoming ? (
        <section className="rounded-3xl p-5 border border-green-500/20 bg-green-500/5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-green-400">Nothing due</p>
          <p className="mt-1 text-lg font-bold">Next: {upcoming.item.name}</p>
          <p className="mt-0.5 text-sm text-gray-400">{describeDue(upcoming)}</p>
        </section>
      ) : (
        <button onClick={() => onOpenVehicle(car.id)} className="w-full text-left rounded-3xl p-5 border border-dashed border-white/15 active:bg-white/5">
          <p className="flex items-center gap-2 font-bold"><CalendarClock className="w-5 h-5 text-racing-red" /> Set up reminders</p>
          <p className="mt-1 text-sm text-gray-400">Tell Pistyn when this car needs servicing.</p>
        </button>
      )}

      {/* At a glance */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Wallet} label={`Spent ${thisYear}`} value={formatMYR(spent)} onClick={() => setActiveTab('expenses')} />
        <StatTile icon={Wrench} label="Last service" value={<span className="font-sans">{timeAgo(last?.date)}</span>} onClick={() => setActiveTab('services')} />
      </div>

      </div>

      <div className="space-y-4 lg:space-y-6">
        {/* Desktop has room for the full to-do list for this car */}
        {carAlerts.length > 1 && (
          <section className="hidden lg:block">
            <SectionTitle>Needs attention</SectionTitle>
            <ListGroup>
              {carAlerts.map(a => (
                <ListRow
                  key={a.key}
                  icon={a.status === 'overdue' ? AlertTriangle : Clock}
                  tone={a.status === 'overdue' ? 'red' : 'amber'}
                  title={a.title}
                  subtitle={a.detail}
                  onClick={() => a.scheduleId ? onLogService(car.id, a.scheduleId) : onOpenVehicle(car.id)}
                  trailing={a.scheduleId ? <span className="text-sm font-medium text-racing-red">Mark done</span> : undefined}
                  chevron={!a.scheduleId}
                />
              ))}
            </ListGroup>
          </section>
        )}

        {last && (
          <section>
            <SectionTitle action={<TextButton onClick={() => setActiveTab('services')}>See all</TextButton>}>
              <span className="lg:hidden">Latest</span><span className="hidden lg:inline">Recent services</span>
            </SectionTitle>
            <ListGroup>
              {recent.map((s, i) => (
                <div key={s.id} className={i > 0 ? 'hidden lg:block' : undefined}>
                  <ServiceRow service={s} onOpen={() => setActiveTab('services')} showVehicle={false} />
                </div>
              ))}
            </ListGroup>
          </section>
        )}
      </div>
      </div>
    </div>
  );
}
