import { useState, FormEvent } from 'react';
import { Plus, Package, ShoppingCart, Trash2, ThumbsDown, ThumbsUp, MinusCircle, Pencil } from 'lucide-react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { Part, PartStatus } from '../types';
import { formatMYR, formatKm, optionalText, optionalNumber, numberInput, errorMessage } from '../lib/utils';
import { partLifespan } from '../lib/maintenance';
import {
  PageHeader, HeaderButton, EmptyState, Modal, ConfirmDialog, Label, FormError, inputClass, ListGroup, ListRow, InfoRow, Tone,
  SplitView, DetailPanel, useIsDesktop
} from './ui';

const statusInfo: Record<PartStatus, { label: string; icon: typeof Package; tone: Tone; text: string; badge: string }> = {
  preferred: { label: 'Recommend', icon: ThumbsUp, tone: 'green', text: 'text-green-400', badge: 'bg-green-500/15 text-green-400' },
  neutral: { label: 'Okay', icon: MinusCircle, tone: 'gray', text: 'text-gray-400', badge: 'bg-white/5 text-gray-300' },
  'not recommended': { label: 'Avoid', icon: ThumbsDown, tone: 'red', text: 'text-racing-red', badge: 'bg-racing-red/15 text-racing-red' },
};

const emptyForm = { name: '', category: '', purchaseLink: '', notes: '', price: '', status: 'neutral' as PartStatus };

export default function Parts() {
  const { parts, services, vehicles, reload } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [itemToConfirmDelete, setItemToConfirmDelete] = useState<Part | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = (part?: Part) => {
    setError(null);
    if (part) {
      setEditingPart(part);
      setFormData({
        name: part.name,
        category: part.category || '',
        purchaseLink: part.purchaseLink || '',
        notes: part.notes || '',
        price: numberInput(part.price),
        status: part.status
      });
    } else {
      setEditingPart(null);
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: formData.name.trim(),
      category: optionalText(formData.category),
      purchaseLink: optionalText(formData.purchaseLink),
      notes: optionalText(formData.notes),
      price: optionalNumber(formData.price),
      status: formData.status
    };
    try {
      if (editingPart) await DataService.update('parts', editingPart.id, payload);
      else await DataService.add('parts', payload);
      await reload();
      setIsModalOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToConfirmDelete) return;
    setSaving(true);
    setError(null);
    try {
      await DataService.remove([{ col: 'parts', id: itemToConfirmDelete.id }]);
      await reload();
      setItemToConfirmDelete(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const desktop = useIsDesktop();
  const viewing = desktop ? null : parts.find(p => p.id === viewingId) ?? null;
  const selected = parts.find(p => p.id === viewingId) ?? parts[0];

  // A part's details and actions; shown in a sheet on phones or the desktop panel
  const details = (part: Part) => {
    const life = partLifespan(part, parts, services);
    return (
      <div className="space-y-5">
        <div className="flex justify-center">
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${statusInfo[part.status].badge}`}>{statusInfo[part.status].label}</span>
        </div>
        <ListGroup>
          <InfoRow label="Category" value={part.category || '—'} />
          <InfoRow label="Price" value={part.price !== undefined && Number.isFinite(part.price) ? formatMYR(part.price) : '—'} />
          {life.average !== null && <InfoRow label="Lasts about" value={`${formatKm(life.average).toLowerCase()} (${life.lifespans.length}×)`} />}
          {life.inUse.map(u => (
            <InfoRow key={`${u.vehicleId}-${u.since}`} label="Fitted now" value={`${vehicles.find(v => v.id === u.vehicleId)?.name ?? 'A car'} at ${formatKm(u.since).toLowerCase()}`} />
          ))}
        </ListGroup>
        {part.notes && <p className="text-gray-300 bg-white/5 rounded-2xl p-4">{part.notes}</p>}
        {part.purchaseLink && (
          <a href={part.purchaseLink} target="_blank" rel="noopener noreferrer" className="racing-button w-full flex items-center justify-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Buy again
          </a>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setViewingId(null); setError(null); setItemToConfirmDelete(part); }} className="btn-secondary flex items-center justify-center gap-2 text-racing-red">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <button onClick={() => { if (!desktop) setViewingId(null); handleOpenModal(part); }} className="btn-secondary flex items-center justify-center gap-2">
            <Pencil className="w-4 h-4" /> Edit
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Parts" subtitle="What you've fitted, rated"
        action={<HeaderButton icon={Plus} label="Add" onClick={() => handleOpenModal()} />} />

      <SplitView
        placeholder="Pick a part to see the details."
        detail={selected && <DetailPanel title={selected.name}>{details(selected)}</DetailPanel>}
        list={parts.length > 0 ? (
          <ListGroup>
            {parts.map(part => {
              const st = statusInfo[part.status];
              return (
                <ListRow
                  key={part.id}
                  icon={st.icon}
                  tone={st.tone}
                  title={part.name}
                  subtitle={[part.category, part.price !== undefined && Number.isFinite(part.price) && formatMYR(part.price)].filter(Boolean).join(' · ') || 'No category'}
                  trailing={<span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>}
                  onClick={() => setViewingId(part.id)}
                  selected={desktop && part.id === selected?.id}
                />
              );
            })}
          </ListGroup>
        ) : (
          <EmptyState icon={Package} text="No parts yet. Add the ones you like (or regret) so you remember next time.">
            <button onClick={() => handleOpenModal()} className="racing-button">Add a part</button>
          </EmptyState>
        )}
      />

      <Modal open={!!viewing} onClose={() => setViewingId(null)} title={viewing?.name ?? ''}>
        {viewing && details(viewing)}
      </Modal>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPart ? 'Edit part' : 'Add a part'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="p-name">Name</Label>
            <input id="p-name" required maxLength={100} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Brembo Brake Pads" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-cat">Category</Label>
              <input id="p-cat" maxLength={100} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Brakes" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="p-price">Price (RM)</Label>
              <input id="p-price" type="number" inputMode="decimal" min="0" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                className={`${inputClass} font-mono`} />
            </div>
          </div>
          <p className="-mt-3 text-xs text-gray-500">Use the same category for parts that replace each other, so Pistyn can tell how long each lasts.</p>

          <div>
            <Label htmlFor="p-link">Where to buy (link)</Label>
            <input id="p-link" type="url" maxLength={4000} value={formData.purchaseLink} onChange={e => setFormData({ ...formData, purchaseLink: e.target.value })}
              placeholder="https://..." className={inputClass} />
          </div>

          <div>
            <Label>Would you buy it again?</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['preferred', 'neutral', 'not recommended'] as PartStatus[]).map(status => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={formData.status === status}
                  onClick={() => setFormData({ ...formData, status })}
                  className={`py-3 px-1 rounded-2xl text-sm font-semibold transition-all border ${
                    formData.status === status
                      ? status === 'preferred' ? 'bg-green-500 border-green-500 text-white' :
                        status === 'not recommended' ? 'bg-racing-red border-racing-red text-white' :
                        'bg-gray-500 border-gray-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  {statusInfo[status].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="p-notes">Notes</Label>
            <textarea id="p-notes" maxLength={1000} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Fit, feel, how long it lasted…" className={`${inputClass} h-24 resize-none`} />
          </div>

          <FormError message={error} />
          <button type="submit" disabled={saving} className="racing-button w-full disabled:opacity-50">
            {saving ? 'Saving…' : editingPart ? 'Save changes' : 'Add part'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!itemToConfirmDelete}
        title="Delete this part?"
        message="It will be removed from your parts list."
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={handleDelete}
        onCancel={() => setItemToConfirmDelete(null)}
        busy={saving}
        error={itemToConfirmDelete ? error : null}
      />
    </div>
  );
}
