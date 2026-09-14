'use client';

import React, { useState } from 'react';
import { Search, Sparkles, X, ArrowRight, Loader2 } from 'lucide-react';
import { aiAPI } from '@/lib/api';

interface AISmartSearchBarProps {
  onSearch: (finalQuery: string) => void;
  initialQuery?: string;
}

export default function AISmartSearchBar({ onSearch, initialQuery = '' }: AISmartSearchBarProps) {
  const [query, setQuery] = useState<string>(initialQuery);
  const [isAiMode, setIsAiMode] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatedQuery, setTranslatedQuery] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      onSearch('');
      setTranslatedQuery(null);
      return;
    }

    if (isAiMode) {
      setIsTranslating(true);
      try {
        const res = await aiAPI.smartSearch(query);
        setTranslatedQuery(res.gmailQuery);
        onSearch(res.gmailQuery);
      } catch (err) {
        console.error('AI smart search translation error:', err);
        onSearch(query);
      } finally {
        setIsTranslating(false);
      }
    } else {
      setTranslatedQuery(null);
      onSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    setTranslatedQuery(null);
    onSearch('');
  };

  return (
    <div className="w-full space-y-1.5">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3.5 text-slate-400">
            {isAiMode ? (
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isAiMode
                ? 'AI Smart Search: "emails from Sarah about the roadmap deadline" or "flight bookings last month"'
                : 'Search inbox: sender, subject, keywords...'
            }
            className={`w-full text-xs rounded-xl pl-10 pr-28 py-2.5 bg-white dark:bg-slate-900 border transition-all shadow-sm ${
              isAiMode
                ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/10 placeholder-indigo-300 dark:placeholder-indigo-700/60 text-slate-900 dark:text-slate-100'
                : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20'
            }`}
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-24 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* AI Mode Toggle Pill */}
          <button
            type="button"
            onClick={() => {
              setIsAiMode(!isAiMode);
              setTranslatedQuery(null);
            }}
            className={`absolute right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              isAiMode
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Toggle AI Natural Language Query Conversion"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Mode</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={isTranslating}
          className="ml-2 p-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity disabled:opacity-50"
          title="Execute Search"
        >
          {isTranslating ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* Translated Query feedback */}
      {translatedQuery && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50 text-[11px] text-indigo-800 dark:text-indigo-300">
          <Sparkles className="w-3 h-3 flex-shrink-0" />
          <span>
            AI converted query: <code className="font-mono font-semibold bg-white dark:bg-slate-900 px-1 py-0.5 rounded">{translatedQuery}</code>
          </span>
        </div>
      )}
    </div>
  );
}
