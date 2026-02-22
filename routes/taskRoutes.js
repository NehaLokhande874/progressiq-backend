const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');

// ✅ 1. Safe Folder Configuration (Fixes EEXIST)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
        console.log("Uploads directory status:", err.code);
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// --- 2. LEADER ROUTES ---

router.get('/leader/:leaderEmail', async (req, res) => {
    try {
        const tasks = await Task.find({ leaderEmail: req.params.leaderEmail }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "Leader tasks fetch failed" });
    }
});

// REMOVE MEMBER FIX (Prevents 404)
router.delete('/remove-member', async (req, res) => {
    try {
        const { memberEmail, leaderEmail } = req.body;
        await Task.deleteMany({ assignedTo: memberEmail, leaderEmail: leaderEmail });
        res.json({ message: "Member and their tasks removed successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Remove failed" });
    }
});

// --- 3. MEMBER ROUTES ---

router.get('/member/:email', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.email });
        // Set tasks to Active when viewed
        await Task.updateMany({ assignedTo: req.params.email, status: 'Pending' }, { $set: { status: 'Active' } });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: "Error fetching member tasks" });
    }
});

// SUBMIT WORK FIX (Prevents 500 Error)
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