import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Printer, CalendarPlus, Archive, RotateCcw, Gauge, Wallet, TrendingUp, Route,
  Sparkles, MoreHorizontal, Wrench, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { ScheduleItem } from '../types';
import { formatMYR, formatKm, formatDate, formatMileage, getCurrentMileage, todayISO, errorMessage } from '../lib/utils';
import {
  getScheduleState, getRenewals, kmPerDay, describeDue, isActive, RECOMMENDED_SCHEDULE, ScheduleState
} from '../lib/maintenance';
import { buildCalendar, calendarFileName, downloadFile } from '../lib/exporters';
import {
  StatusBadge, ConfirmDialog, FormError, Notice, PageHeader, SectionTitle, TextButton, ListGroup, ListRow, InfoRow,
  StatTile, Modal, ActionList, Card, statusTone
} from './ui';
import VehicleForm from './VehicleForm';
import ScheduleForm from './ScheduleForm';
import { ServiceRow, useServiceActions } from './Services';
import { IssueRow, useIssueActions } from './Issues';
import { HealthBadge } from './Vehicles';

export default function VehicleDetail({ vehicleId, onBack, onPrint }: {
  vehicleId: string;
  onBack: () => void;
  onPrint: (vehicleId: string) => void;
}) {
  const { vehicles, services, schedules, issues, reload } = useData();
  const vehicle = vehicles.find(v => v.id === vehicleId);
  const serviceActions = useServiceActions();
  const issueActions = useIssueActions();

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewing, setViewing] = useState<ScheduleState | null>(null);
  const [scheduleForm, setScheduleForm] = useState<{ open: boolean; item: ScheduleItem | null }>({ open: false, item: null });
  const [confirm, setConfirm] = useState<null | { kind: 'vehicle' } | { kind: 'schedule'; item: ScheduleItem }>(null);
  const [showFixed, setShowFixed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicle) onBack();
  }, [vehicle, onBack]);

  if (!vehicle) return null;

  const carServices = services
    .filter(s => s.vehicleId === vehicle.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const carSchedules = schedules.filter(s => s.vehicleId === vehicle.id);
  const carIssues = issues.filter(i => i.vehicleId === vehicle.id);
  const openIssues = carIssues.filter(i => i.status === 'open');
  const fixedIssues = carIssues.filter(i => i.status === 'resolved');
  const current = getCurrentMileage(vehicle, services);
  const rate = kmPerDay(vehicle, services);
  const totalSpent = carServices.reduce((sum, s) => sum + s.cost, 0);
  const mileages = carServices.map(s => s.mileage).concat(vehicle.purchaseMileage ?? []).filter(Number.isFinite);
  const kmCovered = current !== null && mileages.length ? current - Math.min(...mileages) : 0;
  const today = todayISO();
  const warranties = carServices.flatMap(s => (s.lineItems ?? [])
    .filter(l => l.warrantyUntil && l.warrantyUntil >= today)
    .map(l => ({ ...l, serviceDate: s.date })));
  const states = carSchedules.map(item => getScheduleState(item, vehicle, services));
  const order = { overdue: 0, soon: 1, unknown: 2, ok: 3 };
  states.sort((a, b) => order[a.status] - order[b.status]);
  const renewals = getRenewals(vehicle);

  const run = async (task: () => Promise<void>, successNotice?: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    let failed = false;
    try {
      await task();
    } catch (err) {
      failed = true;
      setError(errorMessage(err));
    } finally {
      // Reload even after a failure so anything that did save is shown
      await reload();
      setBusy(false);
      if (!failed && successNotice) setNotice(successNotice);
    }
  };

  const addRecommended = () => run(async () => {
    for (const item of RECOMMENDED_SCHEDULE) {
      await DataService.add('schedules', { ...item, vehicleId: vehicle.id });
    }
  }, 'Reminders added. Tap each one to set when it was last done.');

  const toggleSold = () => {
    setMenuOpen(false);
    run(() =>
      isActive(vehicle)
        ? DataService.update('vehicles', vehicle.id, { status: 'sold', soldDate: todayISO() })
        : DataService.update('vehicles', vehicle.id, { status: 'active', soldDate: undefined })
    );
  };

  const exportCalendar = () => {
    setMenuOpen(false);
    const { content, count } = buildCalendar([vehicle], services, schedules, issues);
    if (!count) {
      setNotice('Nothing to add yet. Set up reminders or renewal dates first.');
      return;
    }
    downloadFile(calendarFileName(vehicle), content, 'text/calendar');
    setNotice(`${count} reminder${count > 1 ? 's' : ''} downloaded. Open the file to add them to your calendar.`);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    try {
      if (confirm.kind === 'vehicle') {
        await DataService.remove([
          ...carServices.map(s => ({ col: 'services' as const, id: s.id })),
          ...carSchedules.map(s => ({ col: 'schedules' as const, id: s.id })),
          ...carIssues.map(i => ({ col: 'issues' as const, id: i.id })),
          { col: 'vehicles', id: vehicle.id },
        ]);
      } else {
        await DataService.remove([{ col: 'schedules', id: confirm.item.id }]);
      }
      setConfirm(null);
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const details: [string, string | undefined][] = [
    ['Make', vehicle.make],
    ['Model', vehicle.model],
    ['Year', vehicle.year?.toString()],
    ['Chassis no.', vehicle.vin],
    ['Engine no.', vehicle.engineNumber],
    ['Bought', vehicle.purchaseDate && `${formatDate(vehicle.purchaseDate)}${vehicle.purchaseMileage !== undefined ? ` · ${formatKm(vehicle.purchaseMileage).toLowerCase()}` : ''}`],
    ['Sold', vehicle.soldDate && formatDate(vehicle.soldDate)],
  ];
  const filledDetails = details.filter(([, v]) => v);
  const v = viewing;

  return (
    <div className="max-w-2xl lg:max-w-none mx-auto space-y-6">
      <PageHeader
        onBack={onBack}
        title={vehicle.name}
        subtitle={<span className="font-mono text-racing-red font-bold tracking-widest">{vehicle.plateNumber}</span>}
        action={
          <button onClick={() => setMenuOpen(true)} aria-label="More actions" className="w-10 h-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-gray-300 active:bg-white/10">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        }
      />

      <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
      <div className="space-y-6">
      <Card className="relative overflow-hidden p-5 bg-gradient-to-br from-surface-light via-surface-dark to-black">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest">Odometer</p>
            <p className="text-3xl font-bold font-mono tracking-tighter">{formatMileage(current)}</p>
            {vehicle.mileageUpdatedAt && <p className="text-xs text-gray-500">Updated {formatDate(vehicle.mileageUpdatedAt)}</p>}
          </div>
          <HealthBadge vehicle={vehicle} />
        </div>
        <button onClick={() => serviceActions.openForm()} className="racing-button w-full mt-5 flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Log a service
        </button>
      </Card>

      <FormError message={!confirm ? error : null} />
      <Notice message={notice} />

      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Wallet} label="Total spent" value={formatMYR(totalSpent)} sub={`${carServices.length} service${carServices.length === 1 ? '' : 's'}`} />
        <StatTile icon={Route} label="Cost per km" value={kmCovered > 0 ? `RM ${(totalSpent / kmCovered).toFixed(2)}` : '—'} sub={kmCovered > 0 ? `over ${formatKm(kmCovered).toLowerCase()}` : 'Needs 2+ readings'} />
        <StatTile icon={TrendingUp} label="Per month" value={rate ? formatKm(rate * 30.44).toLowerCase() : '—'} sub={rate ? 'average driving' : 'Needs 30+ days'} />
        <StatTile icon={Gauge} label="Reminders" value={carSchedules.length} sub={states.filter(s => s.status === 'overdue' || s.status === 'soon').length ? `${states.filter(s => s.status === 'overdue' || s.status === 'soon').length} need attention` : 'all on track'} />
      </div>

      <section>
        <SectionTitle action={carSchedules.length > 0 && <TextButton onClick={() => setScheduleForm({ open: true, item: null })}>Add</TextButton>}>
          Maintenance
        </SectionTitle>
        {states.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="font-semibold">No reminders yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-5">Start with a typical Malaysian service plan, then adjust it to your manual.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={addRecommended} disabled={busy} className="racing-button flex items-center justify-center gap-2 disabled:opacity-50">
                <Sparkles className="w-4 h-4" /> {busy ? 'Adding…' : 'Use recommended'}
              </button>
              <button onClick={() => setScheduleForm({ open: true, item: null })} className="btn-secondary">Add my own</button>
            </div>
          </Card>
        ) : (
          <ListGroup>
            {states.map(state => (
              <ListRow
                key={state.item.id}
                icon={Wrench}
                tone={statusTone[state.status]}
                title={state.item.name}
                subtitle={state.status === 'unknown' ? 'Tap to set when it was last done' : describeDue(state)}
                trailing={state.status !== 'ok' && state.status !== 'unknown' ? <StatusBadge status={state.status} /> : undefined}
                onClick={() => setViewing(state)}
              />
            ))}
          </ListGroup>
        )}
      </section>

      <section>
        <SectionTitle action={<TextButton onClick={issueActions.add}>Report</TextButton>}>Issues</SectionTitle>
        {openIssues.length + (showFixed ? fixedIssues.length : 0) > 0 ? (
          <ListGroup>
            {[...openIssues, ...(showFixed ? fixedIssues : [])].map(issue => (
              <IssueRow key={issue.id} issue={issue} onOpen={() => issueActions.open(issue)} showVehicle={false} />
            ))}
          </ListGroup>
        ) : (
          <Card className="px-4 py-3.5 flex items-center gap-3 text-gray-400">
            <CheckCircle2 className="w-5 h-5 text-green-400" /> No open issues
          </Card>
        )}
        {fixedIssues.length > 0 && (
          <button onClick={() => setShowFixed(s => !s)} className="mt-2 px-1 text-sm text-gray-500 active:text-white">
            {showFixed ? 'Hide fixed' : `Show fixed (${fixedIssues.length})`}
          </button>
        )}
      </section>

      </div>

      <div className="space-y-6">
      <section>
        <SectionTitle action={<TextButton onClick={() => setEditOpen(true)}>Edit</TextButton>}>Details</SectionTitle>
        {renewals.length + filledDetails.length > 0 ? (
          <ListGroup>
            {renewals.map(r => (
              <InfoRow key={r.label} label={r.label} value={
                <span className="inline-flex items-center gap-2">
                  {formatDate(r.date)}
                  {(r.status === 'overdue' || r.status === 'soon') && <StatusBadge status={r.status} label={r.status === 'overdue' ? 'Expired' : 'Renew soon'} />}
                </span>
              } />
            ))}
            {filledDetails.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}
          </ListGroup>
        ) : (
          <button onClick={() => setEditOpen(true)} className="w-full text-left rounded-3xl p-4 border border-dashed border-white/15 text-gray-400 active:bg-white/5">
            Add road tax and insurance dates to get renewal reminders.
          </button>
        )}
        {vehicle.notes && <p className="mt-3 text-gray-400 bg-white/5 rounded-2xl p-4">{vehicle.notes}</p>}
      </section>

      {warranties.length > 0 && (
        <section>
          <SectionTitle>Under warranty</SectionTitle>
          <ListGroup>
            {warranties.map((w, i) => (
              <ListRow key={i} icon={ShieldCheck} tone="green" title={w.description}
                subtitle={`Fitted ${formatDate(w.serviceDate)}`} trailing={<span className="text-sm text-green-400">to {formatDate(w.warrantyUntil)}</span>} />
            ))}
          </ListGroup>
        </section>
      )}

      <section>
        <SectionTitle>History</SectionTitle>
        {carServices.length > 0 ? (
          <ListGroup>
            {carServices.map(s => <ServiceRow key={s.id} service={s} onOpen={() => serviceActions.open(s)} showVehicle={false} />)}
          </ListGroup>
        ) : (
          <Card className="px-4 py-3.5 text-gray-400">No services logged yet.</Card>
        )}
      </section>

      </div>
      </div>

      {/* Schedule item sheet */}
      <Modal open={!!v} onClose={() => setViewing(null)} title={v?.item.name ?? ''}>
        {v && (
          <div className="space-y-5">
            {v.status !== 'unknown' && (
              <div className="flex items-center justify-center gap-2 py-1">
                <StatusBadge status={v.status} />
                <span className="text-gray-300">{describeDue(v)}</span>
              </div>
            )}
            <ListGroup>
              <InfoRow label="Every" value={[v.item.intervalKm && formatKm(v.item.intervalKm).toLowerCase(), v.item.intervalMonths && `${v.item.intervalMonths} months`].filter(Boolean).join(' or ') || '—'} />
              <InfoRow label="Last done" value={v.lastDate || v.lastMileage !== undefined
                ? [v.lastDate && formatDate(v.lastDate), v.lastMileage !== undefined && formatKm(v.lastMileage).toLowerCase()].filter(Boolean).join(' · ')
                : 'Not set'} />
              {(v.dueDate || v.dueMileage !== undefined) && (
                <InfoRow label="Next due" value={[v.dueMileage !== undefined && formatKm(v.dueMileage).toLowerCase(), v.dueDate && formatDate(v.dueDate)].filter(Boolean).join(' or ')} />
              )}
              {v.estimatedDate && v.estimatedDate !== v.dueDate && <InfoRow label="Expected around" value={formatDate(v.estimatedDate)} />}
              {v.item.estimatedCost ? <InfoRow label="Usual cost" value={formatMYR(v.item.estimatedCost)} /> : null}
            </ListGroup>
            {v.item.notes && <p className="text-gray-300 bg-white/5 rounded-2xl p-4">{v.item.notes}</p>}
            <button onClick={() => { setViewing(null); serviceActions.openForm(undefined, v.item.id); }} className="racing-button w-full flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Mark as done
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setViewing(null); setConfirm({ kind: 'schedule', item: v.item }); }} className="btn-secondary flex items-center justify-center gap-2 text-racing-red">
                <Trash2 className="w-4 h-4" /> Remove
              </button>
              <button onClick={() => { setViewing(null); setScheduleForm({ open: true, item: v.item }); }} className="btn-secondary flex items-center justify-center gap-2">
                <Pencil className="w-4 h-4" /> Edit
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Car actions */}
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title={vehicle.name}>
        <ActionList actions={[
          { icon: Pencil, label: 'Edit details', onClick: () => { setMenuOpen(false); setEditOpen(true); } },
          { icon: Printer, label: 'Service report (PDF)', onClick: () => { setMenuOpen(false); onPrint(vehicle.id); } },
          { icon: CalendarPlus, label: 'Add reminders to calendar', onClick: exportCalendar },
          isActive(vehicle)
            ? { icon: Archive, label: 'Mark as sold', onClick: toggleSold, disabled: busy }
            : { icon: RotateCcw, label: 'Mark as active', onClick: toggleSold, disabled: busy },
          { icon: Trash2, label: 'Delete car', danger: true, onClick: () => { setMenuOpen(false); setConfirm({ kind: 'vehicle' }); } },
        ]} />
      </Modal>

      <VehicleForm open={editOpen} onClose={() => setEditOpen(false)} vehicle={vehicle} />
      <ScheduleForm open={scheduleForm.open} onClose={() => setScheduleForm(s => ({ ...s, open: false }))} vehicleId={vehicle.id} item={scheduleForm.item} />
      {serviceActions.dialogs(vehicle.id)}
      {issueActions.dialogs(vehicle.id)}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'vehicle' ? 'Delete this car?' : 'Remove this reminder?'}
        message={
          confirm?.kind === 'vehicle'
            ? <>This deletes the car and all its history: {carServices.length} service{carServices.length === 1 ? '' : 's'}, {carSchedules.length} reminder{carSchedules.length === 1 ? '' : 's'} and {carIssues.length} issue{carIssues.length === 1 ? '' : 's'}. Sold it? Use "Mark as sold" to keep the history.</>
            : `"${confirm?.kind === 'schedule' ? confirm.item.name : ''}" won't be tracked any more. Past services stay.`
        }
        confirmLabel={confirm?.kind === 'vehicle' ? 'Delete car' : 'Remove'}
        onConfirm={handleConfirm}
        onCancel={() => { setConfirm(null); setError(null); }}
        busy={busy}
        error={confirm ? error : null}
      />
    </div>
  );
}
