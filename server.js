const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const os = require('os'); 
const fs = require('fs'); 
require('dotenv').config();

const app = express();

// 💡 1. AUTO-FOLDER LOGIC
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("📂 Created 'uploads' directory.");
}

// 💡 2. DYNAMIC CORS SETTINGS (Final Professional Fix)
app.use(cors({
    origin: function (origin, callback) {
        // ✅ Allow requests with no origin (like Postman or Mobile)
        if (!origin) return callback(null, true);
        
        // ✅ Strict check for Localhost and ANY Vercel link
        // handles 'progresiq-frontend.vercel.app'
        if (origin.includes('localhost') || origin.endsWith('vercel.app')) {
            callback(null, true);
        } else {
            console.log("❌ Blocked by CORS: ", origin);
            callback(new Error('Blocked by CORS policy'));
        }
    },
    // ✅ 'OPTIONS' is required for browser security checks before POST requests
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200 
})); 

// 💡 3. MIDDLEWARE
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Static File Serving
app.use('/uploads', express.static(uploadDir));

// 💡 4. ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// 💡 5. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ProgressIQ";
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ ProgressIQ Database Connected...'))
    .catch(err => console.log('❌ DB Connection Error:', err));

// 💡 6. DYNAMIC IP DETECTION
const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

// 💡 7. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("🚨 Server Error:", err.message);
    res.status(500).json({ success: false, message: "Something went wrong on the server!" });
});

const PORT = process.env.PORT || 5000;
const IP_ADDRESS = getLocalIP();

// Listen on 0.0.0.0 for Render deployment compatibility
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on Port: ${PORT}`);
    console.log(`📡 Network Access: http://${IP_ADDRESS}:${PORT}`);
});