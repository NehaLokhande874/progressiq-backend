const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Path module garjeche aahe
require('dotenv').config();

const app = express();

// ✅ 1. FIXED CORS CONFIGURATION
app.use(cors({
  origin: ['https://progressiq-frontend.vercel.app', 'http://localhost:3000'], // Dev ani Production donhi sathi
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true 
}));

app.options('*', cors());

// ✅ 2. MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 3. STATIC FOLDER FOR UPLOADS (Aatichya code madhe missing hote)
// Hyamule /uploads/filename.pdf hi link browser madhe open hoil
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ 4. HEALTH CHECK ROUTE
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on Port: ${PORT}`);
});