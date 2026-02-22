const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');

// ✅ 1. UPLOADS DIRECTORY CONFIGURATION (Tujha adhi cha working code)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
        console.error("❌ Uploads directory creation failed:", err.code);
    }
}

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

// --- 2. ADMIN & MENTOR ROUTES (Global Monitoring) ---

router.get('/all', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "All tasks fetch failed", details: err.message });
    }
});

router.delete('/admin/clear-all-tasks', async (req, res) => {
    try {
        await Task.deleteMany({});
        res.json({ message: "System-wide tasks cleared successfully!" });
    } catch (err) {
        res.status(500).json({ error: "DB Reset failed" });
    }
});

// --- 3. LEADER ROUTES (Including Fixes for 404) ---

// ✅ FIX 1: Bulk Task Creation (Working)
router.post('/create-multiple', async (req, res) => {
    try {
        const { tasks } = req.body;
        if (!tasks || tasks.length === 0) return res.status(400).json({ msg: "No tasks to save" });
        const savedTasks = await Task.insertMany(tasks);
        res.status(201).json(savedTasks);
    } catch (err) {
        res.status(500).json({ error: "Failed to save tasks" });
    }
});

// ✅ FIX 2: Invite Link Generation (Working)
router.post('/invite', async (req, res) => {
    try {
        const { leaderEmail } = req.body;
        const inviteLink = `https://progressiq-frontend.vercel.app/signup?role=Member&leader=${leaderEmail}`;
        res.json({ link: inviteLink });
    } catch (err) {
        res.status(500).json({ error: "Link generation failed" });
    }
});

router.get('/leader/:leaderEmail', async (req, res) => {
    try {
        const tasks = await Task.find({ leaderEmail: req.params.leaderEmail }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "Leader tasks fetch failed" });
    }
});

router.delete('/remove-member', async (req, res) => {
    try {
        const { memberEmail, leaderEmail } = req.body;
        await Task.deleteMany({ assignedTo: memberEmail, leaderEmail: leaderEmail });
        res.json({ message: "Member removed successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Remove operation failed" });
    }
});

// --- 4. MEMBER ROUTES (Tujha Working Code Perat Add Kela) ---

router.get('/member/:email', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.email });
        await Task.updateMany(
            { assignedTo: req.params.email, status: 'Pending' }, 
            { $set: { status: 'Active' } }
        );
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: "Error fetching tasks" });
    }
});

router.put('/submit-work/:id', upload.single('workFile'), async (req, res) => {
    try {
        const updateData = {
            status: 'Submitted',
            submissionNote: req.body.submissionNote || "Work submitted",
            submittedAt: new Date()
        };
        if (req.file) updateData.fileUrl = `/uploads/${req.file.filename}`;
        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: "Submission failed", error: err.message });
    }
});

module.exports = router;