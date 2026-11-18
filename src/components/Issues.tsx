import { useState } from 'react';
import { Plus, AlertTriangle, Pencil, Trash2, CheckCircle2, Wrench, Eye } from 'lucide-react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { Issue } from '../types';
import { formatDate, formatKm, todayISO, errorMessage } from '../lib/utils';
import { getIssueDue } from '../lib/maintenance';
import {
  PageHeader, HeaderButton, EmptyState, StatusBadge, ConfirmDialog, FormError, Modal, ListGroup, ListRow, InfoRow, Chips, Tone,
  SplitView, DetailPanel, useIsDesktop
} from './ui';
import IssueForm from './IssueForm';

const severityOrder = { high: 0, medium: 1, low: 2 };
const severityTone: Record<Issue['severity'], Tone> = { high: 'red', medium: 'amber', low: 'gray' };
const severityLabel = { high: 'High', medium: 'Medium', low: 'Low' };

export function IssueRow({ issue, onOpen, showVehicle = true, selected }: { issue: Issue; onOpen: () => void; showVehicle?: boolean; selected?: boolean }) {
  const { vehicles, services } = useData();
  const vehicle = vehicles.find(v => v.id === issue.vehicleId);
  const due = getIssueDue(issue, vehicle, services);
  const resolved = issue.status === 'resolved';
  return (
    <ListRow
      icon={resolved ? CheckCircle2 : AlertTriangle}
      tone={resolved ? 'green' : severityTone[issue.severity]}
      title={issue.title}
      subtitle={[showVehicle && vehicle?.name, resolved ? `Fixed ${formatDate(issue.resolvedDate)}` : `${severityLabel[issue.severity]} priority`].filter(Boolean).join(' · ')}
      trailing={!resolved && (due === 'overdue' || due === 'soon') ? <StatusBadge status={due} label={due === 'overdue' ? 'Past due' : 'Fix soon'} /> : undefined}
      onClick={onOpen}
      muted={resolved}
      selected={selected}
    />
  );
}

/** Shared view/edit/resolve/delete for issues */
export function useIssueActions() {
  const { vehicles, reload } = useData();
  const [viewing, setViewing] = useState<Issue | null>(null);
  const [form, setForm] = useState<{ open: boolean; issue: Issue | null }>({ open: false, issue: null });
  const [toDelete, setToDelete] = useState<Issue | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const resolve = async (issue: Issue) => {
    if (await run(() => DataService.update('issues', issue.id, { status: 'resolved', resolvedDate: todayISO() }))) setViewing(null);
  };

  // The issue's details and actions; shown in a sheet on phones or the desktop panel
  const details = (i: Issue) => {
    const vehicle = vehicles.find(v => v.id === i.vehicleId);
    return (
          <div className="space-y-5">
            <ListGroup>
              <InfoRow label="Car" value={vehicle?.name ?? '—'} />
              <InfoRow label="Priority" value={severityLabel[i.severity]} />
              <InfoRow label={i.source === 'workshop' ? 'Workshop advised' : 'Noticed'} value={`${formatDate(i.reportedDate)}${i.reportedMileage !== undefined ? ` · ${formatKm(i.reportedMileage).toLowerCase()}` : ''}`} />
              {(i.dueDate || i.dueMileage !== undefined) && (
                <InfoRow label="Fix by" value={[i.dueMileage !== undefined && formatKm(i.dueMileage).toLowerCase(), i.dueDate && formatDate(i.dueDate)].filter(Boolean).join(' or ')} />
              )}
              {i.status === 'resolved' && <InfoRow label="Fixed" value={formatDate(i.resolvedDate)} />}
            </ListGroup>
            {i.details && <p className="text-gray-300 bg-white/5 rounded-2xl p-4">{i.details}</p>}
            <FormError message={error} />
            {i.status === 'open' && (
              <button onClick={() => resolve(i)} disabled={busy} className="racing-button w-full flex items-center justify-center gap-2 disabled:opacity-50">
                <CheckCircle2 className="w-5 h-5" /> {busy ? 'Saving…' : 'Mark as fixed'}
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setViewing(null); setToDelete(i); }} className="btn-secondary flex items-center justify-center gap-2 text-racing-red">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button onClick={() => { setViewing(null); setForm({ open: true, issue: i }); }} className="btn-secondary flex items-center justify-center gap-2">
                <Pencil className="w-4 h-4" /> Edit
              </button>
            </div>
          </div>
    );
  };

  const dialogs = (defaultVehicleId?: string) => (
    <>
      <Modal open={!!viewing} onClose={() => { setViewing(null); setError(null); }} title={viewing?.title ?? ''}>
        {viewing && details(viewing)}
      </Modal>
      <IssueForm open={form.open} onClose={() => setForm(f => ({ ...f, open: false }))} issue={form.issue} defaultVehicleId={defaultVehicleId} />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete this issue?"
        message="It will be removed permanently."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (toDelete && await run(() => DataService.remove([{ col: 'issues', id: toDelete.id }]))) setToDelete(null);
        }}
        onCancel={() => { setToDelete(null); setError(null); }}
        busy={busy}
        error={toDelete ? error : null}
      />
    </>
  );

  return { open: setViewing, add: () => setForm({ open: true, issue: null }), details, dialogs };
}

export default function Issues() {
  const { issues, vehicles } = useData();
  const actions = useIssueActions();
  const [status, setStatus] = useState<'open' | 'resolved' | 'all'>('open');
  const [vehicleId, setVehicleId] = useState('');

  const list = issues
    .filter(i => (status === 'all' || i.status === status) && (!vehicleId || i.vehicleId === vehicleId))
    .sort((a, b) => a.status.localeCompare(b.status) || severityOrder[a.severity] - severityOrder[b.severity]);
  const openCount = issues.filter(i => i.status === 'open').length;
  const desktop = useIsDesktop();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find(i => i.id === selectedId) ?? list[0];
  const show = (i: Issue) => desktop ? setSelectedId(i.id) : actions.open(i);

  return (
    <div className="space-y-5">
      <PageHeader title="Issues" subtitle="Catch small problems early"
        action={<HeaderButton icon={Plus} label="Report" onClick={actions.add} />} />

      <SplitView
        placeholder="Pick an issue to see the details."
        detail={selected && <DetailPanel title={selected.title}>{actions.details(selected)}</DetailPanel>}
        list={<>
      <Chips label="Status" value={status} onChange={v => setStatus(v as typeof status)}
        options={[{ value: 'open', label: `Open${openCount ? ` (${openCount})` : ''}` }, { value: 'resolved', label: 'Fixed' }, { value: 'all', label: 'All' }]} />
      {vehicles.length > 1 && (
        <Chips label="Car" value={vehicleId} onChange={setVehicleId}
          options={[{ value: '', label: 'All cars' }, ...vehicles.map(v => ({ value: v.id, label: v.name }))]} />
      )}

      {list.length > 0 ? (
        <ListGroup>
          {list.map(issue => <IssueRow key={issue.id} issue={issue} onOpen={() => show(issue)} selected={desktop && issue.id === selected?.id} showVehicle={!vehicleId && vehicles.length > 1} />)}
        </ListGroup>
      ) : (
        <EmptyState icon={status === 'open' ? CheckCircle2 : Eye} text={status === 'open' ? 'No open issues. Nice.' : 'Nothing here yet.'}>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-2"><Wrench className="w-4 h-4" /> Noises, leaks, warning lights or workshop advice all go here.</p>
        </EmptyState>
      )}
        </>}
      />

      {actions.dialogs()}
    </div>
  );
}
