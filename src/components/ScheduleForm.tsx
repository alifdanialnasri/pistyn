import { useState, useEffect, FormEvent } from 'react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { ScheduleItem } from '../types';
import { Modal, Label, FormError, inputClass } from './ui';
import { optionalText, optionalNumber, numberInput, errorMessage } from '../lib/utils';

const empty = { name: '', category: '', intervalKm: '', intervalMonths: '', lastDoneDate: '', lastDoneMileage: '', estimatedCost: '', notes: '' };

export default function ScheduleForm({ open, onClose, vehicleId, item }: {
  open: boolean;
  onClose: () => void;
  vehicleId: string;
  item?: ScheduleItem | null;
}) {
  const { reload } = useData();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(item ? {
      name: item.name,
      category: item.category ?? '',
      intervalKm: numberInput(item.intervalKm),
      intervalMonths: numberInput(item.intervalMonths),
      lastDoneDate: item.lastDoneDate ?? '',
      lastDoneMileage: numberInput(item.lastDoneMileage),
      estimatedCost: numberInput(item.estimatedCost),
      notes: item.notes ?? ''
    } : empty);
  }, [open, item]);

  const set = (key: keyof typeof empty) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const intervalKm = optionalNumber(form.intervalKm);
    const intervalMonths = optionalNumber(form.intervalMonths);
    if (!intervalKm && !intervalMonths) {
      setError('Enter an interval in KM, months, or both.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      category: optionalText(form.category),
      intervalKm: intervalKm || undefined,
      intervalMonths: intervalMonths || undefined,
      lastDoneDate: optionalText(form.lastDoneDate),
      lastDoneMileage: optionalNumber(form.lastDoneMileage),
      estimatedCost: optionalNumber(form.estimatedCost),
      notes: optionalText(form.notes),
    };
    try {
      if (item) await DataService.update('schedules', item.id, payload);
      else await DataService.add('schedules', { ...payload, vehicleId });
      await reload();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit Schedule Item' : 'Add Schedule Item'}>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">
        <div className="col-span-2">
          <Label htmlFor="sc-name">Item *</Label>
          <input id="sc-name" required maxLength={100} value={form.name} onChange={set('name')} placeholder="e.g. Engine Oil" className={inputClass} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="sc-cat">Category</Label>
          <input id="sc-cat" maxLength={50} value={form.category} onChange={set('category')} placeholder="e.g. Engine" className={inputClass} />
        </div>
        <div>
          <Label htmlFor="sc-km">Every (KM)</Label>
          <input id="sc-km" type="number" min="1" step="1" value={form.intervalKm} onChange={set('intervalKm')} placeholder="5000" className={`${inputClass} font-mono`} />
        </div>
        <div>
          <Label htmlFor="sc-months">Every (Months)</Label>
          <input id="sc-months" type="number" min="1" step="1" value={form.intervalMonths} onChange={set('intervalMonths')} placeholder="6" className={`${inputClass} font-mono`} />
        </div>
        <p className="col-span-2 -mt-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
          Due at whichever comes first. Check your owner's manual for the right interval.
        </p>
        <div>
          <Label htmlFor="sc-cost">Estimated Cost (RM)</Label>
          <input id="sc-cost" type="number" min="0" step="0.01" value={form.estimatedCost} onChange={set('estimatedCost')} placeholder="Used for budgeting" className={`${inputClass} font-mono`} />
        </div>
        <div className="col-span-2 pt-2 border-t border-white/5">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4">
            Last done before using Pistyn? (e.g. from your paper service book) — services you log later will take over automatically.
          </p>
        </div>
        <div>
          <Label htmlFor="sc-ldate">Last Done Date</Label>
          <input id="sc-ldate" type="date" value={form.lastDoneDate} onChange={set('lastDoneDate')} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="sc-lkm">Last Done At (KM)</Label>
          <input id="sc-lkm" type="number" min="0" step="1" value={form.lastDoneMileage} onChange={set('lastDoneMileage')} className={`${inputClass} font-mono`} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="sc-notes">Notes</Label>
          <textarea id="sc-notes" maxLength={1000} value={form.notes} onChange={set('notes')} placeholder="Oil grade, part numbers..." className={`${inputClass} h-20 resize-none`} />
        </div>
        <div className="col-span-2">
          <FormError message={error} />
          <button type="submit" disabled={saving} className="racing-button w-full py-4 text-lg disabled:opacity-50">
            {saving ? 'Saving...' : item ? 'Save Item' : 'Add to Schedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
