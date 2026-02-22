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

// 💡 2. DYNAMIC CORS SETTINGS (Final Fix for Render + Vercel)
app.use(cors({
    origin: function (origin, callback) {
        // ✅ Allow requests with no origin (like Postman or Mobile)
        if (!origin) return callback(null, true);
        
        // ✅ Strict check for Localhost and ANY Vercel link
        if (origin.includes('localhost') || origin.endsWith('vercel.app')) {
            callback(null, true);
        } else {
            console.log("❌ Blocked by CORS: ", origin);
            callback(new Error('Blocked by CORS policy'));
        }
    },
    // ✅ ADDED 'OPTIONS' - He khup mukhya aahe signup sathi
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200 // Some older browsers need this
})); 

app.use(express.json()); 

// Static File Serving
app.use('/uploads', express.static(uploadDir));

// 💡 3. ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// 💡 4. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ProgressIQ";
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ ProgressIQ Database Connected...'))
    .catch(err => console.log('❌ DB Connection Error:', err));

// 💡 5. DYNAMIC IP DETECTION
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

// 💡 6. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("🚨 Server Error:", err.message);
    res.status(500).json({ success: false, message: "Something went wrong on the server!" });
});

const PORT = process.env.PORT || 5000;
const IP_ADDRESS = getLocalIP();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on Port: ${PORT}`);
    console.log(`📡 Network Access: http://${IP_ADDRESS}:${PORT}`);
});