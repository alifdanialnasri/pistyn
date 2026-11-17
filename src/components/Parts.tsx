import { useState, FormEvent } from 'react';
import { Plus, Package, ShoppingCart, Trash2, AlertCircle, CheckCircle2, MinusCircle, Pencil, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import { DataService } from '../lib/dataService';
import { useData } from '../lib/DataContext';
import { Part, PartStatus } from '../types';
import { formatMYR, formatKm, optionalText, optionalNumber, numberInput, errorMessage } from '../lib/utils';
import { partLifespan } from '../lib/maintenance';
import { PageHeader, EmptyState, Modal, ConfirmDialog, Label, FormError, inputClass } from './ui';

const emptyForm = { name: '', category: '', purchaseLink: '', notes: '', price: '', status: 'neutral' as PartStatus };

export default function Parts() {
  const { parts, services, vehicles, reload } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [itemToConfirmDelete, setItemToConfirmDelete] = useState<Part | null>(null);
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

  const getStatusInfo = (status: PartStatus) => {
    switch (status) {
      case 'preferred': return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
      case 'not recommended': return { icon: AlertCircle, color: 'text-racing-red', bg: 'bg-racing-red/10', border: 'border-racing-red/20' };
      default: return { icon: MinusCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Inventory"
        title="Parts Library"
        action={
          <button onClick={() => handleOpenModal()} className="racing-button flex items-center gap-2 text-xs md:text-sm w-full md:w-auto justify-center">
            <Plus className="w-4 h-4" />
            Add Part
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parts.map((part, i) => {
          const statusInfo = getStatusInfo(part.status);
          const life = partLifespan(part, parts, services);
          return (
            <motion.div
              key={part.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.05 }}
              className="racing-panel p-6 rounded-2xl group flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:text-white transition-colors">
                  <Package className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`status-badge flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>
                    <statusInfo.icon className="w-3 h-3" />
                    {part.status}
                  </div>
                  <button aria-label="Edit part" onClick={() => handleOpenModal(part)} className="p-1.5 text-gray-600 hover:text-white transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1 tracking-tight">{part.name}</h3>
                <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-4">{part.category || 'Uncategorized'}</p>
                {part.notes && <p className="text-gray-400 text-sm italic mb-4">"{part.notes}"</p>}

                {(life.average !== null || life.inUse.length > 0) && (
                  <div className="mb-4 p-3 bg-black/40 rounded-lg border border-white/5 text-xs font-mono space-y-1">
                    <div className="flex items-center gap-2 text-gray-500 uppercase tracking-widest text-[10px]"><Timer className="w-3 h-3" /> Longevity</div>
                    {life.average !== null && (
                      <div className="text-gray-300">Lasted avg {formatKm(life.average)} <span className="text-gray-500">({life.lifespans.length} replacement{life.lifespans.length > 1 ? 's' : ''})</span></div>
                    )}
                    {life.inUse.map(u => (
                      <div key={`${u.vehicleId}-${u.since}`} className="text-gray-400">
                        Fitted on {vehicles.find(v => v.id === u.vehicleId)?.name ?? 'a vehicle'} at {formatKm(u.since)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-auto space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center text-sm font-mono">
                  <span className="text-gray-500">MSRP/COST</span>
                  <span className="font-bold text-white">{part.price !== undefined && Number.isFinite(part.price) ? formatMYR(part.price) : '—'}</span>
                </div>

                <div className="flex gap-2">
                  {part.purchaseLink && (
                    <a
                      href={part.purchaseLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-all"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      BUY LINK
                    </a>
                  )}
                  <button aria-label="Delete part" onClick={() => { setError(null); setItemToConfirmDelete(part); }} className="p-2 text-gray-700 hover:text-racing-red transition-colors ml-auto">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        {parts.length === 0 && <EmptyState icon={Package} text="Your parts library is empty" />}
      </div>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPart ? 'Revise Specifications' : 'Catalog New Equipment'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="p-name">Part Name *</Label>
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
              <Label htmlFor="p-price">Price Reference (RM)</Label>
              <input id="p-price" type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                className={`${inputClass} font-mono`} />
            </div>
          </div>
          <p className="-mt-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Use the same category for parts that replace each other to track how long each lasts.</p>

          <div>
            <Label htmlFor="p-link">Purchase URL (Shopee/Lazada/etc)</Label>
            <input id="p-link" type="url" maxLength={4000} value={formData.purchaseLink} onChange={e => setFormData({ ...formData, purchaseLink: e.target.value })}
              placeholder="https://..." className={inputClass} />
          </div>

          <div>
            <Label>Reliability Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['preferred', 'neutral', 'not recommended'] as PartStatus[]).map(status => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={formData.status === status}
                  onClick={() => setFormData({ ...formData, status })}
                  className={`py-2 px-1 rounded-lg text-[10px] font-mono uppercase transition-all border ${
                    formData.status === status
                      ? status === 'preferred' ? 'bg-green-500 border-green-500 text-white' :
                        status === 'not recommended' ? 'bg-racing-red border-racing-red text-white' :
                        'bg-gray-500 border-gray-500 text-white'
                      : 'bg-black border-white/10 text-gray-500 hover:border-white/20'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="p-notes">Review / Notes</Label>
            <textarea id="p-notes" maxLength={1000} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Fitment details, longevity feedback..." className={`${inputClass} h-24 resize-none`} />
          </div>

          <FormError message={error} />
          <button type="submit" disabled={saving} className="racing-button w-full py-4 text-lg disabled:opacity-50">
            {saving ? 'Saving...' : editingPart ? 'Update Library' : 'Add to Library'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!itemToConfirmDelete}
        title="Erase Part?"
        message="This will remove this item from your equipment library."
        confirmLabel="Confirm Removal"
        cancelLabel="Keep It"
        onConfirm={handleDelete}
        onCancel={() => setItemToConfirmDelete(null)}
        busy={saving}
        error={itemToConfirmDelete ? error : null}
      />
    </div>
  );
}
