const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Task = require('../models/Task'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');

// --- SIGNUP USER ---
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password, role, adminSecretKey } = req.body; 

        // 1. User exist aahe ka check kara
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // 🛡️ ADMIN PROTECTION: Fakt secret key asel tarach Admin role milel
        let assignedRole = role || 'Member';
        if (assignedRole === 'Admin') {
            if (adminSecretKey !== 'PROGRESS_IQ_SUPER_SECRET_99') { // He key tumhi badlu shakta
                return res.status(403).json({ msg: "Unauthorized: Invalid Admin Key!" });
            }
        }

        // 2. Password hash kara
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Navin user save kara
        user = new User({
            username,
            email,
            password: hashedPassword,
            role: assignedRole 
        });

        await user.save();

        // Member status activate logic
        if (user.role === 'Member') {
            await Task.updateMany(
                { assignedTo: email, status: 'Pending' }, 
                { $set: { status: 'Active' } }   
            );
        }
        
        res.status(201).json({ msg: "User registered successfully", role: user.role });

    } catch (err) {
        res.status(500).json({ error: "Server Error: " + err.message });
    }
});

// --- LOGIN USER ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "User does not exist" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }

        // JWT Token
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || 'your_secret_key', 
            { expiresIn: '24h' } 
        );

        res.json({
            token,
            username: user.username,
            email: user.email, 
            role: user.role 
        });

    } catch (err) {
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
});

// ==========================================
// 🔥 ADMIN ONLY ROUTES (SUPER POWERS) 🔥
// ==========================================

// 1. Get All Users (Admin Panel Table sathi)
router.get('/admin/users', async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Password kadhun sagle users dakhva
        res.json(users);
    } catch (err) {
        res.status(500).json({ msg: "Users fetch failed" });
    }
});

// 2. Delete Any User (Admin power to remove anyone)
router.delete('/admin/delete-user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        if(email === 'admin@gmail.com') return res.status(400).json({msg: "Cannot delete Super Admin!"});

        await User.findOneAndDelete({ email });
        // Tyache tasks pan delete kara mhanje DB clean rahil
        await Task.deleteMany({ $or: [{ leaderEmail: email }, { assignedTo: email }] });

        res.json({ msg: `User ${email} and their data deleted successfully!` });
    } catch (err) {
        res.status(500).json({ msg: "User deletion failed" });
    }
});

module.exports = router;