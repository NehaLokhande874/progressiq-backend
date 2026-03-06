const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');

// ✅ 1. UPLOADS DIRECTORY
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s/g, '_'));
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// --- 2. ADMIN & MENTOR ROUTES ---
router.get('/all', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

// --- 3. LEADER ROUTES (With Real-Time Socket Support) ---

router.post('/create-multiple', async (req, res) => {
    try {
        const { tasks } = req.body;
        if (!tasks || tasks.length === 0) return res.status(400).json({ msg: "No tasks" });
        
        const savedTasks = await Task.insertMany(tasks);
        
        // 🚀 REAL-TIME UPDATE: Member la notify karr
        tasks.forEach(task => {
            req.io.emit("new-task-assigned", { memberEmail: task.assignedTo });
        });
        
        res.status(201).json(savedTasks);
    } catch (err) { res.status(500).json({ error: "Failed to save tasks" }); }
});

router.post('/invite', (req, res) => {
    const { leaderEmail } = req.body;
    res.json({ link: `https://progressiq-frontend.vercel.app/signup?role=Member&leader=${leaderEmail}` });
});

router.get('/leader/:leaderEmail', async (req, res) => {
    try {
        const tasks = await Task.find({ leaderEmail: req.params.leaderEmail }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

// --- 4. MEMBER ROUTES ---

router.get('/member/:email', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.email });
        await Task.updateMany({ assignedTo: req.params.email, status: 'Pending' }, { $set: { status: 'Active' } });
        res.json(tasks);
    } catch (err) { res.status(500).json({ message: "Error" }); }
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
        
        // 🚀 REAL-TIME UPDATE: Leader la notify karr
        if (task) {
            req.io.emit("work-submitted", { leaderEmail: task.leaderEmail, taskId: task._id });
        }
        
        res.json(task);
    } catch (err) { res.status(500).json({ message: "Submission failed" }); }
});

// ✅ 5. NEW: Mentor Guidance Route
router.put('/update-guidance/:email', async (req, res) => {
    try {
        await Task.updateMany({ assignedTo: req.params.email }, { $set: { mentorGuidance: req.body.mentorGuidance } });
        req.io.emit("new-guidance", { memberEmail: req.params.email });
        res.json({ message: "Guidance updated!" });
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

module.exports = router;