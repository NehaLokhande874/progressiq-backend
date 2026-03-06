const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http'); // Socket.io sathi garjeche
const { Server } = require('socket.io'); // Socket.io library
require('dotenv').config();

const app = express();
const server = http.createServer(app); // HTTP server create kela

// ✅ 1. FIXED CORS CONFIGURATION (Socket.io & API sathi)
const io = new Server(server, {
  cors: {
    origin: ['https://progressiq-frontend.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

app.use(cors({
  origin: ['https://progressiq-frontend.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true 
}));

// ✅ 2. MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 3. SOCKET.IO CONNECTION
io.on('connection', (socket) => {
  console.log('🔗 Client Connected to Socket:', socket.id);
  socket.on('disconnect', () => console.log('❌ Client Disconnected'));
});

// ✅ 4. ROUTES (Attaching IO to Request Object for Controllers)
app.use((req, res, next) => {
  req.io = io; // Controller madhe 'req.io.emit' vaprayla milel
  next();
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// ✅ 5. STATIC FOLDER & HEALTH CHECK
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/health', (req, res) => {
  res.status(200).json({ status: '✅ ProgressIQ backend is live' });
});

// ✅ 6. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ProgressIQ";
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ ProgressIQ Database Connected...'))
  .catch(err => console.log('❌ DB Connection Error:', err));

// ✅ 7. SERVER LISTEN (app.listen aivaji server.listen vapra)
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Real-Time Server running on Port: ${PORT}`);
});