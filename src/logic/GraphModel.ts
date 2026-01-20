export interface GraphNode {
  id: string;
  label: string;
  type: 'part' | 'process' | 'resource' | 'sensor';
  layer: 'EBOM' | 'MBOM' | 'SBOM';

  // Belief State (Posterior Probability)
  beliefs: Record<string, number>;

  // ... Other properties hidden in public view ...
  [key: string]: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

export class KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;

  constructor() {
    this.nodes = new Map();
    this.adjacency = new Map();
    this.reverseAdjacency = new Map();
  }

  addNode(node: GraphNode) {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) this.adjacency.set(node.id, []);
    if (!this.reverseAdjacency.has(node.id)) this.reverseAdjacency.set(node.id, []);
  }

  addEdge(sourceId: string, targetId: string) {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) return;

    this.adjacency.get(sourceId)?.push(targetId);
    this.reverseAdjacency.get(targetId)?.push(sourceId);
  }

  getParents(nodeId: string): string[] {
    return this.reverseAdjacency.get(nodeId) || [];
  }
}
