
import React, { useState } from 'react';
import { Pill, Camera, Bell, Users, ChevronRight, X, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';

const STEP_ICONS = [
  <Sparkles size={32} className="text-emerald-500" />,
  <Camera size={32} className="text-blue-500" />,
  <Pill size={32} className="text-emerald-500" />,
  <Bell size={32} className="text-amber-500" />,
  <Users size={32} className="text-teal-500" />,
];

interface OnboardingOverlayProps {
  onFinish: () => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onFinish }) => {
  const { t } = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const step = t.onboarding.steps[stepIndex];
  const isLast = stepIndex === t.onboarding.steps.length - 1;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
      <button onClick={onFinish} aria-label={t.onboarding.closeLabel} className="absolute top-0 right-0 p-4 safe-top text-white/70 hover:text-white transition-colors">
        <X size={24} />
      </button>

      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[40px] p-8 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center">
          {STEP_ICONS[stepIndex]}
        </div>
        <h2 id="onboarding-title" className="text-xl font-black text-slate-800 dark:text-slate-100 mb-3 tracking-tight">{step.title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-8">{step.description}</p>

        <div className="flex justify-center gap-1.5 mb-8">
          {t.onboarding.steps.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        <div className="flex gap-3">
          {!isLast && (
            <button onClick={onFinish} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-sm">
              {t.onboarding.skip}
            </button>
          )}
          <button
            onClick={() => (isLast ? onFinish() : setStepIndex(i => i + 1))}
            className="flex-[2] py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            {isLast ? t.onboarding.start : t.onboarding.next}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
