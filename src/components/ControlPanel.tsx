import { useState, useEffect } from 'react';
import { AttributeEditorModal } from './AttributeEditorModal';
import { Sparkline } from './Sparkline';
import type { GraphNode, GraphEdge } from '../logic/GraphModel';
import { translations } from '../logic/translations';
import type { Language } from '../logic/translations';

interface ControlPanelProps {
    selectedNode: GraphNode | null;
    selectedEdge: GraphEdge | null;
    lang: Language;
    // currentConfidence prop is for the static Bayesian analysis result
    // But for simulation, we should prefer the node's own dynamic belief
    currentConfidence: number;
    onSetConfidence: (nodeId: string, value: number | null) => void;
    onRemoveNode: (nodeId: string) => void;
    onUpdateNode: (nodeId: string, updates: Partial<GraphNode>) => void;

    onRemoveEdge: (edgeId: string) => void;
    // Analysis
    engine: any | null; // Use any to avoid circular import for now, or import BayesianEngine type
    evidence: Record<string, number>;
    activeAlgorithm?: string;

    // Multi-select
    selectedCount?: number;
    onGroup?: () => void;
    onUngroup?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    selectedNode,
    selectedEdge,
    lang,
    currentConfidence,
    onSetConfidence,
    onRemoveNode,
    onUpdateNode,

    onRemoveEdge,
    engine,
    evidence,
    activeAlgorithm,
    selectedCount,
    onGroup,
    onUngroup
}) => {
    const t = translations[lang];

    const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
    const [isOverrideMode, setIsOverrideMode] = useState(false);
    // Use dynamic confidence from simulation if available, otherwise use static Bayesian result
    const displayedConfidence = (selectedNode && selectedNode.beliefs?.['working'] !== undefined)
        ? selectedNode.beliefs['working']
        : currentConfidence;

    const [activeTag, setActiveTag] = useState<string | null>(null);

    const [initialAttributesCache, setInitialAttributesCache] = useState<Record<string, any>>({});

    // Cache initial attributes when node selection changes
    useEffect(() => {
        if (selectedNode?.customAttributes) {
            // Deep copy to keyframe the state at selection time
            setInitialAttributesCache(JSON.parse(JSON.stringify(selectedNode.customAttributes)));
        } else {
            setInitialAttributesCache({});
        }
    }, [selectedNode?.id]); // Only re-cache when switching nodes, NOT when updating values

    const handleSaveAttributes = (attributes: Record<string, { value: number; confidence: number }>) => {
        if (!selectedNode) return;
        onUpdateNode(selectedNode.id, { customAttributes: attributes });
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedNode) return;
        const value = e.target.value;
        const updates: Partial<GraphNode> = lang === 'en'
            ? { labelEn: value, label: value }
            : { labelZh: value, label: value };
        onUpdateNode(selectedNode.id, updates);
    };

    const renderInspector = () => {
        // Multi-select view
        if (selectedCount && selectedCount > 1) {
            return (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-300">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">{selectedCount} {lang === 'zh' ? '项已选择' : 'Items Selected'}</h2>

                    {onGroup && (
                        <button
                            onClick={onGroup}
                            className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                            {lang === 'zh' ? '编组节点' : 'Group Selection'}
                        </button>
                    )}
                </div>
            );
        }

        if (!selectedNode && !selectedEdge) {
            return (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">{t.inspectorTitle}</h2>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-[200px]">{t.inspectorText}</p>
                </div>
            );
        }



        // Edge Inspector - Removed as per user request (BOM definition is now in bottom floating bar)
        if (selectedEdge) {
            return (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-8 opacity-50">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <p className="text-slate-400 text-xs">{lang === 'zh' ? '已选中连接' : 'Connection Selected'}</p>
                    <div className="mt-4">
                        <button
                            onClick={() => onRemoveEdge(selectedEdge.id)}
                            className="text-xs text-red-400 hover:text-red-500 underline"
                        >
                            {lang === 'zh' ? '删除连接' : 'Delete Link'}
                        </button>
                    </div>
                </div>
            );
        }

        const nodeLabel = lang === 'en' ? selectedNode!.labelEn : selectedNode!.labelZh;
        return (
            <div className="p-8 flex flex-col gap-8">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t.nodeLabel}</span>
                        <input
                            type="text"
                            value={nodeLabel}
                            onChange={handleLabelChange}
                            className="w-full text-2xl font-black text-slate-900 leading-tight bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-100 rounded-lg p-1 -ml-1 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => onRemoveNode(selectedNode!.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t.id}</span>
                        <span className="font-mono text-sm text-slate-600 block truncate">{selectedNode!.id}</span>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t.type}</span>
                            <span className="text-sm font-bold text-slate-700 capitalize">{selectedNode!.type}</span>
                        </div>
                        <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t.context}</span>
                            <span className="text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase">{selectedNode!.context}</span>
                        </div>
                    </div>

                    {/* Group Actions */}
                    {selectedNode!.type === 'group' && onUngroup && (
                        <button
                            onClick={onUngroup}
                            className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                            {lang === 'zh' ? '解除编组' : 'Ungroup Nodes'}
                        </button>
                    )}

                    {/* Render Tags */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{lang === 'zh' ? '元数据 (Metadata)' : 'Metadata Tags'}</span>
                        <div className="grid grid-cols-1 gap-3">
                            {selectedNode && Object.entries(selectedNode.tags || {}).map(([key, value]) => (
                                <div key={key} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{key}</div>
                                        <div className="text-xs font-black text-slate-700 truncate" title={value}>{value}{key === 'Progress' ? '%' : (key === 'Time' ? ' d' : '')}</div>
                                    </div>

                                    {/* Special Visualization for Progress */}
                                    {key === 'Progress' && (
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${value}%` }}
                                            ></div>
                                        </div>
                                    )}

                                    {/* Special Visualization for Time (Pulse) */}
                                    {key === 'Time' && (
                                        <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            {lang === 'zh' ? '后台时序模拟中' : 'Active simulation cycle'}
                                        </div>
                                    )}

                                    {/* Sparkline for Tag History */}
                                    {selectedNode.history && selectedNode.history[key] && selectedNode.history[key].length > 0 && (
                                        <div className="mt-2 h-10 w-full">
                                            <Sparkline
                                                data={selectedNode.history[key]}
                                                color={key === 'Progress' ? '#3b82f6' : '#64748b'}
                                                height={40}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {(selectedNode?.type === 'part' || selectedNode?.type === 'process') && (
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {lang === 'zh' ? '节点属性 (Tags)' : 'Node Attributes'}
                            </span>
                            <button
                                onClick={() => setIsAttributeModalOpen(true)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg transition-colors uppercase tracking-wider"
                            >
                                {lang === 'zh' ? '管理...' : 'Manage...'}
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            {Object.entries(selectedNode.customAttributes || {}).map(([key, data]) => {
                                // Determine if modified (compare with cache, tolerance 0.001)
                                const cachedEntry = initialAttributesCache[key];
                                const initialConf = cachedEntry ? cachedEntry.confidence : 1.0;
                                const isModified = Math.abs(data.confidence - initialConf) > 0.001;

                                return (
                                    <div
                                        key={key}
                                        className={`bg-slate-50 border px-3 py-2 rounded-xl transition-all ${activeTag === key ? 'border-amber-300 shadow-md ring-1 ring-amber-100' : 'border-slate-100 hover:border-blue-200 cursor-pointer'}`}
                                        onClick={() => setActiveTag(activeTag === key ? null : key)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                {key}
                                                {/* Reset Button (Revert to Initial) */}
                                                {(isModified || data.confidence < 0.99) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdateNode(selectedNode.id, {
                                                                customAttributes: {
                                                                    ...selectedNode.customAttributes,
                                                                    [key]: { ...data, confidence: initialConf }
                                                                }
                                                            });
                                                        }}
                                                        className="text-slate-300 hover:text-amber-500 transition-colors"
                                                        title={`Reset to Baseline (${(initialConf * 100).toFixed(0)}%)`}
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                                    </button>
                                                )}
                                            </span>
                                            <span className="text-sm font-black text-slate-700 font-mono">{data.value}</span>
                                        </div>

                                        {/* Mini Interactive Slider (Always Visible for "Live" feel) */}
                                        <div className="mt-2 flex items-center gap-2 group" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex-1 relative h-4 flex items-center">
                                                {/* Background Track */}
                                                <div className="absolute w-full h-1.5 bg-slate-200 rounded-full overflow-hidden pointer-events-none">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${data.confidence < 0.5 ? 'bg-rose-500' : data.confidence < 0.8 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                        style={{ width: `${data.confidence * 100}%` }}
                                                    ></div>
                                                </div>
                                                {/* Interactive Range Input (Invisible but overlaid) */}
                                                <input
                                                    type="range" min="0" max="1" step="0.05"
                                                    className="absolute w-full h-4 opacity-0 cursor-ew-resize z-10"
                                                    title={`Adjust Sensitivity: ${(data.confidence * 100).toFixed(0)}%`}
                                                    value={data.confidence}
                                                    onChange={(e) => {
                                                        const newVal = parseFloat(e.target.value);
                                                        // Clear working belief to force simulation to re-converge immediately to new attribute baseline
                                                        const newBeliefs = { ...selectedNode.beliefs };
                                                        delete newBeliefs['working'];

                                                        // Link Confidence to Value (Live Simulation of Degradation)
                                                        let updatedValue = data.value;
                                                        if (cachedEntry && typeof cachedEntry.value === 'number') {
                                                            const baseConf = Math.max(0.1, cachedEntry.confidence);
                                                            // Calculate new value based on ratio from Baseline
                                                            updatedValue = Math.floor(cachedEntry.value * (newVal / baseConf));
                                                        }

                                                        onUpdateNode(selectedNode.id, {
                                                            customAttributes: {
                                                                ...selectedNode.customAttributes,
                                                                [key]: {
                                                                    ...data,
                                                                    confidence: newVal,
                                                                    value: updatedValue
                                                                }
                                                            },
                                                            beliefs: newBeliefs
                                                        });
                                                    }}
                                                />
                                                {/* Thumb Indicator (Visual only, follows value) */}
                                                <div
                                                    className="absolute h-3 w-3 bg-white border border-slate-300 shadow-sm rounded-full pointer-events-none transition-all duration-75 group-hover:scale-125"
                                                    style={{ left: `calc(${data.confidence * 100}% - 6px)` }}
                                                />
                                            </div>
                                            <span className={`text-[9px] font-bold font-mono w-8 text-right ${data.confidence < 0.8 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                {(data.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>

                                        {/* Description / Metadata Hint */}
                                        {data.confidence < 0.6 && (
                                            <div className="mt-1 text-[8px] text-rose-500 font-bold animate-pulse">
                                                ⚠️ Risk Critical
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {(!selectedNode.customAttributes || Object.keys(selectedNode.customAttributes).length === 0) && (
                                <span className="text-xs text-slate-300 italic">
                                    {lang === 'zh' ? '暂无标签' : 'No tags'}
                                </span>
                            )}
                        </div>

                        {/* Attribute Modal */}
                        {isAttributeModalOpen && (
                            <AttributeEditorModal
                                isOpen={isAttributeModalOpen}
                                onClose={() => setIsAttributeModalOpen(false)}
                                onSave={handleSaveAttributes}
                                initialAttributes={selectedNode.customAttributes || {}}
                                lang={lang}
                            />
                        )}
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isOverrideMode ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`}></span>
                            {t.simulateStatus}
                        </h3>
                        <button
                            onClick={() => setIsOverrideMode(!isOverrideMode)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${isOverrideMode ? 'bg-amber-100 text-amber-700 shadow-inner' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {lang === 'zh' ? (isOverrideMode ? '退出实验' : '开启实验模式') : (isOverrideMode ? 'Exit Experiment' : 'Experiment Mode')}
                        </button>
                    </div>

                    {!isOverrideMode ? (
                        <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex justify-between text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">
                                <span>{lang === 'zh' ? '当前计算值' : 'Calculated Value'}</span>
                                <span className="font-mono text-slate-900">{(displayedConfidence * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-700 ease-out ${displayedConfidence < 0.5 ? 'bg-rose-500' : displayedConfidence < 0.9 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${displayedConfidence * 100}%` }}
                                ></div>
                            </div>

                            {/* Confidence History Sparkline */}
                            {selectedNode && selectedNode.history && selectedNode.history['confidence'] && selectedNode.history['confidence'].length > 0 && (
                                <div className="mt-3 bg-white/50 rounded-lg p-2 border border-slate-100/50">
                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                        {lang === 'zh' ? '置信度趋势' : 'Confidence Trend'}
                                    </div>
                                    <Sparkline
                                        data={selectedNode.history['confidence']}
                                        color={displayedConfidence < 0.5 ? '#f43f5e' : displayedConfidence < 0.9 ? '#f59e0b' : '#10b981'}
                                        height={60}
                                        showXAxis={false}
                                    />
                                </div>
                            )}

                            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                                {lang === 'zh' ? '此数值由贝叶斯网络根据父节点和自定义属性自动推断。' : 'Auto-inferred by the Bayesian network based on parents and attributes.'}
                            </p>

                            {/* Sensitivity Analysis & AI Influencers */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                                    {lang === 'zh' ? '关键影响因子 (AI Insights)' : 'Key Influencers (AI Insights)'}
                                </span>
                                <div className="space-y-2">
                                    {selectedNode ? (
                                        (() => {
                                            // 1. Gather AI Influencers from modelParams
                                            const influencers: { id: string; type: 'attn' | 'pos' | 'neg'; score: number; label: string }[] = [];

                                            // Helper to get label
                                            const getLabel = (id: string) => {
                                                const n = engine?.graph?.nodes?.get(id);
                                                return n ? (lang === 'zh' ? n.labelZh : n.labelEn) : id;
                                            };

                                            if (selectedNode.modelParams) {
                                                // Attention
                                                if (selectedNode.modelParams.attention) {
                                                    Object.entries(selectedNode.modelParams.attention).forEach(([targetId, score]) => {
                                                        if (score > 0.1) influencers.push({ id: targetId, type: 'attn', score, label: getLabel(targetId) });
                                                    });
                                                }
                                                // Weights
                                                if (selectedNode.modelParams.weights) {
                                                    Object.entries(selectedNode.modelParams.weights).forEach(([targetId, weight]) => {
                                                        if (Math.abs(weight) > 0.2) {
                                                            influencers.push({
                                                                id: targetId,
                                                                type: weight > 0 ? 'pos' : 'neg',
                                                                score: Math.abs(weight),
                                                                label: getLabel(targetId)
                                                            });
                                                        }
                                                    });
                                                }
                                            }

                                            // 2. Fallback to Sensitivity Analysis if no AI params yet or sparse
                                            if (influencers.length === 0 && engine) {
                                                try {
                                                    const sensitivityMap = engine.runSensitivityAnalysis(selectedNode.id, evidence, activeAlgorithm || 'BN');
                                                    Array.from(sensitivityMap.entries()).forEach(([key, score]: any) => {
                                                        const [nodeId, attrName] = key.split(':');
                                                        if (nodeId !== selectedNode.id) {
                                                            influencers.push({
                                                                id: nodeId,
                                                                type: 'pos', // Default to generic positive influence for probabilistic
                                                                score: score,
                                                                label: `${getLabel(nodeId)}${attrName ? ' > ' + attrName : ''}`
                                                            });
                                                        }
                                                    });
                                                } catch (e) { /* ignore */ }
                                            }

                                            // 3. Sort & Slice
                                            const topInfluencers = influencers
                                                .sort((a, b) => b.score - a.score)
                                                .slice(0, 3);

                                            if (topInfluencers.length === 0) return (
                                                <div className="text-[10px] text-slate-400 italic pl-1">
                                                    {lang === 'zh' ? '暂无显著影响因子' : 'No significant influencers found.'}
                                                </div>
                                            );

                                            return topInfluencers.map((inf, idx) => (
                                                <div key={`${inf.id}-${inf.type}-${idx}`} className="flex items-center justify-between text-[10px] bg-slate-50 p-2 rounded border border-slate-100 mb-1">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {/* Icon based on Type */}
                                                        {inf.type === 'attn' && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" title="Attention" />}
                                                        {inf.type === 'pos' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Positive Weight" />}
                                                        {inf.type === 'neg' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" title="Negative Weight" />}

                                                        <span className="text-slate-700 truncate" title={inf.label}>
                                                            {inf.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${inf.type === 'attn' ? 'text-violet-400' :
                                                                inf.type === 'pos' ? 'text-emerald-400' : 'text-rose-400'
                                                            }`}>
                                                            {inf.type === 'attn' ? 'ATTN' : inf.type === 'pos' ? 'POS' : 'NEG'}
                                                        </span>
                                                        <span className="font-mono font-bold text-slate-900">
                                                            {(inf.score * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ));

                                        })()
                                    ) : (
                                        <div className="text-[10px] text-slate-400 italic pl-1">Loading...</div>
                                    )}
                                </div>
                                <p className="text-[9px] text-slate-400 italic mt-2">
                                    {lang === 'zh' ? 'AI 自动识别的主要因果来源' : 'Top causal sources identified by AI'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-top-2 duration-300 fade-in">
                            <div className="mb-8 px-2">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                                    <span>Manual Override</span>
                                    <span>{(currentConfidence * 100).toFixed(1)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={currentConfidence}
                                    onChange={(e) => onSetConfidence(selectedNode!.id, parseFloat(e.target.value))}
                                    className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-500 mb-4 hover:accent-amber-600 transition-all"
                                />
                            </div>

                            <div className="flex gap-3 mb-4">
                                <button
                                    onClick={() => onSetConfidence(selectedNode!.id, 1.0)}
                                    className={`flex-1 py-3 rounded-xl font-bold border-2 text-xs transition-all ${currentConfidence > 0.999 ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200 hover:text-emerald-500'}`}
                                >
                                    Functional (100%)
                                </button>
                                <button
                                    onClick={() => onSetConfidence(selectedNode!.id, 0.0)}
                                    className={`flex-1 py-3 rounded-xl font-bold border-2 text-xs transition-all ${currentConfidence < 0.001 ? 'bg-rose-500 border-rose-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-rose-200 hover:text-rose-500'}`}
                                >
                                    Failed (0%)
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    onSetConfidence(selectedNode!.id, null);
                                    setIsOverrideMode(false);
                                }}
                                className="w-full py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                {lang === 'zh' ? '重置为计算值' : 'Reset to Calculated'}
                            </button>
                        </div>
                    )
                    }
                </div >

                <div className="mt-auto bg-slate-900 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl transition-all"></div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.diagnostic}</h4>
                    <div className="text-5xl font-black text-white tracking-tighter">
                        {(displayedConfidence * 100).toFixed(0)}<span className="text-xl ml-1 text-slate-500">%</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-wide">{t.confidenceScore}</div>
                </div>
            </div >
        );
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto">
                {renderInspector()}
            </div>
        </div>
    );
};
