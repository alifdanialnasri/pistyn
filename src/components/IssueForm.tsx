import { useState, useEffect, FormEvent } from 'react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { Issue, IssueSeverity, IssueSource, IssueStatus } from '../types';
import { Modal, Label, FormError, inputClass } from './ui';
import { isActive } from '../lib/maintenance';
import { optionalText, optionalNumber, numberInput, todayISO, errorMessage } from '../lib/utils';

export default function IssueForm({ open, onClose, issue, defaultVehicleId }: {
  open: boolean;
  onClose: () => void;
  issue?: Issue | null;
  defaultVehicleId?: string;
}) {
  const { vehicles, reload } = useData();
  const blank = {
    vehicleId: defaultVehicleId ?? '', title: '', details: '', source: 'observed' as IssueSource, severity: 'medium' as IssueSeverity,
    status: 'open' as IssueStatus, reportedDate: todayISO(), reportedMileage: '', dueDate: '', dueMileage: '', resolvedDate: ''
  };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(issue ? {
      vehicleId: issue.vehicleId,
      title: issue.title,
      details: issue.details ?? '',
      source: issue.source,
      severity: issue.severity,
      status: issue.status,
      reportedDate: issue.reportedDate,
      reportedMileage: numberInput(issue.reportedMileage),
      dueDate: issue.dueDate ?? '',
      dueMileage: numberInput(issue.dueMileage),
      resolvedDate: issue.resolvedDate ?? ''
    } : blank);
  }, [open, issue]);

  const set = (key: keyof typeof blank) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const vehicleOptions = vehicles.filter(v => isActive(v) || v.id === form.vehicleId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const resolved = form.status === 'resolved';
    const payload = {
      title: form.title.trim(),
      details: optionalText(form.details),
      source: form.source,
      severity: form.severity,
      status: form.status,
      reportedDate: form.reportedDate,
      reportedMileage: optionalNumber(form.reportedMileage),
      dueDate: optionalText(form.dueDate),
      dueMileage: optionalNumber(form.dueMileage),
      resolvedDate: resolved ? (optionalText(form.resolvedDate) ?? todayISO()) : undefined,
    };
    try {
      if (issue) await DataService.update('issues', issue.id, payload);
      else await DataService.add('issues', { ...payload, vehicleId: form.vehicleId });
      await reload();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={issue ? 'Edit issue' : 'Report an issue'} size="xl">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <Label htmlFor="is-vehicle">Car</Label>
          <select id="is-vehicle" required disabled={!!issue} value={form.vehicleId} onChange={set('vehicleId')} className={inputClass}>
            <option value="">Choose a car</option>
            {vehicleOptions.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="is-title">What's wrong?</Label>
          <input id="is-title" required maxLength={150} value={form.title} onChange={set('title')} placeholder="e.g. Squeaking noise when braking" className={inputClass} />
        </div>
        <div>
          <Label htmlFor="is-source">Who spotted it?</Label>
          <select id="is-source" value={form.source} onChange={set('source')} className={inputClass}>
            <option value="observed">I noticed it</option>
            <option value="workshop">Workshop recommended</option>
          </select>
        </div>
        <div>
          <Label htmlFor="is-severity">Priority</Label>
          <select id="is-severity" value={form.severity} onChange={set('severity')} className={inputClass}>
            <option value="low">Low — monitor</option>
            <option value="medium">Medium — fix soon</option>
            <option value="high">High — fix now</option>
          </select>
        </div>
        <div>
          <Label htmlFor="is-rdate">Noticed on</Label>
          <input id="is-rdate" type="date" required value={form.reportedDate} onChange={set('reportedDate')} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="is-rkm">Odometer then (km)</Label>
          <input id="is-rkm" type="number" inputMode="numeric" min="0" step="1" value={form.reportedMileage} onChange={set('reportedMileage')} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <Label htmlFor="is-ddate">Fix by (date)</Label>
          <input id="is-ddate" type="date" value={form.dueDate} onChange={set('dueDate')} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="is-dkm">Fix by (km)</Label>
          <input id="is-dkm" type="number" inputMode="numeric" min="0" step="1" value={form.dueMileage} onChange={set('dueMileage')} placeholder="e.g. within 5,000 km" className={`${inputClass} font-mono`} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="is-details">Details</Label>
          <textarea id="is-details" maxLength={2000} value={form.details} onChange={set('details')} placeholder="When it happens, what the workshop said..." className={`${inputClass} h-24 resize-none`} />
        </div>
        {issue && (
          <>
            <div>
              <Label htmlFor="is-status">Status</Label>
              <select id="is-status" value={form.status} onChange={set('status')} className={inputClass}>
                <option value="open">Open</option>
                <option value="resolved">Fixed</option>
              </select>
            </div>
            {form.status === 'resolved' && (
              <div>
                <Label htmlFor="is-resdate">Fixed on</Label>
                <input id="is-resdate" type="date" value={form.resolvedDate || todayISO()} onChange={set('resolvedDate')} className={inputClass} />
              </div>
            )}
          </>
        )}
        <div className="md:col-span-2">
          <FormError message={error} />
          <button type="submit" disabled={saving} className="racing-button w-full disabled:opacity-50">
            {saving ? 'Saving…' : issue ? 'Save changes' : 'Save issue'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
