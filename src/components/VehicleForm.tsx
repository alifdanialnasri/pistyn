import { useState, useEffect, FormEvent } from 'react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { Vehicle } from '../types';
import { Modal, Label, FormError, inputClass } from './ui';
import { getCurrentMileage, formatKm, optionalText, optionalNumber, numberInput, todayISO, errorMessage } from '../lib/utils';

const empty = {
  name: '', plateNumber: '', make: '', model: '', year: '', currentMileage: '', vin: '', engineNumber: '',
  purchaseDate: '', purchaseMileage: '', roadTaxExpiry: '', insuranceExpiry: '', notes: ''
};

export default function VehicleForm({ open, onClose, vehicle, onSaved }: {
  open: boolean;
  onClose: () => void;
  vehicle?: Vehicle | null;
  onSaved?: (id: string) => void;
}) {
  const { services, reload } = useData();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(vehicle ? {
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      make: vehicle.make ?? '',
      model: vehicle.model ?? '',
      year: numberInput(vehicle.year),
      currentMileage: numberInput(vehicle.currentMileage),
      vin: vehicle.vin ?? '',
      engineNumber: vehicle.engineNumber ?? '',
      purchaseDate: vehicle.purchaseDate ?? '',
      purchaseMileage: numberInput(vehicle.purchaseMileage),
      roadTaxExpiry: vehicle.roadTaxExpiry ?? '',
      insuranceExpiry: vehicle.insuranceExpiry ?? '',
      notes: vehicle.notes ?? ''
    } : empty);
  }, [open, vehicle]);

  const set = (key: keyof typeof empty) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const latestKnown = vehicle ? getCurrentMileage(vehicle, services) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const currentMileage = optionalNumber(form.currentMileage);
    const mileageChanged = currentMileage !== vehicle?.currentMileage;
    const payload = {
      name: form.name.trim(),
      plateNumber: form.plateNumber.trim(),
      make: optionalText(form.make),
      model: optionalText(form.model),
      year: optionalNumber(form.year),
      vin: optionalText(form.vin),
      engineNumber: optionalText(form.engineNumber),
      purchaseDate: optionalText(form.purchaseDate),
      purchaseMileage: optionalNumber(form.purchaseMileage),
      currentMileage,
      // The date of the reading lets Pistyn estimate how far the car is driven each day
      mileageUpdatedAt: currentMileage === undefined ? undefined : mileageChanged ? todayISO() : vehicle?.mileageUpdatedAt,
      roadTaxExpiry: optionalText(form.roadTaxExpiry),
      insuranceExpiry: optionalText(form.insuranceExpiry),
      notes: optionalText(form.notes),
    };
    try {
      let id = vehicle?.id;
      if (vehicle) {
        await DataService.update('vehicles', vehicle.id, payload);
      } else {
        id = await DataService.add('vehicles', { ...payload, status: 'active' });
      }
      // Reload first so the car exists in the list before anything navigates to it
      await reload();
      onClose();
      if (id) onSaved?.(id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={vehicle ? 'Update Vehicle Details' : 'Register New Fleet Member'} size="xl">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <Label htmlFor="v-name">Vehicle Name / Nickname *</Label>
          <input id="v-name" required maxLength={100} value={form.name} onChange={set('name')} placeholder="e.g. Skyline R34" className={inputClass} />
        </div>
        <div>
          <Label htmlFor="v-plate">Plate Number *</Label>
          <input id="v-plate" required maxLength={20} value={form.plateNumber} onChange={set('plateNumber')} placeholder="ABC 1234" className={`${inputClass} font-mono`} />
        </div>
        <div>
          <Label htmlFor="v-mileage">Current Mileage (KM)</Label>
          <input id="v-mileage" type="number" min="0" step="1" value={form.currentMileage} onChange={set('currentMileage')} placeholder="e.g. 85200" className={`${inputClass} font-mono`} />
          {latestKnown !== null && (
            <p className="mt-1 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Latest known: {formatKm(latestKnown)}</p>
          )}
        </div>
        <div>
          <Label htmlFor="v-make">Make</Label>
          <input id="v-make" maxLength={50} value={form.make} onChange={set('make')} placeholder="e.g. Perodua" className={inputClass} />
        </div>
        <div>
          <Label htmlFor="v-model">Model / Variant</Label>
          <input id="v-model" maxLength={50} value={form.model} onChange={set('model')} placeholder="e.g. Myvi 1.5 AV" className={inputClass} />
        </div>
        <div>
          <Label htmlFor="v-year">Year</Label>
          <input id="v-year" type="number" min="1900" max="2100" step="1" value={form.year} onChange={set('year')} placeholder="e.g. 2019" className={`${inputClass} font-mono`} />
        </div>
        <div>
          <Label htmlFor="v-vin">Chassis No. (VIN)</Label>
          <input id="v-vin" maxLength={40} value={form.vin} onChange={set('vin')} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <Label htmlFor="v-engine">Engine No.</Label>
          <input id="v-engine" maxLength={40} value={form.engineNumber} onChange={set('engineNumber')} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <Label htmlFor="v-pdate">Purchase Date</Label>
          <input id="v-pdate" type="date" value={form.purchaseDate} onChange={set('purchaseDate')} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="v-pmileage">Mileage When Bought (KM)</Label>
          <input id="v-pmileage" type="number" min="0" step="1" value={form.purchaseMileage} onChange={set('purchaseMileage')} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <Label htmlFor="v-roadtax">Road Tax Expiry</Label>
          <input id="v-roadtax" type="date" value={form.roadTaxExpiry} onChange={set('roadTaxExpiry')} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="v-insurance">Insurance Expiry</Label>
          <input id="v-insurance" type="date" value={form.insuranceExpiry} onChange={set('insuranceExpiry')} className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="v-notes">Internal Notes</Label>
          <textarea id="v-notes" maxLength={1000} value={form.notes} onChange={set('notes')} placeholder="Engine specs, modifications, etc..." className={`${inputClass} h-24 resize-none`} />
        </div>
        <div className="md:col-span-2">
          <FormError message={error} />
          <button type="submit" disabled={saving} className="racing-button w-full py-4 text-lg disabled:opacity-50">
            {saving ? 'Saving...' : vehicle ? 'Apply Modifications' : 'Confirm Registration'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
