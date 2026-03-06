const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ✅ 1. CORS CONFIGURATION (Strict Production URL)
const allowedOrigins = [
  'https://progressiq-frontend.vercel.app', 
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// ✅ 2. SOCKET.IO CONFIGURATION
const io = new Server(server, {
  cors: corsOptions
});

// ✅ 3. MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 4. SOCKET.IO CONNECTION
io.on('connection', (socket) => {
  console.log('🔗 Client Connected:', socket.id);
  socket.on('disconnect', () => console.log('❌ Client Disconnected'));
});

// ✅ 5. ROUTES (Injecting IO for real-time updates)
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// ✅ 6. STATIC FOLDER & HEALTH CHECK
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/health', (req, res) => {
  res.status(200).json({ status: '✅ ProgressIQ backend is live' });
});

// ✅ 7. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ ProgressIQ Database Connected...'))
  .catch(err => console.error('❌ DB Connection Error:', err));

// ✅ 8. SERVER LISTEN
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on Port: ${PORT}`);
});