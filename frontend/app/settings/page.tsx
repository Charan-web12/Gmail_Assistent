'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Shield,
  Key,
  Globe,
  Sparkles,
  Check,
  AlertCircle,
  Link as LinkIcon,
  LogOut,
  Moon,
  Loader2,
  ExternalLink,
  Copy,
  Info,
} from 'lucide-react';
import ToneSelector, { ToneOption } from '@/components/ToneSelector';
import { authAPI, gmailAPI } from '@/lib/api';

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Chinese (Mandarin)',
  'Portuguese',
  'Italian',
  'Hindi',
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [gmailStatus, setGmailStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  // Preference fields
  const [darkMode, setDarkMode] = useState(true);
  const [defaultTone, setDefaultTone] = useState<ToneOption>('Professional');
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [autoSummarize, setAutoSummarize] = useState(true);

  const redirectUri =
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
    'http://localhost:5000/api/gmail/oauth/callback';

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Check query parameter error or success
      const urlError = searchParams.get('error');
      if (urlError) {
        if (urlError.includes('redirect_uri_mismatch')) {
          setError(
            `Google OAuth Error: Redirect URI mismatch. Please add "${redirectUri}" to Authorized Redirect URIs in your Google Cloud Console.`
          );
        } else if (urlError.includes('access_denied')) {
          setError('Google OAuth access was denied or cancelled.');
        } else {
          setError(`Google OAuth Error: ${urlError}`);
        }
      }

      if (searchParams.get('gmail_connected') === 'true') {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }

      const [userRes, gmailRes] = await Promise.all([
        authAPI.getMe().catch(() => null),
        gmailAPI.getStatus().catch(() => null),
      ]);

      if (userRes?.user) {
        setUser(userRes.user);
        const prefs = userRes.user.preferences || {};
        if (typeof prefs.darkMode === 'boolean') setDarkMode(prefs.darkMode);
        if (prefs.defaultTone) setDefaultTone(prefs.defaultTone);
        if (prefs.defaultLanguage) setDefaultLanguage(prefs.defaultLanguage);
        if (typeof prefs.autoSummarize === 'boolean') setAutoSummarize(prefs.autoSummarize);
      }

      if (gmailRes) {
        setGmailStatus(gmailRes);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [searchParams]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await authAPI.updatePreferences({
        darkMode,
        defaultTone,
        defaultLanguage,
        autoSummarize,
      });

      // Apply theme
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    setError(null);
    try {
      const res = await gmailAPI.getOAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setError(
        err.message ||
          'Could not start Google OAuth flow. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in your .env file.'
      );
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account? Stored tokens will be permanently removed.')) {
      return;
    }

    try {
      await gmailAPI.disconnect();
      setGmailStatus({ connected: false, emailAddress: null });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect Gmail.');
    }
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs text-slate-500">Loading settings and integration status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Workspace Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure Gmail OAuth, Gemini AI intelligence parameters, and interface preferences
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 leading-relaxed">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>Settings / Connection updated successfully!</span>
        </div>
      )}

      {/* Section 1: Google OAuth Integration */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Google Account (Gmail OAuth 2.0)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct API connection using AES-256-GCM encrypted tokens. Passwords are never requested.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Connection Status:
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  gmailStatus?.connected
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                {gmailStatus?.connected ? 'Connected & Active' : 'Not Connected (Simulation Mode)'}
              </span>
            </div>
            {gmailStatus?.connected && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Linked Email: <strong className="text-slate-800 dark:text-slate-200">{gmailStatus.emailAddress}</strong>
              </p>
            )}
          </div>

          <div>
            {gmailStatus?.connected ? (
              <button
                type="button"
                onClick={handleDisconnectGmail}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
              >
                Disconnect Account
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGmail}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <span>Connect Gmail Account</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Google Cloud Console Help Box */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>Google Cloud Console Redirect URI</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Ensure your Google Cloud Console OAuth 2.0 Client has the following exact Authorized Redirect URI registered:
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 flex-1 select-all">
              {redirectUri}
            </code>
            <button
              type="button"
              onClick={copyRedirectUri}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition-colors flex items-center gap-1"
              title="Copy redirect URI"
            >
              {copiedUri ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUri ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: AI Preferences */}
      <form onSubmit={handleSavePreferences} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Gemini AI Preferences
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Powered by Google Gemini 3.6 Flash. Customize tone, language, and automated synthesis behavior.
            </p>
          </div>
        </div>

        {/* Default Tone */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Default AI Reply Tone
          </label>
          <ToneSelector selectedTone={defaultTone} onChange={setDefaultTone} />
        </div>

        {/* Default Language */}
        <div className="space-y-2 max-w-xs">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Default Target Language
          </label>
          <select
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
            className="w-full text-xs rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        {/* Auto Summarize Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Automatic Executive Summaries
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Automatically trigger Gemini summaries when opening emails
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoSummarize}
            onChange={(e) => setAutoSummarize(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
          />
        </div>

        {/* Theme Settings */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Dark Mode Appearance
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Enable sleek dark theme across the entire application interface
            </p>
          </div>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
