'use client';

import React from 'react';
import Link from 'next/link';
import {
  Star,
  Mail,
  MailOpen,
  Archive,
  Trash2,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';

export interface EmailItem {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  to?: string;
  date: string;
  snippet: string;
  labels?: string[];
  isUnread: boolean;
  isStarred: boolean;
  priority?: { score: number; reason: string } | null;
  category?: string | null;
  phishingAnalysis?: { isSuspicious: boolean; riskScore: number; warnings: string[] } | null;
  actionItems?: any[];
  deadlines?: any[];
}

interface EmailListProps {
  emails: EmailItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleStar: (id: string, currentlyStarred: boolean) => void;
  onToggleRead: (id: string, currentlyUnread: boolean) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getSenderName(from: string) {
  if (!from) return 'Unknown';
  const match = from.match(/^"?([^"<]+)"?\s*(?:<.*>)?$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return from.split('@')[0];
}

function getSenderInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function EmailList({
  emails,
  selectedIds,
  onToggleSelect,
  onToggleStar,
  onToggleRead,
  onArchive,
  onDelete,
  isLoading = false,
}: EmailListProps) {
  if (isLoading) {
    return (
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
            <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
            </div>
            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-16 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <MailOpen className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Your Inbox is clear
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          No messages match the current folder or search query. Enjoy the peace of mind!
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
      {emails.map((email) => {
        const isSelected = selectedIds.includes(email.id);
        const senderName = getSenderName(email.from);
        const initials = getSenderInitials(senderName);
        const isPhishing = Boolean(email.phishingAnalysis?.isSuspicious);

        // Priority Color Mapping
        const pScore = email.priority?.score || 3;
        let priorityBadge = null;
        if (pScore >= 5) {
          priorityBadge = (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              P5 Urgent
            </span>
          );
        } else if (pScore === 4) {
          priorityBadge = (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              P4 High
            </span>
          );
        }

        // Category Tag
        let categoryChip = null;
        if (email.category) {
          categoryChip = (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {email.category}
            </span>
          );
        }

        return (
          <div
            key={email.id}
            className={`group relative flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer ${
              email.isUnread
                ? 'bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
            } ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''}`}
          >
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(email.id)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
            />

            {/* Star Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(email.id, email.isStarred);
              }}
              className="text-slate-400 hover:text-amber-400 p-0.5 transition-colors"
              title={email.isStarred ? 'Unstar message' : 'Star message'}
            >
              <Star
                className={`w-4 h-4 ${
                  email.isStarred
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                }`}
              />
            </button>

            {/* Sender Avatar Initials */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                isPhishing
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 border border-rose-300 dark:border-rose-800'
                  : email.isUnread
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {isPhishing ? <AlertOctagon className="w-4 h-4" /> : initials}
            </div>

            {/* Email Main Content Link */}
            <Link
              href={`/email/${email.id}`}
              className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-3"
            >
              {/* Sender & Unread dot */}
              <div className="flex items-center gap-2 md:w-48 flex-shrink-0">
                {email.isUnread && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                )}
                <span
                  className={`text-xs truncate ${
                    email.isUnread
                      ? 'font-bold text-slate-900 dark:text-slate-100'
                      : 'font-medium text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {senderName}
                </span>
              </div>

              {/* Subject, Badges & Snippet */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {priorityBadge}
                {isPhishing && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white">
                    Phishing Alert
                  </span>
                )}
                <span
                  className={`text-xs truncate ${
                    email.isUnread
                      ? 'font-bold text-slate-900 dark:text-slate-100'
                      : 'font-medium text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {email.subject}
                </span>
                <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500 truncate">
                  — {email.snippet}
                </span>
              </div>

              {/* Badges & Meta */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {categoryChip}
                {email.actionItems && email.actionItems.length > 0 && (
                  <span
                    className="hidden lg:flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                    title={`${email.actionItems.length} action items detected`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{email.actionItems.length}</span>
                  </span>
                )}
                <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {formatRelativeTime(email.date)}
                </span>
              </div>
            </Link>

            {/* Hover Quick Action Buttons */}
            <div className="hidden group-hover:flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 pl-2 py-1 absolute right-4 shadow-sm rounded-lg border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRead(email.id, email.isUnread);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={email.isUnread ? 'Mark as read' : 'Mark as unread'}
              >
                {email.isUnread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              </button>

              {onArchive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(email.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Archive message"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(email.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Trash message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
