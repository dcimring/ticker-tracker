import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Loader2, Sparkles, Plus, AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ParsedTrade } from '../types';

interface MagicPasteProps {
  onParsed: (trades: ParsedTrade[]) => void;
  onClose?: () => void;
}

export default function MagicPaste({ onParsed, onClose }: MagicPasteProps) {
  const [text, setText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!text.trim()) return;

    setIsParsing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Extract ticker, asset type (stock or crypto), target price (buy price), take profit levels (sell prices), and reasoning from this text. Return as a clean JSON array. Text: "${text}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ticker: { type: Type.STRING, description: "The ticker symbol (e.g., AAPL, BTC/USD)." },
                assetType: { type: Type.STRING, enum: ["stock", "crypto"], description: "The type of asset." },
                targetPrice: { type: Type.NUMBER, description: "The price level to trigger an alert." },
                takeProfitLevels: { 
                  type: Type.ARRAY, 
                  items: { type: Type.NUMBER },
                  description: "List of price levels at which to sell."
                },
                reasoning: { type: Type.STRING, description: "The user's reasoning for this trade." }
              },
              required: ["ticker", "assetType", "targetPrice"]
            }
          }
        }
      });

      const parsed = JSON.parse(response.text);
      onParsed(parsed);
      setText('');
      if (onClose) onClose();
    } catch (err) {
      console.error("Parsing error:", err);
      setError("Failed to parse text. Please try again or enter manually.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="p-0">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center shadow-lg shadow-black/5">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-on-surface tracking-tighter">Magic Intelligence</h2>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">AI-Powered Trade Extraction</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-2xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>
      
      <p className="text-sm text-on-surface-variant mb-8 font-medium leading-relaxed max-w-2xl">
        Paste unstructured market data, analyst reports, or social sentiment. Our neural engine will distill tickers, asset classes, and target levels with obsidian precision.
      </p>

      <div className="flex flex-col gap-4">
        <div className="relative group">
          <textarea
            className="w-full h-48 p-6 md:p-8 bg-surface-container-highest border border-transparent rounded-[2rem] text-on-surface font-medium focus:bg-surface-bright/10 focus:border-primary/30 transition-all outline-none resize-none text-base leading-relaxed placeholder:text-on-surface-variant/30"
            placeholder="Example: $AAPL looking strong at $180 support. If it breaks $185, target $200. $BTC consolidation near $65k..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          <button
            onClick={handleParse}
            disabled={isParsing || !text.trim()}
            className={cn(
              "md:absolute md:bottom-6 md:right-6 flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-primary/10 w-full md:w-auto",
              isParsing && "animate-pulse"
            )}
          >
            {isParsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Extract Intelligence
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-center gap-3 text-secondary text-xs font-bold bg-secondary/10 p-4 rounded-2xl border border-secondary/20">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
