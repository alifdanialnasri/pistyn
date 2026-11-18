import { useState } from 'react';
import { Plus, Car } from 'lucide-react';
import { useData } from '../lib/DataContext';
import { formatMileage, getCurrentMileage } from '../lib/utils';
import { isActive, vehicleHealth } from '../lib/maintenance';
import { PageHeader, HeaderButton, EmptyState, StatusBadge, ListGroup, ListRow, Chips } from './ui';
import VehicleForm from './VehicleForm';
import { Vehicle } from '../types';

/** One short status for a car: the worst thing about it */
export function HealthBadge({ vehicle }: { vehicle: Vehicle }) {
  const { services, schedules, issues } = useData();
  const h = vehicleHealth(vehicle, services, schedules, issues);
  if (!isActive(vehicle)) return <StatusBadge status="unknown" label="Sold" />;
  if (h.overdue) return <StatusBadge status="overdue" label={`${h.overdue} overdue`} />;
  if (h.soon) return <StatusBadge status="soon" label={`${h.soon} due`} />;
  if (h.openIssues) return <StatusBadge status="soon" label={`${h.openIssues} issue${h.openIssues > 1 ? 's' : ''}`} />;
  return h.hasSchedule ? <StatusBadge status="ok" label="All good" /> : <StatusBadge status="unknown" label="No reminders" />;
}

export default function Vehicles({ onOpenVehicle }: { onOpenVehicle: (id: string) => void }) {
  const { vehicles, services } = useData();
  const [formOpen, setFormOpen] = useState(false);
  const [show, setShow] = useState<'active' | 'all'>('active');

  const soldCount = vehicles.filter(v => !isActive(v)).length;
  const list = show === 'all' ? vehicles : vehicles.filter(isActive);

  return (
    <div className="space-y-5">
      <PageHeader title="Garage" subtitle={`${vehicles.filter(isActive).length} car${vehicles.filter(isActive).length === 1 ? '' : 's'}`}
        action={<HeaderButton icon={Plus} label="Add car" onClick={() => setFormOpen(true)} />} />

      {soldCount > 0 && (
        <Chips label="Show" value={show} onChange={v => setShow(v as typeof show)}
          options={[{ value: 'active', label: 'My cars' }, { value: 'all', label: `Include sold (${soldCount})` }]} />
      )}

      {list.length > 0 && (
        <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(vehicle => (
            <button
              key={vehicle.id}
              onClick={() => onOpenVehicle(vehicle.id)}
              className={`relative overflow-hidden text-left rounded-3xl border border-white/5 bg-gradient-to-br from-surface-light via-surface-dark to-black p-5 hover:border-white/15 transition-colors ${isActive(vehicle) ? '' : 'opacity-50'}`}
            >
              <Car className="absolute -right-6 -bottom-8 w-40 h-40 text-white/[0.04] pointer-events-none" strokeWidth={1} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold italic uppercase tracking-tighter leading-tight line-clamp-2">{vehicle.name}</p>
                  <p className="text-[11px] font-mono text-racing-red font-bold tracking-widest">{vehicle.plateNumber}</p>
                </div>
                <HealthBadge vehicle={vehicle} />
              </div>
              <p className="relative mt-8 text-[11px] text-gray-500 uppercase tracking-widest">Odometer</p>
              <p className="relative text-2xl font-bold font-mono tracking-tighter">{formatMileage(getCurrentMileage(vehicle, services))}</p>
            </button>
          ))}
          <button onClick={() => setFormOpen(true)}
            className="rounded-3xl border border-dashed border-white/10 p-5 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-white hover:border-white/20 transition-colors min-h-[160px]">
            <Plus className="w-6 h-6" /> Add a car
          </button>
        </div>
      )}

      {list.length > 0 ? (
        <div className="lg:hidden"><ListGroup>
          {list.map(vehicle => (
            <ListRow
              key={vehicle.id}
              icon={Car}
              tone={isActive(vehicle) ? 'red' : 'gray'}
              title={vehicle.name}
              subtitle={`${vehicle.plateNumber} · ${formatMileage(getCurrentMileage(vehicle, services)).toLowerCase()}`}
              trailing={<HealthBadge vehicle={vehicle} />}
              onClick={() => onOpenVehicle(vehicle.id)}
              muted={!isActive(vehicle)}
            />
          ))}
        </ListGroup></div>
      ) : (
        <EmptyState icon={Car} text="Your garage is empty.">
          <button onClick={() => setFormOpen(true)} className="racing-button">Add your first car</button>
        </EmptyState>
      )}

      <VehicleForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={onOpenVehicle} />
    </div>
  );
}
