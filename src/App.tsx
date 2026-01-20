import { ProjectManagerModal } from './components/ProjectManagerModal';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { KnowledgeGraph } from './logic/GraphModel';
import type { GraphNode, BOMType } from './logic/GraphModel';

import { AIAssistant } from './components/AIAssistant';
import { SpaceTopologyGraph } from './components/SpaceTopologyGraph';
import { ControlPanel } from './components/ControlPanel';
import { NetworkGraph } from './components/NetworkGraph';
import { SidebarLeft } from './components/SidebarLeft';
import './index.css';
import { BayesianEngine } from './logic/BayesianEngine';
import { generateMockData } from './data/mockFactory';
import { translations } from './logic/translations';
import type { Language } from './logic/translations';

function App() {

  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [engine, setEngine] = useState<BayesianEngine | null>(null);
  const [confidenceScores, setConfidenceScores] = useState<Map<string, number>>(new Map());
  const [evidence, setEvidence] = useState<Record<string, number>>({});

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [is3DViewOpen, setIs3DViewOpen] = useState(false);

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const [lang, setLang] = useState<Language>('zh');
  const [activeBOMFilter, setActiveBOMFilter] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [copiedNode, setCopiedNode] = useState<GraphNode | null>(null);
  const [algoConfig, setAlgoConfig] = useState<string[]>(['BN']);
  const [, setHistory] = useState<KnowledgeGraph[]>([]);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Theme Toggle Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true); // Control flag for simulation

  const t = translations[lang];

  // Derive single selected node for ControlPanel (only if exactly 1 is selected)
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

  const handleSelectionChange = useCallback((nodes: any[], edges: any[] = []) => {
    // Safety check for arrays
    const safeNodes = Array.isArray(nodes) ? nodes : [];
    const safeEdges = Array.isArray(edges) ? edges : [];

    const newNodeIds = safeNodes.map(n => n?.id).filter(Boolean).sort();
    const newEdgeIds = safeEdges.map(e => e?.id).filter(Boolean).sort();

    // 1. Update Nodes (Deep Compare)
    setSelectedNodeIds(prevNodeIds => {
      const prevSorted = [...prevNodeIds].sort();
      const isNodeIdsSame = prevSorted.length === newNodeIds.length &&
        prevSorted.every((val, index) => val === newNodeIds[index]);
      return isNodeIdsSame ? prevNodeIds : newNodeIds;
    });

    // 2. Determine Edge Selection (Logic: Single Edge if no Nodes selected)
    let nextSelectedEdgeId: string | null = null;
    if (newEdgeIds.length === 1 && newNodeIds.length === 0) {
      nextSelectedEdgeId = newEdgeIds[0];
    } else {
      nextSelectedEdgeId = null; // Clear edge selection if nodes are selected or multi-edges
    }

    // 3. Update Edge (Compare)
    setSelectedEdgeId(prev => (prev === nextSelectedEdgeId ? prev : nextSelectedEdgeId));

    // NOTE: We REMOVED setIsSidebarVisible from here. 
    // It is now handled by a useEffect that watches selectedNodeIds/selectedEdgeId changes.
    // This prevents the "H" key toggle from being overridden by spurious ReactFlow updates.
  }, []);

  // Sync Sidebar Visibility with Selection Changes
  useEffect(() => {
    // Logic: 
    // - Node Selected (Single) -> Open Sidebar
    // - Node Selected (Multi) -> Close Sidebar (User Request: "不需要激活")
    // - Edge Selected -> Close Sidebar
    // - None Selected -> Close Sidebar
    const nodeCount = selectedNodeIds.length;


    if (nodeCount === 1) {
      setIsSidebarVisible(true);
    } else {
      // Covers: Multi-select (nodeCount > 1), Edge selected, or None selected
      setIsSidebarVisible(false);
    }
  }, [selectedNodeIds, selectedEdgeId]);

  const BOM_COLORS: Record<string, string> = {
    EBOM: '#10b981',
    PBOM: '#f59e0b',
    MBOM: '#3b82f6',
    SBOM: '#8b5cf6',
    DBOM: '#f43f5e',
    GBOM: '#06b6d4',
    BBOM: '#ec4899',
    OBOM: '#f97316'
  };

  const BOM_OPTIONS: { type: BOMType; labelKey: keyof typeof translations.en; color: string }[] = [
    { type: 'EBOM', labelKey: 'ebomDesc', color: '#10b981' },
    { type: 'PBOM', labelKey: 'pbomDesc', color: '#f59e0b' },
    { type: 'MBOM', labelKey: 'mbomDesc', color: '#3b82f6' },
    { type: 'SBOM', labelKey: 'sbomDesc', color: '#8b5cf6' },
    { type: 'DBOM', labelKey: 'dbomDesc', color: '#f43f5e' },
    { type: 'GBOM', labelKey: 'gbomDesc', color: '#06b6d4' },
    { type: 'BBOM', labelKey: 'bbomDesc', color: '#ec4899' },
    { type: 'OBOM', labelKey: 'obomDesc', color: '#f97316' }
  ];

  // Handle Graph Updates
  const updateGraph = useCallback((newGraph: KnowledgeGraph, saveHistory = true) => {
    if (saveHistory && graph) {
      setHistory(prev => [...prev.slice(-19), graph]);
    }

    setGraph(newGraph);

    try {
      const bayesEngine = new BayesianEngine(newGraph);
      setEngine(bayesEngine);
      setConfidenceScores(bayesEngine.analyze(evidence, algoConfig));
    } catch (e) {
      console.error("Critical: Bayesian Engine Failed", e);
      // Fallback to prevent crash
      setEngine(null);
      setConfidenceScores(new Map());
    }
  }, [evidence, algoConfig, graph]);

  const selectedEdge = useMemo(() => {
    if (!graph || !selectedEdgeId) return null;
    return graph.edges.find(e => e.id === selectedEdgeId) || null;
  }, [graph, selectedEdgeId]);

  const isSelectedEdgeSourcePart = useMemo(() => {
    try {
      if (!selectedEdge || !graph) return false;
      const sourceNode = graph.nodes.get(selectedEdge.source);
      return sourceNode?.type === 'part';
    } catch (e) {
      return false;
    }
  }, [selectedEdge, graph]);

  const handleUpdateEdge = useCallback((edgeId: string, updates: any) => {
    if (!graph) return;
    const newGraph = graph.clone();
    const edgeIndex = newGraph.edges.findIndex(e => e.id === edgeId);
    if (edgeIndex > -1) {
      newGraph.edges[edgeIndex] = { ...newGraph.edges[edgeIndex], ...updates };
      updateGraph(newGraph);
    }
  }, [graph, updateGraph]);

  const handleRemoveEdge = useCallback((edgeId: string) => {
    if (!graph) return;
    const newGraph = graph.clone();
    newGraph.removeEdge(edgeId);
    if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
    updateGraph(newGraph);
  }, [graph, selectedEdgeId, updateGraph]);

  const insertNodeAndEdge = useCallback((node: GraphNode, edge?: any) => {
    if (!graph) return;
    const newGraph = graph.clone();
    newGraph.addNode(node);
    if (edge) newGraph.addEdge(edge);
    updateGraph(newGraph);
    setSelectedNodeIds([node.id]);
    setIsSidebarVisible(true);
    setSelectedEdgeId(null);
  }, [graph, updateGraph]);

  const handleAddNode = useCallback((type: 'part' | 'process', context: 'design' | 'manufacturing', position?: { x: number, y: number }) => {
    const id = `${type === 'part' ? 'D' : 'M'}-${Date.now()}`;
    const newNode: GraphNode = {
      id,
      label: type === 'part' ? 'New Part' : 'New Process',
      labelEn: type === 'part' ? 'New Part' : 'New Process',
      labelZh: type === 'part' ? '新零件' : '新工序',
      type,
      context,
      beliefs: {},
      position: position || { x: Math.random() * 400, y: Math.random() * 400 }
    };
    insertNodeAndEdge(newNode);
  }, [insertNodeAndEdge]);

  const requestAddNode = (type: 'part' | 'process', context: 'design' | 'manufacturing') => {
    if ((window as any).triggerAddNodeAtCenter) {
      (window as any).triggerAddNodeAtCenter(type, context);
    }
  };

  const handleRemoveNode = (nodeId: string) => {
    if (!graph) return;
    const newGraph = graph.clone();
    newGraph.removeNode(nodeId);
    if (selectedNodeIds.includes(nodeId)) {
      setSelectedNodeIds(prev => prev.filter(id => id !== nodeId));
      if (selectedNodeIds.length <= 1) setIsSidebarVisible(false);
    }
    updateGraph(newGraph);
  };

  const handleRemoveEdges = (edges: any[]) => {
    if (!graph) return;
    const newGraph = graph.clone();
    edges.forEach(edge => {
      newGraph.removeEdge(edge.id);
    });
    updateGraph(newGraph);
  };

  const handleNodesDelete = useCallback((nodes: any[]) => {
    if (!graph) return;
    const newGraph = graph.clone();
    nodes.forEach(n => newGraph.removeNode(n.id));
    updateGraph(newGraph);
    setSelectedNodeIds([]);
    setIsSidebarVisible(false);
  }, [graph, updateGraph]);

  const handleSetConfidence = useCallback((nodeId: string, value: number | null) => {
    // 1. Update Evidence State (for Engine)
    setEvidence(prevEvidence => {
      const newEvidence = { ...prevEvidence };
      if (value === null) {
        delete newEvidence[nodeId];
      } else {
        newEvidence[nodeId] = value;
      }
      return newEvidence;
    });

    // 2. Instant Graph Update (for Visuals)
    if (graph) {
      const newGraph = graph.clone();
      const node = newGraph.nodes.get(nodeId);
      if (node) {
        if (value !== null) {
          node.beliefs['working'] = value;
        } else {
          // Reset: Clear belief to let Simulation recover it naturaly
          delete node.beliefs['working'];
        }
        updateGraph(newGraph);
      }
    }
  }, [graph, updateGraph]);

  const handleGroupSelection = useCallback(() => {
    if (selectedNodeIds.length < 2 || !graph) return;

    // 1. Calculate Bounding Box
    const nodes = selectedNodeIds.map(id => graph.nodes.get(id)).filter(Boolean) as GraphNode[];
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (!n.position) return;
      if (n.position.x < minX) minX = n.position.x;
      if (n.position.y < minY) minY = n.position.y;
      // Estimate width/height if not present. Standard node ~160x80
      const w = 180;
      const h = 100;
      if (n.position.x + w > maxX) maxX = n.position.x + w;
      if (n.position.y + h > maxY) maxY = n.position.y + h;
    });

    const padding = 60;
    const groupX = minX - padding;
    const groupY = minY - padding;
    const groupWidth = (maxX - minX) + padding * 2;
    const groupHeight = (maxY - minY) + padding * 2;

    const groupId = `G-${Date.now()}`;
    const groupNode: GraphNode = {
      id: groupId,
      type: 'group',
      label: 'New Group',
      labelEn: 'New Group',
      labelZh: '新分组',
      context: nodes[0].context, // Inherit context
      beliefs: {},
      position: { x: groupX, y: groupY },
      style: { width: groupWidth, height: groupHeight }
    };

    const newGraph = graph.clone();
    newGraph.addNode(groupNode);

    // Update children to be relative to group
    nodes.forEach(n => {
      const nodeInGraph = newGraph.nodes.get(n.id);
      if (nodeInGraph && nodeInGraph.position) {
        nodeInGraph.parentId = groupId;
        // React Flow expects relative position for child nodes
        nodeInGraph.position = {
          x: nodeInGraph.position.x - groupX,
          y: nodeInGraph.position.y - groupY
        };
      }
    });

    updateGraph(newGraph);
    setSelectedNodeIds([groupId]);
  }, [graph, selectedNodeIds, updateGraph]);

  const selectedNode = useMemo(() => {
    if (!graph || !selectedNodeId) return null;
    return graph.nodes.get(selectedNodeId) || null;
  }, [graph, selectedNodeId]);

  const handleUngroup = useCallback(() => {
    if (!graph || !selectedNode || selectedNode.type !== 'group') return;

    const groupNode = selectedNode;
    const newGraph = graph.clone();

    // 1. Find Children
    const children: GraphNode[] = [];
    newGraph.nodes.forEach(n => {
      if (n.parentId === groupNode.id) children.push(n);
    });

    // 2. Reparent and Reposition Children (Convert Relative to Absolute)
    const gPos = groupNode.position || { x: 0, y: 0 };
    children.forEach(child => {
      child.parentId = undefined;
      if (child.position) {
        child.position = {
          x: gPos.x + child.position.x,
          y: gPos.y + child.position.y
        };
      }
    });

    // 3. Delete Group Node
    newGraph.removeNode(groupNode.id);

    // 4. Update Graph
    updateGraph(newGraph);

    // Select the children instead of the deleted group
    setSelectedNodeIds(children.map(c => c.id));

  }, [graph, selectedNode, updateGraph]);

  // Unified Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (key === 'h' || key === 'i') setIsSidebarVisible(prev => !prev);

      if (key === 'tab' && selectedNode && graph) {
        e.preventDefault();
        const isProcess = selectedNode.type === 'process';
        const offset = isProcess ? { x: 200, y: 0 } : { x: 0, y: 150 };
        const currentPos = selectedNode.position || { x: 0, y: 0 };
        const newId = `${selectedNode.type === 'part' ? 'D' : 'M'}-${Date.now()}`;
        const newNode: GraphNode = {
          id: newId,
          type: selectedNode.type,
          context: selectedNode.context,
          label: isProcess ? 'New Step' : 'New Component',
          labelEn: isProcess ? 'New Step' : 'New Component',
          labelZh: isProcess ? '新工序' : '新组件',
          position: { x: currentPos.x + offset.x, y: currentPos.y + offset.y },
          beliefs: {}
        };
        const newEdge = { id: `e-${Date.now()}`, source: selectedNode.id, target: newId, type: 'structural' as const, weight: 1.0 };
        insertNodeAndEdge(newNode, newEdge);
      }

      if (ctrl && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroup();
        } else {
          handleGroupSelection();
        }
      }

      if (ctrl && key === 'z') {
        setHistory(prev => {
          if (prev.length === 0) return prev;
          const newHistory = [...prev];
          const previousGraph = newHistory.pop();
          if (previousGraph) updateGraph(previousGraph, false);
          return newHistory;
        });
      }

      if (ctrl && key === 'c' && selectedNode) setCopiedNode({ ...selectedNode });

      if (ctrl && key === 'v' && copiedNode && graph) {
        const id = `${copiedNode.type === 'part' ? 'D' : 'M'}-${Date.now()}`;
        const pos = copiedNode.position || { x: 100, y: 100 };
        const newNode: GraphNode = {
          ...copiedNode,
          id,
          label: `${copiedNode.label} (Copy)`,
          labelEn: `${copiedNode.labelEn} (Copy)`,
          labelZh: `${copiedNode.labelZh} (副本)`,
          position: { x: pos.x + 40, y: pos.y + 40 },
          beliefs: {}
        };
        const newGraph = graph.clone();
        newGraph.addNode(newNode);
        updateGraph(newGraph);
        setSelectedNodeIds([id]);
        setIsSidebarVisible(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, copiedNode, graph, updateGraph, insertNodeAndEdge, handleGroupSelection]);

  const handleConnect = useCallback((params: any) => {
    if (!graph) return;
    const newGraph = graph.clone();
    newGraph.addEdge({ id: `e-${Date.now()}`, source: params.source, target: params.target, type: 'structural', weight: 1.0 });
    updateGraph(newGraph);
  }, [graph, updateGraph]);

  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // Ref to track latest graph state for the interval closure
  const graphRef = useRef<KnowledgeGraph | null>(null);
  useEffect(() => { graphRef.current = graph; }, [graph]);

  // Sync Logic: Polling backend for industrial simulation updates
  useEffect(() => {
    if (!activeGraphId || activeGraphId.startsWith('new-') || !isSimulationRunning) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/graphs/${activeGraphId}`);
        const fullGraph = await response.json();
        if (fullGraph) { // Ensure fullGraph exists
          // 1. Sync Graph Data (Simulation)
          if (fullGraph.data) {
            const data = fullGraph.data;
            // Only update if data actually changed significantly? 
            // Ideally we diff, but for now we trust the backend's "simulation" loop implies change.
            // We do NOT overwrite local edits immediately if user is typing? 
            // But existing logic blindly overwrote. We keep it consistent.
            // Re-instantiate to ensure Prototype methods exist
            const loadedGraph = new KnowledgeGraph(new Map(data.nodes.map((n: any) => {
              // 1.1 Preserve and Update History
              // The backend doesn't store history, so we must merge it from our local state
              const existingNode = graphRef.current?.nodes.get(n.id);
              const history = existingNode?.history || {};
              const localModelParams = existingNode?.modelParams; // [PRESERVE] Keep ML Params

              // Helper to append history
              const appendHistory = (key: string, val: number) => {
                if (!history[key]) history[key] = [];
                history[key].push(val);
                if (history[key].length > 50) history[key].shift(); // Keep last 50 points
              };

              // Track Confidence
              const conf = n.beliefs?.['working'] ?? 0;
              appendHistory('confidence', parseFloat(Number(conf).toFixed(3)));

              // Track Numeric Tags
              if (n.tags) {
                Object.entries(n.tags).forEach(([k, v]) => {
                  const num = parseFloat(v as string);
                  if (!isNaN(num)) appendHistory(k, parseFloat(num.toFixed(2)));
                });
              }

              // Attach updated history to the new node object
              n.history = history;

              // [RESTORE] If backend didn't send params (it usually won't), use our local training
              if (localModelParams) {
                n.modelParams = localModelParams;
              }

              return [n.id, n];
            })), data.edges);

            updateGraph(loadedGraph, false);
          }

          // 2. Sync Chat History (only if different count or specifically needed)
          // For simplicity, we sync it. Note: This might overwrite local pending chat if polling happens exactly then.
          // Ideally, we merge. But simpler model: Backend is truth.
          if (fullGraph.chatHistory) {
            setChatHistory(fullGraph.chatHistory);
          }
        }
      } catch (err) {
        console.warn('Simulation sync failed', err);
      }
    }, 3000); // Faster sync to match new speed
    return () => clearInterval(interval);
  }, [activeGraphId, updateGraph, isSimulationRunning]);

  // Helper to store history
  const appendHistoryToNode = (node: GraphNode, key: string, val: number) => {
    if (!node.history) node.history = {};
    if (!node.history[key]) node.history[key] = [];
    node.history[key].push(val);
    if (node.history[key].length > 50) node.history[key].shift();
  };

  const handleChatUpdate = useCallback((newMessages: any[]) => {
    setChatHistory(newMessages);
    // Persist to backend
    if (activeGraphId) {
      fetch(`/api/graphs/${activeGraphId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory: newMessages })
      }).catch(err => console.error("Failed to save chat history", err));
    }
  }, [activeGraphId]);

  // ... (existing helper effects)

  // Initialize Data
  useEffect(() => {
    const mockGraph = generateMockData();
    const bayesEngine = new BayesianEngine(mockGraph);
    setGraph(mockGraph);
    setEngine(bayesEngine);
    setConfidenceScores(bayesEngine.analyze({}, ['BN']));
  }, []);

  // Enhanced AI Visualization State
  const [aiVisualConfig, setAIVisualConfig] = useState({
    enabled: false,
    showAttention: true,
    showPositive: true,
    showNegative: true
  });

  // AI Training State
  const [isTraining, setIsTraining] = useState(true);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [trainingSteps, setTrainingSteps] = useState(0);

  // Local Simulation for Default Demo Mode (When no backend project is active)
  useEffect(() => {
    if (activeGraphId || !graph || !isSimulationRunning) return;

    const interval = setInterval(() => {
      const newGraph = graph.clone();
      let changed = false;

      // 1. Identify "Computed" Nodes (Nodes that are Parents in Structural relationships)
      const computedNodeIds = new Set<string>();
      newGraph.edges.forEach(e => {
        if (e.type === 'structural') computedNodeIds.add(e.source);
      });

      newGraph.nodes.forEach((node) => {
        // 0. HARD OVERRIDE: Respect Manual Experiment Evidence
        if (evidence[node.id] !== undefined) {
          node.beliefs['working'] = evidence[node.id];
          return; // Skip simulation logic, lock to user value
        }

        // Logic for Process Nodes (Factory steps)
        if (node.type === 'process' && !computedNodeIds.has(node.id)) {
          changed = true;
          // Init tags
          if (!node.tags) node.tags = {};
          if (!node.tags['Progress']) node.tags['Progress'] = "0";

          let currentProgress = parseFloat(node.tags['Progress']);
          let currentConfidence = node.beliefs['working'] || 0;

          // Simple oscillating simulation
          if (currentProgress < 100) {
            currentProgress = Math.min(100, currentProgress + 10);
            currentConfidence = Math.min(0.99, currentConfidence + 0.05);
          } else {
            // Reset for demo loop
            if (Math.random() > 0.8) {
              currentProgress = 0;
              currentConfidence = 0.5;
            }
          }

          node.tags['Progress'] = currentProgress.toFixed(1);
          node.beliefs['working'] = parseFloat(currentConfidence.toFixed(2));
          appendHistoryToNode(node, 'confidence', node.beliefs['working']);
          appendHistoryToNode(node, 'Progress', currentProgress);

          // Simulation of Attribute Decay (If not manually overridden)
          Object.keys(node.customAttributes || {}).forEach(attrKey => {
            const attr = node.customAttributes![attrKey];
            // Random Drift
            if (Math.random() > 0.95) {
              const drift = (Math.random() - 0.5) * 0.05;
              attr.confidence = Math.max(0.1, Math.min(1.0, attr.confidence + drift));
            }
          });

        } else if (node.type === 'part' && !computedNodeIds.has(node.id)) {
          // Logic for Leaf Nodes (Parts)
          // Just noise and attribute influence
          changed = true;

          // 1. Calculate Dynamic Baseline from Design Attributes
          let baseline = 0.95;
          if (node.customAttributes && Object.keys(node.customAttributes).length > 0) {
            const attrs = Object.values(node.customAttributes);
            const sum = attrs.reduce((acc, curr) => acc + curr.confidence, 0);
            baseline = sum / attrs.length;
          }

          let currentConfidence = node.beliefs['working'] || 0.95;

          // 2. Drift towards Baseline
          const drift = (baseline - currentConfidence) * 0.2;
          currentConfidence += drift;

          // 3. Add micro-fluctuations (Sensor Noise)
          const noise = (Math.random() - 0.5) * 0.02; // +/- 1%

          // Random "Dip" event only if healthy
          if (baseline > 0.8 && Math.random() > 0.98) currentConfidence -= 0.1;

          currentConfidence = Math.max(0.01, Math.min(0.99, currentConfidence + noise));
          node.beliefs['working'] = parseFloat(currentConfidence.toFixed(3));
          appendHistoryToNode(node, 'confidence', currentConfidence);
        }
      });

      // 2. Run Bayesian Engine with Training Flag
      try {
        const simEngine = new BayesianEngine(newGraph);
        const simScores = simEngine.analyze(evidence, algoConfig, isTraining);

        // 3. Apply Calculated Scores to Parent Nodes
        newGraph.nodes.forEach(node => {
          if (computedNodeIds.has(node.id) && simScores.has(node.id)) {
            changed = true;
            const newScore = simScores.get(node.id)!;
            node.beliefs['working'] = parseFloat(newScore.toFixed(3));
            appendHistoryToNode(node, 'confidence', newScore);
          }
        });

        // 4. Calculate Global Loss & Update Training Stats
        if (isTraining) {
          let totalLoss = 0;
          let count = 0;
          newGraph.nodes.forEach(n => {
            if (n.modelParams && n.modelParams.lastError !== undefined) {
              totalLoss += n.modelParams.lastError;
              count++;
            }
          });
          const meanLoss = count > 0 ? totalLoss / count : 0;

          setLossHistory(prev => {
            const updated = [...prev, meanLoss];
            if (updated.length > 50) updated.shift();
            return updated;
          });
          setTrainingSteps(prev => prev + 1);
        }

      } catch (e) {
        console.warn("Simulation Engine Calc Failed", e);
      }

      if (changed) {
        updateGraph(newGraph, false); // Update without adding to history to avoid flood
      }
    }, 1000); // 1s tick for better visibility of training

    return () => clearInterval(interval);
  }, [activeGraphId, graph, updateGraph, isSimulationRunning, evidence, algoConfig, isTraining]); // Added isTraining dep

  // Re-propagate when engine or evidence changes
  useEffect(() => {
    if (!engine) return;
    setConfidenceScores(engine.analyze(evidence, algoConfig));
  }, [engine, evidence, algoConfig]);



  const handleNodesChange = useCallback((changes: any) => {
    setGraph((prev) => {
      if (!prev) return null;
      const newGraph = prev.clone();
      let changed = false;
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.position) {
          const node = newGraph.nodes.get(change.id);
          if (node) { node.position = change.position; changed = true; }
        }
      });
      return changed ? newGraph : prev;
    });
  }, []);

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<GraphNode>) => {
    setGraph((prev) => {
      if (!prev) return null;
      const newGraph = prev.clone();
      const node = newGraph.nodes.get(nodeId);
      if (node) { Object.assign(node, updates); }
      return newGraph;
    });
  }, []);

  const handleLoadGraph = useCallback((newGraph: KnowledgeGraph, id?: string, name?: string) => {
    updateGraph(newGraph);
    if (id) {
      setActiveGraphId(id);
      setActiveProjectName(name || "Untitled Project");
      // Initial fetch to get chat history immediately when loading a graph
      fetch(`/api/graphs/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.chatHistory) setChatHistory(data.chatHistory);
          else setChatHistory([]); // Reset if no history
        })
        .catch(err => console.error("Failed to load initial graph details", err));
    } else {
      setActiveGraphId(null);
      setActiveProjectName(name || null);
    }
    setSelectedNodeIds([]);
    setIsSidebarVisible(false);
  }, [updateGraph]);

  // 2. Scenario / Fault Injection
  const handleInjectFault = useCallback(() => {
    if (!graph) return;
    // Find a healthy leaf node
    const candidates = Array.from(graph.nodes.values()).filter(n =>
      n.type === 'part' && (n.beliefs['working'] || 0) > 0.8
    );

    if (candidates.length === 0) return;
    const victim = candidates[Math.floor(Math.random() * candidates.length)];

    setGraph(prev => {
      if (!prev) return null;
      const newGraph = prev.clone();
      const target = newGraph.nodes.get(victim.id)!;

      // SMASH CONFIDENCE
      target.beliefs['working'] = 0.1;
      // SMASH ATTRIBUTE (to prevent immediate drift back)
      if (target.customAttributes) {
        Object.keys(target.customAttributes).forEach(k => {
          target.customAttributes![k].confidence = 0.1;
        });
      }

      // Add "Fault" Tag
      if (!target.tags) target.tags = {};
      target.tags['Status'] = 'CRITICAL FAILURE';

      return newGraph;
    });
  }, [graph]);

  if (!graph) return <div className="p-10">{t.loading}</div>;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans transition-colors duration-500">
      <SidebarLeft
        algoConfig={algoConfig}
        setAlgoConfig={setAlgoConfig}
        lang={lang}
        setLang={setLang}
        aiVisualConfig={aiVisualConfig}
        setAIVisualConfig={setAIVisualConfig}
        isTraining={isTraining}
        setIsTraining={setIsTraining}
        lossHistory={lossHistory}
        trainingSteps={trainingSteps}
        onInjectFault={handleInjectFault}
      />

      <div className="flex-1 flex flex-col relative h-full">
        <div className="absolute top-6 right-6 z-30 flex gap-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md hover:scale-110 transition-all text-slate-500 dark:text-yellow-400 backdrop-blur-md"
            title={lang === 'zh' ? '切换主题' : 'Toggle Theme'}
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          <button onClick={() => setIs3DViewOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/80 backdrop-blur text-white rounded-xl border border-slate-700 hover:bg-slate-800 hover:scale-105 transition-all font-bold text-xs uppercase tracking-wider">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
            3D View
          </button>
          <button
            onClick={() => setIsSimulationRunning(!isSimulationRunning)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-bold text-xs uppercase tracking-wider ${isSimulationRunning
              ? 'bg-amber-500/10 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white'
              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
              }`}
          >
            {isSimulationRunning ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                {lang === 'zh' ? '模拟运行中' : 'Sim Running'}
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                {lang === 'zh' ? '模拟已暂停' : 'Sim Paused'}
              </>
            )}
          </button>
          <button onClick={() => setIsProjectModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all font-bold text-xs uppercase tracking-wider">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            {lang === 'zh' ? '项目管理' : 'Project Manager'}
          </button>
        </div>

        <div className="absolute top-6 left-6 z-10 pointers-events-none select-none flex flex-col gap-3">
          {/* Project Name Badge */}
          {activeProjectName && (
            <div className="bg-white/80 active:scale-95 transition-all backdrop-blur pointer-events-auto shadow-lg shadow-indigo-100 dark:shadow-none dark:bg-slate-900/80 border border-white/50 dark:border-slate-700 rounded-xl p-3 flex items-center gap-3 animate-in slide-in-from-left-4 fade-in duration-500">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-inner">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              </div>
              <div>
                <div className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none mb-1">Active Project</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">{activeProjectName}</div>
              </div>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur pointer-events-auto shadow-md rounded-xl p-3 border border-white/40 dark:bg-slate-900/80 dark:border-slate-700 flex flex-col gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">BOM Structure</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> {t.designBOM}
              </span>
              <span className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span> {t.mfgBOM}
              </span>
            </div>
          </div>

          <div className="mt-4 flex gap-3 pointer-events-auto">
            <button
              onClick={() => requestAddNode('part', 'design')}
              className="bg-emerald-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:scale-105 transition-all flex items-center gap-2 uppercase tracking-wider"
            >
              <span className="text-sm">+</span> {t.addPart}
            </button>
            <button
              onClick={() => requestAddNode('process', 'manufacturing')}
              className="bg-blue-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-2 uppercase tracking-wider"
            >
              <span className="text-sm">+</span> {t.addProcess}
            </button>
          </div>
        </div>

        <div className="flex-1 h-full relative">
          <NetworkGraph
            graph={graph}
            lang={lang}
            confidenceScores={confidenceScores}
            activeBOMFilter={activeBOMFilter}
            onUpdateEdge={handleUpdateEdge}
            onNodeClick={(id) => { setSelectedNodeIds([id]); setIsSidebarVisible(true); setSelectedEdgeId(null); }}
            onEdgeClick={(id) => { setSelectedEdgeId(id); setSelectedNodeIds([]); setIsSidebarVisible(false); }}
            onNodesChange={handleNodesChange}
            aiVisualConfig={aiVisualConfig}
            onConnect={handleConnect}
            onEdgesDelete={handleRemoveEdges}
            onNodesDelete={handleNodesDelete}
            onAddNodeTriggered={(pos, type, context) => { handleAddNode(type as any, context as any, pos); }}
            onSelectionChange={handleSelectionChange}
            onUpdateNode={handleUpdateNode}
          />

          <div className={`absolute bottom-32 z-20 flex flex-col gap-2 transition-all duration-500 ${isSidebarVisible ? 'right-[420px]' : 'right-8'}`}>
            <div className="bg-white/95 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-3xl p-1.5 flex flex-col gap-1 w-32">
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 mb-0.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{t.filterPanelTitle}</span>
                {!activeBOMFilter && <span className="w-1 h-1 rounded-full bg-blue-500"></span>}
              </div>
              <button
                onClick={() => setActiveBOMFilter(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 text-[9px] font-black uppercase ${!activeBOMFilter ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full border ${!activeBOMFilter ? 'bg-white border-white/20' : 'border-slate-300'}`}></span>
                {t.allFilter}
              </button>
              {Object.keys(BOM_COLORS).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveBOMFilter(prev => prev === type ? null : type)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 text-[9px] font-black uppercase ${activeBOMFilter === type ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BOM_COLORS[type], border: activeBOMFilter === type ? '1px solid rgba(255,255,255,0.2)' : 'none' }}></span>
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside className={`fixed top-0 right-0 h-full bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.05)] transition-all duration-500 ease-in-out z-40 flex flex-col ${isSidebarVisible ? 'w-[400px]' : 'w-0 overflow-hidden'}`}>
        <ControlPanel
          selectedNode={selectedNodeId && graph ? graph.nodes.get(selectedNodeId) || null : null}
          selectedEdge={selectedEdge}
          lang={lang}
          currentConfidence={selectedNodeId ? (confidenceScores.get(selectedNodeId) || 0) : 0}
          onSetConfidence={handleSetConfidence}
          onRemoveNode={handleRemoveNode}
          onUpdateNode={handleUpdateNode}
          onRemoveEdge={handleRemoveEdge}
          engine={engine}
          evidence={evidence}
          activeAlgorithm={algoConfig[0] || 'BN'}
          selectedCount={selectedNodeIds.length}
          onGroup={handleGroupSelection}
          onUngroup={handleUngroup}
        />
      </aside>

      {/* {(selectedNode || selectedEdge) && (
        <button
          onClick={() => setIsSidebarVisible(!isSidebarVisible)}
          className={`fixed bottom-10 right-0 z-30 p-3 bg-white shadow-[-5px_0_20px_rgba(0,0,0,0.1)] border border-slate-200 border-r-0 rounded-l-2xl text-slate-400 hover:text-slate-900 transition-all duration-500 hover:pr-6 group ${isSidebarVisible ? 'translate-x-full' : 'translate-x-0'}`}
          title={isSidebarVisible ? (lang === 'zh' ? "隐藏属性面板" : "Hide Properties") : (lang === 'zh' ? "显示属性面板" : "Show Properties")}
        >
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 transition-transform duration-500 ${isSidebarVisible ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            {!isSidebarVisible && <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden whitespace-nowrap">{lang === 'zh' ? '节点属性' : 'Node Properties'}</span>}
          </div>
        </button>
      )} */}

      {selectedEdge && selectedEdge.type === 'structural' && isSelectedEdgeSourcePart && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl border border-white/50 p-2 flex items-center gap-2 ring-1 ring-slate-900/5">
            <div className="px-3 border-r border-slate-200 mr-1">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lang === 'zh' ? '定义连接类型' : 'Define Connection'}</div>
              <div className="text-xs font-bold text-slate-800">Physical Link</div>
            </div>
            <div className="flex gap-1.5">
              {BOM_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleUpdateEdge(selectedEdge.id, { bomType: opt.type })}
                  className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 border ${selectedEdge.bomType === opt.type
                    ? 'bg-slate-800 border-slate-800 text-white shadow-lg scale-110 z-10'
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  title={t[opt.labelKey]}
                >
                  <span className={`w-2 h-2 rounded-full mb-1 transition-colors ${selectedEdge.bomType === opt.type ? 'bg-white' : ''}`} style={{ backgroundColor: selectedEdge.bomType === opt.type ? undefined : opt.color }}></span>
                  <span className="text-[9px] font-black tracking-tight">{opt.type}</span>

                  {/* Tooltip */}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[9px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {t[opt.labelKey]}
                  </span>
                </button>
              ))}
              <div className="w-px h-8 bg-slate-200 mx-1 self-center"></div>
              <button
                onClick={() => handleUpdateEdge(selectedEdge.id, { bomType: undefined })}
                className="w-8 h-12 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Reset"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        currentGraph={graph}
        onLoadGraph={handleLoadGraph}
        lang={lang}
      />

      <AIAssistant
        graph={graph}
        lang={lang}
        isSidebarOpen={isSidebarVisible}
        initialMessages={chatHistory}
        onChatUpdate={handleChatUpdate}
        // Bridge Logic
        aiStats={{
          loss: lossHistory.length > 0 ? lossHistory[lossHistory.length - 1] : 0,
          trainingSteps: trainingSteps,
          isTraining: isTraining
        }}
      />
      <SpaceTopologyGraph
        visible={is3DViewOpen}
        graph={graph}
        onClose={() => setIs3DViewOpen(false)}
        // Sync 3D with 2D AI State
        aiVisualConfig={aiVisualConfig}
        isTraining={isTraining}
      />
    </div>
  );
}

export default App;
