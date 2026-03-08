const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const path      = require('path');
const http      = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);

// ✅ Allowed Origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://progressiq-frontend.vercel.app',
  /https:\/\/progressiq-frontend.*\.vercel\.app$/,
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(a =>
      a instanceof RegExp ? a.test(origin) : a === origin
    );
    if (isAllowed) callback(null, true);
    else {
      console.warn(`❌ CORS blocked: ${origin}`);
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email'], // ✅ FIXED
  optionsSuccessStatus: 200,
};

// ✅ Apply CORS before everything
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ✅ Socket.io with same CORS
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some(a =>
        a instanceof RegExp ? a.test(origin) : a === origin
      );
      if (isAllowed) callback(null, true);
      else callback(new Error('Socket.io CORS blocked'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Attach socket.io to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ✅ Socket.io rooms for targeted real-time updates
io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  // User joins their personal room
  socket.on('join', (email) => {
    if (email) {
      socket.join(`user:${email}`);
      console.log(`👤 ${email} joined room user:${email}`);
    }
  });

  // User joins their team room
  socket.on('join-team', (teamName) => {
    if (teamName) {
      socket.join(`team:${teamName}`);
      console.log(`👥 joined team room: ${teamName}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ✅ Routes
app.use('/api/auth',  require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/users', require('./routes/authRoutes')); // alias for member-details

// ✅ Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: '✅ ProgressIQ backend is live',
    timestamp: new Date().toISOString(),
  });
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ ProgressIQ Database Connected...'))
  .catch(err => console.error('❌ DB Connection Error:', err));

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on Port: ${PORT}`);
});