import { Car, Wrench, AlertTriangle, TrendingUp, Plus, CheckCircle2, ChevronRight, BellRing } from 'lucide-react';
import { motion } from 'motion/react';
import { useData } from '../lib/DataContext';
import { formatMYR, formatMileage, formatDate, getCurrentMileage, parseDate } from '../lib/utils';
import { getAlerts, isActive } from '../lib/maintenance';
import { StatusBadge } from './ui';
import { HealthBadges } from './Vehicles';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenVehicle: (id: string) => void;
}

export default function Dashboard({ setActiveTab, onOpenVehicle }: DashboardProps) {
  const { vehicles, services, parts, schedules, issues } = useData();

  const activeVehicles = vehicles.filter(isActive);
  const thisYear = new Date().getFullYear();
  const spentThisYear = services
    .filter(s => parseDate(s.date)?.getFullYear() === thisYear)
    .reduce((acc, curr) => acc + curr.cost, 0);
  const openIssues = issues.filter(i => i.status === 'open').length;
  const alerts = getAlerts(vehicles, services, schedules, issues);
  const anySchedule = schedules.some(s => activeVehicles.some(v => v.id === s.vehicleId));
  const preferred = parts.filter(p => p.status === 'preferred');

  const stats = [
    { label: 'Vehicles', value: activeVehicles.length, icon: Car, color: 'text-blue-500' },
    { label: 'Services', value: services.length, icon: Wrench, color: 'text-racing-red' },
    { label: `Spent in ${thisYear}`, value: formatMYR(spentThisYear), icon: TrendingUp, color: 'text-green-500' },
    { label: 'Open Issues', value: openIssues, icon: AlertTriangle, color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-[10px] md:text-sm font-mono text-gray-500 uppercase tracking-widest mb-1">Overview</h2>
          <h1 className="text-2xl md:text-4xl font-bold italic tracking-tighter uppercase">Command Center</h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('services')}
            className="racing-button flex items-center gap-2 text-xs md:text-sm w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            New Service
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="racing-panel p-6 rounded-xl group hover:border-racing-red transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="h-1 w-8 bg-white/10 group-hover:bg-racing-red transition-colors"></div>
            </div>
            <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-3xl font-bold font-mono tracking-tighter">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <section className="racing-panel p-6 md:p-8 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold italic uppercase tracking-tight flex items-center gap-3">
            <BellRing className="w-5 h-5 text-racing-red" /> Attention Needed
          </h3>
          {alerts.length > 0 && <span className="text-xs font-mono text-gray-500 uppercase">{alerts.length} item{alerts.length > 1 ? 's' : ''}</span>}
        </div>
        {alerts.length > 0 ? (
          <ul className="divide-y divide-white/5">
            {alerts.slice(0, 8).map(alert => (
              <li key={alert.key}>
                <button onClick={() => onOpenVehicle(alert.vehicleId)} className="w-full flex items-center gap-4 py-3 text-left group">
                  <StatusBadge status={alert.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{alert.title}</p>
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest truncate">{alert.vehicleName} · {alert.detail}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white shrink-0" />
                </button>
              </li>
            ))}
            {alerts.length > 8 && <li className="pt-3 text-xs font-mono text-gray-500 uppercase">+ {alerts.length - 8} more on each car's page</li>}
          </ul>
        ) : anySchedule ? (
          <p className="flex items-center gap-3 text-green-500 text-sm"><CheckCircle2 className="w-5 h-5" /> All caught up. Nothing due in the next 30 days or 1,000 km.</p>
        ) : (
          <div className="text-sm text-gray-400">
            <p className="mb-3">Set up a maintenance schedule for each car to see what's due here before it's missed.</p>
            <button onClick={() => setActiveTab('vehicles')} className="text-racing-red text-xs font-mono uppercase tracking-widest hover:underline">Go to Garage →</button>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="racing-panel p-8 rounded-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold italic uppercase tracking-tight">Recent Maintenance Activity</h3>
              <button
                onClick={() => setActiveTab('services')}
                className="text-gray-500 hover:text-white text-xs font-mono uppercase transition-colors"
              >
                View All History →
              </button>
            </div>

            <div className="space-y-6">
              {services.slice(0, 5).map((service, i) => (
                <div key={service.id} className="flex gap-6 group">
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full border-2 border-racing-red bg-black group-hover:bg-racing-red transition-colors z-10"></div>
                    {i !== services.slice(0, 5).length - 1 && <div className="w-0.5 flex-1 bg-white/5 my-1"></div>}
                  </div>
                  <div className="flex-1 pb-6 border-b border-white/5 group-last:border-none min-w-0">
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <h4 className="font-bold text-lg break-words">{service.description}</h4>
                      <span className="font-mono text-xs text-gray-500 uppercase whitespace-nowrap">{formatDate(service.date)}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">
                      {vehicles.find(v => v.id === service.vehicleId)?.name ?? 'Unknown Vehicle'} · {service.workshop || 'Self-service'}
                    </p>
                    <div className="flex gap-4">
                      <div className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-mono text-gray-500 uppercase tracking-widest">{service.mileage.toLocaleString('en-MY')} KM</div>
                      <div className="px-2 py-0.5 bg-green-500/10 rounded text-[10px] font-mono text-green-500 uppercase tracking-widest">{formatMYR(service.cost)}</div>
                    </div>
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                  <Wrench className="w-12 h-12 text-white/5 mx-auto mb-4" />
                  <p className="text-gray-500 uppercase tracking-widest text-sm">No maintenance records found</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="racing-panel p-8 rounded-2xl">
            <h3 className="text-xl font-bold italic uppercase tracking-tight mb-6">Fleet Summary</h3>
            <div className="space-y-4">
              {activeVehicles.map(vehicle => (
                <button
                  key={vehicle.id}
                  onClick={() => onOpenVehicle(vehicle.id)}
                  className="w-full text-left p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold">{vehicle.name}</h4>
                    <Car className="w-4 h-4 text-gray-500 group-hover:text-racing-red transition-colors" />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-black text-[10px] font-mono text-racing-red font-bold rounded border border-racing-red/20">{vehicle.plateNumber}</span>
                    <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-mono text-gray-500 uppercase tracking-widest">{formatMileage(getCurrentMileage(vehicle, services))}</span>
                  </div>
                  <div className="flex justify-start"><HealthBadges vehicle={vehicle} /></div>
                </button>
              ))}
              {activeVehicles.length === 0 && (
                <p className="text-gray-500 text-sm italic">No vehicles registered yet.</p>
              )}
            </div>
          </section>

          <section className="racing-panel p-8 rounded-2xl bg-gradient-to-br from-racing-red/10 to-transparent">
            <h3 className="text-xl font-bold italic uppercase tracking-tight mb-4">Critical Spares</h3>
            <div className="space-y-4">
              {preferred.slice(0, 3).map(part => (
                <div key={part.id} className="flex justify-between items-center gap-3">
                  <span className="text-sm">{part.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-green-500 text-white rounded-full">PREFERRED</span>
                </div>
              ))}
              {preferred.length === 0 && (
                <p className="text-gray-500 text-sm italic">{parts.length === 0 ? 'No spare parts in library.' : 'No parts marked as preferred yet.'}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
