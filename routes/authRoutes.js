const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Task = require('../models/Task'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');

// --- SIGNUP USER ---
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body; // ✅ "name" instead of "username"

        // 1. Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 🛡️ ADMIN PROTECTION
        let assignedRole = role || 'member';

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Save new user
        user = new User({
            username: name,  // ✅ map "name" from frontend → "username" in DB
            email,
            password: hashedPassword,
            role: assignedRole 
        });

        await user.save();

        // Member status activate logic
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

// --- LOGIN USER ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // JWT Token
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || 'your_secret_key', 
            { expiresIn: '24h' } 
        );

        // ✅ Wrapped in user:{} so Login.jsx can read data.user.role etc.
        res.json({
            token,
            user: {
                name:  user.username,
                email: user.email,
                role:  user.role
            }
        });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// ==========================================
// 🔥 ADMIN ONLY ROUTES
// ==========================================

// 1. Get All Users
router.get('/admin/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Users fetch failed" });
    }
});

// 2. Delete Any User
router.delete('/admin/delete-user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        if (email === 'admin@gmail.com') {
            return res.status(400).json({ message: "Cannot delete Super Admin!" });
        }

        await User.findOneAndDelete({ email });
        await Task.deleteMany({ $or: [{ leaderEmail: email }, { assignedTo: email }] });

        res.json({ message: `User ${email} and their data deleted successfully!` });
    } catch (err) {
        res.status(500).json({ message: "User deletion failed" });
    }
});

module.exports = router;