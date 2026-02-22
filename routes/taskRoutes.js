const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Task = require('../models/Task');

// --- 1. Multer Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- 2. LEADER ROUTES ---

/**
 * SINGLE TASK ASSIGN: 
 * Member Analysis page varun single task assign karnyasaathi
 */
router.post('/assign', async (req, res) => {
    try {
        const { email, title, deadline, leaderEmail } = req.body;
        
        const newTask = new Task({
            title: title,
            assignedTo: email, // Member's Email
            leaderEmail: leaderEmail || "admin@test.com", // Leader's identifier
            deadline: deadline,
            // ✅ BADAL: Default status 'Pending' pahije, mhanje member login karel tevha to Active hoil
            status: 'Pending' 
        });

        await newTask.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: "Failed to assign task" });
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
            // ✅ BADAL: Default status 'Pending'
            status: 'Pending' 
        }));

        await Task.insertMany(formattedTasks);
        res.status(201).json({ message: "Tasks assigned successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// FEEDBACK: Leader ne dila feedback save karnyasaathi
router.put('/add-feedback/:id', async (req, res) => {
    try {
        const { feedback } = req.body;
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id, 
            { feedback: feedback }, 
            { new: true }
        );
        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ error: "Feedback update failed" });
    }
});

// GET ALL: Leader Dashboard cha progress table sathi
router.get('/leader/:leaderEmail', async (req, res) => {
    try {
        const tasks = await Task.find({ leaderEmail: req.params.leaderEmail });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// INVITE LINK: Mobile connectivity sathi
router.post('/invite', async (req, res) => {
    try {
        const { leaderEmail } = req.body;
        // Tip: Localhost vaprat asal tar IP update karat raha jar network badalle tar
        const ipAddress = "10.157.236.1"; 
        const groupLink = `http://${ipAddress}:5173/signup?leader=${leaderEmail}&role=Member`;
        res.json({ link: groupLink });
    } catch (err) {
        res.status(500).json({ error: "Invite failed" });
    }
});

// REMOVE MEMBER: Member ani tyache tasks delete karnyasaathi
router.delete('/remove-member', async (req, res) => {
    try {
        const { memberEmail, leaderEmail } = req.body;
        await Task.deleteMany({ assignedTo: memberEmail, leaderEmail: leaderEmail });
        res.json({ message: "Member removed successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Remove failed" });
    }
});

// --- 3. MEMBER ROUTES ---

// FETCH MY TASKS: Member Dashboard sathi
router.get('/member/:email', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.email });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: "Error fetching tasks" });
    }
});

// SUBMIT WORK: File upload ani status update
router.put('/submit-work/:id', upload.single('workFile'), async (req, res) => {
    try {
        const updateData = {
            status: 'Completed',
            submissionNote: req.body.submissionNote,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
            submittedAt: new Date()
        };
        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: "Submission failed" });
    }
});

module.exports = router;