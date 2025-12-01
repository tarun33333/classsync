const express = require('express');
const router = express.Router();
const { verifyWifi, markAttendance, getSessionAttendance, getStudentHistory, getStudentDashboard, getStudentStats, getTeacherReports } = require('../controllers/attendanceController');
const { protect, teacherOnly } = require('../middlewares/authMiddleware');

router.post('/verify-wifi', protect, verifyWifi);
router.post('/mark', protect, markAttendance);
router.get('/dashboard', protect, getStudentDashboard);
router.get('/student', protect, getStudentHistory);
router.get('/stats', protect, getStudentStats);
router.get('/reports', protect, teacherOnly, getTeacherReports);
router.get('/session/:sessionId', protect, teacherOnly, getSessionAttendance);

module.exports = router;
