const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');

// ✅ 1. Safe Folder Configuration (Fixes File System Errors)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
        console.log("Uploads directory error:", err.code);
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

// --- 2. LEADER ROUTES ---

// Get all tasks for a leader
router.get('/leader/:leaderEmail', async (req, res) => {
    try {
        const tasks = await Task.find({ leaderEmail: req.params.leaderEmail }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "Leader tasks fetch failed" });
    }
});

// ✅ REMOVE MEMBER (Fixes 404 Error from Screenshot)
router.delete('/remove-member', async (req, res) => {
    try {
        const { memberEmail, leaderEmail } = req.body;
        if (!memberEmail || !leaderEmail) {
            return res.status(400).json({ error: "Emails are required" });
        }
        // Member che sagle tasks delete karto
        await Task.deleteMany({ assignedTo: memberEmail, leaderEmail: leaderEmail });
        res.json({ message: "Member and their tasks removed successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Remove failed", detail: err.message });
    }
});

// Approve Task (Leader Action)
router.put('/add-feedback/:id', async (req, res) => {
    try {
        const { feedback, status } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.id, 
            { feedback, status }, 
            { new: true }
        );
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: "Feedback update failed" });
    }
});

// --- 3. MEMBER ROUTES ---

// Get tasks for specific member
router.get('/member/:email', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.email });
        // Jeva member dashboard baghel, teva Pending tasks Active kara
        await Task.updateMany(
            { assignedTo: req.params.email, status: 'Pending' }, 
            { $set: { status: 'Active' } }
        );
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: "Error fetching member tasks" });
    }
});

// ✅ SUBMIT WORK (Fixes 500 Error from Screenshot)
router.put('/submit-work/:id', upload.single('workFile'), async (req, res) => {
    try {
        const updateData = {
            status: 'Submitted',
            submissionNote: req.body.submissionNote || "Work submitted",
            submittedAt: new Date()
        };
        
        // Jar file upload jhali asel tar URL save kara
        if (req.file) {
            updateData.fileUrl = `/uploads/${req.file.filename}`;
        }

        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
        
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        
        res.json(task);
    } catch (err) {
        console.error("Submission Error:", err);
        res.status(500).json({ message: "Submission failed", error: err.message });
    }
});

module.exports = router;