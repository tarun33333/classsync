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

        console.log('Cleared existing data...');

        // --- Create Teachers ---
        const teacher1 = await User.create({
            name: 'John Doe',
            email: 'teacher@test.com',
            password: '111',
            role: 'teacher',
            department: 'CS'
        });

        const teacher2 = await User.create({
            name: 'Jane Smith',
            email: 'teacher2@test.com',
            password: '111',
            role: 'teacher',
            department: 'CS'
        });

        console.log('Teachers created: teacher@test.com, teacher2@test.com');

        // --- Create 5 Students ---
        const students = [];
        const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];
        for (let i = 0; i < 5; i++) {
            const student = await User.create({
                name: `${names[i]} Student`,
                email: `student${i + 1}@test.com`,
                password: '111',
                role: 'student',
                rollNumber: `CS10${i + 1}`,
                department: 'CS',
                section: 'A'
            });
            students.push(student);
        }
        console.log('Students created: student1@test.com to student5@test.com');

        // --- Create Routines ---
        // We want to ensure there are classes for "Today" so the user sees them immediately.
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        // Ensure 'today' is in the list, even if it's weekend (just for demo)
        if (!days.includes(today)) days.push(today);

        const subjects = ['Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Computer Networks'];

        const routines = [];

        // 1. Routine for Teacher 1 (John Doe) - Data Structures & Algo
        routines.push({
            teacher: teacher1._id,
            subject: 'Data Structures',
            section: 'A',
            day: today, // Class for TODAY
            startTime: '09:00',
            endTime: '10:00'
        });
        routines.push({
            teacher: teacher1._id,
            subject: 'Algorithms',
            section: 'A',
            day: today, // Another class for TODAY
            startTime: '11:00',
            endTime: '12:00'
        });
        routines.push({
            teacher: teacher1._id,
            subject: 'Data Structures',
            section: 'A',
            day: 'Monday',
            startTime: '10:00',
            endTime: '11:00'
        });

        // 2. Routine for Teacher 2 (Jane Smith) - DB & OS
        routines.push({
            teacher: teacher2._id,
            subject: 'Database Systems',
            section: 'A',
            day: today,
            startTime: '14:00',
            endTime: '15:00'
        });
        routines.push({
            teacher: teacher2._id,
            subject: 'Operating Systems',
            section: 'A',
            day: 'Wednesday',
            startTime: '10:00',
            endTime: '11:00'
        });

        await ClassRoutine.insertMany(routines);
        console.log(`Routines created. Added classes for ${today} so you can test immediately.`);

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();
