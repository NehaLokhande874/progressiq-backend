const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ FIXED CORS — credentials:true is incompatible with origin:'*'
const allowedOrigins = [
  'https://progressiq-frontend.vercel.app',
  'http://localhost:3000', // for local dev
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (Postman, cron pings, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
}));

// ✅ Handle preflight for ALL routes — must be BEFORE routes
app.options('*', cors());

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// Health check — keeps Render awake via cron-job.org
app.get('/health', (req, res) => {
  res.status(200).json({ status: '✅ ProgressIQ backend is live' });
});

// Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ ProgressIQ Database Connected...'))
  .catch(err => console.log('❌ DB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server live on port ${PORT}`);
});