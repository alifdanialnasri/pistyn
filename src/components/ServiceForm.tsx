import { useState, useEffect, useMemo, FormEvent, ChangeEvent } from 'react';
import { Paperclip, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { MAX_UPLOAD_MB } from '../lib/firestoreService';
import { ServiceRecord, ServiceType, LineItemKind, Attachment, LineItem } from '../types';
import { Modal, Label, FormError, inputClass } from './ui';
import { SERVICE_TYPES, isActive } from '../lib/maintenance';
import {
  getCurrentMileage, formatKm, formatMYR, optionalText, optionalNumber, numberInput, todayISO,
  roundMoney, getAttachments, errorMessage
} from '../lib/utils';

interface LineRow { description: string; kind: LineItemKind; quantity: string; unitPrice: string; warrantyUntil: string }

const cellClass = 'w-full min-w-0 bg-black border border-white/10 rounded-lg px-3 py-2 focus:border-racing-red focus:outline-none transition-colors';

const blankLine = (): LineRow => ({ description: '', kind: 'part', quantity: '1', unitPrice: '', warrantyUntil: '' });

const blankForm = (vehicleId = '') => ({
  vehicleId, date: todayISO(), mileage: '', serviceType: 'maintenance' as ServiceType | '', description: '', cost: '',
  workshop: '', workshopPhone: '', workshopLocation: '', invoiceNumber: '', notes: ''
});

export default function ServiceForm({ open, onClose, service, defaultVehicleId }: {
  open: boolean;
  onClose: () => void;
  service?: ServiceRecord | null;
  defaultVehicleId?: string;
}) {
  const { vehicles, services, parts, schedules, reload } = useData();
  const [form, setForm] = useState(blankForm());
  const [scheduleIds, setScheduleIds] = useState<string[]>([]);
  const [partIds, setPartIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setUploading(0);
    if (service) {
      setForm({
        vehicleId: service.vehicleId,
        date: service.date,
        mileage: numberInput(service.mileage),
        serviceType: service.serviceType ?? '',
        description: service.description,
        cost: numberInput(service.cost),
        workshop: service.workshop ?? '',
        workshopPhone: service.workshopPhone ?? '',
        workshopLocation: service.workshopLocation ?? '',
        invoiceNumber: service.invoiceNumber ?? '',
        notes: service.notes ?? ''
      });
      setScheduleIds(service.scheduleIds ?? []);
      setPartIds(service.partIds ?? []);
      setAttachments(getAttachments(service));
      setLines((service.lineItems ?? []).map(l => ({
        description: l.description, kind: l.kind, quantity: numberInput(l.quantity), unitPrice: numberInput(l.unitPrice), warrantyUntil: l.warrantyUntil ?? ''
      })));
    } else {
      setForm(blankForm(defaultVehicleId));
      setScheduleIds([]);
      setPartIds([]);
      setAttachments([]);
      setLines([]);
    }
  }, [open, service, defaultVehicleId]);

  const set = (key: keyof ReturnType<typeof blankForm>) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const vehicle = vehicles.find(v => v.id === form.vehicleId);
  const vehicleOptions = vehicles.filter(v => isActive(v) || v.id === form.vehicleId);
  const vehicleSchedules = schedules.filter(s => s.vehicleId === form.vehicleId);
  const currentMileage = vehicle ? getCurrentMileage(vehicle, services.filter(s => s.id !== service?.id)) : null;

  const workshops = useMemo(() => {
    const seen = new Map<string, ServiceRecord>();
    services.forEach(s => { if (s.workshop && !seen.has(s.workshop)) seen.set(s.workshop, s); });
    return seen;
  }, [services]);

  const lineTotal = roundMoney(lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0));
  const hasLines = lines.length > 0;

  const handleVehicleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setForm(f => ({ ...f, vehicleId: e.target.value }));
    // Schedule items belong to one car, so ticks don't carry over
    setScheduleIds([]);
  };

  const handleWorkshopChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const known = workshops.get(name);
    setForm(f => ({
      ...f,
      workshop: name,
      workshopPhone: f.workshopPhone || known?.workshopPhone || '',
      workshopLocation: f.workshopLocation || known?.workshopLocation || ''
    }));
  };

  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  const updateLine = (index: number, key: keyof LineRow, value: string) =>
    setLines(ls => ls.map((l, i) => i === index ? { ...l, [key]: value } : l));

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (attachments.length + files.length > 20) {
      setError('A service can have up to 20 attachments.');
      return;
    }
    setError(null);
    for (const file of files) {
      setUploading(n => n + 1);
      try {
        const att = await DataService.uploadFile(file);
        // Functional update so edits made while uploading are not lost
        setAttachments(a => [...a, att]);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setUploading(n => n - 1);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const filledLines = lines.filter(l => l.description.trim() || l.unitPrice.trim());
    const lineItems: LineItem[] = [];
    for (const l of filledLines) {
      const quantity = Number(l.quantity);
      const unitPrice = Number(l.unitPrice);
      if (!l.description.trim()) return setError('Each cost line needs a description.');
      if (!(quantity > 0) || !Number.isFinite(unitPrice) || unitPrice < 0 || l.unitPrice.trim() === '') {
        return setError(`Check the quantity and price for "${l.description.trim()}".`);
      }
      lineItems.push({ description: l.description.trim(), kind: l.kind, quantity, unitPrice, warrantyUntil: optionalText(l.warrantyUntil) });
    }

    const cost = lineItems.length
      ? roundMoney(lineItems.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0))
      : optionalNumber(form.cost);
    if (cost === undefined) return setError('Enter the total cost (use 0 if it was free).');

    const mileage = optionalNumber(form.mileage);
    if (mileage === undefined) return setError('Enter the odometer reading.');

    const validScheduleIds = scheduleIds.filter(id => vehicleSchedules.some(s => s.id === id));
    const description = form.description.trim() ||
      vehicleSchedules.filter(s => validScheduleIds.includes(s.id)).map(s => s.name).join(', ');
    if (!description) return setError('Describe the work done, or tick the items serviced.');

    const payload = {
      vehicleId: form.vehicleId,
      date: form.date,
      mileage,
      serviceType: form.serviceType || undefined,
      scheduleIds: validScheduleIds,
      description: description.slice(0, 2000),
      cost,
      lineItems: lineItems.length ? lineItems : undefined,
      workshop: optionalText(form.workshop),
      workshopPhone: optionalText(form.workshopPhone),
      workshopLocation: optionalText(form.workshopLocation),
      invoiceNumber: optionalText(form.invoiceNumber),
      notes: optionalText(form.notes),
      attachments: attachments.length ? attachments : undefined,
      // Older single-receipt records move into the attachments list on save
      receiptUrl: undefined,
      partIds: partIds.filter(id => parts.some(p => p.id === id)),
    };

    setSaving(true);
    try {
      if (service) await DataService.update('services', service.id, payload);
      else await DataService.add('services', payload);
      await reload();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={service ? 'Update Intake' : 'Service Intake'} size="xl">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <Label htmlFor="sv-vehicle">Subject Vehicle *</Label>
          <select id="sv-vehicle" required value={form.vehicleId} onChange={handleVehicleChange} className={inputClass}>
            <option value="">Select from Garage</option>
            {vehicleOptions.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>)}
          </select>
        </div>

        <div>
          <Label htmlFor="sv-date">Service Date *</Label>
          <input id="sv-date" type="date" required value={form.date} onChange={set('date')} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="sv-mileage">Odometer Reading (KM) *</Label>
          <input id="sv-mileage" type="number" required min="0" step="1" value={form.mileage} onChange={set('mileage')}
            placeholder={currentMileage !== null ? `Last known ${currentMileage}` : 'e.g. 85200'} className={`${inputClass} font-mono`} />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="sv-type">Type of Work</Label>
          <select id="sv-type" value={form.serviceType} onChange={set('serviceType')} className={inputClass}>
            {!form.serviceType && <option value="">Not set</option>}
            {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <Label>Work Done (Maintenance Schedule)</Label>
          <div className="flex flex-wrap gap-2 p-4 bg-black border border-white/10 rounded-lg min-h-[60px]">
            {vehicleSchedules.map(item => (
              <button
                type="button"
                key={item.id}
                aria-pressed={scheduleIds.includes(item.id)}
                onClick={() => setScheduleIds(ids => toggle(ids, item.id))}
                className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase transition-all border ${
                  scheduleIds.includes(item.id) ? 'bg-racing-red border-racing-red text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                {item.name}
              </button>
            ))}
            {!form.vehicleId && <span className="text-gray-600 text-xs italic">Select a vehicle first</span>}
            {form.vehicleId && vehicleSchedules.length === 0 && (
              <span className="text-gray-600 text-xs italic">No schedule for this car yet. Set one up on the car's page to track what's due.</span>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="sv-desc">Description {scheduleIds.length ? '' : '*'}</Label>
          <input id="sv-desc" maxLength={2000} value={form.description} onChange={set('description')}
            placeholder={scheduleIds.length ? 'Optional — ticked items are used if blank' : 'e.g. Engine Oil Change & Filter'} className={inputClass} />
        </div>

        <div className="md:col-span-2">
          <Label>Cost Breakdown (Optional)</Label>
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 p-3 bg-black/50 border border-white/5 rounded-lg">
                <input aria-label="Item" maxLength={200} value={l.description} onChange={e => updateLine(i, 'description', e.target.value)}
                  placeholder="Item, e.g. Oil filter" className={`${cellClass} col-span-12 md:col-span-5`} />
                <select aria-label="Kind" value={l.kind} onChange={e => updateLine(i, 'kind', e.target.value)} className={`${cellClass} col-span-5 md:col-span-3`}>
                  <option value="part">Part</option>
                  <option value="labour">Labour</option>
                  <option value="other">Other</option>
                </select>
                <input aria-label="Quantity" type="number" min="0.01" step="any" value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)}
                  placeholder="Qty" className={`${cellClass} col-span-3 md:col-span-2 font-mono`} />
                <input aria-label="Unit price (RM)" type="number" min="0" step="0.01" value={l.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)}
                  placeholder="RM each" className={`${cellClass} col-span-4 md:col-span-2 font-mono`} />
                <div className="col-span-12 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Warranty until
                    <input type="date" value={l.warrantyUntil} onChange={e => updateLine(i, 'warrantyUntil', e.target.value)}
                      className="bg-black border border-white/10 rounded px-2 py-1 text-xs text-white normal-case" />
                  </label>
                  <button type="button" aria-label="Remove line" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}
                    className="p-1 text-gray-600 hover:text-racing-red">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setLines(ls => [...ls, blankLine()])}
              className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-400 hover:text-white">
              <Plus className="w-4 h-4" /> Add cost line
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="sv-cost">Total Project Cost (RM) *</Label>
          {hasLines ? (
            <div id="sv-cost" className={`${inputClass} font-mono text-green-500`}>{formatMYR(lineTotal)}</div>
          ) : (
            <input id="sv-cost" type="number" required min="0" step="0.01" value={form.cost} onChange={set('cost')} className={`${inputClass} font-mono`} />
          )}
        </div>
        <div>
          <Label htmlFor="sv-invoice">Invoice No.</Label>
          <input id="sv-invoice" maxLength={50} value={form.invoiceNumber} onChange={set('invoiceNumber')} className={`${inputClass} font-mono`} />
        </div>

        <div>
          <Label htmlFor="sv-workshop">Workshop / Facility</Label>
          <input id="sv-workshop" list="sv-workshops" maxLength={200} value={form.workshop} onChange={handleWorkshopChange} placeholder="e.g. Performance Lab" className={inputClass} />
          <datalist id="sv-workshops">
            {[...workshops.keys()].map(w => <option key={w} value={w} />)}
          </datalist>
        </div>
        <div>
          <Label htmlFor="sv-phone">Workshop Phone</Label>
          <input id="sv-phone" type="tel" maxLength={30} value={form.workshopPhone} onChange={set('workshopPhone')} className={`${inputClass} font-mono`} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="sv-location">Workshop Location</Label>
          <input id="sv-location" maxLength={200} value={form.workshopLocation} onChange={set('workshopLocation')} placeholder="e.g. Shah Alam" className={inputClass} />
        </div>

        <div className="md:col-span-2">
          <Label>Parts Applied (Inventory)</Label>
          <div className="flex flex-wrap gap-2 p-4 bg-black border border-white/10 rounded-lg min-h-[60px]">
            {parts.map(part => (
              <button
                type="button"
                key={part.id}
                aria-pressed={partIds.includes(part.id)}
                onClick={() => setPartIds(ids => toggle(ids, part.id))}
                className={`px-3 py-1 rounded-full text-[10px] font-mono transition-all border ${
                  partIds.includes(part.id) ? 'bg-racing-red border-racing-red text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                }`}
              >
                {part.name}
              </button>
            ))}
            {parts.length === 0 && <span className="text-gray-600 text-xs italic">No parts available in library</span>}
          </div>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="sv-files">Receipts / Photos / Documents</Label>
          {attachments.length > 0 && (
            <ul className="mb-3 space-y-2">
              {attachments.map((a, i) => (
                <li key={`${a.url}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 bg-black/50 border border-white/5 rounded-lg text-xs">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate hover:text-racing-red">
                    <Paperclip className="w-3 h-3 shrink-0" /> <span className="truncate">{a.name}</span>
                  </a>
                  <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setAttachments(list => list.filter((_, j) => j !== i))}
                    className="text-gray-600 hover:text-racing-red shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input id="sv-files" type="file" multiple accept="image/*,application/pdf" onChange={handleFiles} disabled={uploading > 0}
            className={`${inputClass} text-sm`} />
          <p className="mt-1 text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
            {uploading > 0 ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading {uploading} file(s)...</> : `Images or PDF, up to ${MAX_UPLOAD_MB} MB each`}
          </p>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="sv-notes">Field Notes</Label>
          <textarea id="sv-notes" maxLength={2000} value={form.notes} onChange={set('notes')} placeholder="Specific torque values, observed wear, etc..." className={`${inputClass} h-24 resize-none`} />
        </div>

        {currentMileage !== null && Number(form.mileage) > 0 && Number(form.mileage) < currentMileage && !service && (
          <p className="md:col-span-2 text-[10px] font-mono text-amber-400 uppercase tracking-widest">
            Heads up: this is lower than the last known reading ({formatKm(currentMileage)}). Fine if you're logging an older service.
          </p>
        )}

        <div className="md:col-span-2">
          <FormError message={error} />
          <button type="submit" disabled={saving || uploading > 0} className="racing-button w-full py-4 text-lg disabled:opacity-50">
            {saving ? 'Saving...' : uploading > 0 ? 'Waiting for upload...' : service ? 'Commit Changes' : 'Submit Log Entry'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
