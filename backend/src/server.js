import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { socketHandler } from './sockets/socketHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';

dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS configuration
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev simplicity, can restrict in production
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Run socket event listeners
socketHandler(io);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static uploads serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);

// Simple Status route
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'CampusFlow Academic Server Running',
    time: new Date()
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
