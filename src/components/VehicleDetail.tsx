import { useState, useEffect, ReactNode } from 'react';
import {
  ArrowLeft, Plus, Pencil, Trash2, Printer, CalendarPlus, Archive, RotateCcw, Gauge, Wallet, TrendingUp,
  ClipboardList, AlertTriangle, ShieldCheck, Wrench, CheckCircle2, Sparkles
} from 'lucide-react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { ScheduleItem, Issue } from '../types';
import {
  formatMYR, formatKm, formatDate, formatMileage, getCurrentMileage, todayISO, errorMessage
} from '../lib/utils';
import {
  getScheduleState, getRenewals, getIssueDue, kmPerDay, describeDue, isActive, RECOMMENDED_SCHEDULE
} from '../lib/maintenance';
import { buildCalendar, calendarFileName, downloadFile } from '../lib/exporters';
import { StatusBadge, ConfirmDialog, FormError } from './ui';
import VehicleForm from './VehicleForm';
import ScheduleForm from './ScheduleForm';
import IssueForm from './IssueForm';
import { ServiceCard, useServiceActions } from './Services';

const actionButton = 'flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] md:text-xs font-mono uppercase tracking-widest transition-colors disabled:opacity-50';

function Section({ title, icon: Icon, action, children }: { title: string; icon: typeof Wrench; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="racing-panel p-5 md:p-8 rounded-2xl">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h3 className="text-lg md:text-xl font-bold italic uppercase tracking-tight flex items-center gap-3">
          <Icon className="w-5 h-5 text-racing-red" /> {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function VehicleDetail({ vehicleId, onBack, onPrint }: {
  vehicleId: string;
  onBack: () => void;
  onPrint: (vehicleId: string) => void;
}) {
  const { vehicles, services, schedules, issues, reload } = useData();
  const vehicle = vehicles.find(v => v.id === vehicleId);
  const serviceActions = useServiceActions();

  const [editOpen, setEditOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<{ open: boolean; item: ScheduleItem | null }>({ open: false, item: null });
  const [issueForm, setIssueForm] = useState<{ open: boolean; issue: Issue | null }>({ open: false, issue: null });
  const [confirm, setConfirm] = useState<null | { kind: 'vehicle' } | { kind: 'schedule'; item: ScheduleItem } | { kind: 'issue'; issue: Issue }>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicle) onBack();
  }, [vehicle, onBack]);

  if (!vehicle) return null;

  const carServices = services.filter(s => s.vehicleId === vehicle.id);
  const carSchedules = schedules.filter(s => s.vehicleId === vehicle.id);
  const carIssues = issues.filter(i => i.vehicleId === vehicle.id);
  const openIssues = carIssues.filter(i => i.status === 'open');
  const resolvedIssues = carIssues.filter(i => i.status === 'resolved');
  const current = getCurrentMileage(vehicle, services);
  const rate = kmPerDay(vehicle, services);
  const totalSpent = carServices.reduce((sum, s) => sum + s.cost, 0);
  const mileages = carServices.map(s => s.mileage).concat(vehicle.purchaseMileage ?? []).filter(Number.isFinite);
  const kmCovered = current !== null && mileages.length ? current - Math.min(...mileages) : 0;
  const today = todayISO();
  const warranties = carServices.flatMap(s => (s.lineItems ?? [])
    .filter(l => l.warrantyUntil && l.warrantyUntil >= today)
    .map(l => ({ ...l, serviceDate: s.date, workshop: s.workshop })));
  const states = carSchedules.map(item => getScheduleState(item, vehicle, services));
  const order = { overdue: 0, soon: 1, unknown: 2, ok: 3 };
  states.sort((a, b) => order[a.status] - order[b.status]);

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
  }, 'Recommended items added. Edit each one to match your owner\'s manual and set when it was last done.');

  const toggleSold = () => run(() =>
    isActive(vehicle)
      ? DataService.update('vehicles', vehicle.id, { status: 'sold', soldDate: todayISO() })
      : DataService.update('vehicles', vehicle.id, { status: 'active', soldDate: undefined })
  );

  const resolveIssue = (issue: Issue) => run(() =>
    DataService.update('issues', issue.id, { status: 'resolved', resolvedDate: todayISO() })
  );

  const exportCalendar = () => {
    const { content, count } = buildCalendar([vehicle], services, schedules, issues);
    if (!count) {
      setNotice('Nothing to add yet. Set up a schedule, renewal dates, or fix-by dates first.');
      return;
    }
    downloadFile(calendarFileName(vehicle), content, 'text/calendar');
    setNotice(`${count} reminder${count > 1 ? 's' : ''} downloaded. Open the file to add them to your phone or Google Calendar.`);
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
      } else if (confirm.kind === 'schedule') {
        await DataService.remove([{ col: 'schedules', id: confirm.item.id }]);
      } else {
        await DataService.remove([{ col: 'issues', id: confirm.issue.id }]);
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
    ['Chassis No.', vehicle.vin],
    ['Engine No.', vehicle.engineNumber],
    ['Purchased', vehicle.purchaseDate && `${formatDate(vehicle.purchaseDate)}${vehicle.purchaseMileage !== undefined ? ` · ${formatKm(vehicle.purchaseMileage)}` : ''}`],
    ['Sold', vehicle.soldDate && formatDate(vehicle.soldDate)],
  ];

  return (
    <div className="space-y-8">
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Garage
        </button>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
          <div>
            <h2 className="text-[10px] md:text-sm font-mono text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-3">
              Logbook <span className="px-2 py-0.5 bg-black text-racing-red font-bold rounded border border-racing-red/20">{vehicle.plateNumber}</span>
              {!isActive(vehicle) && <StatusBadge status="unknown" label="Sold" />}
            </h2>
            <h1 className="text-2xl md:text-4xl font-bold italic tracking-tighter uppercase">{vehicle.name}</h1>
          </div>
          <button onClick={() => serviceActions.openForm()} className="racing-button flex items-center gap-2 text-xs md:text-sm justify-center">
            <Plus className="w-4 h-4" /> Log Service
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => setEditOpen(true)} className={actionButton}><Pencil className="w-4 h-4" /> Edit</button>
          <button onClick={() => onPrint(vehicle.id)} className={actionButton}><Printer className="w-4 h-4" /> Service Report (PDF)</button>
          <button onClick={exportCalendar} className={actionButton}><CalendarPlus className="w-4 h-4" /> Add to Calendar</button>
          <button onClick={toggleSold} disabled={busy} className={actionButton}>
            {isActive(vehicle) ? <><Archive className="w-4 h-4" /> Mark as Sold</> : <><RotateCcw className="w-4 h-4" /> Mark as Active</>}
          </button>
          <button onClick={() => setConfirm({ kind: 'vehicle' })} className={`${actionButton} hover:text-racing-red`}><Trash2 className="w-4 h-4" /> Delete</button>
        </div>
      </div>

      <FormError message={error} />
      {notice && (
        <p role="status" className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-[11px] text-green-500 font-mono uppercase tracking-wide">{notice}</p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Current Mileage', value: formatMileage(current), sub: vehicle.mileageUpdatedAt ? `Updated ${formatDate(vehicle.mileageUpdatedAt)}` : undefined, icon: Gauge },
          { label: 'Avg per Month', value: rate ? formatKm(rate * 30.44) : '—', sub: rate ? undefined : 'Needs 30+ days of readings', icon: TrendingUp },
          { label: 'Total Spent', value: formatMYR(totalSpent), sub: `${carServices.length} service${carServices.length === 1 ? '' : 's'}`, icon: Wallet },
          { label: 'Cost per KM', value: kmCovered > 0 ? `RM ${(totalSpent / kmCovered).toFixed(2)}` : '—', sub: kmCovered > 0 ? `Over ${formatKm(kmCovered)}` : 'Needs 2+ readings', icon: Wrench },
        ].map(stat => (
          <div key={stat.label} className="racing-panel p-4 md:p-6 rounded-xl">
            <stat.icon className="w-5 h-5 text-gray-500 mb-3" />
            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-lg md:text-2xl font-bold font-mono tracking-tighter">{stat.value}</p>
            {stat.sub && <p className="text-[10px] font-mono text-gray-600 uppercase mt-1">{stat.sub}</p>}
          </div>
        ))}
      </div>

      <Section
        title="Maintenance Schedule"
        icon={ClipboardList}
        action={
          <button onClick={() => setScheduleForm({ open: true, item: null })} className={actionButton}>
            <Plus className="w-4 h-4" /> Add Item
          </button>
        }
      >
        {states.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-xl">
            <p className="text-gray-400 text-sm mb-2">No schedule yet. Pistyn uses it to tell you what's due and when.</p>
            <p className="text-gray-600 text-xs mb-6">Start from a common Malaysian service schedule, then adjust it to your owner's manual.</p>
            <button onClick={addRecommended} disabled={busy} className="racing-button inline-flex items-center gap-2 text-xs disabled:opacity-50">
              <Sparkles className="w-4 h-4" /> {busy ? 'Adding...' : 'Add Recommended Schedule'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-[10px] font-mono text-gray-500 uppercase tracking-widest text-left">
                  <th className="px-2 pb-3 font-normal">Item</th>
                  <th className="px-2 pb-3 font-normal">Every</th>
                  <th className="px-2 pb-3 font-normal">Last Done</th>
                  <th className="px-2 pb-3 font-normal">Next Due</th>
                  <th className="px-2 pb-3 font-normal">Status</th>
                  <th className="px-2 pb-3 font-normal sr-only">Actions</th>
                </tr>
              </thead>
              <tbody>
                {states.map(state => {
                  const { item } = state;
                  return (
                    <tr key={item.id} className="border-t border-white/5 align-top">
                      <td className="px-2 py-3">
                        <div className="font-bold">{item.name}</div>
                        {item.estimatedCost ? <div className="text-[10px] font-mono text-gray-500">~{formatMYR(item.estimatedCost)}</div> : null}
                      </td>
                      <td className="px-2 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">
                        {[item.intervalKm && formatKm(item.intervalKm), item.intervalMonths && `${item.intervalMonths} mo`].filter(Boolean).join(' / ')}
                      </td>
                      <td className="px-2 py-3 font-mono text-xs text-gray-400">
                        {state.lastDate || state.lastMileage !== undefined ? (
                          <>
                            {state.lastDate && <div>{formatDate(state.lastDate)}</div>}
                            {state.lastMileage !== undefined && <div className="text-gray-600">{formatKm(state.lastMileage)}</div>}
                          </>
                        ) : (
                          <button onClick={() => setScheduleForm({ open: true, item })} className="text-racing-red hover:underline uppercase text-[10px]">Set last done</button>
                        )}
                      </td>
                      <td className="px-2 py-3 font-mono text-xs text-gray-400">
                        {state.dueMileage !== undefined && <div>{formatKm(state.dueMileage)}</div>}
                        {state.dueDate && <div>{formatDate(state.dueDate)}</div>}
                        {state.estimatedDate && state.estimatedDate !== state.dueDate && (
                          <div className="text-gray-600 text-[10px]">est. {formatDate(state.estimatedDate)}</div>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <StatusBadge status={state.status} />
                        {state.status !== 'unknown' && <div className="text-[10px] font-mono text-gray-500 mt-1">{describeDue(state)}</div>}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex gap-2 justify-end">
                          <button aria-label={`Edit ${item.name}`} onClick={() => setScheduleForm({ open: true, item })} className="text-gray-600 hover:text-white"><Pencil className="w-4 h-4" /></button>
                          <button aria-label={`Delete ${item.name}`} onClick={() => setConfirm({ kind: 'schedule', item })} className="text-gray-600 hover:text-racing-red"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section
          title="Issues & Recommendations"
          icon={AlertTriangle}
          action={
            <button onClick={() => setIssueForm({ open: true, issue: null })} className={actionButton}>
              <Plus className="w-4 h-4" /> Report
            </button>
          }
        >
          <div className="space-y-3">
            {(showResolved ? carIssues : openIssues).map(issue => {
              const due = getIssueDue(issue, vehicle, services);
              return (
                <div key={issue.id} className={`p-4 bg-white/5 rounded-xl border border-white/5 ${issue.status === 'resolved' ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between gap-3 mb-1">
                    <h4 className="font-bold">{issue.title}</h4>
                    <div className="flex gap-2 shrink-0">
                      <button aria-label="Edit issue" onClick={() => setIssueForm({ open: true, issue })} className="text-gray-600 hover:text-white"><Pencil className="w-4 h-4" /></button>
                      <button aria-label="Delete issue" onClick={() => setConfirm({ kind: 'issue', issue })} className="text-gray-600 hover:text-racing-red"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {issue.status === 'resolved'
                      ? <StatusBadge status="ok" label={`Resolved ${formatDate(issue.resolvedDate)}`} />
                      : <StatusBadge status={issue.severity === 'high' ? 'overdue' : issue.severity === 'medium' ? 'soon' : 'unknown'} label={`${issue.severity} severity`} />}
                    {issue.status === 'open' && (due === 'overdue' || due === 'soon') && <StatusBadge status={due} label={due === 'overdue' ? 'Past fix-by' : 'Fix soon'} />}
                  </div>
                  {issue.details && <p className="text-sm text-gray-400 mb-2">{issue.details}</p>}
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    {issue.source === 'workshop' ? 'Workshop recommended' : 'Noticed'} {formatDate(issue.reportedDate)}
                    {issue.dueMileage !== undefined && ` · fix by ${formatKm(issue.dueMileage)}`}
                    {issue.dueDate && ` · fix by ${formatDate(issue.dueDate)}`}
                  </p>
                  {issue.status === 'open' && (
                    <button onClick={() => resolveIssue(issue)} disabled={busy} className="mt-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-green-500 hover:text-green-400 disabled:opacity-50">
                      <CheckCircle2 className="w-4 h-4" /> Mark resolved
                    </button>
                  )}
                </div>
              );
            })}
            {openIssues.length === 0 && !showResolved && <p className="text-gray-500 text-sm italic">No open issues.</p>}
            {resolvedIssues.length > 0 && (
              <button onClick={() => setShowResolved(s => !s)} className="text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-white">
                {showResolved ? 'Hide resolved' : `Show resolved (${resolvedIssues.length})`}
              </button>
            )}
          </div>
        </Section>

        <div className="space-y-8">
          <Section title="Vehicle Profile" icon={Wrench}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {details.filter(([, value]) => value).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{label}</dt>
                  <dd className="font-mono break-all">{value}</dd>
                </div>
              ))}
              {getRenewals(vehicle).map(r => (
                <div key={r.label}>
                  <dt className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{r.label} Expiry</dt>
                  <dd className="font-mono flex flex-wrap items-center gap-2">
                    {formatDate(r.date)}
                    {(r.status === 'overdue' || r.status === 'soon') && <StatusBadge status={r.status} label={r.status === 'overdue' ? 'Expired' : 'Renew soon'} />}
                  </dd>
                </div>
              ))}
            </dl>
            {details.every(([, value]) => !value) && getRenewals(vehicle).length === 0 && (
              <p className="text-gray-500 text-sm italic">
                Add make, model, chassis number and renewal dates with <button onClick={() => setEditOpen(true)} className="text-racing-red hover:underline">Edit</button>.
              </p>
            )}
            {vehicle.notes && <p className="text-gray-500 text-sm italic mt-4">"{vehicle.notes}"</p>}
          </Section>

          <Section title="Active Warranties" icon={ShieldCheck}>
            <div className="space-y-3">
              {warranties.map((w, i) => (
                <div key={i} className="flex justify-between gap-3 text-sm">
                  <div>
                    <div>{w.description}</div>
                    <div className="text-[10px] font-mono text-gray-500 uppercase">Fitted {formatDate(w.serviceDate)}{w.workshop && ` · ${w.workshop}`}</div>
                  </div>
                  <div className="text-right font-mono text-xs text-green-500 whitespace-nowrap">until {formatDate(w.warrantyUntil)}</div>
                </div>
              ))}
              {warranties.length === 0 && <p className="text-gray-500 text-sm italic">No active warranties. Add warranty dates on cost lines when logging a service.</p>}
            </div>
          </Section>
        </div>
      </div>

      <Section title="Service History" icon={Wrench}>
        <div className="space-y-4">
          {carServices.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} showVehicle={false}
              onEdit={() => serviceActions.openForm(service)} onDelete={() => serviceActions.askDelete(service)} />
          ))}
          {carServices.length === 0 && <p className="text-gray-500 text-sm italic">No services logged for this car yet.</p>}
        </div>
      </Section>

      <VehicleForm open={editOpen} onClose={() => setEditOpen(false)} vehicle={vehicle} />
      <ScheduleForm open={scheduleForm.open} onClose={() => setScheduleForm(s => ({ ...s, open: false }))} vehicleId={vehicle.id} item={scheduleForm.item} />
      <IssueForm open={issueForm.open} onClose={() => setIssueForm(s => ({ ...s, open: false }))} issue={issueForm.issue} defaultVehicleId={vehicle.id} />
      {serviceActions.dialogs(vehicle.id)}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'vehicle' ? 'Delete Vehicle?' : confirm?.kind === 'schedule' ? 'Remove Schedule Item?' : 'Delete Issue?'}
        message={
          confirm?.kind === 'vehicle'
            ? <>This permanently deletes this car and its {carServices.length} service log(s), {carSchedules.length} schedule item(s) and {carIssues.length} issue(s). If you sold it, use "Mark as Sold" to keep its history.</>
            : confirm?.kind === 'schedule'
              ? `"${confirm.item.name}" will no longer be tracked. Past service logs are kept.`
              : 'This issue will be permanently removed.'
        }
        confirmLabel="Delete"
        onConfirm={handleConfirm}
        onCancel={() => { setConfirm(null); setError(null); }}
        busy={busy}
        error={confirm ? error : null}
      />
    </div>
  );
}
