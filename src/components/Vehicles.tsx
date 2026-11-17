import { useState } from 'react';
import { Plus, Car, Gauge, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useData } from '../lib/DataContext';
import { formatMileage, getCurrentMileage } from '../lib/utils';
import { isActive, vehicleHealth } from '../lib/maintenance';
import { PageHeader, EmptyState, StatusBadge } from './ui';
import VehicleForm from './VehicleForm';
import { Vehicle } from '../types';

export function HealthBadges({ vehicle }: { vehicle: Vehicle }) {
  const { services, schedules, issues } = useData();
  const h = vehicleHealth(vehicle, services, schedules, issues);
  if (!isActive(vehicle)) return <StatusBadge status="unknown" label="Sold" />;
  return (
    <div className="flex flex-wrap gap-1.5 justify-end">
      {h.overdue > 0 && <StatusBadge status="overdue" label={`${h.overdue} overdue`} />}
      {h.soon > 0 && <StatusBadge status="soon" label={`${h.soon} due soon`} />}
      {h.openIssues > 0 && <StatusBadge status="soon" label={`${h.openIssues} issue${h.openIssues > 1 ? 's' : ''}`} />}
      {h.overdue === 0 && h.soon === 0 && h.openIssues === 0 && (
        h.hasSchedule ? <StatusBadge status="ok" label="All good" /> : <StatusBadge status="unknown" label="No schedule" />
      )}
    </div>
  );
}

export default function Vehicles({ onOpenVehicle }: { onOpenVehicle: (id: string) => void }) {
  const { vehicles, services } = useData();
  const [formOpen, setFormOpen] = useState(false);
  const [showSold, setShowSold] = useState(false);

  const soldCount = vehicles.filter(v => !isActive(v)).length;
  const list = showSold ? vehicles : vehicles.filter(isActive);

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Fleet"
        title="Garage"
        action={
          <button onClick={() => setFormOpen(true)} className="racing-button flex items-center gap-2 text-xs md:text-sm w-full md:w-auto justify-center">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        }
      />

      {soldCount > 0 && (
        <label className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-gray-500 cursor-pointer w-fit">
          <input type="checkbox" checked={showSold} onChange={e => setShowSold(e.target.checked)} className="accent-racing-red" />
          Show sold vehicles ({soldCount})
        </label>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((vehicle, i) => (
          <motion.button
            type="button"
            key={vehicle.id}
            onClick={() => onOpenVehicle(vehicle.id)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`racing-panel p-8 rounded-2xl group border-l-4 text-left hover:border-white/20 transition-colors ${isActive(vehicle) ? 'border-l-racing-red' : 'border-l-gray-600 opacity-70'}`}
          >
            <div className="flex justify-between items-start gap-4 mb-6">
              <div className="p-3 bg-white/5 rounded-xl text-racing-red">
                <Car className="w-8 h-8" />
              </div>
              <HealthBadges vehicle={vehicle} />
            </div>

            <h3 className="text-2xl font-bold mb-2 uppercase tracking-tight">{vehicle.name}</h3>
            <span className="inline-block px-3 py-1 bg-black text-racing-red font-mono font-bold rounded border border-racing-red/20 mb-4 text-sm">
              {vehicle.plateNumber}
            </span>

            <div className="flex items-center gap-2 text-gray-400 text-sm font-mono uppercase tracking-widest mb-6">
              <Gauge className="w-4 h-4 text-gray-600" />
              {formatMileage(getCurrentMileage(vehicle, services))}
            </div>

            {vehicle.notes && (
              <p className="text-gray-500 text-sm line-clamp-2 italic mb-4">"{vehicle.notes}"</p>
            )}

            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">
              Open logbook
              <ChevronRight className="w-4 h-4" />
            </div>
          </motion.button>
        ))}
        {list.length === 0 && <EmptyState icon={Car} text="No vehicles in your garage" />}
      </div>

      <VehicleForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={onOpenVehicle} />
    </div>
  );
}
