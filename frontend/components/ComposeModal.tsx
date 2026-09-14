'use client';

import React, { useState } from 'react';
import { X, Send, Sparkles, Loader2, Check, Paperclip, ChevronDown, ChevronUp } from 'lucide-react';
import { emailAPI, aiAPI } from '@/lib/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  threadId?: string;
  onSent?: () => void;
}

export default function ComposeModal({
  isOpen,
  onClose,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  threadId,
  onSent,
}: ComposeModalProps) {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  const [isSending, setIsSending] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) {
      setError('Please provide Recipient, Subject, and Body content.');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await emailAPI.sendEmail({
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        body,
        threadId,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onSent) onSent();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to send email. Please check your connection.');
    } finally {
      setIsSending(false);
    }
  };

  const handleAiDraftAssist = async () => {
    if (!subject.trim()) {
      setError('Please enter a subject line first to help AI understand the context.');
      return;
    }

    setIsAiDrafting(true);
    setError(null);

    try {
      const res = await aiAPI.generateReply({
        subject,
        bodyText: body || subject,
        tone: 'Professional',
        instructions: 'Draft an original, articulate email based on this subject.',
      });

      if (res.reply) {
        setBody(res.reply);
      }
    } catch (err: any) {
      setError('AI Draft Assist failed: ' + err.message);
    } finally {
      setIsAiDrafting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              New Message
            </h3>
            {threadId && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Reply in Thread
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSend} className="p-6 space-y-3 flex-1 overflow-y-auto flex flex-col">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* To Field */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <span className="text-xs font-medium text-slate-400 w-12">To:</span>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              required
              className="flex-1 text-xs bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
            >
              {showCcBcc ? 'Hide Cc/Bcc' : 'Cc / Bcc'}
            </button>
          </div>

          {/* Cc / Bcc Fields */}
          {showCcBcc && (
            <div className="space-y-2 border-b border-slate-100 dark:border-slate-800/80 pb-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 w-12">Cc:</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 text-xs bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 w-12">Bcc:</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="flex-1 text-xs bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Subject Field */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <span className="text-xs font-medium text-slate-400 w-12">Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of message topic..."
              required
              className="flex-1 text-xs font-medium bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          {/* AI Draft Assist Bar */}
          <div className="flex items-center justify-between py-1 px-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Need help writing? Gemini can draft this email for you.</span>
            </div>
            <button
              type="button"
              onClick={handleAiDraftAssist}
              disabled={isAiDrafting}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {isAiDrafting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Drafting...</span>
                </>
              ) : (
                <span>AI Draft Assist</span>
              )}
            </button>
          </div>

          {/* Body Textarea */}
          <div className="flex-1 min-h-[180px] pt-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here..."
              required
              rows={10}
              className="w-full h-full text-xs leading-relaxed bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Discard
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSending || success}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-sm shadow-indigo-500/30 transition-all disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : success ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Sent!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
