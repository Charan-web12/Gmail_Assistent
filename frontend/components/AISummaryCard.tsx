'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import { aiAPI } from '@/lib/api';

interface AISummaryCardProps {
  emailId: string;
  initialSummary?: string | null;
  subject?: string;
  sender?: string;
  bodyText?: string;
}

export default function AISummaryCard({
  emailId,
  initialSummary,
  subject,
  sender,
  bodyText,
}: AISummaryCardProps) {
  const [summary, setSummary] = useState<string>(initialSummary || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerateSummary = async () => {
    setLoading(true);
    try {
      const res = await aiAPI.summarize({
        emailId,
        subject,
        sender,
        bodyText: bodyText || '',
      });
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err: any) {
      console.error('Failed to generate summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 border border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 via-white/80 to-purple-50/40 dark:from-indigo-950/20 dark:via-slate-900/60 dark:to-purple-950/20 backdrop-blur-md shadow-sm">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-sm shadow-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            AI Executive Summary
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
              Gemini 1.5
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {summary && (
            <button
              onClick={copyToClipboard}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
              title="Copy summary"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <button
            onClick={handleGenerateSummary}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
            title="Refresh summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{summary ? 'Regenerate' : 'Summarize'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 py-2 animate-pulse">
          <div className="h-3.5 bg-indigo-200/50 dark:bg-indigo-900/40 rounded w-full" />
          <div className="h-3.5 bg-indigo-200/50 dark:bg-indigo-900/40 rounded w-5/6" />
          <div className="h-3.5 bg-indigo-200/50 dark:bg-indigo-900/40 rounded w-3/4" />
        </div>
      ) : summary ? (
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 selection:bg-indigo-500/20">
          {summary}
        </p>
      ) : (
        <div className="py-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Click "Summarize" to generate a quick 2-4 sentence executive overview.</span>
          <button
            onClick={handleGenerateSummary}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-medium underline"
          >
            Generate now
          </button>
        </div>
      )}
    </div>
  );
}
