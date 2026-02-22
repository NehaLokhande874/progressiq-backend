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
    console.log("📂 Created 'uploads' directory for storing files.");
}

// 💡 2. INDUSTRY-STANDARD CORS SETTINGS (FIXED)
app.use(cors({
    origin: function (origin, callback) {
        // ✅ Allow localhost
        // ✅ Allow your official domain: progresiq-frontend.vercel.app
        // ✅ Allow ANY Vercel preview link to stop "Blocked by CORS" errors
        if (!origin || origin.includes('localhost') || origin.includes('vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS policy'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
})); 

app.use(express.json()); 

// Static File Serving
app.use('/uploads', express.static(uploadDir));

// 💡 3. ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// 💡 4. DATABASE CONNECTION
// Added serverSelectionTimeoutMS for more stable Render connections
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ProgressIQ";
mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000
})
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
    console.log(`-----------------------------------------------`);
    console.log(`🚀 Server running on Port: ${PORT}`);
    console.log(`🏠 Local Access:   http://localhost:${PORT}`);
    console.log(`📡 Network Access: http://${IP_ADDRESS}:${PORT}`);
    console.log(`-----------------------------------------------`);
});