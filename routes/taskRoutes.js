const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');

// ✅ 1. UPLOADS DIRECTORY CONFIGURATION
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
        console.error("❌ Uploads directory creation failed:", err.code);
    }
}

// Multer Storage Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s/g, '_'));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- 2. ADMIN & GLOBAL ROUTES ---

// ✅ GET ALL TASKS (Admin ani Mentor sathi sarv data)
router.get('/all', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "All tasks fetch failed", details: err.message });
    }
});

// ✅ ADMIN: CLEAR ALL TASKS (Database saaf karnyathi)
router.delete('/admin/clear-all-tasks', async (req, res) => {
    try {
        await Task.deleteMany({});
        res.json({ message: "System-wide tasks cleared successfully!" });
    } catch (err) {
        res.status(500).json({ error: "DB Reset failed" });
    }
});

// --- 3. LEADER ROUTES ---

// ✅ CREATE MULTIPLE TASKS (Fixes 404 Error in Leader Panel)
router.post('/create-multiple', async (req, res) => {
    try {
        const { tasks, leaderEmail } = req.body;
        if (!tasks || tasks.length === 0) {
            return res.status(400).json({ msg: "No tasks to save" });
        }
        
        // Database madhe bulk insert karne
        const savedTasks = await Task.insertMany(tasks);
        res.status(201).json(savedTasks);
    } catch (err) {
        console.error("❌ Bulk Task Save Error:", err);
        res.status(500).json({ error: "Failed to save tasks", detail: err.message });
    }
});

// Specific leader che tasks milvne
router.get('/leader/:leaderEmail', async (req, res) => {
    try {
        const tasks = await Task.find({ leaderEmail: req.params.leaderEmail }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "Leader tasks fetch failed" });
    }
});

// ✅ REMOVE MEMBER (Cascade Delete)
router.delete('/remove-member', async (req, res) => {
    try {
        const { memberEmail, leaderEmail } = req.body;
        if (!memberEmail || !leaderEmail) {
            return res.status(400).json({ error: "Emails are required" });
        }
        await Task.deleteMany({ assignedTo: memberEmail, leaderEmail: leaderEmail });
        res.json({ message: "Member and their tasks removed successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Remove operation failed" });
    }
});

// Feedback ani Status update
router.put('/add-feedback/:id', async (req, res) => {
    try {
        const { feedback, status } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.id, 
            { feedback, status }, 
            { new: true }
        );
        if (!task) return res.status(404).json({ error: "Task not found" });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: "Feedback update failed" });
    }
});

// --- 4. MEMBER ROUTES ---

// Member sathi tasks fetch karne
router.get('/member/:email', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.email });
        // Pending tasks 'Active' karne
        await Task.updateMany(
            { assignedTo: req.params.email, status: 'Pending' }, 
            { $set: { status: 'Active' } }
        );
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: "Error fetching member tasks" });
    }
});

// ✅ SUBMIT WORK
router.put('/submit-work/:id', upload.single('workFile'), async (req, res) => {
    try {
        const updateData = {
            status: 'Submitted',
            submissionNote: req.body.submissionNote || "Work submitted",
            submittedAt: new Date()
        };
        
        if (req.file) {
            updateData.fileUrl = `/uploads/${req.file.filename}`;
        }

        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!task) return res.status(404).json({ message: "Task not found" });
        
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: "Submission failed", error: err.message });
    }
});

module.exports = router;