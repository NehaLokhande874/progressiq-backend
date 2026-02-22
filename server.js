const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ 1. FIXED CORS CONFIGURATION
// frontend link specific taklyamule 'credentials: true' aata block honar nahi
app.use(cors({
  origin: 'https://progressiq-frontend.vercel.app', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true 
}));

// ✅ 2. EXPLICIT OPTIONS HANDLER
// Browser cha 'preflight' request handle karnyathi
app.options('*', cors());

// ✅ 3. MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 4. HEALTH CHECK ROUTE
app.get('/health', (req, res) => {
  res.status(200).json({ status: '✅ ProgressIQ backend is live' });
});

// ✅ 5. ROUTES
// Frontend 'axios.js' madhe baseURL '.../api' asne garjeche aahe
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// ✅ 6. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ProgressIQ";
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ ProgressIQ Database Connected...'))
  .catch(err => console.log('❌ DB Connection Error:', err));

// ✅ 7. SERVER LISTEN
const PORT = process.env.PORT || 5000;
// Render deployment sathi '0.0.0.0' binding garjeche aahe
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on Port: ${PORT}`);
});