const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const Task = require('../models/Task');

// ✅ 1. Multer Configuration (Fixing Deployment Crash)
const uploadDir = 'uploads/';
// Error fix: recursive true kelya muly folder asel tar crash honar nahi
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
        res.status(500).json({ error: "Failed to assign task: " + err.message });
    }
});

// BULK SAVE: Multiple tasks assign karnyasaathi
router.post('/create-multiple', async (req, res) => {
    try {
        const { tasks, leaderEmail } = req.body;
        if (!tasks || tasks.length === 0) return res.status(400).json({ error: "No tasks provided" });
        
        const formattedTasks = tasks.map(t => ({
            title: t.title,
            assignedTo: t.assignedTo,
            leaderEmail: leaderEmail,
            deadline: t.deadline,
            status: 'Pending' 
        }));

        const result = await Task.insertMany(formattedTasks);
        res.status(201).json({ message: "Tasks assigned successfully!", count: result.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// ADD FEEDBACK: Leader ne kaam check karun feedback dene
router.put('/add-feedback/:id', async (req, res) => {
    try {
        const { feedback, status } = req.body;
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id, 
            { feedback: feedback, status: status || 'Completed' }, 
            { new: true }
        );
        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ error: "Feedback update failed" });
    }
});

// --- 3. MEMBER ROUTES ---

// FETCH MY TASKS: Member Dashboard load hotana
router.get('/member/:email', async (req, res) => {
    try {
        // Dashboard ughadla ki tasks fetch kara
        const tasks = await Task.find({ assignedTo: req.params.email }).sort({ deadline: 1 });
        
        // Logical Fix: Member ne dashboard ughadla ki Pending tasks automatic Active kara
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
            status: 'Submitted', // Leader la status 'Submitted' disel
            submissionNote: submissionNote,
            submittedAt: new Date()
        };

        if (req.file) {
            updateData.fileUrl = `/uploads/${req.file.filename}`;
        }

        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
        
        if (!task) return res.status(404).json({ message: "Task not found" });
        
        res.json(task);
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ message: "Submission failed", error: err.message });
    }
});

module.exports = router;