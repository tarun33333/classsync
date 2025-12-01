require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const ClassRoutine = require('../models/ClassRoutine');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/classsync')
    .then(() => console.log('MongoDB Connected for Seeding'))
    .catch(err => console.error(err));

const seedData = async () => {
    try {
        await User.deleteMany({});
        await ClassRoutine.deleteMany({});

        // Create Teacher
        const teacher = await User.create({
            name: 'John Doe',
            email: 'teacher@test.com',
            password: 'password123',
            role: 'teacher'
        });

        // Create Student
        const student = await User.create({
            name: 'Alice Smith',
            email: 'student@test.com',
            password: 'password123',
            role: 'student',
            rollNumber: 'CS101',
            department: 'CS',
            section: 'A'
        });

        // Create Routine
        await ClassRoutine.create({
            teacher: teacher._id,
            subject: 'Data Structures',
            section: 'A',
            day: 'Monday',
            startTime: '10:00',
            endTime: '11:00'
        });

        console.log('Data Seeded!');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();
