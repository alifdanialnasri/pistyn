import { createPortal } from 'react-dom';
import { useData } from '../lib/DataContext';
import { formatMYR, formatKm, formatDate, formatMileage, getCurrentMileage, todayISO, getAttachments } from '../lib/utils';
import { getScheduleState, getRenewals, serviceTypeLabel } from '../lib/maintenance';

const statusText = { overdue: 'OVERDUE', soon: 'Due soon', ok: 'OK', unknown: 'No record' };

// Rendered only for printing. The browser's print dialog has a "Save as PDF" option.
export default function PrintReport({ vehicleId }: { vehicleId: string }) {
  const { vehicles, services, schedules, issues } = useData();
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return null;

  const history = services.filter(s => s.vehicleId === vehicle.id);
  const carSchedules = schedules.filter(s => s.vehicleId === vehicle.id).map(item => getScheduleState(item, vehicle, services));
  const openIssues = issues.filter(i => i.vehicleId === vehicle.id && i.status === 'open');
  const total = history.reduce((sum, s) => sum + s.cost, 0);

  const profile: [string, string | undefined][] = [
    ['Plate Number', vehicle.plateNumber],
    ['Make / Model', [vehicle.make, vehicle.model].filter(Boolean).join(' ') || undefined],
    ['Year', vehicle.year?.toString()],
    ['Chassis No.', vehicle.vin],
    ['Engine No.', vehicle.engineNumber],
    ['Current Mileage', formatMileage(getCurrentMileage(vehicle, services))],
    ['Purchased', vehicle.purchaseDate && `${formatDate(vehicle.purchaseDate)}${vehicle.purchaseMileage !== undefined ? ` at ${formatKm(vehicle.purchaseMileage)}` : ''}`],
    ...getRenewals(vehicle).map(r => [`${r.label} Expiry`, formatDate(r.date)] as [string, string]),
  ];

  const th = 'text-left font-semibold border-b-2 border-black py-1.5 pr-3 align-bottom';
  const td = 'border-b border-gray-300 py-1.5 pr-3 align-top';

  return createPortal(
    <div className="hidden print:block print-report text-black bg-white text-[11px] leading-snug font-sans">
      <header className="flex justify-between items-end border-b-4 border-black pb-3 mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest">Vehicle Service Record</p>
          <h1 className="text-2xl font-bold">{vehicle.name}</h1>
        </div>
        <div className="text-right text-[10px]">
          <p className="font-bold text-base italic">PISTYN</p>
          <p>Generated {formatDate(todayISO())}</p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-x-6 gap-y-2 mb-6">
        {profile.filter(([, v]) => v).map(([label, value]) => (
          <div key={label}>
            <p className="text-[9px] uppercase tracking-wider text-gray-600">{label}</p>
            <p className="font-semibold">{value}</p>
          </div>
        ))}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-gray-600">Services Recorded</p>
          <p className="font-semibold">{history.length} · {formatMYR(total)}</p>
        </div>
      </section>

      {carSchedules.length > 0 && (
        <section className="mb-6 break-inside-avoid">
          <h2 className="text-sm font-bold uppercase mb-2">Maintenance Schedule Status</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr><th className={th}>Item</th><th className={th}>Interval</th><th className={th}>Last Done</th><th className={th}>Next Due</th><th className={th}>Status</th></tr>
            </thead>
            <tbody>
              {carSchedules.map(s => (
                <tr key={s.item.id}>
                  <td className={td}>{s.item.name}</td>
                  <td className={td}>{[s.item.intervalKm && formatKm(s.item.intervalKm), s.item.intervalMonths && `${s.item.intervalMonths} months`].filter(Boolean).join(' / ')}</td>
                  <td className={td}>{[s.lastDate && formatDate(s.lastDate), s.lastMileage !== undefined && formatKm(s.lastMileage)].filter(Boolean).join(' · ') || '—'}</td>
                  <td className={td}>{[s.dueDate && formatDate(s.dueDate), s.dueMileage !== undefined && formatKm(s.dueMileage)].filter(Boolean).join(' · ') || '—'}</td>
                  <td className={`${td} ${s.status === 'overdue' ? 'font-bold' : ''}`}>{statusText[s.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase mb-2">Service History</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Date</th><th className={th}>Mileage</th><th className={th}>Work Done</th>
              <th className={th}>Workshop</th><th className={`${th} text-right pr-0`}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {history.map(s => {
              const work = (s.scheduleIds ?? []).map(id => schedules.find(x => x.id === id)?.name).filter(Boolean);
              return (
                <tr key={s.id} className="break-inside-avoid">
                  <td className={`${td} whitespace-nowrap`}>{formatDate(s.date)}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatKm(s.mileage)}</td>
                  <td className={td}>
                    <p className="font-semibold">{s.description}</p>
                    <p className="text-[9px] text-gray-600">{serviceTypeLabel(s.serviceType)}{work.length ? ` · ${work.join(', ')}` : ''}</p>
                    {s.lineItems?.map((l, i) => (
                      <p key={i} className="text-[9px] text-gray-700">
                        {l.quantity} × {l.description} — {formatMYR(l.quantity * l.unitPrice)}{l.warrantyUntil ? ` (warranty to ${formatDate(l.warrantyUntil)})` : ''}
                      </p>
                    ))}
                    {s.notes && <p className="text-[9px] italic text-gray-700">{s.notes}</p>}
                    {getAttachments(s).length > 0 && <p className="text-[9px] text-gray-600">{getAttachments(s).length} receipt/document(s) on file</p>}
                  </td>
                  <td className={td}>
                    {s.workshop || 'Owner'}
                    {s.workshopLocation && <span className="block text-[9px] text-gray-600">{s.workshopLocation}</span>}
                    {s.invoiceNumber && <span className="block text-[9px] text-gray-600">Inv. {s.invoiceNumber}</span>}
                  </td>
                  <td className={`${td} text-right pr-0 whitespace-nowrap`}>{formatMYR(s.cost)}</td>
                </tr>
              );
            })}
            {history.length === 0 && <tr><td className={td} colSpan={5}>No services recorded.</td></tr>}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-2 font-bold text-right pr-3">Total</td>
              <td className="pt-2 font-bold text-right whitespace-nowrap">{formatMYR(total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {openIssues.length > 0 && (
        <section className="mb-6 break-inside-avoid">
          <h2 className="text-sm font-bold uppercase mb-2">Open Issues & Recommendations</h2>
          <ul className="list-disc pl-5">
            {openIssues.map(i => (
              <li key={i.id}>
                <span className="font-semibold">{i.title}</span> ({i.severity}) — noted {formatDate(i.reportedDate)}
                {i.dueMileage !== undefined && `, fix by ${formatKm(i.dueMileage)}`}{i.dueDate && `, fix by ${formatDate(i.dueDate)}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-black pt-2 text-[9px] text-gray-600">
        This record was kept by the owner in Pistyn | Performance Hub. Original receipts are available on request.
      </footer>
    </div>,
    document.body
  );
}
