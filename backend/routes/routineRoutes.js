const express = require('express');
const router = express.Router();
const { getTeacherRoutines } = require('../controllers/routineController');
const { protect, teacherOnly } = require('../middlewares/authMiddleware');

router.get('/teacher', protect, teacherOnly, getTeacherRoutines);

module.exports = router;
