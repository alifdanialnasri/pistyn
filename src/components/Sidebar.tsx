import { Car, Package, LogOut, ChevronRight, Menu, X, AlertTriangle, Wallet, Database, ShieldCheck, Home, History, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { useState } from 'react';
import { DEMO_MODE, handleSecretTap } from '../lib/demoConfig';
import { planLabel, planStatus } from '../lib/adminConfig';
import { formatDate } from '../lib/utils';
import { UserProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenBackup: () => void;
  onNewService: () => void;
  isAdmin?: boolean;
  profile?: UserProfile | null;
}

// Phone navigation: the everyday screens, one tap to log a service, the rest under More
const tabItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'vehicles', label: 'Garage', icon: Car },
  { id: 'services', label: 'History', icon: History },
];

const menuItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'vehicles', label: 'Garage', icon: Car },
  { id: 'services', label: 'History', icon: History },
  { id: 'issues', label: 'Issues', icon: AlertTriangle },
  { id: 'expenses', label: 'Costs', icon: Wallet },
  { id: 'parts', label: 'Parts', icon: Package },
];

export default function Sidebar({ activeTab, setActiveTab, onOpenBackup, onNewService, isAdmin, profile }: SidebarProps) {
  const items = isAdmin ? [...menuItems, { id: 'admin', label: 'Admin', icon: ShieldCheck }] : menuItems;
  const status = planStatus(profile);
  const [isOpen, setIsOpen] = useState(false);

  const handleTabSelect = (id: string) => {
    setActiveTab(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className={`lg:hidden fixed left-0 right-0 bg-surface-dark border-b border-white/5 flex items-center justify-between px-6 z-40 bg-carbon ${DEMO_MODE ? 'h-16 top-[calc(1.5rem+env(safe-area-inset-top,0px))]' : 'top-0 h-[calc(4rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)]'}`}>
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={handleSecretTap}>
          <div className="w-6 h-6 bg-racing-red flex items-center justify-center font-bold text-lg italic skew-x-[-15deg]">P</div>
          <span className="font-bold italic uppercase tracking-tighter">Pistyn</span>
        </div>
      </div>

      {/* Bottom tab bar (Mobile) */}
      <nav aria-label="Main" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-dark/95 backdrop-blur-md border-t border-white/5 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="grid grid-cols-5 h-16">
          {tabItems.slice(0, 2).map(tab => (
            <TabButton key={tab.id} label={tab.label} icon={tab.icon} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
          ))}
          <div className="flex items-center justify-center">
            <button
              onClick={onNewService}
              aria-label="Log a service"
              className="w-14 h-14 -mt-6 rounded-2xl bg-racing-red text-white flex items-center justify-center shadow-lg shadow-racing-red/30 border-4 border-carbon-black active:scale-95 transition-transform"
            >
              <Plus className="w-7 h-7" strokeWidth={2.5} />
            </button>
          </div>
          <TabButton label={tabItems[2].label} icon={tabItems[2].icon} active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
          <TabButton
            label="More"
            icon={Menu}
            active={isOpen || !['dashboard', 'vehicles', 'services'].includes(activeTab)}
            onClick={() => setIsOpen(true)}
          />
        </div>
      </nav>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <div className={`
        fixed lg:sticky lg:top-0 lg:h-dvh inset-y-0 left-0 z-50 w-64 shrink-0 bg-surface-dark border-r border-white/5 flex flex-col transition-transform duration-300 transform
        ${DEMO_MODE ? 'pt-[calc(3rem+env(safe-area-inset-top,0px))] lg:pt-12' : 'pt-[calc(2rem+env(safe-area-inset-top,0px))] lg:pt-8'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-6 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleSecretTap}>
            <div className="w-8 h-8 bg-racing-red flex items-center justify-center font-bold text-xl italic skew-x-[-15deg]">P</div>
            <h1 className="text-2xl font-bold tracking-tighter italic uppercase">Pistyn</h1>
          </div>
          <button onClick={() => setIsOpen(false)} aria-label="Close menu" className="lg:hidden p-2 -mr-2 text-gray-500 active:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto overscroll-contain">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabSelect(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all relative overflow-hidden group ${
                activeTab === item.id
                  ? 'bg-racing-red text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
              {activeTab === item.id && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-0 top-0 w-1 h-full bg-white"
                />
              )}
              <ChevronRight className={`ml-auto w-4 h-4 transition-transform ${activeTab === item.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
            </button>
          ))}
        </nav>

        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:pb-4 border-t border-white/5 space-y-1">
          {profile && (
            <p className="px-4 pb-2 text-xs text-gray-500">
              {status.state === 'active'
                ? <>{planLabel(status.plan)} plan · until {formatDate(profile.planExpiresAt)}</>
                : status.state === 'expired' ? <>{planLabel(profile.plan)} expired · Free plan</> : 'Free plan'}
            </p>
          )}
          <button
            onClick={() => { setIsOpen(false); onOpenBackup(); }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:text-white active:bg-white/5 transition-colors"
          >
            <Database className="w-5 h-5" />
            <span className="font-medium">Backup & export</span>
          </button>
          <button
            onClick={() => {
              if (DEMO_MODE) {
                window.location.reload();
              } else {
                auth.signOut();
              }
            }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:text-racing-red active:bg-white/5 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </div>
    </>
  );
}

function TabButton({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Home; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-white' : 'text-gray-500 active:text-gray-300'}`}
    >
      <Icon className={`w-6 h-6 ${active ? 'text-racing-red' : ''}`} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
