const Session = require('../models/Session');
const crypto = require('crypto');

// @desc    Start a new session
// @route   POST /api/sessions/start
// @access  Teacher
const startSession = async (req, res) => {
    const { subject, section, bssid, ssid } = req.body;

    try {
        // Strict Schedule Validation
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });

        // Format current time to HH:MM for comparison
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        const ClassRoutine = require('../models/ClassRoutine');

        // Find if there is a routine for this teacher, subject, section, day
        // And current time is within startTime and endTime
        const routine = await ClassRoutine.findOne({
            teacher: req.user._id,
            subject,
            section,
            day: currentDay
        });

        if (!routine) {
            return res.status(400).json({ message: `No class schedule found for ${subject} on ${currentDay}` });
        }

        // Check time bounds
        // Simple string comparison works for 24h format "09:00" < "09:30"
        if (currentTime < routine.startTime || currentTime > routine.endTime) {
            return res.status(400).json({
                message: `Class can only be started between ${routine.startTime} and ${routine.endTime}. Current time: ${currentTime}`
            });
        }

        // End any active sessions for this teacher
        await Session.updateMany(
            { teacher: req.user._id, isActive: true },
            { isActive: false, endTime: Date.now() }
        );

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const qrCode = crypto.randomBytes(16).toString('hex');

        const session = await Session.create({
            teacher: req.user._id,
            subject,
            section,
            bssid,
            ssid,
            otp,
            qrCode,
            isActive: true,
            routineId: routine._id // Link to routine
        });

        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    End current session
// @route   POST /api/sessions/end
// @access  Teacher
// @desc    End current session
// @route   POST /api/sessions/end
// @access  Teacher
const endSession = async (req, res) => {
    const { sessionId } = req.body;

    try {
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        if (session.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        session.isActive = false;
        session.endTime = Date.now();
        await session.save();

        // Auto-mark absent students
        const User = require('../models/User');
        const Attendance = require('../models/Attendance');

        // 1. Get all students in this section
        const allStudents = await User.find({
            role: 'student',
            section: session.section
        }).select('_id');

        // 2. Get all present students for this session
        const presentAttendance = await Attendance.find({
            session: sessionId
        }).select('student');

        const presentStudentIds = presentAttendance.map(a => a.student.toString());

        // 3. Filter out students who are NOT present
        const absentStudents = allStudents.filter(s => !presentStudentIds.includes(s._id.toString()));

        // 4. Bulk insert absent records
        if (absentStudents.length > 0) {
            const absentRecords = absentStudents.map(s => ({
                session: sessionId,
                student: s._id,
                status: 'absent',
                method: 'manual', // System marked
                verified: true
            }));
            await Attendance.insertMany(absentRecords);
        }

        res.json({
            message: 'Session ended',
            session,
            markedAbsent: absentStudents.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get active session for teacher
// @route   GET /api/sessions/active
// @access  Teacher
const getActiveSession = async (req, res) => {
    try {
        const session = await Session.findOne({ teacher: req.user._id, isActive: true });
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { startSession, endSession, getActiveSession };
