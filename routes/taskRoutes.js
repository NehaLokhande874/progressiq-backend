const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');

// ✅ 1. UPLOADS DIRECTORY CONFIGURATION
// Project chya root madhe 'uploads' folder check ani create karne
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
        // File name unique thevnyasathi timestamp vaprat aahe
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s/g, '_'));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- 2. MENTOR ROUTES ---

// ✅ GET ALL TASKS (Mentor sathi sarv teams cha data)
router.get('/all', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "All tasks fetch failed", details: err.message });
    }
});

// --- 3. LEADER ROUTES ---

// Specific leader che tasks milvne
router.get('/leader/:leaderEmail', async (req, res) => {
    try {
        const tasks = await Task.find({ leaderEmail: req.params.leaderEmail }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "Leader tasks fetch failed" });
    }
});

// ✅ REMOVE MEMBER (Fixes 404 Error)
router.delete('/remove-member', async (req, res) => {
    try {
        const { memberEmail, leaderEmail } = req.body;
        if (!memberEmail || !leaderEmail) {
            return res.status(400).json({ error: "Emails are required to remove member" });
        }
        // Member che sagle tasks delete kelyavar to team madhun automatic baher jato
        await Task.deleteMany({ assignedTo: memberEmail, leaderEmail: leaderEmail });
        res.json({ message: "Member removed and their tasks deleted successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Remove operation failed", detail: err.message });
    }
});

// Feedback ani Status update (Leader kiwa Mentor sathi)
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
        
        // Logical Update: Pending tasks 'Active' karne (jevha member login karel)
        await Task.updateMany(
            { assignedTo: req.params.email, status: 'Pending' }, 
            { $set: { status: 'Active' } }
        );
        
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: "Error fetching member tasks" });
    }
});

// ✅ SUBMIT WORK (Fixes 500 Error)
router.put('/submit-work/:id', upload.single('workFile'), async (req, res) => {
    try {
        const updateData = {
            status: 'Submitted',
            submissionNote: req.body.submissionNote || "Work submitted",
            submittedAt: new Date()
        };
        
        // Jar file upload jhali asel tar URL save karne
        if (req.file) {
            updateData.fileUrl = `/uploads/${req.file.filename}`;
        }

        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
        
        if (!task) {
            return res.status(404).json({ message: "Task not found to submit work" });
        }
        
        res.json(task);
    } catch (err) {
        console.error("Submission Error Details:", err);
        res.status(500).json({ message: "File submission failed on server", error: err.message });
    }
});

module.exports = router;