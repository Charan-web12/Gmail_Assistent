'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  Layers,
  Send,
  RefreshCw,
} from 'lucide-react';
import { emailAPI, aiAPI, gmailAPI } from '@/lib/api';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [gmailStatus, setGmailStatus] = useState<any>(null);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, statusRes, historyRes] = await Promise.all([
        emailAPI.getAnalytics().catch(() => null),
        gmailAPI.getStatus().catch(() => null),
        aiAPI.getHistory(5).catch(() => ({ history: [] })),
      ]);

      if (analyticsRes) setAnalytics(analyticsRes);
      if (statusRes) setGmailStatus(statusRes);
      if (historyRes) setAiHistory(historyRes.history || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = analytics?.stats || {
    totalEmails: 4,
    unreadCount: 2,
    highPriorityCount: 1,
    phishingAlerts: 1,
    categories: { Work: 1, Personal: 1, Spam: 1, Updates: 1 },
  };

  const isGmailConnected = gmailStatus?.connected || analytics?.isGmailConnected;

  return (
    <div className="space-y-8 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Intelligence Center
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
              Active
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time analytics, AI threat monitoring, and message synthesis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-sm shadow-indigo-600/25 transition-all"
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Open Inbox</span>
          </Link>
        </div>
      </div>

      {/* Gmail OAuth Connection Status Alert / Card */}
      <div
        className={`p-5 rounded-3xl border transition-all ${
          isGmailConnected
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
            : 'bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-pink-50/40 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900 border-indigo-200 dark:border-indigo-800/60'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl ${
                isGmailConnected
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              }`}
            >
              {isGmailConnected ? <ShieldCheck className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {isGmailConnected ? 'Live Gmail Account Connected' : 'Google OAuth Gmail Integration'}
                </h3>
                <span
                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                    isGmailConnected
                      ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                      : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                  }`}
                >
                  {isGmailConnected ? 'OAuth Active' : 'Demo Mode Active'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                {isGmailConnected
                  ? `Authenticated as ${gmailStatus?.emailAddress || 'your Google account'}. All actions map directly to live Gmail API.`
                  : 'Currently showing intelligent simulation mailbox. Connect your Google account anytime with OAuth 2.0 (no passwords stored).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {isGmailConnected ? (
              <Link
                href="/settings"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Manage Connection
              </Link>
            ) : (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all"
              >
                <span>Connect Gmail</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Metrics 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Emails */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Inbox
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.totalEmails}
            </span>
            <span className="text-[11px] text-slate-400">tracked messages</span>
          </div>
        </div>

        {/* Card 2: Unread Count */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Unread
            </span>
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {stats.unreadCount}
            </span>
            <span className="text-[11px] text-slate-400">require review</span>
          </div>
        </div>

        {/* Card 3: Priority Items */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              High Priority
            </span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {stats.highPriorityCount}
            </span>
            <span className="text-[11px] text-slate-400">P4 or P5 scored</span>
          </div>
        </div>

        {/* Card 4: Phishing Alerts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Threat Alerts
            </span>
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {stats.phishingAlerts}
            </span>
            <span className="text-[11px] text-slate-400">flagged threats</span>
          </div>
        </div>
      </div>

      {/* Analytics & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Email Classification Distribution
              </h3>
            </div>
            <span className="text-xs text-slate-400">Automated by Gemini</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {Object.entries(stats.categories || {}).map(([cat, count]: [string, any]) => (
              <div
                key={cat}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
              >
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{cat}</div>
                <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent AI Operations (1 Col) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent AI Activity
              </h3>
            </div>
          </div>

          {aiHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent AI tasks. Summaries and drafts will appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {aiHistory.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="capitalize text-indigo-600 dark:text-indigo-400">
                      {item.type}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 line-clamp-2 text-[11px]">
                    {typeof item.result === 'string' ? item.result : JSON.stringify(item.result)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
