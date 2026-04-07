import React, { useState, useEffect } from 'react';
import { db, doc, setDoc, getDoc, handleFirestoreError, OperationType } from '../firebase';
import { UserConfig } from '../types';
import { Bell, Shield, Save, Loader2, CheckCircle2, Send, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';

interface SettingsProps {
  userId: string;
  onConfigUpdate: (config: UserConfig) => void;
}

export default function Settings({ userId, onConfigUpdate }: SettingsProps) {
  const [config, setConfig] = useState<UserConfig>({ userId });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const path = `userConfigs/${userId}`;
      try {
        const docRef = doc(db, 'userConfigs', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as UserConfig);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    };
    fetchConfig();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const path = `userConfigs/${userId}`;
    try {
      await setDoc(doc(db, 'userConfigs', userId), config);
      onConfigUpdate(config);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!config.discordWebhookUrl) return;
    setIsTesting(true);
    setTestStatus('idle');
    setTestError(null);
    try {
      await axios.post('/api/test-webhook', { webhookUrl: config.discordWebhookUrl });
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch (err: any) {
      console.error("Test webhook error:", err);
      setTestStatus('error');
      setTestError(err.response?.data?.error || "Failed to send test alert.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-12">
        <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center shrink-0">
          <Bell className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-on-surface tracking-tighter">Alert Configuration</h1>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">System-wide notification parameters</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 md:space-y-10">
        <div className="bg-surface-container-low rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 space-y-8 md:space-y-10 border border-outline-variant/10">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] ml-1">Discord Webhook Interface</label>
              {config.discordWebhookUrl && (
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isTesting}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    testStatus === 'success' ? "bg-primary/20 text-primary" : 
                    testStatus === 'error' ? "bg-secondary/20 text-secondary" :
                    "bg-surface-container-highest text-on-surface-variant hover:text-primary hover:bg-primary/10"
                  )}
                >
                  {isTesting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : testStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Test Sent
                    </>
                  ) : testStatus === 'error' ? (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      Test Failed
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      Test Webhook
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="relative group">
              <input
                type="url"
                className="w-full p-6 bg-surface-container-highest border border-transparent rounded-[1.5rem] text-on-surface font-medium focus:bg-surface-bright/10 focus:border-primary/30 transition-all outline-none text-sm placeholder:text-on-surface-variant/30"
                placeholder="https://discord.com/api/webhooks/..."
                value={config.discordWebhookUrl || ''}
                onChange={(e) => setConfig({ ...config, discordWebhookUrl: e.target.value })}
              />
            </div>
            {testError && (
              <p className="text-[9px] text-secondary font-bold uppercase tracking-widest ml-1">{testError}</p>
            )}
            <p className="text-[10px] text-on-surface-variant/60 font-medium uppercase tracking-widest ml-1">Alerts will be dispatched to this endpoint upon target breach.</p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] ml-1">Proximity Threshold</label>
              <span className="text-2xl font-mono font-black text-primary tabular-nums">
                {Math.round((config.alertThreshold || 0.05) * 100)}%
              </span>
            </div>
            <div className="relative h-2 flex items-center">
              <input
                type="range"
                min="0.01"
                max="0.20"
                step="0.01"
                className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
                value={config.alertThreshold || 0.05}
                onChange={(e) => setConfig({ ...config, alertThreshold: parseFloat(e.target.value) })}
              />
            </div>
            <p className="text-[10px] text-on-surface-variant/60 font-medium uppercase tracking-widest ml-1">Define the visual and notification trigger radius.</p>
          </div>

          <div className="pt-6 border-t border-outline-variant/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] ml-1">Live Sync Engine</label>
                <p className="text-[10px] text-on-surface-variant/60 font-medium uppercase tracking-widest ml-1 mt-1">Automatically refresh market data every 5 minutes while the app is open.</p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, liveSyncEnabled: !config.liveSyncEnabled })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    config.liveSyncEnabled ? "bg-primary" : "bg-surface-container-highest"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      config.liveSyncEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-outline-variant/10 gap-6">
          <div className="flex items-center gap-4 text-on-surface-variant">
            <Shield className="w-6 h-6 text-primary/40 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Encrypted Storage • Firebase Enterprise</p>
          </div>
          
          <button
            type="submit"
            disabled={isSaving}
            className={cn(
              "w-full md:w-auto flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-primary/10",
              saveStatus === 'success' 
                ? "bg-primary text-on-primary-container shadow-primary/20" 
                : "bg-gradient-to-br from-primary to-primary-container text-on-primary-container hover:opacity-90"
            )}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saveStatus === 'success' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Synchronized
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Commit Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
