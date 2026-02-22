const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, "Task title is required"], 
        trim: true 
    },
    // ✅ NEW: Project Name field - Member Dashboard var dakhvnyasathi
    projectName: {
        type: String,
        required: [true, "Project name is required"],
        trim: true,
        default: "Internal Project"
    },
    assignedTo: { 
        type: String, 
        required: [true, "Member email is required"], 
        lowercase: true, 
        trim: true 
    }, 
    leaderEmail: { 
        type: String, 
        required: true, 
        lowercase: true, 
        trim: true 
    },
    // ✅ NEW: Mentor Name field - Dashboard var "Mentor" mhanun dakhvnyasathi
    mentorName: {
        type: String,
        trim: true,
        default: "Lead Mentor"
    },
    deadline: { 
        type: Date, 
        required: [true, "Deadline date is required"] 
    },
    status: { 
        type: String, 
        default: 'Pending', 
        enum: ['Pending', 'Active', 'Completed', 'Submitted', '-'] 
    },
    // 🚀 MEMBER SUBMISSION FIELDS
    submission: {
        fileUrl: { 
            type: String, 
            trim: true,
            default: "" 
        },
        memberNote: { 
            type: String, 
            trim: true,
            default: "" 
        },
        submittedAt: { 
            type: Date 
        }
    },
    // Leader feedback field (jar tula leader dashboard madhun feedback dyaycha asel)
    feedback: {
        type: String,
        trim: true,
        default: ""
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Task', TaskSchema);