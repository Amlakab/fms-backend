"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const auth_1 = __importDefault(require("./routes/auth"));
const accountant_1 = __importDefault(require("./routes/accountant"));
const banks_1 = __importDefault(require("./routes/banks"));
const houseRoutes_1 = __importDefault(require("./routes/houseRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const menuRoutes_1 = __importDefault(require("./routes/menuRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
const agent_1 = __importDefault(require("./routes/agent"));
const user_1 = __importDefault(require("./routes/user"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const loanRoutes_1 = __importDefault(require("./routes/loanRoutes"));
const foodRoutes_1 = __importDefault(require("./routes/foodRoutes"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const propertyFeatureRoutes_1 = __importDefault(require("./routes/propertyFeatureRoutes"));
const reviewReportRoutes_1 = __importDefault(require("./routes/reviewReportRoutes"));
const workflowRoutes_1 = __importDefault(require("./routes/workflowRoutes"));
const database_1 = require("./config/database");
const errorHandler_1 = require("./middleware/errorHandler");
// Import image serving controllers
const foodController_1 = require("./controllers/foodController");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Get client URL from environment variables
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
// Socket.io setup with specific origin
const io = new socket_io_1.Server(server, {
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
app.use((0, cors_1.default)({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers", "*"]
}));
// Handle preflight requests for ALL routes
app.options('*', (0, cors_1.default)({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["*"]
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// BACKWARD COMPATIBILITY ROUTES - Serve images from database
// These routes intercept old upload URLs and serve images from MongoDB
app.get('/uploads/foods/:filename', foodController_1.serveFoodImage);
// API Routes
app.use('/api/user', user_1.default);
app.use('/api/foods', foodRoutes_1.default);
app.use('/api/loans', loanRoutes_1.default);
app.use('/api/wallet', wallet_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/agent', agent_1.default);
app.use('/api/feedback', feedback_1.default);
app.use('/api/houses', houseRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/menu', menuRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/public', publicRoutes_1.default);
app.use('/api/properties', propertyFeatureRoutes_1.default);
app.use('/api/reviews', reviewReportRoutes_1.default);
app.use('/api/workflows', workflowRoutes_1.default);
app.use('/api/banks', banks_1.default);
app.use('/api/accountants', accountant_1.default);
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
app.use(errorHandler_1.errorHandler);
// Connect to database
(0, database_1.connectDB)();
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
