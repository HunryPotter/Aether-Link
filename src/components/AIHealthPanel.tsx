import React from 'react';
import { Sparkline } from './Sparkline';
import { type Language } from '../logic/translations';

interface AIHealthPanelProps {
    lang: Language;
    isTraining: boolean;
    onToggleTraining: () => void;
    onInjectFault: () => void; // New
    lossHistory: number[];
    accuracy: number;
    trainingSteps: number;
}

export const AIHealthPanel: React.FC<AIHealthPanelProps> = ({
    lang,
    isTraining,
    onToggleTraining,
    onInjectFault, // New
    lossHistory,
    accuracy,
    trainingSteps
}) => {
    return (
        <div className="bg-slate-900 rounded-2xl p-4 shadow-xl border border-slate-700 w-full mb-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isTraining ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {lang === 'zh' ? 'AI 训练监控' : 'AI Training Monitor'}
                    </h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onInjectFault}
                        className="text-[9px] font-bold px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors uppercase"
                        title="Simulate random sensor failure"
                    >
                        {lang === 'zh' ? '注入故障' : 'INJECT ANOMALY'}
                    </button>
                    <button
                        onClick={onToggleTraining}
                        className={`text-[9px] font-bold px-2 py-1 rounded transition-colors ${isTraining
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                            }`}
                    >
                        {isTraining
                            ? (lang === 'zh' ? '正在训练' : 'TRAINING ACTIVE')
                            : (lang === 'zh' ? '训练暂停' : 'TRAINING PAUSED')
                        }
                    </button>
                </div>
            </div>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Loss Metric */}
                <div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Mean Loss</div>
                    <div className="text-xl font-mono font-black text-white">
                        {lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].toFixed(4) : '0.000'}
                    </div>
                </div>
                {/* Accuracy Metric (Derived) */}
                <div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Model Accuracy</div>
                    <div className={`text-xl font-mono font-black ${accuracy > 0.9 ? 'text-emerald-400' : accuracy > 0.7 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {(accuracy * 100).toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Loss Chart */}
            <div className="h-16 w-full bg-slate-800/50 rounded-lg overflow-hidden relative mb-2">
                <Sparkline
                    data={lossHistory}
                    color="#f43f5e"
                    height={64}
                    showXAxis={false}
                />
                <div className="absolute top-1 right-1 text-[8px] text-slate-600 font-mono">LOSS CURVE</div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-700 pt-3">
                <div className="text-[9px] text-slate-500 font-mono">
                    Steps: {trainingSteps}
                </div>
                <div className="text-[9px] text-slate-500">
                    LR: 0.05 (Adaptive)
                </div>
            </div>
        </div>
    );
};
