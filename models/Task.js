const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, "Task title is required"], // Validation message
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
        default: '-', // Initial dash status
        enum: ['-', 'Active', 'Completed', 'Pending'] // Fakt yach values allow hotil
    }
}, { 
    timestamps: true // He automatic 'createdAt' ani 'updatedAt' fields add karel
});

module.exports = mongoose.model('Task', TaskSchema);