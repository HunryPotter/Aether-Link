import React, { useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
// @ts-ignore
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { KnowledgeGraph } from '../logic/GraphModel';

interface SpaceTopologyGraphProps {
    graph: KnowledgeGraph | null;
    visible: boolean;
    onClose: () => void;
    // New: Pass down AI Visual Config to sync 2D/3D views
    aiVisualConfig?: {
        enabled: boolean;
        showAttention: boolean;
        showPositive: boolean;
        showNegative: boolean;
    };
    isTraining?: boolean;
}

import { BOM_COLORS, VISUAL_CONSTANTS } from '../logic/theme';

export const SpaceTopologyGraph: React.FC<SpaceTopologyGraphProps> = ({
    graph,
    visible,
    onClose,
    aiVisualConfig,
    isTraining
}) => {
    const fgRef = React.useRef<any>(null);

    // Theme Constants
    const { SHARED_COLOR, DIM_COLOR, DIM_OPACITY, LIT_OPACITY } = VISUAL_CONSTANTS;

    // Dynamic BOM Discovery

    // Dynamic BOM Discovery
    const availableBOMs = useMemo(() => {
        if (!graph) return ['EBOM', 'MBOM', 'SBOM', 'Logical'];
        const types = new Set<string>();
        graph.edges.forEach(e => {
            if (e.type === 'logical') types.add('Logical');
            else if (e.bomType && e.bomType !== 'None') types.add(e.bomType);
            else types.add('Structural');
        });
        if (types.size === 0) return ['EBOM', 'MBOM', 'SBOM', 'Logical'];
        return Array.from(types).sort();
    }, [graph]);

    // View Dimension State
    const [viewMode, setViewMode] = React.useState<'topology' | 'health'>('topology');

    // BOM Filter State
    const [visibleBOMs, setVisibleBOMs] = React.useState<Record<string, boolean>>({});

    // Init state when availableBOMs changes
    React.useEffect(() => {
        const initial: Record<string, boolean> = {};
        availableBOMs.forEach(t => initial[t] = true);
        setVisibleBOMs(initial);
    }, [availableBOMs]);

    const toggleBOM = (type: string) => {
        setVisibleBOMs(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    // Add Starfield & Bloom
    React.useEffect(() => {
        if (fgRef.current && visible) {
            const scene = fgRef.current.scene();

            // 1. Bloom
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                1.5, 0.4, 0.85
            );
            bloomPass.strength = 1.2; // Self-luminous boost
            bloomPass.radius = 0.5;
            bloomPass.threshold = 0.1;

            const composer = fgRef.current.postProcessingComposer();
            if (composer) composer.addPass(bloomPass);

            // 2. Starfield
            const starGeometry = new THREE.BufferGeometry();
            const starCount = 3000;
            const positions = new Float32Array(starCount * 3);
            for (let i = 0; i < starCount * 3; i++) {
                positions[i] = (Math.random() - 0.5) * 3000;
            }
            starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const starMaterial = new THREE.PointsMaterial({
                color: 0x88ccff,
                size: 1.0,
                transparent: true,
                opacity: 0.6,
                sizeAttenuation: true
            });
            const stars = new THREE.Points(starGeometry, starMaterial);
            scene.add(stars);
        }
    }, [visible]);

    // Transform Graph Data (High Contrast Neon + Multi-Dimension Support)
    const graphData = useMemo(() => {
        if (!graph) return { nodes: [], links: [] };

        // 1. Calculate Activity State
        const nodeActiveCategories = new Map<string, Set<string>>();

        const getEdgeCategory = (edge: any) => {
            if (edge.type === 'logical') return 'Logical';
            if (edge.bomType && edge.bomType !== 'None') return edge.bomType;
            return 'Structural';
        };

        // Pass 1: Activity Calculation
        graph.edges.forEach(edge => {
            const category = getEdgeCategory(edge);
            const isCategoryActive = visibleBOMs[category];

            if (isCategoryActive) {
                if (!nodeActiveCategories.has(edge.source)) nodeActiveCategories.set(edge.source, new Set());
                if (!nodeActiveCategories.has(edge.target)) nodeActiveCategories.set(edge.target, new Set());

                if (category !== 'Structural') {
                    nodeActiveCategories.get(edge.source)!.add(category);
                    nodeActiveCategories.get(edge.target)!.add(category);
                } else {
                    nodeActiveCategories.get(edge.source)!.add('Structural');
                    nodeActiveCategories.get(edge.target)!.add('Structural');
                }
            }
        });

        // 2. Nodes: Multi-Dimension Logic
        const nodes = Array.from(graph.nodes.values()).map((node: any) => {
            const activeCats = nodeActiveCategories.get(node.id) || new Set();
            const colorCats = new Set(activeCats);
            colorCats.delete('Structural');

            const isLit = activeCats.size > 0;
            const isShared = colorCats.size > 1;

            let baseSize = 4;
            if (node.type === 'group') baseSize = 12;
            else if (node.type === 'process') baseSize = 6;
            else baseSize = 2;

            const health = node.beliefs?.working || 0.5;
            const size = baseSize * (0.5 + health * 0.5);

            // DEFAULT: THE VOID (Inactive State)
            let color = DIM_COLOR;
            let opacity = DIM_OPACITY;

            if (isLit) {
                opacity = LIT_OPACITY;

                if (viewMode === 'health') {
                    // --- HEALTH DIMENSION ---
                    if (health >= 0.8) color = '#10b981'; // Emerald (Good)
                    else if (health >= 0.5) color = '#f59e0b'; // Amber (Warning)
                    else color = '#ef4444'; // Rose (Critical)
                } else {
                    // --- TOPOLOGY DIMENSION ---
                    if (isShared) {
                        color = SHARED_COLOR; // Gold High Enegry
                    } else if (colorCats.size === 1) {
                        const cat = Array.from(colorCats)[0];
                        color = BOM_COLORS[cat] || '#10b981';
                    } else {
                        color = BOM_COLORS['Structural'] || '#94a3b8';
                    }
                }
            }

            return {
                id: node.id,
                name: node.labelZh || node.label,
                group: node.context || 'unknown',
                val: size,
                color: color,
                opacity: opacity,
                isGhost: !isLit,
                desc: `
                    <div style="font-family: monospace; padding: 4px;">
                        <span style="font-weight:bold; font-size: 1.1em; color: ${isLit ? '#fff' : '#444'}">${node.labelZh || node.label}</span><br/>
                        <span style="color: #888">Status: ${viewMode === 'health' ? (health * 100).toFixed(0) + '%' : (isShared ? 'Shared' : 'Standard')}</span><br/>
                        <span style="color: ${isShared && viewMode === 'topology' ? SHARED_COLOR : (isLit ? color : '#bbb')}">
                            ${!isLit ? '● DORMANT' : '● ACTIVE'}
                        </span>
                    </div>
                `
            };
        });

        // 3. Links: Extreme Contrast
        const links: any[] = [];
        graph.edges.forEach(edge => {
            const category = getEdgeCategory(edge);
            const isActive = visibleBOMs[category];

            links.push({
                source: edge.source,
                target: edge.target,
                type: 'structural',
                // Active: Neon Color. Inactive: Visible Grey Structure
                color: isActive ? (BOM_COLORS[category] || '#22d3ee') : DIM_COLOR,
                // Active: THICK Neon. Inactive: Thinner but solid
                width: isActive ? (category === 'Logical' ? 0.3 : 0.6) : 0.1,
                // Particles: Active = Flowing Energy. Inactive = Dead.
                particles: isActive ? (category === 'Logical' ? 3 : 1) : 0,
                particleSpeed: category === 'Logical' ? 0.005 : 0.003,
                particleWidth: 2.0,
                opacity: isActive ? 1.0 : 0.1
            });
        });

        if (aiVisualConfig?.enabled) {
            graph.nodes.forEach(node => {
                if (!node.modelParams) return;
                if (aiVisualConfig.showAttention && node.modelParams.attention) {
                    Object.entries(node.modelParams.attention).forEach(([targetId, score]) => {
                        if (score > 0.1) links.push({
                            source: node.id, target: targetId, type: 'attention',
                            color: '#c084fc', width: score * 1.5, particles: 3, particleSpeed: 0.01,
                            curvature: 0.3, particleWidth: 2
                        });
                    });
                }
                if (node.modelParams.weights) {
                    Object.entries(node.modelParams.weights).forEach(([targetId, weight]) => {
                        if (Math.abs(weight) > 0.2) {
                            const isPositive = weight > 0;
                            if ((isPositive && !aiVisualConfig.showPositive) || (!isPositive && !aiVisualConfig.showNegative)) return;
                            links.push({
                                source: node.id, target: targetId, type: isPositive ? 'positive' : 'negative',
                                color: isPositive ? '#4ade80' : '#f87171', width: Math.abs(weight) * 0.8,
                                particles: isTraining ? 4 : 2, particleSpeed: 0.02, curvature: -0.3, particleWidth: 1.5
                            });
                        }
                    });
                }
            });
        }

        return { nodes, links };
    }, [graph, aiVisualConfig, isTraining, visibleBOMs, viewMode]);

    // OPTIMIZATION: Shared Geometry for Instantly Faster Rendering (WP-00.2)
    // Reuse a single "Unit Sphere" geometry and scale it. 
    // This saves GPU memory and Draw Call setup for 2000+ nodes.
    const unitSphereGeometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);

    // Custom Node Renderer - High Contrast Neon Support
    const nodeThreeObject = React.useCallback((node: any) => {
        const targetRadius = node.val;
        const mainColor = new THREE.Color(node.color);
        const isGhost = node.isGhost;

        // Dynamic Material Construction (Materials must be unique per color/state, but cheap compared to Geometry)
        const material = new THREE.MeshPhysicalMaterial({
            color: mainColor,
            emissive: mainColor,
            // LIT vs DIM intensity from Theme
            emissiveIntensity: isGhost ? VISUAL_CONSTANTS.DIM_EMISSIVE_INTENSITY : VISUAL_CONSTANTS.LIT_EMISSIVE_INTENSITY,

            // LIT: Glassy. DIM: Frosted Moonstone.
            roughness: isGhost ? 0.4 : 0.2, // Rougher for moonstone effect
            metalness: 0.2,
            transmission: isGhost ? 0.6 : 0.6, // Transparent but visible
            thickness: 1.5,

            transparent: true,
            opacity: isGhost ? VISUAL_CONSTANTS.DIM_OPACITY : VISUAL_CONSTANTS.LIT_OPACITY
        });

        const mesh = new THREE.Mesh(unitSphereGeometry, material);

        // Apply Scale to match target radius (Since geometry is r=1)
        mesh.scale.set(targetRadius, targetRadius, targetRadius);

        return mesh;
    }, [unitSphereGeometry]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black animate-in fade-in duration-700">
            <div className="absolute top-6 left-6 z-10 text-white pointer-events-none">
                <h1 className="text-2xl font-black tracking-widest uppercase mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Aether Space</h1>
                <div className="text-[10px] text-cyan-400 font-mono tracking-wider">
                    NEURAL TOPOLOGY VISUALIZER v2.5 <br />
                    NODES: {graphData.nodes.length} | SYNAPSES: {graphData.links.length}
                </div>
            </div>

            {/* LEGEND & CONTROLS */}
            <div className="absolute top-24 left-6 z-10 flex flex-col gap-3 pointer-events-auto h-[70vh] overflow-y-auto pr-2 scrollbar-none">

                {/* DIMENSION SWITCHER */}
                <div className="w-56 p-1 bg-slate-900/80 border border-slate-700 rounded-lg flex mb-2 backdrop-blur-md">
                    <button
                        onClick={() => setViewMode('topology')}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'topology' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Topology
                    </button>
                    <button
                        onClick={() => setViewMode('health')}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'health' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Health
                    </button>
                </div>

                {/* BOM LEGEND */}
                {availableBOMs.map(bom => (
                    <div
                        key={bom}
                        onClick={() => toggleBOM(bom)}
                        className={`cursor-pointer px-4 py-2 rounded border backdrop-blur-md transition-all flex items-center gap-3 w-56
                                ${visibleBOMs[bom] ? 'bg-indigo-500/20 border-indigo-500/50 hover:bg-indigo-500/30' : 'bg-slate-900/50 border-slate-700 opacity-50 hover:opacity-75'}
                            `}
                    >
                        <div
                            className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
                            style={{ backgroundColor: BOM_COLORS[bom] || '#64748b', color: BOM_COLORS[bom] || '#64748b' }}
                        ></div>
                        <span className="text-xs font-bold text-indigo-100 tracking-wider uppercase truncate">{bom || 'STRUCTURAL'}</span>
                    </div>
                ))}
            </div>

            {/* Legend Footer */}
            <div className="absolute bottom-10 left-6 z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></span> <span className="text-[10px] text-slate-300">Design</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></span> <span className="text-[10px] text-slate-300">Mfg</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_5px_#f59e0b]"></span> <span className="text-[10px] text-amber-200 font-bold">SHARED</span>
                </div>
            </div>

            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-10 bg-black/40 hover:bg-red-900/40 text-white px-6 py-2 rounded-none border-b-2 border-red-500 backdrop-blur-md transition-all font-bold text-xs uppercase tracking-widest hover:scale-105"
            >
                Disconnect
            </button>

            <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                backgroundColor="#000000"

                // Custom Node Rendering
                nodeThreeObject={nodeThreeObject}
                nodeLabel="name"
                nodeResolution={24}

                // Link Visuals
                linkWidth={link => (link as any).width || 1}
                linkColor={link => (link as any).color}
                linkDirectionalParticles={link => (link as any).particles || 0}
                linkDirectionalParticleSpeed={link => (link as any).particleSpeed || 0}
                linkDirectionalParticleWidth={link => (link as any).particleWidth || 1}
                linkCurvature={link => (link as any).curvature || 0}
                linkOpacity={0.6}

                // Environment
                showNavInfo={false}
                controlType="orbit"
            />

            {/* Logic Overlay */}
            {aiVisualConfig?.enabled && (
                <div className="absolute bottom-6 right-6 z-10 pointer-events-none flex flex-col items-end gap-1">
                    <div className="text-[10px] text-violet-400 font-mono uppercase tracking-widest animate-pulse">
                        AI SYSTEM ONLINE
                    </div>
                    {isTraining && (
                        <div className="text-[10px] text-red-500 font-mono uppercase tracking-widest animate-bounce">
                            Training Active
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
