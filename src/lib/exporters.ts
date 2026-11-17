import { Vehicle, ServiceRecord, ScheduleItem, Issue, Part } from '../types';
import { getScheduleState, getRenewals, serviceTypeLabel, isActive } from './maintenance';
import { parseDate, toISODate, addDays, todayISO } from './utils';

export function downloadFile(fileName: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'vehicle';

// --- Calendar (.ics) ---

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsDate = (iso: string) => iso.replace(/-/g, '');

// Lines longer than 75 characters must be folded with a leading space
function fold(line: string) {
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 73) out.push((i ? ' ' : '') + line.slice(i, i + 73));
  return out.join('\r\n');
}

interface CalendarEvent { uid: string; date: string; title: string; description: string }

export function buildCalendar(vehicles: Vehicle[], services: ServiceRecord[], schedules: ScheduleItem[], issues: Issue[]) {
  const events: CalendarEvent[] = [];
  const today = todayISO();

  vehicles.filter(isActive).forEach(v => {
    schedules.filter(s => s.vehicleId === v.id).forEach(item => {
      const state = getScheduleState(item, v, services);
      if (state.status === 'unknown') return;
      const date = state.estimatedDate ?? (state.status === 'overdue' ? today : undefined);
      if (!date) return;
      const due = [
        state.dueMileage !== undefined ? `at ${state.dueMileage.toLocaleString('en-MY')} km` : '',
        state.dueDate ? `by ${state.dueDate}` : ''
      ].filter(Boolean).join(' or ');
      events.push({
        uid: `schedule-${item.id}-${date}`,
        date: date < today ? today : date,
        title: `${v.name}: ${item.name} due`,
        description: `${item.name} is due ${due}. Date is an estimate based on your driving.`
      });
    });
    getRenewals(v).forEach(r => events.push({
      uid: `renewal-${v.id}-${slug(r.label)}-${r.date}`,
      date: r.date,
      title: `${v.name}: ${r.label} expires`,
      description: `${r.label} for ${v.plateNumber} expires on ${r.date}.`
    }));
    issues.filter(i => i.vehicleId === v.id && i.status === 'open' && i.dueDate).forEach(i => events.push({
      uid: `issue-${i.id}-${i.dueDate}`,
      date: i.dueDate!,
      title: `${v.name}: fix ${i.title}`,
      description: i.details ?? i.title
    }));
  });

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pistyn//Maintenance//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...events.flatMap(e => {
      const start = parseDate(e.date)!;
      return [
        'BEGIN:VEVENT',
        `UID:${e.uid}@pistyn`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
        `DTEND;VALUE=DATE:${icsDate(toISODate(addDays(start, 1)))}`,
        `SUMMARY:${icsText(e.title)}`,
        `DESCRIPTION:${icsText(e.description)}`,
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-P7D', `DESCRIPTION:${icsText(e.title)}`, 'END:VALARM',
        'END:VEVENT'
      ];
    }),
    'END:VCALENDAR'
  ];
  return { content: lines.map(fold).join('\r\n') + '\r\n', count: events.length };
}

export function calendarFileName(vehicle?: Vehicle) {
  return `pistyn-${vehicle ? slug(vehicle.name) : 'all'}-reminders.ics`;
}

// --- Spreadsheet (.csv) ---

const csvCell = (value: unknown) => {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildServicesCsv(vehicles: Vehicle[], services: ServiceRecord[], schedules: ScheduleItem[]) {
  const header = ['Date', 'Vehicle', 'Plate', 'Mileage (km)', 'Type', 'Description', 'Work done', 'Workshop', 'Invoice no.', 'Cost (RM)', 'Notes'];
  const rows = services.map(s => {
    const v = vehicles.find(x => x.id === s.vehicleId);
    const work = (s.scheduleIds ?? []).map(id => schedules.find(x => x.id === id)?.name).filter(Boolean).join('; ');
    return [s.date, v?.name ?? 'Unknown', v?.plateNumber ?? '', s.mileage, serviceTypeLabel(s.serviceType), s.description, work,
      s.workshop ?? '', s.invoiceNumber ?? '', s.cost.toFixed(2), s.notes ?? ''];
  });
  // Byte-order mark so Excel opens the file as UTF-8
  return '\uFEFF' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}

// --- Full backup (.json) ---

export function buildBackup(data: { vehicles: Vehicle[]; services: ServiceRecord[]; parts: Part[]; schedules: ScheduleItem[]; issues: Issue[] }) {
  return JSON.stringify({ app: 'Pistyn', version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2);
}
