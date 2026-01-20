import React, { useEffect } from 'react';
import ReactFlow, {
    type Node,
    type Edge,
    type NodeProps,
    type EdgeProps,
    BaseEdge,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    MarkerType,
    Position,
    Handle,
    useReactFlow,
    ReactFlowProvider,
    NodeResizer
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { KnowledgeGraph, GraphNode } from '../logic/GraphModel';
import type { Language } from '../logic/translations';

interface NetworkGraphProps {
    graph: KnowledgeGraph;
    lang: Language;
    confidenceScores: Map<string, number>;
    onNodeClick?: (nodeId: string) => void;
    onEdgeClick?: (edgeId: string) => void;
    onNodesChange?: (changes: any) => void;
    onConnect?: (params: any) => void;
    onEdgesDelete?: (edges: Edge[]) => void;
    onNodesDelete?: (nodes: Node[]) => void;
    activeBOMFilter?: string | null;
    onUpdateEdge?: (edgeId: string, updates: any) => void;
    onUpdateNode?: (nodeId: string, updates: any) => void;
    onAddNodeTriggered?: (pos: { x: number, y: number }, type: 'part' | 'process', context: 'design' | 'manufacturing') => void;
    onSelectionChange?: (nodes: Node[], edges: Edge[]) => void;
    aiVisualConfig?: {
        enabled: boolean;
        showAttention: boolean;
        showPositive: boolean;
        showNegative: boolean;
    };
}

import { BOM_COLORS, VISUAL_CONSTANTS } from '../logic/theme';

const MILK_WHITE = VISUAL_CONSTANTS.MILK_WHITE;

const getNodeColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10b981'; // Emerald 500
    if (confidence >= 0.5) return '#f59e0b'; // Amber 500
    return '#ef4444'; // Rose 500
};

// --- Unreal Engine Style Constants ---
const UE_THEME = {
    nodeBg: 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xl dark:shadow-none',
    headerBg: 'bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800',
    border: 'border border-slate-300 dark:border-slate-600',
    selected: 'ring-2 ring-blue-500 dark:ring-yellow-500',
    text: 'text-slate-700 dark:text-slate-200',
    label: 'text-slate-700 dark:text-white font-bold text-xs drop-shadow-sm',
    pin: 'w-3 h-3 rounded-full border border-slate-300 dark:border-slate-900',
    pinIn: 'bg-emerald-500',
    pinOut: 'bg-blue-500',
};

// Group Node Component
const GroupNode = ({ data, selected, id }: NodeProps) => {
    const isCollapsed = data.collapsed;

    return (
        <>
            <div
                className={`relative rounded-xl border-2 transition-all ${selected ? 'border-blue-500 shadow-lg' : 'border-slate-300'
                    } ${isCollapsed ? 'bg-white' : 'bg-slate-50/50 backdrop-blur-sm'}`}
                style={{
                    width: '100%',
                    height: '100%',
                    minWidth: isCollapsed ? 150 : undefined,
                    minHeight: isCollapsed ? 60 : undefined,
                }}
            >
                {!isCollapsed && <NodeResizer minWidth={100} minHeight={100} isVisible={selected} onResizeEnd={(_: any, params: any) => data.onNodeResize && data.onNodeResize(id, params.width, params.height)} />}

                <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-200/50 ${isCollapsed ? 'h-full border-none' : 'bg-slate-100/50 rounded-t-xl'}`}>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            {data.label || 'Group'}
                        </span>
                    </div>

                    <button
                        className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:bg-blue-500 hover:text-white hover:border-blue-600 rounded-md shadow-sm transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onToggleCollapse && data.onToggleCollapse(id, !isCollapsed);
                        }}
                        title={isCollapsed ? "Expand Group" : "Collapse Group"}
                    >
                        {isCollapsed ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                        )}
                    </button>
                </div>

                {isCollapsed && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-400 font-bold opacity-20">GROUP</span>
                    </div>
                )}
            </div>
            {/* Handles for connections to the group when collapsed or just in general */}
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-200 !border-slate-400" />
            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-200 !border-slate-400" />
        </>
    );
};

// Custom Node Component
const CustomNode = ({ data, selected }: NodeProps) => {
    const isLogic = data.nodeType === 'process';
    const hasActiveFilter = data.isRelated && data.activeFilterColor;

    return (
        <div className={`relative px-4 py-2 rounded-xl shadow-xl transition-all border-2 flex items-center justify-center text-center font-black text-xs min-h-[60px] min-w-[140px] overflow-hidden ${selected ? 'ring-4 ring-blue-500/20 scale-105' : ''
            } ${isLogic ? 'border-dashed border-blue-400' : 'border-slate-100'}`}
            style={{
                background: isLogic
                    ? `rgba(59, 130, 246, 0.05)`
                    : (hasActiveFilter ? data.activeFilterColor : MILK_WHITE),
                backdropFilter: isLogic ? 'blur(4px)' : 'none',
                color: (hasActiveFilter || isLogic) ? '#1e293b' : '#334155',
            }}
        >
            {/* Confidence Status Bar - Left side accent */}
            {!isLogic && !hasActiveFilter && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ background: data.color }}
                />
            )}

            <Handle
                type="target"
                position={isLogic ? Position.Left : Position.Top}
                className={`!w-2 !h-2 !bg-slate-300 !border-none ${isLogic ? '!-left-1' : '!-top-1'}`}
                style={isLogic ? { top: '50%', transform: 'translateY(-50%)' } : { left: '50%', transform: 'translateX(-50%)' }}
            />

            <div className="flex flex-col z-10">
                <span className="uppercase tracking-tight">{data.label}</span>
                <span className={`text-[9px] mt-1 font-bold ${isLogic ? 'text-blue-600' : 'opacity-60'}`}>
                    {data.confidenceText}
                </span>
                {data.isSimulating && (
                    <>
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping opacity-75" />
                    </>
                )}
            </div>

            <Handle
                type="source"
                position={isLogic ? Position.Right : Position.Bottom}
                className={`!w-2 !h-2 !bg-slate-400 !border-none ${isLogic ? '!-right-1' : '!-bottom-1'}`}
                style={isLogic ? { top: '50%', transform: 'translateY(-50%)' } : { left: '50%', transform: 'translateX(-50%)' }}
            />
        </div>
    );
};

// Custom Edge Component to handle overlapping BOM lines with Arc Path and Manual Adjustment
const BOMEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
    data,
    label,
    labelStyle,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius
}: EdgeProps) => {
    const offsetIndex = data?.offsetIndex || 0;

    // Curvature logic: pixel offset along normal
    let curvature = data?.curvature;
    if (curvature === undefined) {
        const step = 40;
        const direction = offsetIndex % 2 === 0 ? 1 : -1;
        curvature = Math.floor((offsetIndex + 1) / 2) * step * direction;
    }

    // Calculate Quadratic Arc
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / (len || 1);
    const ny = dx / (len || 1);

    const cx = midX + nx * curvature;
    const cy = midY + ny * curvature;

    const edgePath = `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`;

    // Label position at the peak (t=0.5 for Quadratic Bezier)
    const labelX = 0.25 * sourceX + 0.5 * cx + 0.25 * targetX;
    const labelY = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY;

    const onMouseDown = (event: React.MouseEvent) => {
        event.stopPropagation();
        const startY = event.clientY;
        const startCurvature = curvature;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const newCurvature = startCurvature + deltaY;
            if (data?.onUpdateEdge) {
                data.onUpdateEdge(id, { curvature: newCurvature });
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            {label && (
                <g
                    transform={`translate(${labelX}, ${labelY})`}
                    onMouseDown={onMouseDown}
                    style={{ cursor: 'pointer' }}
                >
                    <rect
                        x={-(labelBgPadding?.[0] || 0) - 20}
                        y={-(labelBgPadding?.[1] || 0) - 8}
                        width={40}
                        height={16}
                        fill={labelBgStyle?.fill || 'white'}
                        fillOpacity={labelBgStyle?.fillOpacity || 1}
                        rx={labelBgBorderRadius || 0}
                        stroke={labelBgStyle?.stroke}
                        strokeWidth={labelBgStyle?.strokeWidth}
                    />
                    <text
                        className="react-flow__edge-text select-none"
                        style={{ ...labelStyle, pointerEvents: 'none' }}
                        textAnchor="middle"
                        dominantBaseline="central"
                    >
                        {label}
                    </text>
                </g>
            )}
        </>
    );
};

// 3. COLLAPSED GROUP NODE (The "Function/Graph" Node)
const UECollapsedNode = ({ data, selected, id }: NodeProps) => {
    const { inputs = [], outputs = [] } = data.ports || {};

    return (
        <div className={`min-w-[160px] rounded-lg overflow-hidden shadow-2xl transition-all ${UE_THEME.nodeBg} ${UE_THEME.border} ${selected ? UE_THEME.selected : ''}`}>
            {/* Header with Expand Button */}
            <div className={`bg-gradient-to-b from-indigo-600 to-indigo-800 px-3 py-1.5 flex items-center justify-between border-b border-white/10`}>
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <span className={`${UE_THEME.label} italic`}>{data.label || 'SubGraph'}</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); data.onToggleCollapse && data.onToggleCollapse(id, false); }}
                    className="text-white/50 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
            </div>

            {/* Metrics Body */}
            <div className="px-3 py-2 space-y-2">
                {/* Confidence Meter */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Confidence</span>
                        <span className={`text-[10px] font-black ${(data.groupConfidence || 0) < 0.8 ? 'text-red-500' : 'text-emerald-500'}`}>{(data.groupConfidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${(data.groupConfidence || 0) < 0.8 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${(data.groupConfidence || 0) * 100}%` }}></div>
                    </div>
                </div>

                {/* Key Factors */}
                {data.keyFactors && data.keyFactors.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                        <div className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mb-1">Key Influence</div>
                        {data.keyFactors.map((f: any) => (
                            <div key={f.id} className="flex justify-between items-center text-[9px]">
                                <span className="truncate max-w-[80px] text-slate-600 dark:text-slate-300 font-medium">{f.label}</span>
                                <span className={`font-mono ${(f.score < 0.8 ? 'text-red-500' : 'text-emerald-500')}`}>{(f.score * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Dynamic Ports Body */}
            <div className="p-2 flex justify-between gap-4">
                {/* Inputs Stack */}
                <div className="flex flex-col gap-3 -ml-3 py-1">
                    {inputs.length === 0 && <span className="text-[9px] text-slate-600 pl-4">No Inputs</span>}
                    {inputs.map((port: any) => (
                        <div key={port.id} className="relative flex items-center gap-2 group h-4">
                            <Handle
                                id={port.handleId}
                                type="target"
                                position={Position.Left}
                                className={`${UE_THEME.pin} ${UE_THEME.pinIn} !border-none`}
                                style={{ top: '50%' }}
                            />
                            <span className="text-[10px] text-slate-300 ml-3 truncate max-w-[80px]" title={port.label}>{port.label}</span>
                        </div>
                    ))}
                </div>

                {/* Outputs Stack */}
                <div className="flex flex-col gap-3 -mr-3 py-1 items-end">
                    {outputs.length === 0 && <span className="text-[9px] text-slate-600 pr-4">No Outputs</span>}
                    {outputs.map((port: any) => (
                        <div key={port.id} className="relative flex items-center gap-2 group justify-end h-4">
                            <span className="text-[10px] text-slate-300 mr-3 truncate max-w-[80px]" title={port.label}>{port.label}</span>
                            <Handle
                                id={port.handleId}
                                type="source"
                                position={Position.Right}
                                className={`${UE_THEME.pin} ${UE_THEME.pinOut} !border-none`}
                                style={{ top: '50%' }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
    group: GroupNode,
    collapsedGroup: UECollapsedNode,
};

const edgeTypes = {
    bomEdge: BOMEdge,
};

const NetworkGraphInternal: React.FC<NetworkGraphProps> = ({
    graph,
    lang,
    confidenceScores,
    onNodeClick,
    onEdgeClick,
    onNodesChange: propsOnNodesChange,
    onConnect,
    onEdgesDelete,
    onNodesDelete,
    onAddNodeTriggered,
    activeBOMFilter,
    onUpdateEdge,
    onUpdateNode,
    onSelectionChange,
    aiVisualConfig
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const { getViewport } = useReactFlow();

    // Export a function to trigger add node at center
    useEffect(() => {
        (window as any).triggerAddNodeAtCenter = (type: string, context: string) => {
            const viewport = getViewport();
            const centerX = -viewport.x / viewport.zoom + (window.innerWidth / 2) / viewport.zoom;
            const centerY = -viewport.y / viewport.zoom + (window.innerHeight / 2) / viewport.zoom;
            onAddNodeTriggered && onAddNodeTriggered({ x: centerX - 80, y: centerY - 40 }, type as any, context as any);
        };
    }, [getViewport, onAddNodeTriggered]);

    useEffect(() => {
        // 1. Helpers
        const getVisualID = (id: string): string => {
            let curr: string | undefined = id;
            let visual = id;
            while (curr) {
                const node = graph.nodes.get(curr);
                if (!node) break;
                if (node.collapsed) visual = curr;
                curr = node.parentId;
            }
            return visual;
        };

        // 2. Pre-calculate Ports
        const groupPorts = new Map<string, { inputs: any[], outputs: any[] }>();
        const getGroupPorts = (gid: string) => {
            if (!groupPorts.has(gid)) groupPorts.set(gid, { inputs: [], outputs: [] });
            return groupPorts.get(gid)!;
        };

        const activeNodes = new Set<string>();
        if (activeBOMFilter) {
            graph.edges.forEach(edge => {
                if (edge.bomType === activeBOMFilter) {
                    activeNodes.add(edge.source);
                    activeNodes.add(edge.target);
                }
            });
        }

        // Scan edges to build ports for collapsed groups
        graph.edges.forEach(edge => {
            const vSource = getVisualID(edge.source);
            const vTarget = getVisualID(edge.target);
            if (vSource === vTarget) return;

            if (vSource !== edge.source) {
                const internal = graph.nodes.get(edge.source);
                const ports = getGroupPorts(vSource);
                const handleId = `out-${edge.source}`;
                if (!ports.outputs.find(p => p.handleId === handleId)) {
                    ports.outputs.push({ id: edge.source, handleId, label: internal?.label || 'Out' });
                }
            }

            if (vTarget !== edge.target) {
                const internal = graph.nodes.get(edge.target);
                const ports = getGroupPorts(vTarget);
                const handleId = `in-${edge.target}`;
                if (!ports.inputs.find(p => p.handleId === handleId)) {
                    ports.inputs.push({ id: edge.target, handleId, label: internal?.label || 'In' });
                }
            }
        });

        const handleToggleCollapse = (id: string, collapsed: boolean) => {
            if (onUpdateNode) onUpdateNode(id, { collapsed });
        };

        const handleNodeResize = (id: string, width: number, height: number) => {
            if (onUpdateNode) {
                const node = graph.nodes.get(id);
                const currentStyle = node?.style || {};
                onUpdateNode(id, { style: { ...currentStyle, width, height } });
            }
        };

        const getGroupMetrics = (groupId: string) => {
            const children = Array.from(graph.nodes.values()).filter(n => n.parentId === groupId);
            if (children.length === 0) return { confidence: 1, factors: [] };

            const scores = children.map(c => {
                const dynamicConf = c.beliefs?.['working'];
                const conf = dynamicConf !== undefined ? dynamicConf : (confidenceScores.get(c.id) ?? 0.95);
                return { id: c.id, label: lang === 'en' ? c.labelEn : c.labelZh, score: conf };
            });

            const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
            // Factors: Lowest 3 scores
            const factors = scores.sort((a, b) => a.score - b.score).slice(0, 3);
            return { confidence: avg, factors };
        };

        // 3. Map Nodes
        const newRfNodes: Node[] = Array.from(graph.nodes.values()).map((node: GraphNode) => {
            const dynamicConf = node.beliefs?.['working'];
            const confidence = dynamicConf !== undefined ? dynamicConf : (confidenceScores.get(node.id) ?? 0.95);
            const label = lang === 'en' ? node.labelEn : node.labelZh;
            const isRelated = !activeBOMFilter || activeNodes.has(node.id);
            const filterColor = activeBOMFilter ? BOM_COLORS[activeBOMFilter] : null;

            const isGroup = node.type === 'group';
            const parentNode = node.parentId ? graph.nodes.get(node.parentId) : null;
            const isParentCollapsed = parentNode?.collapsed;
            const isHidden = isParentCollapsed;
            const isCollapsed = isGroup && node.collapsed;

            const groupMetrics = isGroup ? getGroupMetrics(node.id) : null;

            return {
                id: node.id,
                type: isCollapsed ? 'collapsedGroup' : (isGroup ? 'group' : 'custom'),
                position: node.position || { x: Math.random() * 400, y: Math.random() * 400 },
                parentNode: node.parentId,
                extent: node.parentId ? 'parent' : undefined,
                hidden: isHidden,
                data: {
                    label: label,
                    confidenceText: `${(confidence * 100).toFixed(1)}%`,
                    color: getNodeColor(confidence),
                    nodeType: node.type,
                    isRelated,
                    activeFilterColor: filterColor,
                    collapsed: node.collapsed,
                    onToggleCollapse: handleToggleCollapse,
                    onNodeResize: handleNodeResize,
                    isSimulating: node.tags && parseFloat(node.tags['Progress'] || '0') > 0 && parseFloat(node.tags['Progress'] || '0') < 100,
                    ports: isCollapsed ? groupPorts.get(node.id) : undefined,
                    groupConfidence: groupMetrics?.confidence,
                    keyFactors: groupMetrics?.factors
                },
                width: isCollapsed ? 200 : undefined,
                height: undefined,
                style: isGroup
                    ? (isCollapsed
                        ? { zIndex: 0 }
                        : { ...node.style, zIndex: -1 }
                    )
                    : {
                        display: isHidden ? 'none' : undefined,
                        opacity: isRelated ? 1 : 0.15,
                        transition: 'opacity 0.5s ease, filter 0.5s ease',
                        filter: isRelated ? 'none' : 'grayscale(100%) blur(1px)'
                    }
            };
        });

        // 4. Map Edges (Physical + Logical + Learned AI Connections)
        const pairCount = new Map<string, number>();
        const newRfEdges: Edge[] = [];

        // 4a. Existing Structural/Logical Edges
        graph.edges.forEach(edge => {
            const vSource = getVisualID(edge.source);
            const vTarget = getVisualID(edge.target);

            if (vSource === vTarget) return;

            const pairKey = [vSource, vTarget].sort().join('-');
            const count = pairCount.get(pairKey) || 0;
            pairCount.set(pairKey, count + 1);

            const sourceHandle = vSource !== edge.source ? `out-${edge.source}` : null;
            const targetHandle = vTarget !== edge.target ? `in-${edge.target}` : null;

            const sourceNode = graph.nodes.get(edge.source);
            const targetNode = graph.nodes.get(edge.target);
            const isLogical = edge.type === 'logical' || sourceNode?.type === 'process' || targetNode?.type === 'process';

            const isMatch = !activeBOMFilter || edge.bomType === activeBOMFilter;
            const bomColor = edge.bomType ? BOM_COLORS[edge.bomType] : '#94a3b8';
            const strokeColor = isLogical ? '#3b82f6' : bomColor;

            newRfEdges.push({
                id: edge.id,
                source: vSource,
                target: vTarget,
                sourceHandle,
                targetHandle,
                type: isLogical ? 'smoothstep' : 'bomEdge',
                data: {
                    offsetIndex: count,
                    isReverse: vSource > vTarget,
                    curvature: edge.curvature,
                    onUpdateEdge: onUpdateEdge
                },
                animated: isLogical,
                interactionWidth: 20,
                className: isLogical ? 'edge-logical' : `edge-physical ${edge.bomType || 'None'}`,
                style: {
                    stroke: strokeColor,
                    strokeWidth: isMatch ? 2 : 1,
                    strokeDasharray: isLogical ? '8,5' : '0',
                    opacity: isMatch ? (isLogical ? 0.8 : 0.7) : 0.05,
                    transition: 'all 0.5s ease'
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: strokeColor,
                },
                label: isLogical ? '' : (edge.bomType || ''),
                hidden: activeBOMFilter && !isMatch ? true : false,
                labelStyle: {
                    fill: strokeColor,
                    fontWeight: 900,
                    fontSize: 11,
                    textTransform: 'uppercase'
                },
                labelBgPadding: [4, 2],
                labelBgBorderRadius: 4,
                labelBgStyle: { fill: 'white', fillOpacity: 0.9, stroke: strokeColor, strokeWidth: 1 }
            });
        });

        // 4b. Visualize AI Learned Connections (The "Brain")
        graph.nodes.forEach(node => {
            if (!node.modelParams || !aiVisualConfig?.enabled) return;

            // Visualize Attention (Graph Transformer)
            if (aiVisualConfig.showAttention && node.modelParams.attention) {
                Object.entries(node.modelParams.attention).forEach(([targetId, score]) => {
                    if (score > 0.1) {
                        const vSource = getVisualID(node.id);
                        const vTarget = getVisualID(targetId);
                        if (vSource === vTarget) return;

                        newRfEdges.push({
                            id: `ai-attn-${node.id}-${targetId}`,
                            source: vSource,
                            target: vTarget,
                            type: 'simplebezier',
                            animated: true,
                            style: {
                                stroke: '#8b5cf6', // Violet
                                strokeWidth: score * 4,
                                opacity: 0.6,
                                strokeDasharray: '4,4'
                            },
                            label: `AI ATTN ${(score * 100).toFixed(0)}%`,
                            labelStyle: { fill: '#8b5cf6', fontSize: 9, fontWeight: 700 },
                            labelBgStyle: { fill: '#fff', fillOpacity: 0.8 }
                        });
                    }
                });
            }

            // Visualize Linear/Logistic Weights
            if (node.modelParams.weights) {
                Object.entries(node.modelParams.weights).forEach(([targetId, weight]) => {
                    if (Math.abs(weight) > 0.2) {
                        // Filter by type
                        if (weight > 0 && !aiVisualConfig.showPositive) return;
                        if (weight < 0 && !aiVisualConfig.showNegative) return;

                        const vSource = getVisualID(node.id);
                        const vTarget = getVisualID(targetId);
                        if (vSource === vTarget) return;

                        newRfEdges.push({
                            id: `ai-weight-${node.id}-${targetId}`,
                            source: vSource,
                            target: vTarget,
                            type: 'simplebezier',
                            animated: true,
                            style: {
                                stroke: weight > 0 ? '#10b981' : '#f43f5e',
                                strokeWidth: Math.abs(weight) * 3,
                                opacity: 0.5,
                                strokeDasharray: '2,2'
                            },
                            label: `WT ${weight.toFixed(2)}`,
                            labelStyle: { fill: weight > 0 ? '#10b981' : '#f43f5e', fontSize: 9 },
                            labelBgStyle: { fill: '#fff', fillOpacity: 0.8 }
                        });
                    }
                });
            }
        });

        setNodes(nds => {
            const nodeMap = new Map(nds.map(n => [n.id, n]));
            return newRfNodes.map(n => ({
                ...n,
                selected: nodeMap.get(n.id)?.selected || false,
                dragging: nodeMap.get(n.id)?.dragging || false
            }));
        });

        setEdges(eds => {
            const edgeMap = new Map(eds.map(e => [e.id, e]));
            return newRfEdges.map(e => ({
                ...e,
                selected: edgeMap.get(e.id)?.selected || false
            }));
        });

    }, [graph, confidenceScores, lang, activeBOMFilter, setNodes, setEdges, onUpdateNode, aiVisualConfig]);

    return (
        <div className="w-full h-full bg-slate-50">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={(changes) => {
                    onNodesChange(changes);
                    propsOnNodesChange && propsOnNodesChange(changes);
                }}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onNodeClick={(_, node) => {
                    onNodeClick && onNodeClick(node.id);
                }}
                onEdgeClick={(_, edge) => {
                    onEdgeClick && onEdgeClick(edge.id);
                }}
                onSelectionChange={({ nodes, edges }) => {
                    onSelectionChange && onSelectionChange(nodes, edges);
                }}
                fitView
                snapToGrid
                snapGrid={[20, 20]}
                deleteKeyCode={['Backspace', 'Delete']}
            >
                <Background color="#cbd5e1" gap={20} size={1} />
                <Controls />
            </ReactFlow>
        </div>
    );
};

export const NetworkGraph: React.FC<NetworkGraphProps> = (props) => (
    <ReactFlowProvider>
        <NetworkGraphInternal {...props} />
    </ReactFlowProvider>
);
