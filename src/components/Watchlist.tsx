import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, onSnapshot, updateDoc, deleteDoc, doc, Timestamp, getDocs, handleFirestoreError, OperationType } from '../firebase';
import { limit } from 'firebase/firestore';
import { WatchlistItem, UserConfig } from '../types';
import { Trash2, Edit2, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, RefreshCw, Loader2, Bell, Settings as SettingsIcon, LogOut, Plus, Sparkles, LayoutDashboard, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';
import EditWatchlistModal from './EditWatchlistModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface WatchlistProps {
  userId: string;
  userConfig: UserConfig | null;
  items: WatchlistItem[];
  isRefreshing: boolean;
  error: string | null;
}

export default function Watchlist({ userId, userConfig, items, isRefreshing, error }: WatchlistProps) {
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<WatchlistItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    const path = `watchlist/${id}`;
    try {
      await deleteDoc(doc(db, 'watchlist', id));
      setDeletingItem(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<WatchlistItem>) => {
    const path = `watchlist/${id}`;
    try {
      await updateDoc(doc(db, 'watchlist', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const getProximityColor = (current: number | undefined, target: number) => {
    if (!current) return 'bg-surface-container-highest';
    const diff = Math.abs(current - target) / current;
    const isFalling = current > target;
    
    // If very close, use the "Danger" color (Red for fall, Green for rise)
    // But the user specifically wants Red for "Distance to Fall"
    if (isFalling) {
      if (diff <= 0.05) return 'bg-secondary'; // Very close to fall target
      return 'bg-secondary/60'; // Further away but still a fall target
    } else {
      if (diff <= 0.05) return 'bg-primary'; // Very close to rise target
      return 'bg-primary/60'; // Further away but still a rise target
    }
  };

  const getProximityPercent = (current: number | undefined, target: number) => {
    if (!current) return 0;
    const diff = Math.abs(current - target) / current;
    // Linear scale: 0% diff = 100% full, 100% or more diff = 0% full
    // This ensures the bar is always visible unless the price is extremely far away
    return Math.max(5, Math.min(100, (1 - diff) * 100));
  };

  const formatPrice = (value: number | undefined) => {
    if (value === undefined) return '---';
    
    let decimals = 2;
    if (value >= 1000) decimals = 0;
    else if (value >= 10) decimals = 2;
    else if (value >= 1) decimals = 3;
    else if (value >= 0.1) decimals = 4;
    else decimals = 6;

    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-surface-container-high rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-on-surface tracking-tighter">Active Watchlist</h2>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Real-time target monitoring</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-2xl text-secondary text-xs font-bold flex items-center gap-3">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-32 bg-surface-container-lowest/50 rounded-[3rem] border border-outline-variant">
          <TrendingUp className="w-16 h-16 text-surface-container-highest mx-auto mb-6" />
          <p className="text-on-surface-variant font-bold uppercase tracking-widest text-sm">No Active Targets</p>
          <p className="text-on-surface-variant/60 text-xs mt-2">Paste market data to initialize tracking.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-surface-container-high rounded-3xl p-4 md:p-6 transition-all hover:bg-surface-bright/10 group relative overflow-hidden border border-outline-variant/10">
              {/* Actions: Absolute on mobile, grid-aligned on desktop */}
              <div className="absolute top-4 right-4 md:static md:flex md:items-center md:justify-end gap-2 z-10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2.5 md:p-3 bg-surface-container-highest/80 backdrop-blur-sm text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingItem(item)}
                    className="p-2.5 md:p-3 bg-surface-container-highest/80 backdrop-blur-sm text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1.2fr_1.5fr] items-start gap-5 md:gap-8">
                {/* Column 1: Ticker */}
                <div className="w-full flex items-center gap-3 md:gap-4 pr-20 md:pr-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-surface-container-highest rounded-2xl flex items-center justify-center shrink-0">
                    <span className="text-lg md:text-xl font-black text-primary tracking-tighter tabular-nums">
                      {item.ticker.charAt(0)}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl md:text-2xl font-black text-on-surface tracking-tighter tabular-nums truncate">${item.ticker}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[7px] md:text-[8px] font-black uppercase tracking-widest shrink-0">
                        {item.assetType}
                      </span>
                    </div>
                    {item.reasoning && (
                      <div className="flex items-start gap-1.5 mt-0.5 md:mt-1">
                        <Sparkles className="w-2.5 h-2.5 text-primary/40 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-on-surface-variant font-medium italic leading-relaxed truncate max-w-[180px] md:max-w-none md:whitespace-normal">
                          {item.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Grid for Metrics */}
                <div className="w-full grid grid-cols-2 md:contents gap-4 md:gap-0">
                  {/* Column 2: Current Value */}
                  <div className="flex flex-col">
                    <span className="text-[8px] md:text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5 md:mb-1">Current</span>
                    <span className="text-lg md:text-xl font-mono font-black text-on-surface tabular-nums">
                      {item.currentPrice ? `$${formatPrice(item.currentPrice)}` : '---'}
                    </span>
                  </div>

                  {/* Column 3: Target Level */}
                  <div className="flex flex-col">
                    <span className="text-[8px] md:text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5 md:mb-1">Target</span>
                    <span className="text-lg md:text-xl font-mono font-bold text-on-surface tabular-nums">${formatPrice(item.targetPrice)}</span>
                  </div>
                </div>

                {/* Column 4: Velocity to Target */}
                <div className="w-full flex flex-col gap-2 md:gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] md:text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Velocity</span>
                    {item.currentPrice && (
                      <div className={cn(
                        "flex items-center gap-1 text-[8px] md:text-[9px] font-black px-1.5 py-0.5 md:px-2 md:py-1 rounded-full uppercase tracking-widest",
                        item.currentPrice > item.targetPrice ? "text-secondary bg-secondary/10" : "text-primary bg-primary/10"
                      )}>
                        {item.currentPrice > item.targetPrice ? <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                        {Math.abs(((item.currentPrice - item.targetPrice) / item.currentPrice) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="h-1.5 md:h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-1000", getProximityColor(item.currentPrice, item.targetPrice))}
                      style={{ width: `${getProximityPercent(item.currentPrice, item.targetPrice)}%` }}
                    />
                  </div>
                </div>

                {/* Column 5: Take Profits */}
                <div className="w-full flex flex-col gap-1.5 md:gap-2">
                  <span className="text-[8px] md:text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">TP Targets</span>
                  <div className="flex md:flex-wrap gap-1.5 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 no-scrollbar">
                    {item.takeProfitLevels && item.takeProfitLevels.length > 0 ? (
                      item.takeProfitLevels.sort((a, b) => a - b).map((level, idx) => (
                        <div key={idx} className="px-2 py-1 bg-surface-container-highest/50 rounded-lg border border-outline-variant/5 flex items-center gap-1.5 shrink-0">
                          <Target className="w-2.5 h-2.5 text-primary" />
                          <span className="text-[9px] font-mono font-bold text-on-surface tabular-nums">${formatPrice(level)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[9px] font-medium text-on-surface-variant/40 italic">No targets</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingItem && (
        <EditWatchlistModal
          item={editingItem}
          onSave={handleUpdate}
          onClose={() => setEditingItem(null)}
        />
      )}

      {deletingItem && (
        <DeleteConfirmationModal
          item={deletingItem}
          onConfirm={handleDelete}
          onClose={() => setDeletingItem(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
