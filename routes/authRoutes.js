const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Task = require('../models/Task'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');

// --- SIGNUP USER (Matches Frontend /auth/signup) ---
// ✅ '/register' badlun '/signup' kele aahe
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password, role } = req.body; 

        // 1. User exist aahe ka check kara
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // 2. Password hash kara
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Navin user save kara
        user = new User({
            username,
            email,
            password: hashedPassword,
            role: role || 'Member' 
        });

        await user.save();

        // --- IMPORTANT: MEMBER STATUS UPDATE LOGIC ---
        if (user.role === 'Member') {
            await Task.updateMany(
                { assignedTo: email }, 
                { status: 'Active' }   
            );
            console.log(`✨ Tasks activated for member: ${email}`);
        }
        
        console.log(`✅ User registered: ${email} as ${user.role}`);
        res.status(201).json({ msg: "User registered successfully", role: user.role });

    } catch (err) {
        console.error("❌ Registration Error:", err.message);
        res.status(500).json({ error: "Server Error: " + err.message });
    }
});

// --- LOGIN USER ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. User check kara
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "User does not exist" });
        }

        // 2. Password compare kara
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }

        // 3. JWT Token create kara
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || 'your_secret_key', 
            { expiresIn: '24h' } 
        );

        // 4. Success response
        console.log(`✅ User logged in: ${email} (${user.role})`);
        res.json({
            token,
            username: user.username,
            email: user.email, 
            role: user.role 
        });

    } catch (err) {
        console.error("❌ Login Error:", err.message);
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
});

module.exports = router;