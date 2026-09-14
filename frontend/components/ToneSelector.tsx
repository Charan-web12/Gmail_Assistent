'use client';

import React from 'react';
import { Briefcase, Smile, Zap, Target, MessageCircle } from 'lucide-react';

export type ToneOption = 'Professional' | 'Friendly' | 'Short' | 'Direct' | 'Casual';

interface ToneSelectorProps {
  selectedTone: ToneOption;
  onChange: (tone: ToneOption) => void;
  disabled?: boolean;
}

const TONES: { id: ToneOption; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'Professional',
    label: 'Professional',
    icon: <Briefcase className="w-3.5 h-3.5" />,
    desc: 'Courteous, articulate, and business-ready',
  },
  {
    id: 'Friendly',
    label: 'Friendly',
    icon: <Smile className="w-3.5 h-3.5" />,
    desc: 'Warm, encouraging, and collaborative',
  },
  {
    id: 'Short',
    label: 'Short',
    icon: <Zap className="w-3.5 h-3.5" />,
    desc: 'Ultra-concise, to-the-point (<3 sentences)',
  },
  {
    id: 'Direct',
    label: 'Direct',
    icon: <Target className="w-3.5 h-3.5" />,
    desc: 'Clear, decisive, and focused on next steps',
  },
  {
    id: 'Casual',
    label: 'Casual',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    desc: 'Relaxed, conversational, and natural',
  },
];

export default function ToneSelector({
  selectedTone,
  onChange,
  disabled = false,
}: ToneSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {TONES.map((tone) => {
        const isSelected = selectedTone === tone.id;
        return (
          <button
            key={tone.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tone.id)}
            title={tone.desc}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              isSelected
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/25 scale-[1.02]'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {tone.icon}
            <span>{tone.label}</span>
          </button>
        );
      })}
    </div>
  );
}
