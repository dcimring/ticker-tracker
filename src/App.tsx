/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onSnapshot, db, collection, query, where, addDoc, Timestamp, doc, updateDoc, getDoc, handleFirestoreError, OperationType, setDoc } from './firebase';
import { User } from 'firebase/auth';
import { UserConfig, ParsedTrade, WatchlistItem } from './types';
import { LogIn, LogOut, LayoutDashboard, Settings as SettingsIcon, Bell, TrendingUp, Sparkles, Loader2, AlertCircle, Menu, X, Plus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import MagicPaste from './components/MagicPaste';
import Watchlist from './components/Watchlist';
import Settings from './components/Settings';
import TradeConfirmation from './components/TradeConfirmation';
import UpdateToast from './components/UpdateToast';
import axios from 'axios';
import { limit } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [pendingTrades, setPendingTrades] = useState<ParsedTrade[] | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const loadedVersion = React.useRef<string | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'system_meta', 'version');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const newVersion = snap.data().version;
        if (!loadedVersion.current) {
          loadedVersion.current = newVersion;
        } else if (newVersion !== loadedVersion.current) {
          setShowUpdateToast(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const path = `userConfigs/${user.uid}`;
      const docRef = doc(db, 'userConfigs', user.uid);
      
      // First check if it exists, if not create it
      const ensureConfig = async () => {
        try {
          const snap = await getDoc(docRef);
          if (!snap.exists()) {
            await setDoc(docRef, {
              userId: user.uid,
              alertThreshold: 0.05,
              createdAt: Timestamp.now()
            });
          }
        } catch (err) {
          console.error("Error ensuring user config:", err);
        }
      };
      ensureConfig();

      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserConfig(docSnap.data() as UserConfig);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      return;
    }
    const path = 'watchlist';
    const q = query(
      collection(db, path), 
      where('userId', '==', user.uid),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WatchlistItem[];
      setWatchlist(newItems.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !userConfig?.liveSyncEnabled) return;

    const interval = setInterval(() => {
      console.log("Live Sync: Triggering background refresh...");
      handleRefreshPrices();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, userConfig?.liveSyncEnabled, watchlist.length]);

  const handleRefreshPrices = async () => {
    if (!user || watchlist.length === 0) return;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const response = await axios.post('/api/check', { 
        items: watchlist, 
        config: userConfig 
      });
      
      const prices = response.data.prices;
      if (prices) {
        const updatePromises = watchlist.map(item => {
          const newPrice = prices[item.ticker];
          if (newPrice !== undefined) {
            return updateDoc(doc(db, 'watchlist', item.id), {
              currentPrice: newPrice
            });
          }
          return Promise.resolve();
        });
        await Promise.all(updatePromises);
      } else if (response.data.error) {
        setRefreshError(response.data.error);
      }
    } catch (err: any) {
      console.error("Refresh error:", err);
      setRefreshError(err.response?.data?.error || "Failed to refresh market data.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        console.log("User closed the login popup.");
        return;
      }
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleLogoClick = () => {
    setActiveTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmTrades = async (trades: ParsedTrade[]) => {
    if (!user) return;

    setIsAdding(true);
    const path = 'watchlist';
    try {
      // 1. Fetch prices for the new tickers first
      let prices: Record<string, number> = {};
      try {
        const response = await axios.post('/api/check', { 
          items: trades,
          config: userConfig 
        });
        if (response.data.success) {
          prices = response.data.prices;
        }
      } catch (err) {
        console.error("Initial price fetch failed:", err);
        // Continue anyway, we'll just have no initial price
      }

      // 2. Add to Firestore with currentPrice if available
      for (const trade of trades) {
        await addDoc(collection(db, path), {
          ...trade,
          userId: user.uid,
          status: 'active',
          currentPrice: prices[trade.ticker] || null,
          createdAt: Timestamp.now()
        });
      }
      setPendingTrades(null);
    } catch (err) {
      console.error("Add trades error:", err);
    } finally {
      setIsAdding(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary-container rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-primary/10 rotate-12">
          <TrendingUp className="w-12 h-12 text-on-primary-container -rotate-12" />
        </div>
        <h1 className="text-5xl font-black text-on-surface mb-4 tracking-tighter">TickerTracker AI</h1>
        <p className="text-on-surface-variant text-center max-w-md mb-12 leading-relaxed font-medium">
          The professional-grade watchlist for serious traders. AI-powered parsing, real-time tracking, and Obsidian-grade precision.
        </p>
        <button
          onClick={handleLogin}
          className="flex items-center gap-3 px-10 py-5 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-2xl font-black hover:opacity-90 transition-all shadow-xl shadow-primary/20 group"
        >
          <LogIn className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          Enter Terminal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary/20 selection:text-primary">
      {/* Ticker Tape */}
      <div className="fixed top-0 left-0 right-0 h-10 bg-surface-container-lowest flex items-center px-4 z-50 overflow-hidden">
        <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
          {['BTC/USD $68,432.12', 'ETH/USD $3,421.55', 'AAPL $182.52', 'TSLA $175.34', 'NVDA $892.12', 'SOL/USD $145.22'].map((tick, i) => (
            <span key={i} className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant tabular-nums">
              {tick} <span className="text-primary ml-1">▲</span>
            </span>
          ))}
        </div>
      </div>

      {/* Top Navigation Bar */}
      <nav className="fixed top-10 left-0 right-0 h-20 bg-surface-container-low/80 backdrop-blur-xl flex items-center px-6 lg:px-12 z-40 border-b border-outline-variant/10">
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-3 lg:gap-4 mr-4 lg:mr-12 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 lg:w-10 h-10 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center shadow-lg shadow-primary/10">
            <TrendingUp className="w-4 h-4 lg:w-5 h-5 text-on-primary-container" />
          </div>
          <span className="text-lg lg:text-xl font-black text-on-surface tracking-tighter uppercase">TickerTracker</span>
        </button>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-2 flex-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.2em]",
              activeTab === 'dashboard' ? "bg-primary text-on-primary-container shadow-lg shadow-primary/10" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.2em]",
              activeTab === 'settings' ? "bg-primary text-on-primary-container shadow-lg shadow-primary/10" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            )}
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3 mr-6">
          <button
            onClick={handleRefreshPrices}
            disabled={isRefreshing || watchlist.length === 0}
            className="flex items-center gap-2.5 px-4 py-2 bg-surface-container-highest/50 border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
          >
            {isRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync Market Data
          </button>

          <button
            onClick={() => setIsMagicModalOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2 bg-surface-container-highest/50 border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tickers
          </button>
        </div>

        {/* Desktop Profile / Logout */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-on-surface tracking-widest uppercase">{user.displayName}</span>
            <span className="text-[8px] font-bold text-primary uppercase tracking-[0.3em]">Pro Member</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-3 text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all group relative"
          >
            <LogOut className="w-5 h-5" />
            <span className="absolute top-full mt-4 right-0 px-2 py-1 bg-secondary text-on-secondary-container text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest z-50">Logout</span>
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden flex-1 justify-end">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl transition-all"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 right-0 bg-surface-container-low border-b border-outline-variant/10 shadow-2xl md:hidden overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <button
                  onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-xs font-black uppercase tracking-[0.2em]",
                    activeTab === 'dashboard' ? "bg-primary text-on-primary-container" : "text-on-surface-variant bg-surface-container-highest/30"
                  )}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </button>
                
                <button
                  onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-xs font-black uppercase tracking-[0.2em]",
                    activeTab === 'settings' ? "bg-primary text-on-primary-container" : "text-on-surface-variant bg-surface-container-highest/30"
                  )}
                >
                  <SettingsIcon className="w-5 h-5" />
                  Settings
                </button>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <button
                    onClick={() => { handleRefreshPrices(); setIsMobileMenuOpen(false); }}
                    disabled={isRefreshing || watchlist.length === 0}
                    className="w-full flex items-center gap-4 px-6 py-4 bg-surface-container-highest/50 border border-outline-variant/20 text-on-surface-variant rounded-2xl transition-all text-xs font-black uppercase tracking-[0.2em] disabled:opacity-50"
                  >
                    {isRefreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    Sync Market Data
                  </button>

                  <button
                    onClick={() => { setIsMagicModalOpen(true); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-4 px-6 py-4 bg-surface-container-highest/50 border border-outline-variant/20 text-on-surface-variant rounded-2xl transition-all text-xs font-black uppercase tracking-[0.2em]"
                  >
                    <Plus className="w-5 h-5" />
                    Add Tickers
                  </button>
                </div>

                <div className="pt-4 border-t border-outline-variant/10">
                  <div className="flex items-center justify-between px-6 py-4 bg-surface-container-highest/20 rounded-2xl mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-on-surface tracking-widest uppercase">{user.displayName}</span>
                      <span className="text-[8px] font-bold text-primary uppercase tracking-[0.3em]">Pro Member</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-6 py-4 bg-secondary/10 text-secondary rounded-2xl font-black uppercase tracking-[0.2em] text-xs"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="pt-32 min-h-screen">
        <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
          {activeTab === 'dashboard' ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-6xl font-black text-on-surface tracking-tighter mb-2">
                    Market <span className="text-primary">Intelligence</span>
                  </h1>
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.4em] ml-1">Terminal Interface • Session Active</p>
                    {userConfig?.liveSyncEnabled && (
                      <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">Live Sync Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Watchlist 
                userId={user.uid} 
                userConfig={userConfig} 
                items={watchlist}
                isRefreshing={isRefreshing}
                error={refreshError}
              />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-surface-container rounded-[2.5rem] p-1 shadow-2xl shadow-black/20">
                <div className="bg-surface-container-low rounded-[2.25rem] p-8 lg:p-12">
                  <Settings userId={user.uid} onConfigUpdate={setUserConfig} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isMagicModalOpen && (
          <div className="fixed inset-0 bg-surface/80 backdrop-blur-xl z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-low w-full max-w-4xl rounded-[3rem] shadow-2xl border border-outline-variant overflow-hidden"
            >
              <div className="p-6 md:p-12">
                <MagicPaste 
                  onParsed={(trades) => {
                    setPendingTrades(trades);
                    setIsMagicModalOpen(false);
                  }} 
                  onClose={() => setIsMagicModalOpen(false)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {pendingTrades && (
        <TradeConfirmation
          trades={pendingTrades}
          onConfirm={handleConfirmTrades}
          onCancel={() => setPendingTrades(null)}
          isAdding={isAdding}
        />
      )}

      <UpdateToast 
        show={showUpdateToast} 
        onRefresh={() => window.location.reload()} 
      />

      {/* Footer / Status */}
      <footer className="py-12 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em]">The Obsidian Architect • v1.0.0</p>
          <div className="flex items-center gap-8">
            <a href="#" className="text-[10px] font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest transition-colors">Documentation</a>
            <a href="#" className="text-[10px] font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest transition-colors">Support</a>
            <a href="#" className="text-[10px] font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
