import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

import { connectDatabases } from './config/db';
import { Neo4jService } from './graph/neo4jService';
import { setupScoringSocket } from './sockets/scoringSocket';
import { seedDatabase } from './scripts/seed';

import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import tournamentRoutes from './routes/tournamentRoutes';
import matchRoutes from './routes/matchRoutes';
import playerRoutes from './routes/playerRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import venueRoutes from './routes/venueRoutes';
import adminRoutes from './routes/adminRoutes';

import path from 'path';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Serve Frontend Static Build
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback GET to serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

setupScoringSocket(io);

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDatabases();
  await Neo4jService.setupConstraints();
  await seedDatabase('full');

  server.listen(PORT, () => {
    console.log(`🚀 CueMyBreak Backend server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
