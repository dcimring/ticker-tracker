import React, { useState } from 'react';
import { WatchlistItem } from '../types';
import { X, Save, Loader2, DollarSign, FileText, Plus, Trash2, Target, Hash } from 'lucide-react';

interface EditWatchlistModalProps {
  item: WatchlistItem;
  onSave: (id: string, updates: Partial<WatchlistItem>) => Promise<void>;
  onClose: () => void;
}

export default function EditWatchlistModal({ item, onSave, onClose }: EditWatchlistModalProps) {
  const [ticker, setTicker] = useState(item.ticker);
  const [targetPrice, setTargetPrice] = useState(item.targetPrice.toString());
  const [takeProfitLevels, setTakeProfitLevels] = useState<string[]>(
    item.takeProfitLevels?.map(l => l.toString()) || []
  );
  const [reasoning, setReasoning] = useState(item.reasoning || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTP = () => {
    setTakeProfitLevels([...takeProfitLevels, '']);
  };

  const handleRemoveTP = (index: number) => {
    setTakeProfitLevels(takeProfitLevels.filter((_, i) => i !== index));
  };

  const handleTPChange = (index: number, value: string) => {
    const newLevels = [...takeProfitLevels];
    newLevels[index] = value;
    setTakeProfitLevels(newLevels);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(item.id, {
        ticker: ticker.trim().toUpperCase(),
        targetPrice: parseFloat(targetPrice),
        takeProfitLevels: takeProfitLevels
          .map(l => parseFloat(l))
          .filter(l => !isNaN(l)),
        reasoning: reasoning.trim()
      });
      onClose();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-surface/80 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-surface-container-high w-full max-w-md rounded-[3rem] shadow-2xl border border-outline-variant overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10">
                <Save className="w-7 h-7 text-on-primary-container" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-on-surface tracking-tighter">Edit ${ticker || item.ticker}</h2>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Recalibrate Strategy</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-2xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] ml-1">Ticker Symbol</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Hash className="w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="w-full pl-12 pr-6 py-5 bg-surface-container-highest border border-transparent rounded-[1.5rem] text-on-surface font-black text-lg focus:bg-surface-bright/20 focus:border-primary/30 transition-all outline-none uppercase"
                  placeholder="e.g. AAPL or BTC-USD"
                />
              </div>
              <p className="text-[9px] text-on-surface-variant/60 font-medium px-1">
                Note: Yahoo Finance may require specific formats (e.g. BTC-USD instead of BTC).
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] ml-1">Target Price ($)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <DollarSign className="w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full pl-12 pr-6 py-5 bg-surface-container-highest border border-transparent rounded-[1.5rem] text-on-surface font-mono font-black text-lg focus:bg-surface-bright/20 focus:border-primary/30 transition-all outline-none tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em]">Take Profit Levels</label>
                <button
                  type="button"
                  onClick={handleAddTP}
                  className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary-container transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Level
                </button>
              </div>
              
              <div className="space-y-3">
                {takeProfitLevels.map((level, idx) => (
                  <div key={idx} className="relative group flex items-center gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <Target className="w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={level}
                        onChange={(e) => handleTPChange(idx, e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-surface-container-highest border border-transparent rounded-[1.25rem] text-on-surface font-mono font-bold text-sm focus:bg-surface-bright/20 focus:border-primary/30 transition-all outline-none tabular-nums"
                        placeholder="TP Level"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTP(idx)}
                      className="p-4 text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-2xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {takeProfitLevels.length === 0 && (
                  <p className="text-[10px] text-on-surface-variant/40 font-medium uppercase tracking-widest text-center py-4 border border-dashed border-outline-variant rounded-[1.25rem]">No profit targets defined</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] ml-1">Strategic Reasoning</label>
              <div className="relative group">
                <div className="absolute top-5 left-5 pointer-events-none">
                  <FileText className="w-5 h-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                </div>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  className="w-full pl-12 pr-6 py-5 bg-surface-container-highest border border-transparent rounded-[1.5rem] text-on-surface text-sm font-medium focus:bg-surface-bright/20 focus:border-primary/30 transition-all outline-none min-h-[140px] resize-none leading-relaxed"
                  placeholder="Define the thesis for this level..."
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-8 py-5 bg-surface-container-highest text-on-surface-variant rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-surface-bright/20 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl shadow-primary/10 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Commit Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
