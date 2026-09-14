'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Calendar,
  CheckSquare,
  Square,
  Sparkles,
  ShieldCheck,
  Send,
  Loader2,
} from 'lucide-react';
import AISummaryCard from './AISummaryCard';
import PhishingWarningBanner from './PhishingWarningBanner';
import AIReplyPanel from './AIReplyPanel';
import { emailAPI, aiAPI } from '@/lib/api';

interface EmailViewProps {
  email: any;
  onRefresh?: () => void;
}

export default function EmailView({ email, onRefresh }: EmailViewProps) {
  const [currentEmail, setCurrentEmail] = useState(email);
  const [actionItems, setActionItems] = useState(email.actionItems || []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const toggleStar = async () => {
    const nextState = !currentEmail.isStarred;
    setCurrentEmail((prev: any) => ({ ...prev, isStarred: nextState }));
    try {
      await emailAPI.modifyEmail(currentEmail.id, {
        addLabels: nextState ? ['STARRED'] : [],
        removeLabels: !nextState ? ['STARRED'] : [],
      });
    } catch (err) {
      console.error('Failed to update star state:', err);
    }
  };

  const toggleRead = async () => {
    const nextUnread = !currentEmail.isUnread;
    setCurrentEmail((prev: any) => ({ ...prev, isUnread: nextUnread }));
    try {
      await emailAPI.modifyEmail(currentEmail.id, {
        addLabels: nextUnread ? ['UNREAD'] : [],
        removeLabels: !nextUnread ? ['UNREAD'] : [],
      });
    } catch (err) {
      console.error('Failed to update read state:', err);
    }
  };

  const handleRunFullAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await aiAPI.analyzeEmail(currentEmail.id, {
        subject: currentEmail.subject,
        sender: currentEmail.from,
        bodyText: currentEmail.bodyText,
      });

      setCurrentEmail((prev: any) => ({
        ...prev,
        summary: res.summary,
        priority: res.priority,
        category: res.category,
        phishingAnalysis: res.phishingAnalysis,
        actionItems: res.actionItems,
        deadlines: res.deadlines,
      }));
      setActionItems(res.actionItems || []);
    } catch (err) {
      console.error('Full AI analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTaskCompleted = (index: number) => {
    setActionItems((prev: any[]) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleSendReply = async (draft: string) => {
    await emailAPI.sendEmail({
      to: currentEmail.from,
      subject: currentEmail.subject.startsWith('Re:')
        ? currentEmail.subject
        : `Re: ${currentEmail.subject}`,
      body: draft,
      threadId: currentEmail.threadId,
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Navigation & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inbox</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* AI Full Analysis Button */}
          <button
            onClick={handleRunFullAnalysis}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isAnalyzing ? 'Analyzing with Gemini...' : 'Deep AI Scan'}</span>
          </button>

          <button
            onClick={toggleStar}
            className="p-2 text-slate-400 hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={currentEmail.isStarred ? 'Unstar' : 'Star'}
          >
            <Star
              className={`w-4 h-4 ${
                currentEmail.isStarred ? 'fill-amber-400 text-amber-400' : ''
              }`}
            />
          </button>

          <button
            onClick={toggleRead}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={currentEmail.isUnread ? 'Mark as Read' : 'Mark as Unread'}
          >
            {currentEmail.isUnread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Phishing Warning Banner */}
      <PhishingWarningBanner analysis={currentEmail.phishingAnalysis} />

      {/* Email Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {currentEmail.subject || '(No Subject)'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {currentEmail.priority && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  Priority: {currentEmail.priority.score}/5 — {currentEmail.priority.reason}
                </span>
              )}
              {currentEmail.category && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Category: {currentEmail.category}
                </span>
              )}
            </div>
          </div>

          <span className="text-xs text-slate-400 whitespace-nowrap">
            {new Date(currentEmail.date).toLocaleString()}
          </span>
        </div>

        {/* Sender & Recipient Information */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {currentEmail.from ? currentEmail.from.slice(0, 2).toUpperCase() : 'ME'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {currentEmail.from}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              To: {currentEmail.to || 'me'}
              {currentEmail.cc ? ` | Cc: ${currentEmail.cc}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary Card */}
      <AISummaryCard
        emailId={currentEmail.id}
        initialSummary={currentEmail.summary}
        subject={currentEmail.subject}
        sender={currentEmail.from}
        bodyText={currentEmail.bodyText}
      />

      {/* Action Items & Deadlines Grid */}
      {((actionItems && actionItems.length > 0) ||
        (currentEmail.deadlines && currentEmail.deadlines.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action Items */}
          {actionItems && actionItems.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Extracted Action Items
                </h4>
              </div>
              <ul className="space-y-2">
                {actionItems.map((item: any, idx: number) => (
                  <li
                    key={idx}
                    onClick={() => toggleTaskCompleted(idx)}
                    className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer group"
                  >
                    <button type="button" className="mt-0.5 text-slate-400 group-hover:text-emerald-500">
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div className={item.completed ? 'line-through text-slate-400' : ''}>
                      <p className="font-medium">{item.task}</p>
                      {item.deadline && item.deadline !== 'None' && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                          Due: {item.deadline}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deadlines & Key Dates */}
          {currentEmail.deadlines && currentEmail.deadlines.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Detected Deadlines & Dates
                </h4>
              </div>
              <div className="space-y-2">
                {currentEmail.deadlines.map((dl: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span>{dl.description || 'Important Date'}</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px]">
                        {dl.date}
                      </span>
                    </div>
                    {dl.context && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                        "{dl.context}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Body View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {currentEmail.bodyHtml ? (
          <div
            className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: currentEmail.bodyHtml }}
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
            {currentEmail.bodyText || currentEmail.snippet}
          </pre>
        )}
      </div>

      {/* AI Reply Panel */}
      <AIReplyPanel
        emailId={currentEmail.id}
        subject={currentEmail.subject}
        sender={currentEmail.from}
        bodyText={currentEmail.bodyText}
        onSendReply={handleSendReply}
      />
    </div>
  );
}
