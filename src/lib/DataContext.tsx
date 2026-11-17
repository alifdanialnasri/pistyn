import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { DataService } from './dataService';
import { Vehicle, ServiceRecord, Part, ScheduleItem, Issue } from '../types';
import { errorMessage } from './utils';

interface AppData {
  vehicles: Vehicle[];
  services: ServiceRecord[];
  parts: Part[];
  schedules: ScheduleItem[];
  issues: Issue[];
}

interface DataContextValue extends AppData {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const byNewest = (a: { createdAt?: string }, b: { createdAt?: string }) =>
  (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({ vehicles: [], services: [], parts: [], schedules: [], issues: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [vehicles, services, parts, schedules, issues] = await Promise.all([
        DataService.list<Vehicle>('vehicles'),
        DataService.list<ServiceRecord>('services'),
        DataService.list<Part>('parts'),
        DataService.list<ScheduleItem>('schedules'),
        DataService.list<Issue>('issues'),
      ]);
      setData({
        vehicles: vehicles.sort(byNewest),
        services: services.sort((a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage),
        parts: parts.sort(byNewest),
        schedules: schedules.sort((a, b) => a.name.localeCompare(b.name)),
        issues: issues.sort((a, b) => b.reportedDate.localeCompare(a.reportedDate)),
      });
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <DataContext.Provider value={{ ...data, loading, error, reload }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
