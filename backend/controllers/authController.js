const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    const { name, email, password, role, rollNumber, department, section } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role,
            rollNumber,
            department,
            section
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    const { email, password, macAddress } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            // MAC Binding Check for Students
            if (user.role === 'student') {
                if (!user.macAddress && macAddress) {
                    // First login, bind MAC
                    user.macAddress = macAddress;
                    await user.save();
                } else if (user.macAddress && macAddress) {
                    // Verify MAC
                    if (user.macAddress !== macAddress) {
                        return res.status(403).json({ message: 'Device not recognized. Please use your registered device.' });
                    }
                }
                // If no macAddress sent, we might skip or warn. For now, assume it's sent.
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                macAddress: user.macAddress,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { register, login };
