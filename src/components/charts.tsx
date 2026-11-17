import { useState } from 'react';
import { formatMYR } from '../lib/utils';

// Single series throughout, so one hue and no legend; values are always shown as text too
const BAR_COLOR = '#38BDF8';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatCount = (n: number) => n.toLocaleString('en-MY');

export function ColumnChart({ data, label, format = formatMYR }: {
  data: { label: string; full: string; value: number }[];
  label: string;
  format?: (value: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.value), 0);
  const active = hover !== null ? data[hover] : null;

  return (
    <figure>
      <div className="h-6 mb-2 text-xs font-mono text-gray-300" aria-live="polite">
        {active ? <>{active.full}: <span className="font-bold text-white">{format(active.value)}</span></> : <span className="text-gray-600">Hover or tap a bar for details</span>}
      </div>
      <div className="relative h-44 border-b border-white/10" role="img" aria-label={label}>
        {max > 0 && (
          <div className="absolute top-0 left-0 right-0 border-t border-dashed border-white/5">
            <span className="absolute -top-2 right-0 bg-surface-dark pl-1 text-[10px] font-mono text-gray-600">{format(max)}</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-end gap-[2px] md:gap-2 pt-3">
          {data.map((d, i) => (
            <button
              type="button"
              key={d.full}
              aria-label={`${d.full}: ${format(d.value)}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => setHover(i)}
              className="flex-1 h-full flex items-end focus:outline-none"
            >
              <span
                className="w-full max-w-10 mx-auto rounded-t-[4px] transition-opacity"
                style={{
                  height: max ? `${(d.value / max) * 100}%` : 0,
                  minHeight: d.value > 0 ? 2 : 0,
                  backgroundColor: BAR_COLOR,
                  opacity: hover === null || hover === i ? 1 : 0.4
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-[2px] md:gap-2 mt-2">
        {data.map(d => <span key={d.full} className="flex-1 text-center text-[9px] md:text-[10px] font-mono text-gray-500 uppercase">{d.label}</span>)}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>{data.map(d => <tr key={d.full}><th>{d.full}</th><td>{format(d.value)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

export function BarList({ rows, empty, format = formatMYR }: {
  rows: { label: string; value: number }[];
  empty: string;
  format?: (value: number) => string;
}) {
  const max = Math.max(...rows.map(r => r.value), 0);
  if (!rows.length || max === 0) return <p className="text-gray-500 text-sm italic">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map(r => (
        <li key={r.label}>
          <div className="flex justify-between text-sm mb-1 gap-3">
            <span className="text-gray-300 truncate">{r.label}</span>
            <span className="font-mono text-gray-300 whitespace-nowrap">{format(r.value)}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-r-[4px]">
            <div className="h-2 rounded-r-[4px]" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: BAR_COLOR }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
