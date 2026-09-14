'use client';

import React, { useState } from 'react';
import { Send, Sparkles, Globe, Edit3, Check, Copy, ArrowRight, Loader2 } from 'lucide-react';
import ToneSelector, { ToneOption } from './ToneSelector';
import { aiAPI } from '@/lib/api';

interface AIReplyPanelProps {
  emailId?: string;
  subject?: string;
  sender?: string;
  bodyText?: string;
  onSendReply?: (draft: string) => Promise<void>;
  onInsertToDraft?: (draft: string) => void;
}

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

export default function AIReplyPanel({
  emailId,
  subject,
  sender,
  bodyText,
  onSendReply,
  onInsertToDraft,
}: AIReplyPanelProps) {
  const [tone, setTone] = useState<ToneOption>('Professional');
  const [language, setLanguage] = useState<string>('English');
  const [instructions, setInstructions] = useState<string>('');
  const [draft, setDraft] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);

  const handleGenerateReply = async () => {
    setIsGenerating(true);
    setDraft('');
    setSentSuccess(false);

    aiAPI.streamReply(
      {
        emailId,
        subject,
        sender,
        bodyText,
        tone,
        language,
        instructions,
      },
      (chunk) => {
        setDraft((prev) => prev + chunk);
      },
      (fullText) => {
        setDraft(fullText);
        setIsGenerating(false);
      },
      (err) => {
        console.error('Error generating reply:', err);
        setIsGenerating(false);
      }
    );
  };

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!draft || !onSendReply) return;
    setIsSending(true);
    try {
      await onSendReply(draft);
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/25">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              AI Reply Assistant
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stream replies tailored to your tone and target language
            </p>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <Globe className="w-3.5 h-3.5 text-indigo-500" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Tone Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Select Tone
          </label>
          <ToneSelector selectedTone={tone} onChange={setTone} disabled={isGenerating} />
        </div>

        {/* Custom Instructions */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Specific Instructions or Key Points (Optional)
          </label>
          <input
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Agree with the roadmap, but request moving the sync to Monday at 10 AM..."
            className="w-full text-xs rounded-xl px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            disabled={isGenerating}
          />
        </div>

        {/* Action button to generate */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleGenerateReply}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-sm shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Streaming Reply...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{draft ? 'Regenerate Reply' : 'Generate AI Reply'}</span>
              </>
            )}
          </button>
        </div>

        {/* Draft Output Area */}
        {(draft || isGenerating) && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                Editable Response Draft
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                className="w-full text-xs font-mono leading-relaxed rounded-xl p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
                placeholder="AI reply will stream here..."
              />
              {isGenerating && (
                <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1 align-middle" />
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Tip: You can directly refine the text above before sending.
              </p>

              <div className="flex items-center gap-2">
                {onInsertToDraft && (
                  <button
                    type="button"
                    onClick={() => onInsertToDraft(draft)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span>Insert into Compose</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {onSendReply && (
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isSending || isGenerating || !draft.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : sentSuccess ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{sentSuccess ? 'Sent!' : isSending ? 'Sending...' : 'Send Reply'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
