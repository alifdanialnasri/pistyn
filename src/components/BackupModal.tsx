import { useState } from 'react';
import { Database, FileSpreadsheet, CalendarPlus, RotateCcw } from 'lucide-react';
import { useData } from '../lib/DataContext';
import { DEMO_MODE } from '../lib/demoConfig';
import { resetDemoData } from '../lib/mockFirestoreService';
import { buildBackup, buildServicesCsv, buildCalendar, calendarFileName, downloadFile } from '../lib/exporters';
import { todayISO } from '../lib/utils';
import { Modal, ListGroup, ListRow, Notice } from './ui';

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
    <Modal open={open} onClose={() => { setMessage(null); onClose(); }} title="Backup & export">
      <div className="space-y-4">
        <ListGroup>
          <ListRow icon={Database} tone="red" title="Full backup" subtitle="Everything, in one file" onClick={exportBackup} />
          <ListRow icon={FileSpreadsheet} tone="green" title="Service history" subtitle="Spreadsheet for Excel or Sheets" onClick={exportCsv} />
          <ListRow icon={CalendarPlus} tone="blue" title="Calendar reminders" subtitle="Services and renewals, all cars" onClick={exportCalendar} />
          {DEMO_MODE && <ListRow icon={RotateCcw} tone="gray" title="Reset demo data" subtitle="Back to the sample cars" onClick={resetDemo} />}
        </ListGroup>
        <p className="text-sm text-gray-500 px-1">Need a report for a buyer? Open the car in Garage and tap ••• .</p>
        <Notice message={message} />
      </div>
    </Modal>
  );
}
