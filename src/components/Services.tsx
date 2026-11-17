import { useState } from 'react';
import { Plus, Wrench, Search, Filter, Gauge, MapPin, Paperclip, Trash2, Pencil, Phone, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { ServiceRecord } from '../types';
import { formatAmount, formatMYR, formatDate, getAttachments, errorMessage } from '../lib/utils';
import { SERVICE_TYPES, serviceTypeLabel } from '../lib/maintenance';
import { PageHeader, EmptyState, ConfirmDialog } from './ui';
import ServiceForm from './ServiceForm';

export function ServiceCard({ service, onEdit, onDelete, showVehicle = true, index = 0 }: {
  service: ServiceRecord;
  onEdit: () => void;
  onDelete: () => void;
  showVehicle?: boolean;
  index?: number;
}) {
  const { vehicles, parts, schedules } = useData();
  const vehicle = vehicles.find(v => v.id === service.vehicleId);
  const workDone = (service.scheduleIds ?? []).map(id => schedules.find(s => s.id === id)?.name).filter(Boolean);
  const files = getAttachments(service);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.05 }}
      className="racing-panel p-4 md:p-6 rounded-2xl flex flex-col md:flex-row gap-4 md:gap-6 group hover:border-white/20 transition-all"
    >
      <div className="md:w-48 flex-shrink-0 flex justify-between md:block">
        <div className="font-mono text-lg md:text-xl font-bold text-racing-red mb-1">{formatDate(service.date)}</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 text-[10px] md:text-xs font-mono uppercase tracking-widest">
            <Gauge className="w-3 h-3" />
            {service.mileage.toLocaleString('en-MY')} KM
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={onEdit} aria-label="Edit service" className="text-gray-600 hover:text-white transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onDelete} aria-label="Delete service" className="text-gray-600 hover:text-racing-red transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-bold text-gray-500 mb-1 block uppercase tracking-widest">
              {showVehicle && `${vehicle?.name || 'Unknown Vehicle'} · `}{serviceTypeLabel(service.serviceType)}
            </span>
            <h3 className="text-lg md:text-xl font-bold italic uppercase tracking-tight leading-tight break-words">{service.description}</h3>
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono tracking-tighter text-green-500 whitespace-nowrap">
            <span className="text-[10px] md:text-xs font-normal mr-1">RM</span>
            {formatAmount(service.cost)}
          </div>
        </div>

        {workDone.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {workDone.map((name, i) => (
              <span key={`${name}-${i}`} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-gray-300 uppercase">{name}</span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-600" />
            {service.workshop || 'Owner Maintenance'}{service.workshopLocation && `, ${service.workshopLocation}`}
          </div>
          {service.workshopPhone && (
            <a href={`tel:${service.workshopPhone}`} className="flex items-center gap-2 hover:text-white">
              <Phone className="w-4 h-4 text-gray-600" /> {service.workshopPhone}
            </a>
          )}
          {service.invoiceNumber && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <FileText className="w-4 h-4 text-gray-600" /> INV {service.invoiceNumber}
            </div>
          )}
          {files.map((f, i) => (
            <a key={`${f.url}-${i}`} href={f.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-racing-red transition-colors text-xs font-mono uppercase">
              <Paperclip className="w-3 h-3" /> {files.length === 1 ? 'View Receipt' : f.name}
            </a>
          ))}
        </div>

        {service.lineItems && service.lineItems.length > 0 && (
          <table className="w-full text-xs font-mono">
            <tbody>
              {service.lineItems.map((l, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="py-1.5 pr-2 text-gray-300">
                    {l.description}
                    {l.warrantyUntil && <span className="ml-2 text-[10px] text-gray-500 uppercase">Warranty to {formatDate(l.warrantyUntil)}</span>}
                  </td>
                  <td className="py-1.5 px-2 text-gray-500 uppercase whitespace-nowrap">{l.kind}</td>
                  <td className="py-1.5 px-2 text-gray-500 whitespace-nowrap">× {l.quantity}</td>
                  <td className="py-1.5 pl-2 text-right text-gray-300 whitespace-nowrap">{formatMYR(l.quantity * l.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {service.notes && (
          <p className="text-gray-500 text-sm bg-black/40 p-3 rounded-lg border border-white/5 italic">"{service.notes}"</p>
        )}

        {service.partIds && service.partIds.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {service.partIds.map(pId => {
              const part = parts.find(p => p.id === pId);
              return part ? (
                <span key={pId} className="px-2 py-0.5 bg-racing-red/10 border border-racing-red/20 rounded text-[10px] font-mono text-racing-red uppercase">
                  {part.name}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Shared edit/delete handling for any list of service cards
export function useServiceActions() {
  const { reload } = useData();
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ServiceRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openForm = (service?: ServiceRecord) => {
    setEditing(service ?? null);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await DataService.remove([{ col: 'services', id: toDelete.id }]);
      await reload();
      setToDelete(null);
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const dialogs = (defaultVehicleId?: string) => (
    <>
      <ServiceForm open={formOpen} onClose={() => setFormOpen(false)} service={editing} defaultVehicleId={defaultVehicleId} />
      <ConfirmDialog
        open={!!toDelete}
        title="Confirm Erasure"
        message="This action will permanently delete this service log from the records."
        confirmLabel="Confirm Delete"
        onConfirm={confirmDelete}
        onCancel={() => { setToDelete(null); setDeleteError(null); }}
        busy={busy}
        error={deleteError}
      />
    </>
  );

  return { openForm, askDelete: setToDelete, dialogs };
}

export default function Services() {
  const { services, vehicles } = useData();
  const { openForm, askDelete, dialogs } = useServiceActions();
  const [search, setSearch] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterType, setFilterType] = useState('');

  const term = search.toLowerCase();
  const filteredServices = services.filter(s => {
    const matchesSearch = !term ||
      s.description.toLowerCase().includes(term) ||
      (s.workshop || '').toLowerCase().includes(term) ||
      (s.invoiceNumber || '').toLowerCase().includes(term) ||
      (s.notes || '').toLowerCase().includes(term);
    const matchesVehicle = !filterVehicle || s.vehicleId === filterVehicle;
    const matchesType = !filterType || (filterType === 'none' ? !s.serviceType : s.serviceType === filterType);
    return matchesSearch && matchesVehicle && matchesType;
  });

  const selectClass = 'bg-surface-dark border border-white/5 rounded-xl pl-12 pr-10 py-3 appearance-none focus:outline-none focus:border-racing-red transition-colors w-full md:min-w-[200px]';

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Maintenance"
        title="Service Logs"
        action={
          <button onClick={() => openForm()} className="racing-button flex items-center gap-2 text-xs md:text-sm w-full md:w-auto justify-center">
            <Plus className="w-4 h-4" />
            Log Service
          </button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            aria-label="Search services"
            placeholder="Search descriptions, workshops, invoices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-dark border border-white/5 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-racing-red transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select aria-label="Filter by vehicle" value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)} className={selectClass}>
            <option value="">All Vehicles</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="relative">
          <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select aria-label="Filter by type" value={filterType} onChange={e => setFilterType(e.target.value)} className={selectClass}>
            <option value="">All Types</option>
            {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            <option value="none">Uncategorised</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredServices.map((service, i) => (
          <ServiceCard key={service.id} service={service} index={i} onEdit={() => openForm(service)} onDelete={() => askDelete(service)} />
        ))}
        {filteredServices.length === 0 && <EmptyState icon={Wrench} text="No maintenance logs matching your path" />}
      </div>

      {dialogs()}
    </div>
  );
}
