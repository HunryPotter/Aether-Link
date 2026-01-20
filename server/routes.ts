import { Router } from 'express';
import { GraphService } from './db.js';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/graphs - List all graphs (summary)
router.get('/graphs', async (req, res) => {
    try {
        const graphs = GraphService.getAll();
        res.json(graphs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch graphs' });
    }
});

// GET /api/graphs/:id - Get full graph details
router.get('/graphs/:id', async (req, res) => {
    try {
        const graph = GraphService.getById(req.params.id);
        if (!graph) {
            return res.status(404).json({ error: 'Graph not found' });
        }
        res.json(graph);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch graph' });
    }
});

// POST /api/graphs - Create a new graph
router.post('/graphs', async (req, res) => {
    try {
        const { name, data, description, tags } = req.body;

        if (!name || !data) {
            return res.status(400).json({ error: 'Name and Data are required' });
        }

        const newGraph = {
            id: randomUUID(),
            name,
            description: description || '',
            tags: tags || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            data
        };

        const created = await GraphService.create(newGraph);
        res.status(201).json(created);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create graph' });
    }
});

// PUT /api/graphs/:id - Update a graph
router.put('/graphs/:id', async (req, res) => {
    try {
        const { name, data, description, tags, chatHistory } = req.body;
        const updates: any = {};
        if (name) updates.name = name;
        if (data) updates.data = data;
        if (description !== undefined) updates.description = description;
        if (tags) updates.tags = tags;
        if (chatHistory) updates.chatHistory = chatHistory;

        const updated = await GraphService.update(req.params.id, updates);
        if (!updated) {
            return res.status(404).json({ error: 'Graph not found' });
        }
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update graph' });
    }
});

// DELETE /api/graphs/:id - Delete a graph
router.delete('/graphs/:id', async (req, res) => {
    try {
        await GraphService.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete graph' });
    }
});

// GET /api/graphs/:id/export - Export as JSON file
router.get('/graphs/:id/export', async (req, res) => {
    try {
        const graph = GraphService.getById(req.params.id);
        if (!graph) {
            return res.status(404).json({ error: 'Graph not found' });
        }

        // Set headers for file download
        // Sanitize filename to avoid filesystem issues
        const safeName = graph.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}_${graph.id.slice(0, 8)}.json"`);
        res.setHeader('Content-Type', 'application/json');

        // Formatted pretty JSON
        res.send(JSON.stringify(graph, null, 2));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to export graph' });
    }
});

// POST /api/chat - DeepSeek AI Chat
router.post('/chat', async (req, res) => {
    console.log('Received /api/chat request');
    try {
        const { message, graphContext, history } = req.body;
        const apiKey = process.env.DEEPSEEK_API_KEY;

        console.log('API Key configured:', !!apiKey);

        if (!apiKey) {
            console.error('Missing API Key');
            return res.status(500).json({ error: 'DeepSeek API Key not configured' });
        }

        // Construct System Prompt with Graph Context
        const nodeSummary = graphContext.nodes.map((n: any) =>
            `- ${n.label} (${n.type}, Belief: ${(Object.values(n.beliefs)[0] as number * 100).toFixed(1)}%)`
        ).join('\n');

        const edgeSummary = graphContext.edges.map((e: any) =>
            `- ${e.source} -> ${e.target} (${e.type})`
        ).join('\n');

        console.log('Constructed Context. Sending to DeepSeek...');

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: `You are Aether Linker, an advanced Industrial AI embedded in a digital twin system.
                        
Current System Context:
${nodeSummary ? nodeSummary : 'No nodes currently.'}

System Topology:
${edgeSummary ? edgeSummary : 'No connections currently.'}

Mathematical Engines Available:
- MCMC: Markov Chain stochastic sampling for deep posterior estimation.
- Variational Inference (VI): Fast, deterministic approximation for large-scale hierarchical trees.
- Graph Transformer (Attention): Semantic weighting of nodes based on Tags and metadata similarity.

Your Mission:
1. Analyze the user's request based on the specific nodes and connections above.
2. Provide technical, precise insights about the BOM structure, manufacturing logic, or confidence levels.
3. If you use the analytical models, explain the rationale (e.g., using Transformer for tag-based risk weighting).
4. If you detect low confidence nodes (<60%), flag them as risks.
5. Be concise but professional.

User Language: Detect automatically (reply in Chinese if queried in Chinese).`
                    },
                    ...history.map((h: any) => ({
                        role: h.role === 'ai' ? 'assistant' : h.role,
                        content: h.content
                    })),
                    { role: "user", content: message }
                ],
                stream: false
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('DeepSeek API Error Response:', response.status, errText);
            throw new Error(`DeepSeek API Error: ${errText}`);
        }

        const data = await response.json();
        console.log('DeepSeek Response received successfully');
        res.json({ reply: data.choices[0].message.content });

    } catch (error: any) {
        console.error('Final AI Error Handler:', error.message);
        res.status(500).json({ error: 'Failed to process AI request' });
    }
});

export const apiRouter = router;
