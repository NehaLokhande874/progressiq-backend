const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ 1. WILDCARD CORS CONFIGURATION
// Everything is allowed - No more "Blocked by CORS policy" errors
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: false // Note: credentials must be false when using '*'
}));

// ✅ 2. EXPLICIT OPTIONS HANDLER
// Directly handles the preflight requests that were failing in your screenshots
app.options('*', cors());

// ✅ 3. MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 4. HEALTH CHECK ROUTE
// Used by cron-job.org to keep your Render instance active
app.get('/health', (req, res) => {
  res.status(200).json({ status: '✅ ProgressIQ backend is live' });
});

// ✅ 5. ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// ✅ 6. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ProgressIQ";
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ ProgressIQ Database Connected...'))
  .catch(err => console.log('❌ DB Connection Error:', err));

// ✅ 7. SERVER LISTEN
const PORT = process.env.PORT || 5000;
// Binding to 0.0.0.0 is mandatory for Render deployment
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on Port: ${PORT}`);
});