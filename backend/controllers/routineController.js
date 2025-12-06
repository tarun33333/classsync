const ClassRoutine = require('../models/ClassRoutine');

// @desc    Get Teacher's Routines
// @route   GET /api/routines/teacher
// @access  Teacher
const getTeacherRoutines = async (req, res) => {
    try {
        const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const routines = await ClassRoutine.find({ teacher: req.user._id, day });
        res.json(routines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getTeacherRoutines };
