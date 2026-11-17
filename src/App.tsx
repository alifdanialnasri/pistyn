/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import VehicleDetail from './components/VehicleDetail';
import Services from './components/Services';
import Issues from './components/Issues';
import Expenses from './components/Expenses';
import Parts from './components/Parts';
import BackupModal from './components/BackupModal';
import PrintReport from './components/PrintReport';
import Admin from './components/Admin';
import { DataProvider, useData } from './lib/DataContext';
import { LoadingBar } from './components/ui';
import { DEMO_MODE } from './lib/demoConfig';
import { syncProfile } from './lib/profile';
import { isAdminUser } from './lib/adminConfig';
import { UserProfile } from './types';

function Workspace({ isAdmin, profile }: { isAdmin: boolean; profile: UserProfile | null }) {
  const { loading, error, reload, vehicles } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [reportVehicleId, setReportVehicleId] = useState<string | null>(null);

  const selectTab = useCallback((tab: string) => {
    setActiveTab(tab);
    setSelectedVehicleId(null);
  }, []);

  const openVehicle = useCallback((id: string) => {
    setActiveTab('vehicles');
    setSelectedVehicleId(id);
  }, []);

  const closeVehicle = useCallback(() => setSelectedVehicleId(null), []);

  // Mount the printable report, open the print dialog, then remove it when printing ends
  useEffect(() => {
    if (!reportVehicleId) return;
    const done = () => setReportVehicleId(null);
    window.addEventListener('afterprint', done);
    const timer = setTimeout(() => window.print(), 150);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [reportVehicleId]);

  // Start each page at the top
  useEffect(() => {
    document.getElementById('main-scroll')?.scrollTo({ top: 0 });
  }, [activeTab, selectedVehicleId]);

  const renderContent = () => {
    if (loading) return <LoadingBar />;
    if (error && vehicles.length === 0) {
      return (
        <div className="racing-panel p-8 rounded-2xl text-center max-w-lg mx-auto mt-12">
          <p className="text-racing-red font-mono uppercase text-sm mb-2">Could not load your records</p>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => reload()} className="racing-button">Try Again</button>
        </div>
      );
    }
    switch (activeTab) {
      case 'vehicles':
        return selectedVehicleId
          ? <VehicleDetail vehicleId={selectedVehicleId} onBack={closeVehicle} onPrint={setReportVehicleId} />
          : <Vehicles onOpenVehicle={openVehicle} />;
      case 'services': return <Services />;
      case 'issues': return <Issues onOpenVehicle={openVehicle} />;
      case 'expenses': return <Expenses />;
      case 'parts': return <Parts />;
      case 'admin': return isAdmin ? <Admin /> : <Dashboard setActiveTab={selectTab} onOpenVehicle={openVehicle} />;
      default: return <Dashboard setActiveTab={selectTab} onOpenVehicle={openVehicle} />;
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-carbon-black bg-carbon overflow-hidden text-sm md:text-base relative print:hidden">
        {DEMO_MODE && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-racing-red text-white py-1 text-center font-mono text-[10px] tracking-[0.2em] uppercase font-bold border-b border-white/20 select-none pointer-events-none">
            DEMO MODE ACTIVE • DATA SAVED ON THIS DEVICE
          </div>
        )}
        <Sidebar activeTab={activeTab} setActiveTab={selectTab} onOpenBackup={() => setBackupOpen(true)} isAdmin={isAdmin} profile={profile} />
        <main id="main-scroll" className={`flex-1 overflow-y-auto h-screen p-4 md:p-8 bg-black/20 ${DEMO_MODE ? 'pt-24 lg:pt-12' : 'pt-20 lg:pt-8'}`}>
          <div className="max-w-6xl mx-auto">
            {error && vehicles.length > 0 && (
              <p role="alert" className="mb-6 bg-racing-red/10 border border-racing-red/20 p-3 rounded-lg text-[11px] text-racing-red font-mono uppercase">
                Showing saved data. Latest refresh failed: {error}
              </p>
            )}
            {renderContent()}
          </div>
        </main>
      </div>
      <BackupModal open={backupOpen} onClose={() => setBackupOpen(false)} />
      {reportVehicleId && <PrintReport vehicleId={reportVehicleId} />}
    </>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      setUser({ uid: 'demo', email: 'demo@pistyn.io', displayName: 'Demo Driver' } as any);
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setProfile(null);
      setLoading(false);
      if (currentUser) syncProfile(currentUser).then(setProfile);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-carbon-black bg-carbon">
        <div className="w-16 h-1 bg-racing-red animate-pulse"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // Keyed by user so switching accounts never shows the previous account's data
  return (
    <DataProvider key={user.uid}>
      <Workspace isAdmin={!DEMO_MODE && isAdminUser(user)} profile={profile} />
    </DataProvider>
  );
}
