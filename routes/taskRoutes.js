const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const Task = require('../models/Task');

// ✅ 1. Multer Configuration (Safe Folder Creation)
const uploadDir = './uploads/'; // Current directory path vapra

// Ha check ekdam solid aahe, error yenar nahi
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log("Uploads folder created successfully");
    } catch (err) {
        console.error("Error creating uploads folder:", err);
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- 2. LEADER ROUTES ---

// SINGLE TASK ASSIGN
router.post('/assign', async (req, res) => {
    try {
        const { email, title, deadline, leaderEmail, description } = req.body;
        const newTask = new Task({
            title,
            description: description || "",
            assignedTo: email,
            leaderEmail: leaderEmail,
            deadline,
            status: 'Pending' 
        });
        await newTask.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: "Failed to assign task" });
    }
});

// GET ALL: Leader Dashboard table sathi
router.get('/leader/:leaderEmail', async (req, res) => {
    try {
        const tasks = await Task.find({ leaderEmail: req.params.leaderEmail }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "Error fetching leader tasks" });
    }
});

// --- 3. MEMBER ROUTES ---

// FETCH MY TASKS: Member Dashboard load hotana
router.get('/member/:email', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.email }).sort({ deadline: 1 });
        // Member ne login kela ki tasks Active kara
        await Task.updateMany(
            { assignedTo: req.params.email, status: 'Pending' },
            { $set: { status: 'Active' } }
        );
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: "Error fetching member tasks" });
    }
});

// SUBMIT WORK: Progress update with file upload
router.put('/submit-work/:id', upload.single('workFile'), async (req, res) => {
    try {
        const { submissionNote } = req.body;
        const updateData = {
            status: 'Submitted', // Leader la 'Submitted' disel
            submissionNote: submissionNote,
            submittedAt: new Date()
        };
        if (req.file) {
            updateData.fileUrl = `/uploads/${req.file.filename}`;
        }
        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: "Submission failed" });
    }
});

module.exports = router;