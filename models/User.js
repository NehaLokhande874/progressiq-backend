const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, default: 'member' },

    // ✅ NEW: Team & Project Info
    teamName:    { type: String, default: '' },
    projectName: { type: String, default: '' },

    // ✅ NEW: Auto-Evaluation (read-only, set by system)
    autoScore:   { type: Number, default: 0 },   // calculated score out of totalMarks
    totalMarks:  { type: Number, default: 100 },  // set by Admin per project

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);