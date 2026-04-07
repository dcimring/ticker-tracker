import React from 'react';
import { ParsedTrade } from '../types';
import { Check, X, AlertCircle } from 'lucide-react';

interface TradeConfirmationProps {
  trades: ParsedTrade[];
  onConfirm: (trades: ParsedTrade[]) => void;
  onCancel: () => void;
  isAdding?: boolean;
}

export default function TradeConfirmation({ trades, onConfirm, onCancel, isAdding }: TradeConfirmationProps) {
  return (
    <div className="fixed inset-0 bg-surface/80 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-surface-container-high w-full max-w-xl rounded-[3rem] shadow-2xl border border-outline-variant overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 md:p-10 bg-surface-container-high">
          <h2 className="text-3xl font-black text-on-surface tracking-tighter mb-2">Confirm Intelligence</h2>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Gemini extracted {trades.length} strategic targets</p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-6 md:p-10 space-y-6 bg-surface-container">
          {trades.map((trade, idx) => (
            <div key={idx} className="bg-surface-container-low p-6 rounded-[2rem] border border-outline-variant/10 flex items-start gap-6 transition-all hover:bg-surface-container-high">
              <div className="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary font-black text-sm tracking-tighter shadow-inner">
                {trade.ticker.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl font-black text-on-surface tracking-tighter tabular-nums">${trade.ticker}</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-black uppercase tracking-[0.15em] text-primary">
                    {trade.assetType}
                  </span>
                </div>
                <div className="flex flex-col mb-3">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Target Level</span>
                  <span className="text-base font-mono font-bold text-on-surface tabular-nums">${trade.targetPrice.toLocaleString()}</span>
                </div>
                {trade.takeProfitLevels && trade.takeProfitLevels.length > 0 && (
                  <div className="flex flex-col mb-3">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Take Profit Targets</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {trade.takeProfitLevels.map((level, lIdx) => (
                        <span key={lIdx} className="px-2 py-0.5 rounded bg-surface-container-highest text-[9px] font-mono font-bold text-on-surface tabular-nums">
                          ${level.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {trade.reasoning && (
                  <p className="text-xs text-on-surface-variant font-medium italic leading-relaxed">"{trade.reasoning}"</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 md:p-10 flex items-center gap-6 bg-surface-container-high">
          <button
            onClick={onCancel}
            disabled={isAdding}
            className="flex-1 px-8 py-5 rounded-[1.5rem] bg-surface-container-highest text-on-surface-variant font-black uppercase tracking-widest text-[10px] hover:bg-surface-bright/20 transition-all disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={() => onConfirm(trades)}
            disabled={isAdding}
            className="flex-1 px-8 py-5 rounded-[1.5rem] bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary-container/30 border-t-on-primary-container rounded-full animate-spin" />
                Synchronizing...
              </>
            ) : (
              'Commit to Watchlist'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
