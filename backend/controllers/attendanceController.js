const Attendance = require('../models/Attendance');
const Session = require('../models/Session');

// @desc    Verify WiFi and check eligibility
// @route   POST /api/attendance/verify-wifi
// @access  Student
const verifyWifi = async (req, res) => {
    const { sessionId, bssid } = req.body;

    try {
        const session = await Session.findById(sessionId);
        if (!session || !session.isActive) {
            return res.status(400).json({ message: 'Session is not active' });
        }

        // Check if already marked
        const existing = await Attendance.findOne({ session: sessionId, student: req.user._id });
        if (existing) {
            return res.status(400).json({ message: 'Attendance already marked' });
        }

        // Verify BSSID
        // In production, BSSID matching should be strict. 
        // For testing/simulators, we might relax this or check if BSSID is provided.
        if (session.bssid !== bssid) {
            // Allow a debug bypass if BSSID is "DEBUG_BSSID"
            if (bssid !== 'DEBUG_BSSID') {
                return res.status(400).json({ message: 'WiFi location mismatch. Please connect to the correct classroom WiFi.' });
            }
        }

        res.json({ message: 'WiFi verified', sessionId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit OTP/QR for Attendance
// @route   POST /api/attendance/mark
// @access  Student
const markAttendance = async (req, res) => {
    const { sessionId, code, method } = req.body; // code can be OTP or QR token

    try {
        const session = await Session.findById(sessionId);
        if (!session || !session.isActive) {
            return res.status(400).json({ message: 'Session is not active' });
        }

        // Verify Code
        if (method === 'otp') {
            if (session.otp !== code) {
                return res.status(400).json({ message: 'Invalid OTP' });
            }
        } else if (method === 'qr') {
            if (session.qrCode !== code) {
                return res.status(400).json({ message: 'Invalid QR Code' });
            }
        } else {
            return res.status(400).json({ message: 'Invalid method' });
        }

        // Check duplicate
        const existing = await Attendance.findOne({ session: sessionId, student: req.user._id });
        if (existing) {
            return res.status(400).json({ message: 'Attendance already marked' });
        }

        const attendance = await Attendance.create({
            session: sessionId,
            student: req.user._id,
            status: 'present',
            method,
            deviceMac: req.user.macAddress // Log the MAC used
        });

        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Live Attendance for Session
// @route   GET /api/attendance/session/:sessionId
// @access  Teacher
const getSessionAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({ session: req.params.sessionId })
            .populate('student', 'name rollNumber macAddress');
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Student History
// @route   GET /api/attendance/student
// @access  Student
const getStudentHistory = async (req, res) => {
    try {
        const history = await Attendance.find({ student: req.user._id })
            .populate('session', 'subject startTime endTime')
            .sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Get Student Dashboard (Today's Periods)
// @route   GET /api/attendance/dashboard
// @access  Student
const getStudentDashboard = async (req, res) => {
    try {
        // Mocking today as "Monday" for demo purposes
        const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const routines = await require('../models/ClassRoutine').find({ section: req.user.section, day });

        const dashboard = await Promise.all(routines.map(async (routine) => {
            // Check for active session for this subject/section
            const session = await Session.findOne({
                subject: routine.subject,
                section: routine.section,
                isActive: true
            });

            let status = 'upcoming';
            let sessionId = null;

            if (session) {
                status = 'ongoing';
                sessionId = session._id;

                // Check if already present
                const attendance = await Attendance.findOne({ session: session._id, student: req.user._id });
                if (attendance) {
                    status = 'present';
                }
            }

            return {
                subject: routine.subject,
                startTime: routine.startTime,
                endTime: routine.endTime,
                status,
                sessionId
            };
        }));

        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Student Stats (Percentage per Subject)
// @route   GET /api/attendance/stats
// @access  Student
const getStudentStats = async (req, res) => {
    try {
        const stats = await Attendance.aggregate([
            { $match: { student: req.user._id, status: 'present' } },
            {
                $lookup: {
                    from: 'sessions',
                    localField: 'session',
                    foreignField: '_id',
                    as: 'sessionData'
                }
            },
            { $unwind: '$sessionData' },
            {
                $group: {
                    _id: '$sessionData.subject',
                    presentCount: { $sum: 1 }
                }
            }
        ]);

        // Note: To get accurate percentage, we need total sessions per subject.
        // For now, we return present count.
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Teacher Reports (Past Sessions)
// @route   GET /api/attendance/reports
// @access  Teacher
const getTeacherReports = async (req, res) => {
    try {
        const sessions = await Session.find({ teacher: req.user._id, isActive: false })
            .sort({ createdAt: -1 })
            .limit(10); // Last 10 sessions

        const reports = await Promise.all(sessions.map(async (session) => {
            const presentCount = await Attendance.countDocuments({ session: session._id, status: 'present' });
            const absentCount = await Attendance.countDocuments({ session: session._id, status: 'absent' });

            return {
                sessionId: session._id,
                subject: session.subject,
                section: session.section,
                date: session.createdAt,
                presentCount,
                absentCount
            };
        }));

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { verifyWifi, markAttendance, getSessionAttendance, getStudentHistory, getStudentDashboard, getStudentStats, getTeacherReports };
