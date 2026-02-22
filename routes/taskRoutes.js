const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');

// ✅ 1. Multer Configuration (Render-Safe Logic)
// Absolute path vaparlyamule Render chya server var folder cha location chuknar nahi
const uploadDir = path.join(__dirname, '../uploads'); 

// Folder check logic - Error prevent karnyasaathi
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        // Space kadhun underscore lavla mhanje URL madhe problem yenar nahi
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- 2. LEADER ROUTES ---

// Dashboard sathi tasks aanne
router.get('/leader/:leaderEmail', async (req, res) => {
    try {
        const tasks = await Task.find({ leaderEmail: req.params.leaderEmail }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "Leader tasks fetch failed" });
    }
});

// Task assign karne
router.post('/assign', async (req, res) => {
    try {
        const { email, title, deadline, leaderEmail, description } = req.body;
        const newTask = new Task({
            title,
            description,
            assignedTo: email,
            leaderEmail,
            deadline,
            status: 'Pending'
        });
        await newTask.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: "Task assignment failed" });
    }
});

// --- 3. MEMBER ROUTES ---

// Member Dashboard load hotana
router.get('/member/:email', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.email }).sort({ deadline: 1 });
        
        // Dashboard ughadla ki tasks Active kara
        await Task.updateMany(
            { assignedTo: req.params.email, status: 'Pending' },
            { $set: { status: 'Active' } }
        );
        
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: "Error fetching member tasks" });
    }
});

// ✅ SUBMIT WORK (Fixing the 500 Error)
router.put('/submit-work/:id', upload.single('workFile'), async (req, res) => {
    try {
        const { submissionNote } = req.body;
        
        const updateData = {
            status: 'Submitted', // Member ne progress pathvli
            submissionNote: submissionNote || "No notes provided",
            submittedAt: new Date()
        };

        if (req.file) {
            updateData.fileUrl = `/uploads/${req.file.filename}`;
        }

        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
        
        if (!task) return res.status(404).json({ message: "Task not found" });
        
        res.json(task);
    } catch (err) {
        console.error("Submission Crash:", err);
        res.status(500).json({ message: "Submission failed", error: err.message });
    }
});

module.exports = router;