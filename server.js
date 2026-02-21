const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const os = require('os'); 
const fs = require('fs'); 
require('dotenv').config();

const app = express();

// 💡 1. AUTO-FOLDER LOGIC: Jar 'uploads' folder nashel tar crash hou naye mhanun
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("📂 Created 'uploads' directory for storing files.");
}

// 💡 2. PROPER CORS SETTINGS: Mobile ani Laptop connectivity sathi
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 

app.use(express.json()); 

// Static File Serving (Analysis page var proof disnyasathi garjeche aahe)
app.use('/uploads', express.static(uploadDir));

// 💡 3. ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// 💡 4. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ProgressIQ";
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ ProgressIQ Database Connected...'))
    .catch(err => console.log('❌ DB Connection Error:', err));

// 💡 5. DYNAMIC IP DETECTION: Terminal madhe dakhvnyasathi
const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // IPv4 check ani internal (127.0.0.1) ignore karne
            if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

// 💡 6. GLOBAL ERROR HANDLER: Server band padu naye mhanun
app.use((err, req, res, next) => {
    console.error("🚨 Server Error:", err.message);
    res.status(500).json({ success: false, message: "Something went wrong on the server!" });
});

const PORT = process.env.PORT || 5000;
const IP_ADDRESS = getLocalIP();

// '0.0.0.0' mule server sarya network devices var open hoto
app.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------------`);
    console.log(`🚀 Server running on Port: ${PORT}`);
    console.log(`🏠 Local Access:   http://localhost:${PORT}`);
    console.log(`📡 Network Access: http://${IP_ADDRESS}:${PORT}`); //
    console.log(`-----------------------------------------------`);
});