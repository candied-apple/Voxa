const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const socketHandler = require('./utils/socketHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  console.log(`📊 Database: ${process.env.MONGODB_URI}`);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('🔧 Please ensure MongoDB is running or update MONGODB_URI in .env');
  console.log('📖 See SETUP.md for database setup instructions');
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Socket.IO handler
socketHandler(io);

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('\n🚀 =================================');
  console.log('🌟     VOXA CHAT SERVER READY    🌟');
  console.log('🚀 =================================');
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔗 Open http://localhost:${PORT} in your browser`);
  console.log(`🧪 Test API: http://localhost:${PORT}/test.html`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🚀 =================================\n');
});

module.exports = { app, server, io };
