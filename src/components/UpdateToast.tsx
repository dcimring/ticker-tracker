import React from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UpdateToastProps {
  show: boolean;
  onRefresh: () => void;
}

export default function UpdateToast({ show, onRefresh }: UpdateToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-3rem)] max-w-md"
        >
          <div className="bg-primary text-on-primary-container p-5 md:p-6 rounded-[2rem] shadow-2xl shadow-primary/30 border border-primary-container/20 flex flex-col sm:flex-row items-center gap-4 md:gap-6">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-on-primary-container/10 rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-on-primary-container animate-pulse" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest mb-0.5 md:mb-1">System Update</h3>
                <p className="text-[9px] md:text-[10px] font-bold opacity-80 uppercase tracking-widest leading-relaxed">
                  New intelligence available.
                </p>
              </div>
            </div>

            <button
              onClick={onRefresh}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 md:px-5 md:py-3 bg-on-primary-container text-primary rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-lg shadow-black/10 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Terminal
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
