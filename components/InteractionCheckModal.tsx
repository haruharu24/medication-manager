import React, { useEffect, useState } from 'react';
import { X, Loader2, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Medication } from '../types';
import { checkInteractions, InteractionCheckResult, InteractionSeverity } from '../utils/interactionCheck';

interface InteractionCheckModalProps {
  medications: Medication[];
  onClose: () => void;
}

const SEVERITY_STYLE: Record<InteractionSeverity, { label: string; className: string }> = {
  high: { label: '注意度: 高', className: 'bg-red-50 dark:bg-red-500/10 text-red-600 border-red-200 dark:border-red-500/30' },
  medium: { label: '注意度: 中', className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/30' },
  low: { label: '注意度: 低', className: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-500/30' },
};

export const InteractionCheckModal: React.FC<InteractionCheckModalProps> = ({ medications, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InteractionCheckResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    checkInteractions(medications)
      .then(res => { if (!cancelled) setResult(res); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'チェックに失敗しました'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [medications]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="interaction-check-title" className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-[32px] p-6 pb-8 safe-bottom max-h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 id="interaction-check-title" className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert size={20} className="text-purple-600" /> 飲み合わせチェック(AI)
          </h2>
          <button onClick={onClose} aria-label="閉じる" className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-90 transition-transform">
            <X size={16} />
          </button>
        </div>

        {loading && (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-500 dark:text-slate-500">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-xs font-bold">AIが飲み合わせを確認しています...</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-10 text-center space-y-2">
            <AlertTriangle size={32} className="mx-auto text-red-400" />
            <p className="text-sm font-bold text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && result && (
          <div className="space-y-4">
            {result.pairs.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <ShieldCheck size={32} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-emerald-600">明確な飲み合わせのリスクは見つかりませんでした</p>
              </div>
            ) : (
              result.pairs.map((pair, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-sm text-slate-800 dark:text-slate-100">{pair.medA} × {pair.medB}</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${SEVERITY_STYLE[pair.severity]?.className || SEVERITY_STYLE.low.className}`}>
                      {SEVERITY_STYLE[pair.severity]?.label || pair.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{pair.description}</p>
                </div>
              ))
            )}

            {result.summary && (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">{result.summary}</p>
            )}

            <div className="flex items-start gap-2 pt-2 text-slate-500 dark:text-slate-500">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <p className="text-[10px] font-bold leading-relaxed">
                この結果はAIによる一般的な情報であり、医学的な判断ではありません。実際の服薬については必ず医師・薬剤師にご確認ください。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
