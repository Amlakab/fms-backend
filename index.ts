import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import accountantRoutes from './routes/accountant';
import bankRoutes from './routes/banks';
import houseRoutes from './routes/houseRoutes';
import orderRoutes from './routes/orderRoutes';
import menuRoutes from './routes/menuRoutes';
import messageRoutes from './routes/messageRoutes';
import publicRoutes from './routes/publicRoutes';
import agentRoutes from './routes/agent';
import userRoutes from './routes/user';
import walletRoutes from './routes/wallet';
import transactionRoutes from './routes/transactions';
import loanRoutes from './routes/loanRoutes';
import foodRoutes from './routes/foodRoutes';
import feedbackRoutes from './routes/feedback';
import propertyFeatureRoutes from './routes/propertyFeatureRoutes';
import reviewReportRoutes from './routes/reviewReportRoutes';
import workflowRoutes from './routes/workflowRoutes';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';

// Import image serving controllers
import { serveFoodImage } from './controllers/foodController';

dotenv.config();

const app = express();
const server = createServer(app);

// Get client URL from environment variables
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Socket.io setup with specific origin
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

// Middleware - Use CLIENT_URL from environment
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers", "*"]
}));

// Handle preflight requests for ALL routes
app.options('*', cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["*"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// BACKWARD COMPATIBILITY ROUTES - Serve images from database
// These routes intercept old upload URLs and serve images from MongoDB
app.get('/uploads/foods/:filename', serveFoodImage);

// API Routes
app.use('/api/user', userRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/properties', propertyFeatureRoutes);
app.use('/api/reviews', reviewReportRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/accountants', accountantRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    cors: `Restricted to: ${CLIENT_URL}`,
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'Unknown',
    imageStorage: 'MongoDB Database',
    compatibility: 'Frontend URLs unchanged'
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  const origin = req.headers.origin;
  const isAllowed = origin === CLIENT_URL;
  
  res.status(200).json({ 
    message: isAllowed ? 'CORS is working! Origin allowed.' : 'CORS: Origin not allowed',
    yourOrigin: origin,
    allowedOrigin: CLIENT_URL,
    allowed: isAllowed,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint (no filesystem operations)
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working with database image storage',
    features: {
      imageStorage: 'MongoDB',
      compatibility: 'Frontend URLs unchanged',
      routes: {
        students: '/api/students',
        blogs: '/api/blogs',
        foods: '/api/foods',
        wallet: '/api/wallet',
        loans: '/api/loans'
      }
    }
  });
});

// WebSocket endpoint for clients that need raw WebSocket
app.get('/ws', (req, res) => {
  res.status(400).json({ error: 'Use Socket.io client instead' });
});

// Error handling middleware
app.use(errorHandler);

// Connect to database
connectDB();

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 CORS: Restricted to ${CLIENT_URL}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Image storage: MongoDB Database`);
  console.log(`🔗 Frontend compatibility: URLs unchanged`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ CORS test: http://localhost:${PORT}/api/cors-test`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📱 Mobile apps must connect from: ${CLIENT_URL}`);
  console.log(`\n📊 Available Routes:`);
  console.log(`   - /api/auth          - Authentication`);
  console.log(`   - /api/user          - User management`);
  console.log(`   - /api/foods         - Food management`);
  console.log(`   - /api/loans         - Loan management`);
  console.log(`   - /api/wallet        - Wallet management`);
  console.log(`   - /api/agent         - Agent management`);
  console.log(`   - /api/accountants   - Accountant management`);
  console.log(`   - /api/feedback      - Feedback system`);
  console.log(`\n🖼️ Image serving (from database):`);
  console.log(`   - /uploads/students/* - Student photos`);
  console.log(`   - /uploads/blogs/*    - Blog images`);
  console.log(`   - /uploads/foods/*    - Food images`);
});