import React from 'react';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { WatchlistItem } from '../types';

interface DeleteConfirmationModalProps {
  item: WatchlistItem;
  onConfirm: (id: string) => Promise<void>;
  onClose: () => void;
  isDeleting: boolean;
}

export default function DeleteConfirmationModal({ item, onConfirm, onClose, isDeleting }: DeleteConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-surface/80 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-surface-container-high w-full max-w-md rounded-[3rem] shadow-2xl border border-outline-variant overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center shadow-lg shadow-secondary/10">
                <Trash2 className="w-7 h-7 text-secondary" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-on-surface tracking-tighter">Remove ${item.ticker}</h2>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Confirm Deletion</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-2xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-surface-container p-8 rounded-[2rem] border border-outline-variant/10 mb-10">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-secondary shrink-0 mt-1" />
              <div className="space-y-4">
                <p className="text-sm text-on-surface font-medium leading-relaxed">
                  Are you sure you want to remove <span className="font-black text-primary">${item.ticker}</span> from your active watchlist?
                </p>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest leading-relaxed">
                  This will permanently delete all strategic targets and reasoning associated with this asset.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-8 py-5 bg-surface-container-highest text-on-surface-variant rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-surface-bright/20 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(item.id)}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-secondary text-on-secondary rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl shadow-secondary/10 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Delete Target
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
