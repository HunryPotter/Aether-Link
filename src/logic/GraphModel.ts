export type NodeType = 'part' | 'process' | 'group';
export type BOMContext = 'design' | 'manufacturing' | 'support';
export type EdgeType = 'structural' | 'logical';

export interface GraphNode {
  id: string;
  label: string; // Internal legacy field
  labelEn: string;
  labelZh: string;
  type: NodeType;
  context: BOMContext;
  beliefs: Record<string, number>;
  position?: { x: number; y: number };
  customAttributes?: Record<string, { value: number; confidence: number }>;
  modelParams?: {                  // [NEW] Machine Learning Persistence
    weights?: Record<string, number>; // Weights for neighbors (id -> weight)
    attention?: Record<string, number>; // [NEW] Learned Attention Coefficients
    bias?: number;
    learningRate?: number;
    lastError?: number;
  };
  tags?: Record<string, string>; // e.g. { "material": "Titanium", "supplier": "Airbus" }
  history?: Record<string, number[]>; // Historical data for tags and beliefs { "confidence": [0.8, 0.9...], "Progress": [10, 20...] }
  parentId?: string;
  collapsed?: boolean;
  style?: Record<string, any>; // For dimensions and custom styles
}

export type BOMType = 'EBOM' | 'PBOM' | 'MBOM' | 'SBOM' | 'DBOM' | 'GBOM' | 'BBOM' | 'OBOM' | 'None';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
  bomType?: BOMType;
  curvature?: number;
}

export class KnowledgeGraph {
  nodes: Map<string, GraphNode> = new Map();
  edges: GraphEdge[] = [];
  adjacency: Map<string, string[]> = new Map();

  constructor(nodes?: Map<string, GraphNode>, edges?: GraphEdge[]) {
    if (nodes) this.nodes = new Map(nodes);
    if (edges) this.edges = [...edges];
    this.rebuildAdjacency();
  }

  rebuildAdjacency() {
    this.adjacency.clear();
    this.nodes.forEach((_, id) => this.adjacency.set(id, []));
    this.edges.forEach(edge => {
      const existing = this.adjacency.get(edge.source) || [];
      this.adjacency.set(edge.source, [...existing, edge.target]);
    });
  }

  addNode(node: GraphNode) {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  removeNode(nodeId: string) {
    this.nodes.delete(nodeId);
    this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    this.rebuildAdjacency();
  }

  addEdge(edge: GraphEdge) {
    this.edges.push(edge);
    this.rebuildAdjacency();
  }

  removeEdge(edgeId: string) {
    this.edges = this.edges.filter(e => e.id !== edgeId);
    this.rebuildAdjacency();
  }

  getNodesByContext(context: BOMContext): GraphNode[] {
    return Array.from(this.nodes.values()).filter(n => n.context === context);
  }

  getParents(nodeId: string): string[] {
    return this.edges
      .filter(e => e.target === nodeId)
      .map(e => e.source);
  }

  clone(): KnowledgeGraph {
    const newNodes = new Map<string, GraphNode>();
    this.nodes.forEach((node, id) => {
      // Deep clone the node object, including nested objects like tags and style
      newNodes.set(id, JSON.parse(JSON.stringify(node)));
    });
    // Edges are usually immutable enough or simple objects, but safer to deep copy too if needed.
    // For performance, we'll slice the array, but if we mutate edges, we need deep copy.
    // Given the simulation only mutates nodes, deep cloning nodes is critical.
    const newEdges = this.edges.map(e => ({ ...e }));
    return new KnowledgeGraph(newNodes, newEdges);
  }
}
