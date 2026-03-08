const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const Task    = require('../models/Task');
const User    = require('../models/User');

// ── File Upload Setup ──
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + '-' + file.originalname.replace(/\s/g, '_'));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Helper: Recalculate score automatically ──
const recalcScore = async (email, io) => {
    try {
        const tasks = await Task.find({ assignedTo: email });
        const user  = await User.findOne({ email });
        if (!user || !tasks.length) return;

        const total       = tasks.length;
        const completed   = tasks.filter(t => t.status === 'Completed').length;
        const onTime      = tasks.filter(t => t.onTime === true).length;
        const avgWeight   = tasks.reduce((s, t) => s + (t.weightage || 5), 0) / total;
        const fbTasks     = tasks.filter(t => t.feedbackScore > 0);
        const avgFeedback = fbTasks.length
            ? fbTasks.reduce((s, t) => s + t.feedbackScore, 0) / fbTasks.length
            : 5;

        const rawScore = (
            (completed / total)     * 0.40 +
            (onTime / total)        * 0.30 +
            ((avgWeight - 1) / 9)   * 0.20 +
            ((avgFeedback - 1) / 9) * 0.10
        );

        const autoScore = Math.round(rawScore * user.totalMarks * 10) / 10;
        await User.findOneAndUpdate({ email }, { autoScore });
        if (io) io.emit('score-updated', { email, autoScore, totalMarks: user.totalMarks });
    } catch (err) {
        console.error('Score recalc error:', err.message);
    }
};

// ── ADMIN ──
router.get('/all',         async (req, res) => {
    try { res.json(await Task.find().sort({ createdAt: -1 })); }
    catch { res.status(500).json({ error: "Fetch failed" }); }
});
router.get('/admin/tasks', async (req, res) => {
    try { res.json(await Task.find().sort({ createdAt: -1 })); }
    catch { res.status(500).json({ error: "Fetch failed" }); }
});

// ── LEADER ──
router.get('/leader/stats', async (req, res) => {
    try {
        const email = req.query.email || req.headers['x-user-email'];
        const tasks = await Task.find({ leaderEmail: email });
        res.json({
            total:     tasks.length,
            completed: tasks.filter(t => t.status === 'Completed').length,
            pending:   tasks.filter(t => ['Pending','Active'].includes(t.status)).length,
            submitted: tasks.filter(t => t.status === 'Submitted').length,
            revision:  tasks.filter(t => t.status === 'Revision').length,
        });
    } catch { res.status(500).json({ error: "Stats fetch failed" }); }
});

router.get('/leader/team-tasks', async (req, res) => {
    try {
        const email = req.query.email || req.headers['x-user-email'];
        res.json(await Task.find({ leaderEmail: email }).sort({ createdAt: -1 }));
    } catch { res.status(500).json({ error: "Fetch failed" }); }
});

router.get('/leader/my-tasks', async (req, res) => {
    try {
        const email = req.query.email || req.headers['x-user-email'];
        res.json(await Task.find({ leaderEmail: email }).sort({ createdAt: -1 }));
    } catch { res.status(500).json({ error: "Fetch failed" }); }
});

router.get('/leader/members', async (req, res) => {
    try {
        const email   = req.query.email || req.headers['x-user-email'];
        const tasks   = await Task.find({ leaderEmail: email });
        const emails  = [...new Set(tasks.map(t => t.assignedTo))];
        const members = await User.find({ email: { $in: emails } }).select('-password');
        res.json(members);
    } catch { res.status(500).json({ error: "Members fetch failed" }); }
});

router.post('/leader/tasks', async (req, res) => {
    try {
        const { tasks } = req.body;
        if (!tasks || !tasks.length) return res.status(400).json({ message: "No tasks" });

        const savedTasks = await Task.insertMany(tasks);
        const uniqueMembers = [...new Set(tasks.map(t => t.assignedTo))];
        uniqueMembers.forEach(memberEmail => {
            req.io.emit('new-task-assigned', { memberEmail });
        });
        res.status(201).json(savedTasks);
    } catch (err) {
        res.status(500).json({ error: "Failed to save tasks: " + err.message });
    }
});

router.post('/create-multiple', async (req, res) => {
    try {
        const { tasks } = req.body;
        if (!tasks || !tasks.length) return res.status(400).json({ msg: "No tasks" });
        const savedTasks = await Task.insertMany(tasks);
        tasks.forEach(task => req.io.emit("new-task-assigned", { memberEmail: task.assignedTo }));
        res.status(201).json(savedTasks);
    } catch { res.status(500).json({ error: "Failed to save tasks" }); }
});

router.get('/leader/:leaderEmail', async (req, res) => {
    try { res.json(await Task.find({ leaderEmail: req.params.leaderEmail }).sort({ createdAt: -1 })); }
    catch { res.status(500).json({ error: "Fetch failed" }); }
});

router.post('/invite', (req, res) => {
    const { leaderEmail } = req.body;
    res.json({ link: `https://progressiq-frontend.vercel.app/signup?role=Member&leader=${leaderEmail}` });
});

// ── MENTOR ──
router.get('/mentor/tasks', async (req, res) => {
    try {
        const email      = req.query.email || req.headers['x-user-email'];
        const mentorUser = await User.findOne({ email });
        const tasks      = mentorUser?.teamName
            ? await Task.find({ teamName: mentorUser.teamName }).sort({ createdAt: -1 })
            : await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch { res.status(500).json({ error: "Fetch failed" }); }
});

router.post('/mentor/feedback/:taskId', async (req, res) => {
    try {
        const { feedback, feedbackScore } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.taskId,
            { feedback, feedbackScore: feedbackScore || 0, status: 'Completed' },
            { new: true }
        );
        if (!task) return res.status(404).json({ message: "Task not found" });

        await recalcScore(task.assignedTo, req.io);
        req.io.emit('task-update', { memberEmail: task.assignedTo, taskId: task._id });
        res.json({ message: "Feedback submitted!", task });
    } catch (err) {
        res.status(500).json({ error: "Feedback failed: " + err.message });
    }
});

// ── MEMBER ──
router.get('/member/tasks', async (req, res) => {
    try {
        const email = req.query.email || req.headers['x-user-email'];
        const tasks = await Task.find({ assignedTo: email });
        await Task.updateMany({ assignedTo: email, status: 'Pending' }, { $set: { status: 'Active' } });
        res.json(tasks);
    } catch { res.status(500).json({ message: "Error fetching tasks" }); }
});

router.get('/member/:email', async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.params.email });
        await Task.updateMany({ assignedTo: req.params.email, status: 'Pending' }, { $set: { status: 'Active' } });
        res.json(tasks);
    } catch { res.status(500).json({ message: "Error" }); }
});

router.patch('/member/tasks/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (status === 'Submitted' && task.deadline) {
            await Task.findByIdAndUpdate(req.params.id, { onTime: new Date() <= new Date(task.deadline) });
        }

        await recalcScore(task.assignedTo, req.io);
        req.io.emit('work-submitted', { leaderEmail: task.leaderEmail, taskId: task._id, memberEmail: task.assignedTo });
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: "Status update failed: " + err.message });
    }
});

router.patch('/member/tasks/:id/progress', async (req, res) => {
    try {
        const { progressNote, status } = req.body;
        const updateData = { progressNote };
        if (status) updateData.status = status;

        const existing = await Task.findById(req.params.id);
        if (existing?.deadline && status === 'Submitted') {
            updateData.onTime = new Date() <= new Date(existing.deadline);
            updateData['submission.submittedAt'] = new Date();
        }

        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!task) return res.status(404).json({ message: "Task not found" });

        await recalcScore(task.assignedTo, req.io);
        req.io.emit('work-submitted', { leaderEmail: task.leaderEmail, taskId: task._id, memberEmail: task.assignedTo });
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: "Progress update failed: " + err.message });
    }
});

router.put('/submit-work/:id', upload.single('workFile'), async (req, res) => {
    try {
        const updateData = {
            status: 'Submitted',
            progressNote: req.body.submissionNote || "Work submitted",
            'submission.submittedAt': new Date(),
        };
        if (req.file) updateData['submission.fileUrl'] = `/uploads/${req.file.filename}`;

        const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (task) {
            await Task.findByIdAndUpdate(req.params.id, {
                onTime: task.deadline ? new Date() <= new Date(task.deadline) : false
            });
            await recalcScore(task.assignedTo, req.io);
            req.io.emit("work-submitted", { leaderEmail: task.leaderEmail, taskId: task._id, memberEmail: task.assignedTo });
        }
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: "Submission failed: " + err.message });
    }
});

router.put('/update-guidance/:email', async (req, res) => {
    try {
        await Task.updateMany({ assignedTo: req.params.email }, { $set: { mentorGuidance: req.body.mentorGuidance } });
        req.io.emit("new-guidance", { memberEmail: req.params.email });
        res.json({ message: "Guidance updated!" });
    } catch { res.status(500).json({ error: "Update failed" }); }
});

module.exports = router;