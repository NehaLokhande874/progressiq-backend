const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, "Task title is required"], 
        trim: true 
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
    deadline: { 
        type: Date, 
        required: [true, "Deadline date is required"] 
    },
    status: { 
        type: String, 
        default: '-', 
        // ✅ Updated enum to include 'Submitted'
        enum: ['-', 'Active', 'Completed', 'Pending', 'Submitted'] 
    },
    // 🚀 NEW: Fields for Member Submission
    submission: {
        fileUrl: { 
            type: String, 
            trim: true,
            default: "" // Link to GitHub, Drive, or Cloudinary
        },
        memberNote: { 
            type: String, 
            trim: true,
            default: "" // Any message from the member
        },
        submittedAt: { 
            type: Date 
        }
    },
    // 🚀 NEW: Optional field to store Leader's name for easier display
    leaderName: {
        type: String,
        trim: true
    }
}, { 
    timestamps: true // Adds 'createdAt' and 'updatedAt' automatically
});

module.exports = mongoose.model('Task', TaskSchema);