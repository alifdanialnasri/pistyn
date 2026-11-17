import { useState } from 'react';
import { Database, FileSpreadsheet, CalendarPlus, RotateCcw } from 'lucide-react';
import { useData } from '../lib/DataContext';
import { DEMO_MODE } from '../lib/demoConfig';
import { resetDemoData } from '../lib/mockFirestoreService';
import { buildBackup, buildServicesCsv, buildCalendar, calendarFileName, downloadFile } from '../lib/exporters';
import { todayISO } from '../lib/utils';
import { Modal } from './ui';

const optionClass = 'w-full flex items-start gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors';

export default function BackupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useData();
  const [message, setMessage] = useState<string | null>(null);

  const stamp = todayISO();

  const exportBackup = () => {
    downloadFile(`pistyn-backup-${stamp}.json`, buildBackup(data), 'application/json');
    setMessage('Backup downloaded. Keep it somewhere safe, like Google Drive.');
  };

  const exportCsv = () => {
    downloadFile(`pistyn-services-${stamp}.csv`, buildServicesCsv(data.vehicles, data.services, data.schedules), 'text/csv;charset=utf-8');
    setMessage('Service history downloaded. It opens in Excel or Google Sheets.');
  };

  const exportCalendar = () => {
    const { content, count } = buildCalendar(data.vehicles, data.services, data.schedules, data.issues);
    if (!count) {
      setMessage('Nothing to add yet. Set up schedules, renewal dates, or fix-by dates first.');
      return;
    }
    downloadFile(calendarFileName(), content, 'text/calendar');
    setMessage(`${count} reminder(s) downloaded. Open the file to add them to your calendar. You'll get an alert 7 days before each one.`);
  };

  const resetDemo = async () => {
    resetDemoData();
    await data.reload();
    setMessage('Demo data reset.');
  };

  return (
    <Modal open={open} onClose={() => { setMessage(null); onClose(); }} title="Backup & Export">
      <div className="space-y-3">
        <button onClick={exportBackup} className={optionClass}>
          <Database className="w-5 h-5 text-racing-red shrink-0 mt-0.5" />
          <span>
            <span className="block font-bold">Full Backup (JSON)</span>
            <span className="block text-xs text-gray-500">Every car, service, part, schedule and issue in one file.</span>
          </span>
        </button>
        <button onClick={exportCsv} className={optionClass}>
          <FileSpreadsheet className="w-5 h-5 text-racing-red shrink-0 mt-0.5" />
          <span>
            <span className="block font-bold">Service History (Spreadsheet)</span>
            <span className="block text-xs text-gray-500">All services as a CSV file for Excel or Google Sheets.</span>
          </span>
        </button>
        <button onClick={exportCalendar} className={optionClass}>
          <CalendarPlus className="w-5 h-5 text-racing-red shrink-0 mt-0.5" />
          <span>
            <span className="block font-bold">Reminders for All Cars (Calendar)</span>
            <span className="block text-xs text-gray-500">Due services, road tax and insurance renewals, with an alert a week before. Download again after big changes.</span>
          </span>
        </button>
        {DEMO_MODE && (
          <button onClick={resetDemo} className={optionClass}>
            <RotateCcw className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
            <span>
              <span className="block font-bold">Reset Demo Data</span>
              <span className="block text-xs text-gray-500">Go back to the original sample cars.</span>
            </span>
          </button>
        )}
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest pt-2">
          A printable service report for each car is on its page in the Garage.
        </p>
        {message && (
          <p role="status" className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-[11px] text-green-500 font-mono uppercase tracking-wide">{message}</p>
        )}
      </div>
    </Modal>
  );
}
