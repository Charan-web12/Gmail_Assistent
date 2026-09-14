'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import EmailView from '@/components/EmailView';
import { emailAPI } from '@/lib/api';

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [email, setEmail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await emailAPI.getEmail(id);
      setEmail(res.email);
    } catch (err: any) {
      console.error('Failed to load email:', err);
      setError(err.message || 'Email not found or could not be retrieved.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs text-slate-500">Decrypting & loading email message...</p>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
          <ArrowLeft className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Message Unavailable
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {error || 'Unable to display email details.'}
        </p>
        <Link
          href="/inbox"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
        >
          Return to Inbox
        </Link>
      </div>
    );
  }

  return <EmailView email={email} onRefresh={loadEmail} />;
}
