const mongoose = require('mongoose');

const classRoutineSchema = new mongoose.Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    section: { type: String },
    day: { type: String, required: true }, // e.g., "Monday"
    startTime: { type: String, required: true }, // "10:00"
    endTime: { type: String, required: true }, // "11:00"
}, { timestamps: true });

module.exports = mongoose.model('ClassRoutine', classRoutineSchema);
