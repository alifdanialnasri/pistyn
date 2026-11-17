import { LayoutDashboard, Car, Wrench, Package, LogOut, ChevronRight, Menu, X, AlertTriangle, Wallet, Database, ShieldCheck } from 'lucide-react';
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
  isAdmin?: boolean;
  profile?: UserProfile | null;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'issues', label: 'Issues', icon: AlertTriangle },
  { id: 'expenses', label: 'Expenses', icon: Wallet },
  { id: 'parts', label: 'Parts Library', icon: Package },
];

export default function Sidebar({ activeTab, setActiveTab, onOpenBackup, isAdmin, profile }: SidebarProps) {
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
      <div className={`lg:hidden fixed left-0 right-0 h-16 bg-surface-dark border-b border-white/5 flex items-center justify-between px-6 z-40 bg-carbon ${DEMO_MODE ? 'top-6' : 'top-0'}`}>
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={handleSecretTap}>
          <div className="w-6 h-6 bg-racing-red flex items-center justify-center font-bold text-lg italic skew-x-[-15deg]">P</div>
          <span className="font-bold italic uppercase tracking-tighter">Pistyn</span>
        </div>
        <button onClick={() => setIsOpen(true)} aria-label="Open menu" className="text-gray-400">
          <Menu className="w-6 h-6" />
        </button>
      </div>

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
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-surface-dark border-r border-white/5 flex flex-col transition-transform duration-300 transform
        ${DEMO_MODE ? 'pt-12' : 'pt-8'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-6 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleSecretTap}>
            <div className="w-8 h-8 bg-racing-red flex items-center justify-center font-bold text-xl italic skew-x-[-15deg]">P</div>
            <h1 className="text-2xl font-bold tracking-tighter italic uppercase">Pistyn</h1>
          </div>
          <button onClick={() => setIsOpen(false)} aria-label="Close menu" className="lg:hidden text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabSelect(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all relative overflow-hidden group ${
                activeTab === item.id
                  ? 'bg-racing-red text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
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

        <div className="p-4 border-t border-white/5 space-y-1">
          {profile && (
            <p className="px-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-gray-500">
              {status.state === 'active'
                ? <>{planLabel(status.plan)} plan · until {formatDate(profile.planExpiresAt)}</>
                : status.state === 'expired' ? <>{planLabel(profile.plan)} expired · Free plan</> : 'Free plan'}
            </p>
          )}
          <button
            onClick={() => { setIsOpen(false); onOpenBackup(); }}
            className="w-full flex items-center gap-4 px-4 py-3 text-gray-400 hover:text-white transition-colors"
          >
            <Database className="w-5 h-5" />
            <span className="font-medium">Backup & Export</span>
          </button>
          <button
            onClick={() => {
              if (DEMO_MODE) {
                window.location.reload();
              } else {
                auth.signOut();
              }
            }}
            className="w-full flex items-center gap-4 px-4 py-3 text-gray-400 hover:text-racing-red transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
