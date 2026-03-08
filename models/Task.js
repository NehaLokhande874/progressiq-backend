const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title:       { type: String, required: [true, "Task title is required"], trim: true },
    projectName: { type: String, required: [true, "Project name is required"], trim: true, default: "Internal Project" },
    teamName:    { type: String, trim: true, default: "" },
    assignedTo:  { type: String, required: [true, "Member email is required"], lowercase: true, trim: true },
    leaderEmail: { type: String, required: true, lowercase: true, trim: true },
    mentorName:  { type: String, trim: true, default: "Lead Mentor" },
    deadline:    { type: Date, required: [true, "Deadline date is required"] },
    status: {
        type: String, default: 'Pending',
        enum: ['Pending', 'Active', 'In Progress', 'Submitted', 'Completed', 'Revision', '-']
    },

    // ✅ Weightage (1-10) set by Leader
    weightage: { type: Number, default: 5, min: 1, max: 10 },

    // Submission fields
    submission: {
        fileUrl:     { type: String, trim: true, default: "" },
        memberNote:  { type: String, trim: true, default: "" },
        submittedAt: { type: Date }
    },

    progressNote: { type: String, trim: true, default: "" },
    feedback:     { type: String, trim: true, default: "" },

    // ✅ Numeric feedback score from Mentor (1-10)
    feedbackScore: { type: Number, default: 0, min: 0, max: 10 },

    // ✅ Was task submitted on time?
    onTime: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);