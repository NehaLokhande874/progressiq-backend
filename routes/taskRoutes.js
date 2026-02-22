const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');

// ✅ Multer Configuration
const uploadDir = path.join(__dirname, '../uploads'); 
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_')); }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// --- LEADER ROUTES ---

// Get leader tasks
router.get('/leader/:leaderEmail', async (req, res) => {
    try {
        const tasks = await Task.find({ leaderEmail: req.params.leaderEmail }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "Leader tasks fetch failed" });
    }
});

// Assign single task
router.post('/assign', async (req, res) => {
    try {
        const { email, title, deadline, leaderEmail, description } = req.body;
        const newTask = new Task({ title, description, assignedTo: email, leaderEmail, deadline, status: 'Pending' });
        await newTask.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: "Task assignment failed" });
    }
});

// ✅ Create multiple tasks at once
router.post('/create-multiple', async (req, res) => {
    try {
        const { tasks, leaderEmail } = req.body;
        if (!tasks || tasks.length === 0) {
            return res.status(400).json({ error: "No tasks provided" });
        }
        const tasksToInsert = tasks.map(task => ({
            title: task.title,
            description: task.description || '',
            assignedTo: task.assignedTo,
            leaderEmail: leaderEmail,
            deadline: task.deadline,
            status: 'Pending'
        }));
        await Task.insertMany(tasksToInsert);
        res.status(201).json({ msg: "✅ Tasks saved successfully!" });
    } catch (err) {
        console.error("Create multiple error:", err);
        res.status(500).json({ error: "Failed to save tasks: " + err.message });
    }
});

// ✅ Generate Invite Link
router.post('/invite', async (req, res) => {
    try {
        const { leaderEmail } = req.body;
        if (!leaderEmail) return res.status(400).json({ error: "Leader email required" });
        const encodedEmail = encodeURIComponent(leaderEmail);
        const link = `https://progressiq-frontend.vercel.app/signup?leader=${encodedEmail}&role=Member`;
        res.status(200).json({ link });
    } catch (err) {
        res.status(500).json({ error: "Link generation failed" });
    }
});

// ✅ Remove member and all their tasks
router.delete('/remove-member/:email', async (req, res) => {
    try {
        const { email } = req.params;
        await Task.deleteMany({ assignedTo: email });
        res.status(200).json({ msg: `✅ ${email} removed successfully.` });
    } catch (err) {
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// --- MEMBER ROUTES ---

// Get member tasks
router.get('/member/:email', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.email }).sort({ deadline: 1 });
        await Task.updateMany(
            { assignedTo: req.params.email, status: 'Pending' },
            { $set: { status: 'Active' } }
        );
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: "Error fetching member tasks" });
    }
});

// ✅ Submit work with file
router.put('/submit-work/:id', upload.single('workFile'), async (req, res) => {
    try {
        const { submissionNote } = req.body;
        const updateData = {
            status: 'Submitted',
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