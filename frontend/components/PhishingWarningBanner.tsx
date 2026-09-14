'use client';

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface PhishingWarningBannerProps {
  analysis?: {
    isSuspicious: boolean;
    riskScore: number;
    warnings: string[];
  } | null;
}

export default function PhishingWarningBanner({ analysis }: PhishingWarningBannerProps) {
  const [expanded, setExpanded] = useState<boolean>(true);

  if (!analysis || !analysis.isSuspicious) {
    return null;
  }

  const isHighRisk = analysis.riskScore >= 70;

  return (
    <div
      className={`rounded-2xl p-4 border transition-all duration-300 shadow-sm ${
        isHighRisk
          ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300/80 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
          : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl flex-shrink-0 ${
              isHighRisk
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                : 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
            }`}
          >
            {isHighRisk ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">
                {isHighRisk ? 'Security Threat Detected (Phishing / Spoofing)' : 'Potential Caution Advised'}
              </h4>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isHighRisk
                    ? 'bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                    : 'bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                }`}
              >
                Risk Score: {analysis.riskScore}%
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              Gemini AI detected potential deceptive patterns. Do not click unverified links or provide credentials.
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title={expanded ? 'Collapse details' : 'Expand details'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && analysis.warnings && analysis.warnings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-800/60">
          <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider opacity-80">
            Detected Red Flags:
          </p>
          <ul className="space-y-1 text-xs">
            {analysis.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-rose-500 font-bold">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
