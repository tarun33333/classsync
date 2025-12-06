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

        // STICT VALIDATION: Check Department and Section
        // Assumes req.user is populated with department and section
        // Depending on your User model, ensure these fields exist.
        // req.user is usually fetched by the 'protect' middleware.
        // We need to fetch the FULL user if protect middleware only has basic info, 
        // but typically protect middleware attaches the full user doc.

        // Let's verify req.user has these fields.
        // If the session has specific department/section, the student MUST match.
        // Note: 'department' on session is usually implied by the routine or teacher, 
        // but Session model schema needs to be checked. 
        // Based on seed.js, Session has subject/section/teacher but NOT explicitly department?
        // Wait, seed.js does NOT add department to Session.
        // It adds 'subject', 'section', 'teacher'.
        // Teacher has 'department'.
        // We can infer Session department from Teacher's department.

        // We need to populate teacher to check department.
        await session.populate('teacher');

        if (req.user.department !== session.teacher.department) {
            return res.status(403).json({ message: `You belong to ${req.user.department}, this class is for ${session.teacher.department}.` });
        }

        if (session.section && req.user.section !== session.section) {
            return res.status(403).json({ message: `You are in Section ${req.user.section}, this class is for Section ${session.section}.` });
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

// @desc    Get Live Attendance for Session (Full Class List)
// @route   GET /api/attendance/session/:sessionId
// @access  Teacher
const getSessionAttendance = async (req, res) => {
    try {
        const ClassHistory = require('../models/ClassHistory'); // Import History model

        // 1. Try finding in Active Sessions
        let session = await Session.findById(req.params.sessionId).populate('teacher');

        // 2. If not active, try ClassHistory (Archived)
        if (!session) {
            session = await ClassHistory.findById(req.params.sessionId).populate('teacher');
        }

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // 1. Fetch all students who SHOULD be in this class
        const User = require('../models/User'); // Import User model inside to ensure availability
        const enrolledStudents = await User.find({
            role: 'student',
            department: session.teacher.department,
            section: session.section
        }).select('name rollNumber');

        // 2. Fetch existing attendance records
        const attendanceRecords = await Attendance.find({ session: session._id });

        // 3. Merge Lists
        const fullReport = enrolledStudents.map(student => {
            const record = attendanceRecords.find(ar => ar.student.toString() === student._id.toString());

            return {
                student: {
                    name: student.name,
                    rollNumber: student.rollNumber,
                    _id: student._id
                },
                status: record ? record.status : 'absent', // Default to absent if no record
                method: record ? record.method : null,
                createdAt: record ? record.createdAt : null
            };
        });

        res.json(fullReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Student History
// @route   GET /api/attendance/student
// @access  Student
// @desc    Get Student History (Active + Archived)
// @route   GET /api/attendance/student
// @access  Student
const getStudentHistory = async (req, res) => {
    try {
        const Session = require('../models/Session');
        const ClassHistory = require('../models/ClassHistory');

        // 1. Fetch Attendance Records (without populate first)
        const attendance = await Attendance.find({ student: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        // 2. Collect Session IDs
        const sessionIds = attendance.map(a => a.session);

        // 3. Fetch from Active Sessions
        const activeSessions = await Session.find({ _id: { $in: sessionIds } }).select('subject startTime endTime');

        // 4. Fetch from Class History
        const archivedSessions = await ClassHistory.find({ _id: { $in: sessionIds } }).select('subject startTime endTime');

        // 5. Create Lookup Map
        const sessionMap = {};
        activeSessions.forEach(s => sessionMap[s._id.toString()] = s);
        archivedSessions.forEach(s => sessionMap[s._id.toString()] = s);

        // 6. Attach Session Data
        const historyWithDetails = attendance.map(record => {
            const sessionData = sessionMap[record.session.toString()];
            return {
                ...record,
                session: sessionData || { subject: 'Unknown Session', startTime: record.createdAt, endTime: record.createdAt }
            };
        });

        res.json(historyWithDetails);
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

        // Fetch all routines for this section & day, populate teacher to check department
        const allRoutines = await require('../models/ClassRoutine')
            .find({ section: req.user.section, day })
            .populate('teacher', 'department')
            .sort({ startTime: 1 });

        // FILTER: Check if Teacher's Dept matches Student's Dept
        const routines = allRoutines.filter(r =>
            r.teacher && r.teacher.department === req.user.department
        );

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
                day: routine.day, // Add this for filtering
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
// @desc    Get Teacher Reports (Past Sessions from History)
// @route   GET /api/attendance/reports
// @access  Teacher
const getTeacherReports = async (req, res) => {
    try {
        const ClassHistory = require('../models/ClassHistory');
        const history = await ClassHistory.find({ teacher: req.user._id })
            .sort({ endTime: -1 })
            .limit(10);

        const reports = history.map(h => ({
            sessionId: h._id,
            subject: h.subject,
            section: h.section,
            date: h.startTime,
            presentCount: h.presentCount,
            absentCount: h.absentCount
        }));

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Reports filtered by Date (from History)
// @route   GET /api/attendance/reports/filter
// @access  Teacher
const getFilteredReports = async (req, res) => {
    const { date } = req.query;
    try {
        const ClassHistory = require('../models/ClassHistory');

        // Create date range for the selected day
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        // Find HISTORY for this teacher on this day
        // Note: We use startTime to filter, as that's when class happened.
        const history = await ClassHistory.find({
            teacher: req.user._id,
            startTime: { $gte: start, $lte: end }
        }).sort({ startTime: 1 });

        const reports = history.map(h => ({
            sessionId: h._id,
            subject: h.subject,
            section: h.section,
            date: h.startTime, // Use startTime as the date
            isActive: false, // History is always inactive
            presentCount: h.presentCount,
            absentCount: h.absentCount
        }));

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { verifyWifi, markAttendance, getSessionAttendance, getStudentHistory, getStudentDashboard, getStudentStats, getTeacherReports, getFilteredReports };
