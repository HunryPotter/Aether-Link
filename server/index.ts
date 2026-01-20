import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { apiRouter } from './routes.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); // Allow cross-origin requests (useful for dev)
app.use(bodyParser.json({ limit: '50mb' })); // Support large graph payloads

// Routes
app.use('/api', apiRouter);

// Base route
app.get('/', (req, res) => {
    res.send({ message: 'Aether Link API Server is running', status: 'OK' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`
    🚀 Server running at http://localhost:${PORT}
    📡 API endpoints available at http://localhost:${PORT}/api
    `);
});
