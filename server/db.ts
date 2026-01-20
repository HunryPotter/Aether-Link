import { JSONFilePreset } from 'lowdb/node';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// 1. Define the Database Schema
// This interface allows for future expansion (e.g., adding user settings, logs)
export interface GraphData {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
    chatHistory?: any[]; // Store chat messages
    data: {
        nodes: any[];
        edges: any[];
        [key: string]: any; // Allow for extra metadata in the graph
    };
}

export interface DatabaseSchema {
    graphs: GraphData[];
    meta: {
        version: string;
        lastBackup?: string;
    };
}

const defaultData: DatabaseSchema = {
    graphs: [],
    meta: { version: '1.0.0' }
};

// 2. Initialize the Database
// Using dirname logic compatible with ESM
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'db.json');

// Initialize LowDB with default data
// This "Preset" handles reading/writing and ensures the file exists
const db = await JSONFilePreset<DatabaseSchema>(DB_PATH, defaultData);

// 3. Data Access Layer (DAL)
// We export functions instead of the raw DB to decouple the implementation.
// If we switch to SQLite/Mongo later, we only change this file.

export const GraphService = {
    getAll: () => {
        db.read(); // Refresh
        return db.data.graphs.map(g => ({
            id: g.id,
            name: g.name,
            description: g.description,
            updatedAt: g.updatedAt,
            tags: g.tags,
            nodeCount: g.data.nodes.length,
            edgeCount: g.data.edges.length
        }));
    },

    getById: (id: string) => {
        db.read();
        return db.data.graphs.find(g => g.id === id);
    },

    create: async (graph: GraphData) => {
        await db.update(({ graphs }) => graphs.push(graph));
        return graph;
    },

    update: async (id: string, updates: Partial<GraphData>) => {
        await db.update(({ graphs }) => {
            const index = graphs.findIndex(g => g.id === id);
            if (index !== -1) {
                graphs[index] = { ...graphs[index], ...updates, updatedAt: new Date().toISOString() };
            }
        });
        return db.data.graphs.find(g => g.id === id);
    },

    delete: async (id: string) => {
        await db.update(({ graphs }) => {
            const index = graphs.findIndex(g => g.id === id);
            if (index !== -1) {
                graphs.splice(index, 1);
            }
        });
        return { success: true };
    }
};

// 4. Background Simulation Engine (Industrial Process Animation)
// Mocked to update every 5 seconds
export const startSimulation = () => {
    console.log('🦾 Industrial Simulation Engine Started (5s logic cycles)');

    // Store last known progress to detect manual overrides
    const lastKnownProgress = new Map<string, number>();

    setInterval(async () => {
        await db.read();
        let changed = false;

        db.data.graphs.forEach(graph => {
            graph.data.nodes.forEach((node: any) => {
                // Only simulate 'process' (logical) nodes
                if (node.type === 'process') {
                    changed = true;

                    // Initialize Tags if missing
                    if (!node.tags) node.tags = {};
                    if (!node.tags['Progress']) node.tags['Progress'] = "0";
                    if (!node.tags['Time']) node.tags['Time'] = "0";

                    let currentProgress = parseFloat(node.tags['Progress']);
                    let currentTime = parseFloat(node.tags['Time']);
                    let currentConfidence = node.beliefs['working'] || 0;

                    const nodeKey = `${graph.id}-${node.id}`;
                    const prevProg = lastKnownProgress.get(nodeKey) ?? currentProgress;

                    // 1. Time always increases (Day units)
                    currentTime += 0.1;

                    // 2. Logic for Progress & Confidence
                    // If progress is currently moving (simulated task)
                    if (currentProgress < 100) {
                        // Random progress increase (0% to 2%)
                        const delta = Math.random() * 2;
                        currentProgress = Math.min(100, currentProgress + delta);

                        // Confidence follows progress tightly during execution
                        currentConfidence = currentProgress / 100;
                    } else {
                        // If progress is at 100%, but Time keeps ticking without new updates
                        // This simulates "Confidence Decay" over time for completed processes
                        currentConfidence = Math.max(0.1, currentConfidence - 0.01);
                    }

                    // 3. User Manual Override Detection
                    // If the user changed the confidence/progress manually since last cycle
                    // we reset the simulation state for this node to their value
                    if (Math.abs(prevProg - currentProgress) > 5) {
                        // User likely jumped the progress
                        lastKnownProgress.set(nodeKey, currentProgress);
                    }

                    // Update node state
                    node.tags['Progress'] = currentProgress.toFixed(1);
                    node.tags['Time'] = currentTime.toFixed(1);
                    node.beliefs['working'] = parseFloat(currentConfidence.toFixed(3));

                    lastKnownProgress.set(nodeKey, currentProgress);
                } else if (node.type === 'part') {
                    // Simulate Part Nodes (Sensor Noise / Wear & Tear)
                    changed = true;
                    // Ensure beliefs structure exists
                    if (!node.beliefs) node.beliefs = {};

                    let currentConfidence = node.beliefs['working'] || 0.95;

                    // Add subtle sensor noise (+/- 0.5%)
                    // Occasionally drift down slightly to simulate wear
                    const noise = (Math.random() - 0.55) * 0.01;
                    currentConfidence = Math.max(0.1, Math.min(0.999, currentConfidence + noise));

                    node.beliefs['working'] = parseFloat(currentConfidence.toFixed(4));
                }
            });
            graph.updatedAt = new Date().toISOString();
        });

        if (changed) {
            console.log(`💾 Simulation: Saved updates for ${db.data.graphs.length} graphs`);
            await db.write();
        }
    }, 5000);
};

// Start the engine immediately
startSimulation();
