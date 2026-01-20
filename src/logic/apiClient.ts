const API_BASE = '/api';

export interface SavedGraph {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    nodeCount: number;
    edgeCount: number;
}

export const apiClient = {
    getAllGraphs: async (): Promise<SavedGraph[]> => {
        const response = await fetch(`${API_BASE}/graphs`);
        if (!response.ok) throw new Error('Failed to fetch graphs');
        return response.json();
    },

    getGraphById: async (id: string) => {
        const response = await fetch(`${API_BASE}/graphs/${id}`);
        if (!response.ok) throw new Error('Failed to fetch graph details');
        return response.json();
    },

    saveGraph: async (name: string, description: string, graphData: any) => {
        const response = await fetch(`${API_BASE}/graphs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                description,
                data: graphData
            }),
        });
        if (!response.ok) throw new Error('Failed to save graph');
        return response.json();
    },

    updateGraph: async (id: string, name: string, description: string) => {
        const response = await fetch(`${API_BASE}/graphs/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                description
            }),
        });
        if (!response.ok) throw new Error('Failed to update graph');
        return response.json();
    },

    deleteGraph: async (id: string) => {
        const response = await fetch(`${API_BASE}/graphs/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete graph');
    },

    exportGraphUrl: (id: string) => {
        return `${API_BASE}/graphs/${id}/export`;
    }
};
