import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Clock, CheckCircle2, HelpCircle, ChevronRight, ChevronLeft, LucideIcon } from 'lucide-react';
import { DueStatus } from '../lib/maintenance';

/* ---------- Form fields ---------- */

export const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 placeholder:text-gray-600 focus:border-racing-red focus:bg-white/[0.07] focus:outline-none transition-colors disabled:opacity-50';

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-400 mb-2">
      {children}
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex gap-2 bg-racing-red/10 text-racing-red p-3 rounded-2xl text-sm mb-4">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {message}
    </p>
  );
}

export function Notice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="flex gap-2 bg-green-500/10 text-green-400 p-3 rounded-2xl text-sm">
      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {message}
    </p>
  );
}

/* ---------- Page structure ---------- */

export function PageHeader({ title, subtitle, action, onBack }: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  onBack?: () => void;
  /** @deprecated kept so older callers compile */
  kicker?: string;
}) {
  return (
    <header className="flex items-center gap-3">
      {onBack && (
        <button onClick={onBack} aria-label="Back" className="w-10 h-10 -ml-1 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-gray-300 active:bg-white/10">
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight line-clamp-2 text-balance">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Small red pill used for the main action on a page header */
export function HeaderButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="shrink-0 flex items-center gap-1.5 bg-racing-red text-white rounded-full pl-3 pr-4 py-2.5 text-sm font-bold active:scale-95 transition-transform">
      <Icon className="w-4 h-4" strokeWidth={2.5} /> {label}
    </button>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 mb-2">
      <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{children}</h2>
      {action}
    </div>
  );
}

export function TextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm font-medium text-racing-red active:opacity-60">
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface-dark border border-white/5 rounded-3xl ${className}`}>{children}</div>;
}

/* ---------- Lists ---------- */

export function ListGroup({ children }: { children: ReactNode }) {
  return <div className="bg-surface-dark border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">{children}</div>;
}

const tones = {
  red: 'bg-racing-red/15 text-racing-red',
  amber: 'bg-amber-400/15 text-amber-400',
  green: 'bg-green-500/15 text-green-400',
  blue: 'bg-sky-400/15 text-sky-400',
  gray: 'bg-white/5 text-gray-400',
};
export type Tone = keyof typeof tones;

export function IconTile({ icon: Icon, tone = 'gray', size = 'md' }: { icon: LucideIcon; tone?: Tone; size?: 'md' | 'lg' }) {
  return (
    <span className={`shrink-0 flex items-center justify-center rounded-2xl ${tones[tone]} ${size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'}`}>
      <Icon className={size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
    </span>
  );
}

export function ListRow({ icon, tone, title, subtitle, trailing, onClick, chevron = !!onClick, muted, selected }: {
  icon?: LucideIcon;
  tone?: Tone;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  muted?: boolean;
  /** Highlighted as the item shown in the desktop details panel */
  selected?: boolean;
}) {
  const body = (
    <>
      {icon && <IconTile icon={icon} tone={tone} />}
      <span className="flex-1 min-w-0">
        <span className="block font-semibold truncate">{title}</span>
        {subtitle && <span className="block text-sm text-gray-500 truncate">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-right">{trailing}</span>}
      {chevron && <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />}
    </>
  );
  const cls = `w-full flex items-center gap-3 px-4 py-3.5 text-left ${muted ? 'opacity-50' : ''} ${selected ? 'bg-white/[0.06] shadow-[inset_3px_0_0_var(--color-racing-red)]' : ''}`;
  return onClick
    ? <button onClick={onClick} aria-current={selected || undefined} className={`${cls} active:bg-white/5 lg:hover:bg-white/[0.04] transition-colors`}>{body}</button>
    : <div className={cls}>{body}</div>;
}

/** Label on the left, value on the right; for details lists */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-right min-w-0 break-words">{value}</span>
    </div>
  );
}

export function StatTile({ icon: Icon, label, value, sub, onClick }: {
  icon?: LucideIcon; label: string; value: ReactNode; sub?: ReactNode; onClick?: () => void;
}) {
  const inner = (
    <>
      {Icon && <Icon className="w-5 h-5 text-gray-500 mb-3" />}
      <p className="text-[11px] text-gray-500 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-bold font-mono tracking-tight truncate">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
    </>
  );
  const cls = 'bg-surface-dark border border-white/5 rounded-3xl p-4 text-left min-w-0';
  return onClick
    ? <button onClick={onClick} className={`${cls} active:bg-surface-light`}>{inner}</button>
    : <div className={cls}>{inner}</div>;
}

/* ---------- Filters ---------- */

export function Chips<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto -mx-4 px-4 md:-mx-8 md:px-8 pb-1 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            value === o.value ? 'bg-white text-black' : 'bg-white/5 text-gray-400 active:bg-white/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Overlays ---------- */

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
const sheetEase = [0.32, 0.72, 0, 1] as const;

/** Bottom sheet on phones, centred dialog on larger screens */
export function Modal({ open, onClose, title, children, size = 'lg' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'lg' | 'xl';
}) {
  const phone = isPhone();
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={phone ? { y: '100%' } : { opacity: 0, y: 24 }}
            animate={phone ? { y: 0 } : { opacity: 1, y: 0 }}
            exit={phone ? { y: '100%' } : { opacity: 0, y: 24 }}
            transition={{ duration: phone ? 0.32 : 0.2, ease: sheetEase }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${size === 'xl' ? 'md:max-w-2xl' : 'md:max-w-lg'} bg-surface-dark border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col`}
          >
            <div className="md:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20" />
            <div className="flex items-center gap-3 px-5 md:px-6 pt-4 pb-4">
              <h2 className="flex-1 text-xl font-bold tracking-tight">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close"
                className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-gray-400 active:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 md:px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** A list of actions shown in a sheet (e.g. the "•••" menu on a car) */
export function ActionList({ actions }: {
  actions: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }[];
}) {
  return (
    <ListGroup>
      {actions.map(a => (
        <button key={a.label} onClick={a.onClick} disabled={a.disabled}
          className={`w-full flex items-center gap-3 px-4 py-4 text-left font-medium active:bg-white/5 disabled:opacity-40 ${a.danger ? 'text-racing-red' : ''}`}>
          <a.icon className={`w-5 h-5 ${a.danger ? '' : 'text-gray-400'}`} /> {a.label}
        </button>
      ))}
    </ListGroup>
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
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: sheetEase }}
            role="alertdialog"
            aria-modal="true"
            className="relative w-full md:max-w-sm bg-surface-dark border border-white/10 rounded-t-3xl md:rounded-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 text-center"
          >
            <span className="mx-auto mb-4 w-12 h-12 rounded-full bg-racing-red/15 text-racing-red flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-bold mb-2">{title}</h2>
            <div className="text-gray-400 text-sm mb-6">{message}</div>
            <FormError message={error} />
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary disabled:opacity-50">
                {cancelLabel}
              </button>
              <button type="button" onClick={onConfirm} disabled={busy} className="racing-button disabled:opacity-50">
                {busy ? 'Working…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Status ---------- */

export function EmptyState({ icon: Icon, text, children }: { icon: LucideIcon; text: string; children?: ReactNode }) {
  return (
    <div className="col-span-full py-14 px-6 text-center rounded-3xl border border-dashed border-white/10">
      <span className="mx-auto mb-4 w-14 h-14 rounded-full bg-white/5 text-gray-500 flex items-center justify-center">
        <Icon className="w-7 h-7" />
      </span>
      <p className="text-gray-400">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

const statusStyles: Record<DueStatus, { label: string; icon: LucideIcon; className: string }> = {
  overdue: { label: 'Overdue', icon: AlertTriangle, className: 'bg-racing-red/15 text-racing-red' },
  soon: { label: 'Due soon', icon: Clock, className: 'bg-amber-400/15 text-amber-400' },
  ok: { label: 'OK', icon: CheckCircle2, className: 'bg-green-500/15 text-green-400' },
  unknown: { label: 'No record', icon: HelpCircle, className: 'bg-white/5 text-gray-400' },
};

export const statusTone: Record<DueStatus, Tone> = { overdue: 'red', soon: 'amber', ok: 'green', unknown: 'gray' };

export function StatusBadge({ status, label }: { status: DueStatus; label?: string }) {
  const s = statusStyles[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.className}`}>
      <s.icon className="w-3 h-3" />
      {label ?? s.label}
    </span>
  );
}

export function LoadingBar() {
  return (
    <div className="min-h-[50svh] flex items-center justify-center">
      <div className="w-16 h-1 rounded-full bg-racing-red animate-pulse"></div>
    </div>
  );
}

/* ---------- Desktop layout ---------- */

/** True on screens wide enough for the sidebar and side-by-side panels */
export function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setDesktop(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return desktop;
}

/** List on the left, details of the selected item on the right (desktop only; phones use sheets) */
export function SplitView({ list, detail, placeholder }: { list: ReactNode; detail?: ReactNode; placeholder: string }) {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_460px] lg:gap-8 lg:items-start">
      <div className="space-y-5 min-w-0">{list}</div>
      <aside className="hidden lg:block lg:sticky lg:top-0 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain">
        {detail ?? (
          <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-gray-500">{placeholder}</div>
        )}
      </aside>
    </div>
  );
}

/** Wrapper for details shown in the desktop panel, matching the sheet layout */
export function DetailPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold tracking-tight mb-5">{title}</h2>
      {children}
    </Card>
  );
}
