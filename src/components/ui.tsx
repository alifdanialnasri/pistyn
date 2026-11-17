import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Clock, CheckCircle2, HelpCircle, LucideIcon } from 'lucide-react';
import { DueStatus } from '../lib/maintenance';

export const inputClass =
  'w-full bg-black border border-white/10 rounded-lg px-4 py-3 focus:border-racing-red focus:outline-none transition-colors disabled:opacity-50';

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">
      {children}
    </label>
  );
}

export function PageHeader({ kicker, title, action }: { kicker: string; title: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
      <div>
        <h2 className="text-[10px] md:text-sm font-mono text-gray-500 uppercase tracking-widest mb-1">{kicker}</h2>
        <h1 className="text-2xl md:text-4xl font-bold italic tracking-tighter uppercase">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function Modal({ open, onClose, title, children, size = 'lg' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'lg' | 'xl';
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${size === 'xl' ? 'max-w-2xl' : 'max-w-lg'} bg-surface-dark border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]`}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-6 right-6 text-gray-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-bold italic uppercase tracking-tighter mb-8 pr-10">{title}</h3>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel, busy, error }: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-sm racing-panel p-8 rounded-2xl text-center"
          >
            <AlertTriangle className="w-12 h-12 text-racing-red mx-auto mb-4" />
            <h3 className="text-xl font-bold italic uppercase tracking-tighter mb-2">{title}</h3>
            <div className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-6">{message}</div>
            <FormError message={error} />
            <div className="grid grid-cols-2 gap-4 mt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-colors uppercase font-mono text-[10px] tracking-widest disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="py-3 bg-racing-red text-white rounded-xl hover:bg-red-600 transition-colors uppercase font-bold text-[10px] tracking-widest disabled:opacity-50"
              >
                {busy ? 'Working...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="bg-racing-red/10 border border-racing-red/20 p-3 rounded-lg text-[11px] text-racing-red font-mono uppercase leading-tight tracking-wide mb-4">
      {message}
    </p>
  );
}

export function EmptyState({ icon: Icon, text, children }: { icon: LucideIcon; text: string; children?: ReactNode }) {
  return (
    <div className="col-span-full py-16 text-center racing-panel rounded-2xl border-2 border-dashed border-white/5">
      <Icon className="w-16 h-16 text-white/5 mx-auto mb-4" />
      <p className="text-gray-500 uppercase tracking-widest text-sm">{text}</p>
      {children}
    </div>
  );
}

const statusStyles: Record<DueStatus, { label: string; icon: LucideIcon; className: string }> = {
  overdue: { label: 'Overdue', icon: AlertTriangle, className: 'bg-racing-red/10 text-racing-red border-racing-red/30' },
  soon: { label: 'Due Soon', icon: Clock, className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  ok: { label: 'OK', icon: CheckCircle2, className: 'bg-green-500/10 text-green-500 border-green-500/30' },
  unknown: { label: 'No Record', icon: HelpCircle, className: 'bg-white/5 text-gray-500 border-white/10' },
};

export function StatusBadge({ status, label }: { status: DueStatus; label?: string }) {
  const s = statusStyles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap ${s.className}`}>
      <s.icon className="w-3 h-3" />
      {label ?? s.label}
    </span>
  );
}

export function LoadingBar() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-16 h-1 bg-racing-red animate-pulse"></div>
    </div>
  );
}
