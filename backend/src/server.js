import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import clinicalNoteRoutes from './routes/notes.js';
import aiRoutes from './routes/ai.js';
import labRoutes from './routes/lab.js';
import auditRoutes from './routes/audit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend client
app.use(cors({
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/clinical-notes', clinicalNoteRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'HealthTrack AI API' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong inside the server!' });
});

// Establish database connection and start listening
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 HealthTrack AI Server running on port ${PORT}`);
  });
};

startServer();
