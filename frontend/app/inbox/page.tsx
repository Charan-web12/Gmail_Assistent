'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Inbox,
  Star,
  Mail,
  Trash2,
  Archive,
  RefreshCw,
  PlusCircle,
  Sparkles,
  CheckSquare,
  Square,
  Filter,
} from 'lucide-react';
import EmailList, { EmailItem } from '@/components/EmailList';
import AISmartSearchBar from '@/components/AISmartSearchBar';
import ComposeModal from '@/components/ComposeModal';
import { emailAPI } from '@/lib/api';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const FOLDERS = [
  { id: 'INBOX', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
  { id: 'STARRED', label: 'Starred', icon: <Star className="w-4 h-4" /> },
  { id: 'UNREAD', label: 'Unread', icon: <Mail className="w-4 h-4" /> },
  { id: 'TRASH', label: 'Trash', icon: <Trash2 className="w-4 h-4" /> },
];

const CATEGORIES = ['All', 'Work', 'Personal', 'Promotions', 'Spam', 'Updates', 'Priority (P4+)'];

function InboxContent() {
  const searchParams = useSearchParams();
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('INBOX');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [justConnected, setJustConnected] = useState<boolean>(false);

  useEffect(() => {
    if (searchParams.get('gmail_connected') === 'true') {
      setJustConnected(true);
      setTimeout(() => setJustConnected(false), 6000);
    }
  }, [searchParams]);

  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await emailAPI.getEmails({
        label: selectedFolder,
        q: searchQuery,
      });

      setEmails(res.messages || []);
      setIsDemo(res.isDemo || false);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, searchQuery]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Handle item selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredEmails.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmails.map((e) => e.id));
    }
  };

  // Toggle Star
  const handleToggleStar = async (id: string, currentlyStarred: boolean) => {
    const nextState = !currentlyStarred;
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isStarred: nextState } : e))
    );

    try {
      await emailAPI.modifyEmail(id, {
        addLabels: nextState ? ['STARRED'] : [],
        removeLabels: !nextState ? ['STARRED'] : [],
      });
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  // Toggle Read
  const handleToggleRead = async (id: string, currentlyUnread: boolean) => {
    const nextUnread = !currentlyUnread;
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isUnread: nextUnread } : e))
    );

    try {
      await emailAPI.modifyEmail(id, {
        addLabels: nextUnread ? ['UNREAD'] : [],
        removeLabels: !nextUnread ? ['UNREAD'] : [],
      });
    } catch (err) {
      console.error('Failed to toggle read:', err);
    }
  };

  // Archive
  const handleArchive = async (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    try {
      await emailAPI.modifyEmail(id, { removeLabels: ['INBOX'] });
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    try {
      await emailAPI.deleteEmail(id);
    } catch (err) {
      console.error('Failed to delete email:', err);
    }
  };

  // Batch actions
  const handleBatchMarkRead = async () => {
    for (const id of selectedIds) {
      await emailAPI.modifyEmail(id, { removeLabels: ['UNREAD'] }).catch(() => {});
    }
    fetchEmails();
  };

  const handleBatchDelete = async () => {
    for (const id of selectedIds) {
      await emailAPI.deleteEmail(id).catch(() => {});
    }
    fetchEmails();
  };

  // Filter emails based on category chip
  const filteredEmails = emails.filter((email) => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Priority (P4+)') {
      return (email.priority?.score || 0) >= 4;
    }
    return email.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Gmail Connected Toast */}
      {justConnected && (
        <div className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>
            <strong>Success!</strong> Your Gmail account is connected. You are now browsing your live Gmail inbox.
          </span>
        </div>
      )}

      {/* Demo Alert Banner if using mock inbox */}
      {isDemo && !justConnected && (
        <div className="px-4 py-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>
              <strong>Intelligent Demo Inbox:</strong> Explore AI features with sample messages. Connect your real Gmail account anytime in Settings.
            </span>
          </div>
        </div>
      )}

      {/* Main Inbox Container */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 items-start">
        {/* Left Folder Navigation (1 Col) */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            className="w-full py-3 px-4 rounded-2xl font-semibold text-xs bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Compose Email</span>
          </button>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2 space-y-1 shadow-sm">
            {FOLDERS.map((folder) => {
              const isActive = selectedFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => {
                    setSelectedFolder(folder.id);
                    setSelectedIds([]);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <span className={isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}>
                    {folder.icon}
                  </span>
                  <span>{folder.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Email List Section (3-4 Cols) */}
        <div className="md:col-span-3 lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          {/* Search Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/30">
            <AISmartSearchBar onSearch={(q) => setSearchQuery(q)} />
          </div>

          {/* Category Filter Pills */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Batch Toolbar */}
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200"
              >
                {selectedIds.length > 0 && selectedIds.length === filteredEmails.length ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>Select All</span>
              </button>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {selectedIds.length} selected
                  </span>
                  <button
                    onClick={handleBatchMarkRead}
                    className="hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Mark Read
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={fetchEmails}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Email Items List */}
          <EmailList
            emails={filteredEmails}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onArchive={handleArchive}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </div>
      </div>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSent={fetchEmails}
      />
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading inbox...</div>}>
      <InboxContent />
    </Suspense>
  );
}
