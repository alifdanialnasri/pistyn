import { useState } from 'react';
import { Plus, Wrench, Search, Paperclip, Trash2, Pencil, Phone, Hammer, Sparkles, ClipboardCheck, CircleDot, ShieldCheck } from 'lucide-react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { ServiceRecord, ServiceType } from '../types';
import { formatMYR, formatDate, formatKm, getAttachments, errorMessage, parseDate } from '../lib/utils';
import { SERVICE_TYPES, serviceTypeLabel } from '../lib/maintenance';
import {
  PageHeader, HeaderButton, EmptyState, ConfirmDialog, Modal, ListGroup, ListRow, InfoRow, SectionTitle, Chips, Tone, inputClass,
  SplitView, DetailPanel, useIsDesktop
} from './ui';
import ServiceForm from './ServiceForm';

const typeIcon: Record<ServiceType, { icon: typeof Wrench; tone: Tone }> = {
  maintenance: { icon: Wrench, tone: 'blue' },
  repair: { icon: Hammer, tone: 'red' },
  upgrade: { icon: Sparkles, tone: 'green' },
  inspection: { icon: ClipboardCheck, tone: 'amber' },
  other: { icon: CircleDot, tone: 'gray' },
};

export const serviceIcon = (s: ServiceRecord) => typeIcon[s.serviceType ?? 'other'] ?? typeIcon.other;

export function ServiceRow({ service, onOpen, showVehicle = true, selected }: { service: ServiceRecord; onOpen: () => void; showVehicle?: boolean; selected?: boolean }) {
  const { vehicles } = useData();
  const vehicle = vehicles.find(v => v.id === service.vehicleId);
  const { icon, tone } = serviceIcon(service);
  return (
    <ListRow
      icon={icon}
      tone={tone}
      title={service.description}
      subtitle={[showVehicle && vehicle?.name, formatDate(service.date), formatKm(service.mileage).toLowerCase()].filter(Boolean).join(' · ')}
      trailing={<span className="font-mono text-sm">{formatMYR(service.cost)}</span>}
      onClick={onOpen}
      chevron={false}
      selected={selected}
    />
  );
}

/** Everything about one service, with edit/delete; shown in a sheet or the desktop panel */
export function ServiceDetails({ service: s, onEdit, onDelete }: {
  service: ServiceRecord;
  onEdit: (s: ServiceRecord) => void;
  onDelete: (s: ServiceRecord) => void;
}) {
  const { vehicles, parts, schedules } = useData();
  const vehicle = vehicles.find(v => v.id === s.vehicleId);
  const workDone = (s.scheduleIds ?? []).map(id => schedules.find(x => x.id === id)?.name).filter(Boolean);
  const usedParts = (s.partIds ?? []).map(id => parts.find(p => p.id === id)?.name).filter(Boolean);
  const files = getAttachments(s);

  return (
        <div className="space-y-5">
          <div className="text-center py-2">
            <p className="text-4xl font-bold font-mono tracking-tight">{formatMYR(s.cost)}</p>
            <p className="text-sm text-gray-500 mt-1">{serviceTypeLabel(s.serviceType)}</p>
          </div>

          <ListGroup>
            <InfoRow label="Car" value={vehicle?.name ?? '—'} />
            <InfoRow label="Date" value={formatDate(s.date)} />
            <InfoRow label="Odometer" value={<span className="font-mono">{formatKm(s.mileage)}</span>} />
            <InfoRow label="Workshop" value={s.workshop || 'Did it myself'} />
            {s.workshopLocation && <InfoRow label="Location" value={s.workshopLocation} />}
            {s.invoiceNumber && <InfoRow label="Invoice" value={<span className="font-mono">{s.invoiceNumber}</span>} />}
          </ListGroup>

          {workDone.length > 0 && (
            <div>
              <SectionTitle>Work done</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {workDone.map((n, i) => <span key={`${n}-${i}`} className="px-3 py-1.5 rounded-full bg-white/5 text-sm">{n}</span>)}
              </div>
            </div>
          )}

          {s.lineItems && s.lineItems.length > 0 && (
            <div>
              <SectionTitle>Cost breakdown</SectionTitle>
              <ListGroup>
                {s.lineItems.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{l.description}</span>
                      <span className="block text-xs text-gray-500">
                        {l.kind === 'labour' ? 'Labour' : l.kind === 'part' ? 'Part' : 'Other'} × {l.quantity}
                        {l.warrantyUntil && <> · <ShieldCheck className="inline w-3 h-3 -mt-0.5" /> to {formatDate(l.warrantyUntil)}</>}
                      </span>
                    </span>
                    <span className="font-mono text-sm">{formatMYR(l.quantity * l.unitPrice)}</span>
                  </div>
                ))}
              </ListGroup>
            </div>
          )}

          {usedParts.length > 0 && (
            <div>
              <SectionTitle>Parts used</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {usedParts.map((n, i) => <span key={`${n}-${i}`} className="px-3 py-1.5 rounded-full bg-racing-red/10 text-racing-red text-sm">{n}</span>)}
              </div>
            </div>
          )}

          {s.notes && <p className="text-gray-300 bg-white/5 rounded-2xl p-4">{s.notes}</p>}

          {(files.length > 0 || s.workshopPhone) && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <a key={`${f.url}-${i}`} href={f.url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2 text-sm py-2.5">
                  <Paperclip className="w-4 h-4" /> {files.length === 1 ? 'Receipt' : f.name}
                </a>
              ))}
              {s.workshopPhone && (
                <a href={`tel:${s.workshopPhone}`} className="btn-secondary flex items-center gap-2 text-sm py-2.5">
                  <Phone className="w-4 h-4" /> Call workshop
                </a>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={() => onDelete(s)} className="btn-secondary flex items-center justify-center gap-2 text-racing-red">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button onClick={() => onEdit(s)} className="racing-button flex items-center justify-center gap-2">
              <Pencil className="w-4 h-4" /> Edit
            </button>
          </div>
        </div>
  );
}

function ServiceSheet({ service, onClose, onEdit, onDelete }: {
  service: ServiceRecord | null;
  onClose: () => void;
  onEdit: (s: ServiceRecord) => void;
  onDelete: (s: ServiceRecord) => void;
}) {
  return (
    <Modal open={!!service} onClose={onClose} title={service?.description ?? ''}>
      {service && <ServiceDetails service={service} onEdit={onEdit} onDelete={onDelete} />}
    </Modal>
  );
}

// Shared open/edit/delete handling for any list of services
export function useServiceActions() {
  const { reload } = useData();
  const [viewing, setViewing] = useState<ServiceRecord | null>(null);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [scheduleId, setScheduleId] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ServiceRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openForm = (service?: ServiceRecord, forScheduleId?: string) => {
    setViewing(null);
    setEditing(service ?? null);
    setScheduleId(forScheduleId);
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
      <ServiceSheet
        service={viewing}
        onClose={() => setViewing(null)}
        onEdit={s => openForm(s)}
        onDelete={s => { setViewing(null); setToDelete(s); }}
      />
      <ServiceForm open={formOpen} onClose={() => setFormOpen(false)} service={editing} defaultVehicleId={defaultVehicleId} defaultScheduleId={scheduleId} />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete this service?"
        message="It will be removed from this car's history."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => { setToDelete(null); setDeleteError(null); }}
        busy={busy}
        error={deleteError}
      />
    </>
  );

  return { openForm, open: setViewing, askDelete: setToDelete, dialogs };
}

const monthKey = (s: ServiceRecord) => {
  const d = parseDate(s.date);
  return d ? d.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' }) : 'No date';
};

export default function Services() {
  const { services, vehicles } = useData();
  const { openForm, open, askDelete, dialogs } = useServiceActions();
  const desktop = useIsDesktop();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterType, setFilterType] = useState('');

  const term = search.toLowerCase();
  const filtered = services
    .filter(s => {
      const matchesSearch = !term ||
        s.description.toLowerCase().includes(term) ||
        (s.workshop || '').toLowerCase().includes(term) ||
        (s.invoiceNumber || '').toLowerCase().includes(term) ||
        (s.notes || '').toLowerCase().includes(term);
      const matchesVehicle = !filterVehicle || s.vehicleId === filterVehicle;
      const matchesType = !filterType || (filterType === 'none' ? !s.serviceType : s.serviceType === filterType);
      return matchesSearch && matchesVehicle && matchesType;
    })
    .sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0));

  const groups: { month: string; items: ServiceRecord[] }[] = [];
  filtered.forEach(s => {
    const month = monthKey(s);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.items.push(s);
    else groups.push({ month, items: [s] });
  });

  // Desktop shows the chosen (or newest) service beside the list
  const selected = filtered.find(s => s.id === selectedId) ?? filtered[0];
  const show = (s: ServiceRecord) => desktop ? setSelectedId(s.id) : open(s);

  return (
    <div className="space-y-5">
      <PageHeader title="History" subtitle={`${services.length} service${services.length === 1 ? '' : 's'} logged`}
        action={<HeaderButton icon={Plus} label="Log" onClick={() => openForm()} />} />

      <SplitView
        placeholder="Pick a service to see the details."
        detail={selected && (
          <DetailPanel title={selected.description}>
            <ServiceDetails service={selected} onEdit={s => openForm(s)} onDelete={askDelete} />
          </DetailPanel>
        )}
        list={<>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="search"
          aria-label="Search services"
          placeholder="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`${inputClass} pl-11`}
        />
      </div>

      {vehicles.length > 1 && (
        <Chips label="Car" value={filterVehicle} onChange={setFilterVehicle}
          options={[{ value: '', label: 'All cars' }, ...vehicles.map(v => ({ value: v.id, label: v.name }))]} />
      )}
      <Chips label="Type" value={filterType} onChange={setFilterType}
        options={[{ value: '', label: 'All types' }, ...SERVICE_TYPES.map(t => ({ value: t.value, label: t.label }))]} />

      {groups.map(g => (
        <section key={g.month}>
          <SectionTitle>{g.month}</SectionTitle>
          <ListGroup>
            {g.items.map(s => <ServiceRow key={s.id} service={s} onOpen={() => show(s)} selected={desktop && s.id === selected?.id} showVehicle={!filterVehicle && vehicles.length > 1} />)}
          </ListGroup>
        </section>
      ))}
      {filtered.length === 0 && (
        <EmptyState icon={Wrench} text={services.length ? 'Nothing matches your search.' : 'No services logged yet.'}>
          {!services.length && <button onClick={() => openForm()} className="racing-button">Log your first service</button>}
        </EmptyState>
      )}
        </>}
      />

      {dialogs()}
    </div>
  );
}
