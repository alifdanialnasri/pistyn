import { useState } from 'react';
import { Plus, AlertTriangle, Pencil, Trash2, CheckCircle2, Filter } from 'lucide-react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { Issue } from '../types';
import { formatDate, formatKm, todayISO, errorMessage } from '../lib/utils';
import { getIssueDue } from '../lib/maintenance';
import { PageHeader, EmptyState, StatusBadge, ConfirmDialog, FormError } from './ui';
import IssueForm from './IssueForm';

const severityOrder = { high: 0, medium: 1, low: 2 };

export default function Issues({ onOpenVehicle }: { onOpenVehicle: (id: string) => void }) {
  const { issues, vehicles, services, reload } = useData();
  const [status, setStatus] = useState<'open' | 'resolved' | 'all'>('open');
  const [vehicleId, setVehicleId] = useState('');
  const [form, setForm] = useState<{ open: boolean; issue: Issue | null }>({ open: false, issue: null });
  const [toDelete, setToDelete] = useState<Issue | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = issues
    .filter(i => (status === 'all' || i.status === status) && (!vehicleId || i.vehicleId === vehicleId))
    .sort((a, b) => a.status.localeCompare(b.status) || severityOrder[a.severity] - severityOrder[b.severity]);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
      await reload();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const selectClass = 'bg-surface-dark border border-white/5 rounded-xl pl-12 pr-10 py-3 appearance-none focus:outline-none focus:border-racing-red transition-colors w-full md:min-w-[200px]';

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Preventive Care"
        title="Issues"
        action={
          <button onClick={() => setForm({ open: true, issue: null })} className="racing-button flex items-center gap-2 text-xs md:text-sm w-full md:w-auto justify-center">
            <Plus className="w-4 h-4" /> Report Issue
          </button>
        }
      />
      <p className="text-gray-500 text-sm -mt-4 max-w-2xl">
        Log anything you notice (noises, leaks, warning lights) and anything the workshop recommends fixing later, so small problems get fixed before they become expensive.
      </p>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex rounded-xl overflow-hidden border border-white/5 w-fit">
          {(['open', 'resolved', 'all'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s}
              className={`px-4 py-3 text-xs font-mono uppercase tracking-widest ${status === s ? 'bg-racing-red text-white' : 'bg-surface-dark text-gray-400 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select aria-label="Filter by vehicle" value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={selectClass}>
            <option value="">All Vehicles</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      </div>

      <FormError message={!toDelete ? error : null} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map(issue => {
          const vehicle = vehicles.find(v => v.id === issue.vehicleId);
          const due = getIssueDue(issue, vehicle, services);
          return (
            <div key={issue.id} className={`racing-panel p-5 rounded-2xl ${issue.status === 'resolved' ? 'opacity-60' : ''}`}>
              <div className="flex justify-between gap-3 mb-2">
                <button onClick={() => vehicle && onOpenVehicle(vehicle.id)} className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest hover:text-white text-left">
                  {vehicle?.name ?? 'Unknown Vehicle'}
                </button>
                <div className="flex gap-2 shrink-0">
                  <button aria-label="Edit issue" onClick={() => setForm({ open: true, issue })} className="text-gray-600 hover:text-white"><Pencil className="w-4 h-4" /></button>
                  <button aria-label="Delete issue" onClick={() => setToDelete(issue)} className="text-gray-600 hover:text-racing-red"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">{issue.title}</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {issue.status === 'resolved'
                  ? <StatusBadge status="ok" label={`Resolved ${formatDate(issue.resolvedDate)}`} />
                  : <StatusBadge status={issue.severity === 'high' ? 'overdue' : issue.severity === 'medium' ? 'soon' : 'unknown'} label={`${issue.severity} severity`} />}
                {issue.status === 'open' && (due === 'overdue' || due === 'soon') && <StatusBadge status={due} label={due === 'overdue' ? 'Past fix-by' : 'Fix soon'} />}
              </div>
              {issue.details && <p className="text-sm text-gray-400 mb-3">{issue.details}</p>}
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                {issue.source === 'workshop' ? 'Workshop recommended' : 'Noticed'} {formatDate(issue.reportedDate)}
                {issue.reportedMileage !== undefined && ` at ${formatKm(issue.reportedMileage)}`}
                {issue.dueMileage !== undefined && ` · fix by ${formatKm(issue.dueMileage)}`}
                {issue.dueDate && ` · fix by ${formatDate(issue.dueDate)}`}
              </p>
              {issue.status === 'open' && (
                <button
                  onClick={() => run(() => DataService.update('issues', issue.id, { status: 'resolved', resolvedDate: todayISO() }))}
                  disabled={busy}
                  className="mt-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-green-500 hover:text-green-400 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark resolved
                </button>
              )}
            </div>
          );
        })}
        {list.length === 0 && <EmptyState icon={AlertTriangle} text={status === 'open' ? 'No open issues. Nice.' : 'No issues found'} />}
      </div>

      <IssueForm open={form.open} onClose={() => setForm(f => ({ ...f, open: false }))} issue={form.issue} />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Issue?"
        message="This issue will be permanently removed."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (toDelete && await run(() => DataService.remove([{ col: 'issues', id: toDelete.id }]))) setToDelete(null);
        }}
        onCancel={() => { setToDelete(null); setError(null); }}
        busy={busy}
        error={toDelete ? error : null}
      />
    </div>
  );
}
