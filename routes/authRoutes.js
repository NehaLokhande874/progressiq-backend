const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Task    = require('../models/Task');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// ── SIGNUP ──
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        const assignedRole   = (role || 'member').toLowerCase();
        const hashedPassword = await bcrypt.hash(password, 10);

        user = new User({ username: name, email, password: hashedPassword, role: assignedRole });
        await user.save();

        if (user.role === 'member') {
            await Task.updateMany(
                { assignedTo: email, status: 'Pending' },
                { $set: { status: 'Active' } }
            );
        }

        res.status(201).json({ message: "User registered successfully", role: user.role });
    } catch (err) {
        console.error('Signup error:', err.message);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// ── LOGIN ──
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User does not exist" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'your_secret_key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                name:        user.username,
                email:       user.email,
                role:        user.role,
                teamName:    user.teamName,
                projectName: user.projectName,
                autoScore:   user.autoScore,
                totalMarks:  user.totalMarks,
            }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// ── ADMIN: Get all users ──
router.get('/admin/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch { res.status(500).json({ message: "Users fetch failed" }); }
});

// ── ADMIN: Delete user ──
router.delete('/admin/delete-user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        if (email === 'admin@gmail.com')
            return res.status(400).json({ message: "Cannot delete Super Admin!" });

        await User.findOneAndDelete({ email });
        await Task.deleteMany({ $or: [{ leaderEmail: email }, { assignedTo: email }] });
        res.json({ message: `User ${email} deleted successfully!` });
    } catch { res.status(500).json({ message: "User deletion failed" }); }
});

// ── ADMIN: Assign team & project ──
router.put('/admin/assign-team', async (req, res) => {
    try {
        const { email, teamName, projectName, totalMarks } = req.body;
        const update = {};
        if (teamName)    update.teamName    = teamName;
        if (projectName) update.projectName = projectName;
        if (totalMarks)  update.totalMarks  = totalMarks;

        await User.findOneAndUpdate({ email }, update);
        await Task.updateMany(
            { $or: [{ leaderEmail: email }, { assignedTo: email }] },
            { $set: { teamName, projectName } }
        );

        req.io.emit('team-updated', { email, teamName, projectName });
        res.json({ message: "Team assigned successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Team assignment failed: " + err.message });
    }
});

// ── ADMIN: Set total marks for project ──
router.put('/admin/set-marks', async (req, res) => {
    try {
        const { projectName, totalMarks } = req.body;
        await User.updateMany({ projectName }, { $set: { totalMarks } });
        res.json({ message: `Total marks set to ${totalMarks} for project ${projectName}` });
    } catch (err) {
        res.status(500).json({ message: "Failed to set marks: " + err.message });
    }
});

// ── AUTO-SCORE: Calculate & save score ──
router.post('/score/calculate/:email', async (req, res) => {
    try {
        const email = req.params.email.toLowerCase();
        const user  = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const tasks = await Task.find({ assignedTo: email });
        if (!tasks.length) return res.json({ autoScore: 0 });

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
        req.io.emit('score-updated', { email, autoScore, totalMarks: user.totalMarks });

        res.json({ autoScore, totalMarks: user.totalMarks });
    } catch (err) {
        res.status(500).json({ message: "Score calculation failed: " + err.message });
    }
});

// ── Member details ──
router.get('/users/member-details/:email', async (req, res) => {
    try {
        const email  = decodeURIComponent(req.params.email);
        const member = await User.findOne({ email }).select('-password');
        const tasks  = await Task.find({ assignedTo: email });
        res.json({ member, tasks });
    } catch { res.status(500).json({ message: "Failed to fetch member details" }); }
});

module.exports = router;