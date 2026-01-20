import React from 'react';
import { type Language } from '../logic/translations';
import { AIHealthPanel } from './AIHealthPanel';

interface SidebarLeftProps {
    algoConfig: string[];
    setAlgoConfig: React.Dispatch<React.SetStateAction<string[]>>;
    lang: Language;
    setLang: (lang: Language) => void;
    aiVisualConfig: {
        enabled: boolean;
        showAttention: boolean;
        showPositive: boolean;
        showNegative: boolean;
    };
    setAIVisualConfig: React.Dispatch<React.SetStateAction<{
        enabled: boolean;
        showAttention: boolean;
        showPositive: boolean;
        showNegative: boolean;
    }>>;
    // AI Training Props
    isTraining: boolean;
    setIsTraining: (val: boolean) => void;
    lossHistory: number[];
    trainingSteps: number;
    onInjectFault: () => void; // New
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
    algoConfig,
    setAlgoConfig,
    lang,
    setLang,
    aiVisualConfig,
    setAIVisualConfig,
    isTraining,
    setIsTraining,
    lossHistory,
    trainingSteps,
    onInjectFault, // New
}) => {

    const toggleAlgo = (algo: string) => {
        setAlgoConfig(prev => {
            if (prev.includes(algo)) {
                if (prev.length === 1) return prev; // Prevent empty
                return prev.filter(a => a !== algo);
            }
            return [...prev, algo];
        });
    };

    const renderAlgoGroup = (title: string, algos: { id: string; label: string; desc: string }[]) => (
        <div className="mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">{title}</h3>
            <div className="flex flex-col gap-2">
                {algos.map(({ id, label, desc }) => {
                    const isActive = algoConfig.includes(id);
                    return (
                        <button
                            key={id}
                            onClick={() => toggleAlgo(id)}
                            className={`flex flex-col text-left px-4 py-3 rounded-xl border transition-all duration-300 group relative overflow-hidden ${isActive
                                ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-200'
                                : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
                                }`}
                        >
                            <div className="flex justify-between items-center w-full z-10 relative">
                                <span className={`text-[11px] font-black uppercase tracking-wide ${isActive ? 'text-white' : 'text-slate-700'}`}>
                                    {label}
                                </span>
                                <div className={`w-2 h-2 rounded-full transition-all ${isActive ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-slate-200'}`}></div>
                            </div>
                            <span className={`text-[9px] mt-1 pr-4 leading-relaxed ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {desc}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <aside className="w-[280px] bg-slate-50/50 border-r border-slate-200 h-full flex flex-col backdrop-blur-sm z-30">
            {/* Header / Logo Area */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path>
                            <circle cx="12" cy="12" r="3" strokeWidth="2" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 uppercase tracking-tighter leading-none">Aether Link</h1>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Analytics Core</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Algorithm List */}
            <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar">
                {renderAlgoGroup(lang === 'zh' ? '高阶概率模型' : 'Probabilistic Models', [
                    { id: 'BN', label: 'Bayesian Network', desc: lang === 'zh' ? '基于因果图的精确推理' : 'Exact inference via causal graph' },
                    { id: 'VI', label: 'Var-Inference', desc: lang === 'zh' ? '变分推断：大系统快速收敛' : 'Variational: Fast large-scale convergence' },
                    { id: 'MCS', label: 'Monte Carlo Sim', desc: lang === 'zh' ? '随机抽样故障模拟' : 'Stochastic failure simulation' },
                    { id: 'MCMC', label: 'MCMC Sampling', desc: lang === 'zh' ? '马尔可夫链置信度游走' : 'Markov Chain confidence walk' },
                ])}

                {renderAlgoGroup(lang === 'zh' ? '神经网络框架' : 'Neural Frameworks', [
                    { id: 'Transformer', label: 'Transformer/GAT', desc: lang === 'zh' ? '自注意力语义分析' : 'Self-attention semantic analysis' },
                ])}

                {renderAlgoGroup(lang === 'zh' ? '基础统计模型' : 'Statistical Models', [
                    { id: 'DT', label: 'Decision Tree', desc: lang === 'zh' ? '规则导向的二叉分析' : 'Rule-based binary analysis' },
                    { id: 'LR', label: 'Linear Regression', desc: lang === 'zh' ? '加权线性趋势预测' : 'Weighted linear trend projection' },
                    { id: 'LogReg', label: 'Logistic Regression', desc: lang === 'zh' ? 'Sigmoid 非线性分类' : 'Sigmoid non-linear implementation' },
                ])}
            </div>

            {/* Bottom: Brain Control & Language */}
            <div className="p-6 border-t border-slate-200 bg-white/50">

                {/* AI Brain Toggle */}
                <div className="mb-4">
                    <button
                        onClick={() => setAIVisualConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${aiVisualConfig.enabled
                            ? 'bg-violet-50 border-violet-200 shadow-sm'
                            : 'bg-white border-slate-100'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${aiVisualConfig.enabled ? 'bg-violet-500 animate-pulse' : 'bg-slate-300'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider ${aiVisualConfig.enabled ? 'text-violet-600' : 'text-slate-400'}`}>
                                {lang === 'zh' ? '显示 AI 思维 & 监控' : 'AI Brain View & Monitor'}
                            </span>
                        </div>
                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${aiVisualConfig.enabled ? 'bg-violet-500' : 'bg-slate-200'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${aiVisualConfig.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </button>

                    {/* Sub-Filters & Health Panel */}
                    {aiVisualConfig.enabled && (
                        <div className="mt-3 animate-in slide-in-from-top-2 duration-500 fade-in">
                            {/* Health Monitor */}
                            <AIHealthPanel
                                lang={lang}
                                isTraining={isTraining}
                                onToggleTraining={() => setIsTraining(!isTraining)}
                                onInjectFault={onInjectFault}
                                lossHistory={lossHistory}
                                accuracy={1 - (lossHistory[lossHistory.length - 1] || 0)} // Approx
                                trainingSteps={trainingSteps}
                            />

                            <div className="grid grid-cols-3 gap-2">
                                {/* Attention Toggle */}
                                <button
                                    onClick={() => setAIVisualConfig(prev => ({ ...prev, showAttention: !prev.showAttention }))}
                                    className={`flex flex-col items-center justify-center py-2 rounded-lg border text-[9px] font-bold transition-all ${aiVisualConfig.showAttention ? 'bg-violet-100 border-violet-200 text-violet-700' : 'bg-white border-slate-100 text-slate-400'
                                        }`}
                                >
                                    <div className={`w-8 h-1 rounded-full mb-1 ${aiVisualConfig.showAttention ? 'bg-violet-500' : 'bg-slate-200'}`}></div>
                                    Attn
                                </button>

                                {/* Positive Toggle */}
                                <button
                                    onClick={() => setAIVisualConfig(prev => ({ ...prev, showPositive: !prev.showPositive }))}
                                    className={`flex flex-col items-center justify-center py-2 rounded-lg border text-[9px] font-bold transition-all ${aiVisualConfig.showPositive ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'
                                        }`}
                                >
                                    <div className={`w-8 h-1 rounded-full mb-1 ${aiVisualConfig.showPositive ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                    Pos
                                </button>

                                {/* Negative Toggle */}
                                <button
                                    onClick={() => setAIVisualConfig(prev => ({ ...prev, showNegative: !prev.showNegative }))}
                                    className={`flex flex-col items-center justify-center py-2 rounded-lg border text-[9px] font-bold transition-all ${aiVisualConfig.showNegative ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-400'
                                        }`}
                                >
                                    <div className={`w-8 h-1 rounded-full mb-1 ${aiVisualConfig.showNegative ? 'bg-rose-500' : 'bg-slate-200'}`}></div>
                                    Neg
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl p-1 shadow-sm border border-slate-100 flex gap-1 mb-4">
                    <button onClick={() => setLang('en')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${lang === 'en' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>ENGLISH</button>
                    <button onClick={() => setLang('zh')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${lang === 'zh' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>中文</button>
                </div>
                <div className="text-[9px] text-slate-300 font-mono text-center">
                    v2.5.0-neural
                </div>
            </div>
        </aside>
    );
};
