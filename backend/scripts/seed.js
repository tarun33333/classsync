require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const ClassRoutine = require('../models/ClassRoutine');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const ClassHistory = require('../models/ClassHistory');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/classsync')
    .then(() => console.log('MongoDB Connected for Seeding'))
    .catch(err => console.error(err));

const seedData = async () => {
    try {
        // Clear all data
        await User.deleteMany({});
        await ClassRoutine.deleteMany({});
        await Session.deleteMany({});
        await Attendance.deleteMany({});
        await ClassHistory.deleteMany({});

        console.log('Cleared existing data...');

        const departments = ['CSE', 'ECE', 'MECH'];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Time slots (6 slots)
        const timeSlots = [
            { start: '09:00', end: '10:00' },
            { start: '10:00', end: '11:00' },
            { start: '11:00', end: '12:00' },
            { start: '13:00', end: '14:00' },
            { start: '14:00', end: '15:00' },
            { start: '15:00', end: '16:00' }
        ];

        // --- Create Users ---
        console.log('Creating Users...');

        const teachersByDept = {};
        const studentsByDept = {};

        for (const dept of departments) {
            teachersByDept[dept] = [];
            studentsByDept[dept] = [];

            // Create 2 Teachers per Dept
            for (let i = 1; i <= 2; i++) {
                const teacher = await User.create({
                    name: `Teacher ${dept} ${i}`,
                    email: `teacher${i}.${dept.toLowerCase()}@test.com`,
                    password: '111',
                    role: 'teacher',
                    department: dept
                });
                teachersByDept[dept].push(teacher);
            }

            // Create 2 Students per Dept
            for (let i = 1; i <= 2; i++) {
                const student = await User.create({
                    name: `Student ${dept} ${i}`,
                    email: `student${i}.${dept.toLowerCase()}@test.com`,
                    password: '111',
                    role: 'student',
                    rollNumber: `${dept}10${i}`,
                    department: dept,
                    section: 'A' // All in Section A for simplicity
                });
                studentsByDept[dept].push(student);
            }
        }

        // --- Create Routines ---
        console.log('Creating Class Routines...');
        const routines = [];

        for (const dept of departments) {
            const deptTeachers = teachersByDept[dept];

            for (const day of days) {
                // Distribute classes among teachers
                // Constraint: Max 3 classes per teacher per day
                // Strategy: We have 6 slots. 
                // Teacher 1 takes slots 0, 2, 4
                // Teacher 2 takes slots 1, 3, 5

                // Teacher 1
                [0, 2, 4].forEach(slotIndex => {
                    routines.push({
                        teacher: deptTeachers[0]._id,
                        subject: `${dept} Core Subject ${slotIndex + 1}`,
                        section: 'A',
                        day: day,
                        startTime: timeSlots[slotIndex].start,
                        endTime: timeSlots[slotIndex].end
                    });
                });

                // Teacher 2
                [1, 3, 5].forEach(slotIndex => {
                    routines.push({
                        teacher: deptTeachers[1]._id,
                        subject: `${dept} Elective Subject ${slotIndex + 1}`,
                        section: 'A',
                        day: day,
                        startTime: timeSlots[slotIndex].start,
                        endTime: timeSlots[slotIndex].end
                    });
                });
            }
        }

        // Ensure "Today" has classes for testing, if not already covered by weekday logic
        // (The logic above covers all days, so today is covered)

        await ClassRoutine.insertMany(routines);


        // --- Create History (Past Sessions & Attendance) ---
        console.log('Generating History...');

        // Let's create history for the last 3 days
        const today = new Date();

        for (let i = 1; i <= 3; i++) {
            const pastDate = new Date(today);
            pastDate.setDate(today.getDate() - i);
            const dayName = pastDate.toLocaleDateString('en-US', { weekday: 'long' });

            // Find routines for this day name
            // We'll mimic that these sessions actually happened

            // Pick just CSE routines for history generation to save time/space
            const relevantRoutines = routines.filter(r => r.day === dayName && teachersByDept['CSE'].some(t => t._id.equals(r.teacher)));

            for (const routine of relevantRoutines) {
                const sessionId = new mongoose.Types.ObjectId();
                const cseStudents = studentsByDept['CSE'];

                // Determine attendance beforehand to set counts
                const attendanceData = [];
                let presentCount = 0;
                let absentCount = 0;

                for (const student of cseStudents) {
                    const isPresent = Math.random() > 0.2; // 80% attendance
                    if (isPresent) {
                        presentCount++;
                        attendanceData.push({
                            session: sessionId,
                            student: student._id,
                            status: 'present',
                            method: isPresent ? 'qr' : 'manual',
                            createdAt: pastDate
                        });
                    } else {
                        absentCount++;
                        attendanceData.push({
                            session: sessionId,
                            student: student._id,
                            status: 'absent',
                            method: 'manual',
                            verified: true,
                            createdAt: pastDate
                        });
                    }
                }

                // Create ClassHistory Record
                await ClassHistory.create({
                    _id: sessionId,
                    teacher: routine.teacher,
                    subject: routine.subject,
                    section: routine.section,
                    bssid: 'HISTORY_BSSID',
                    ssid: 'HISTORY_WIFI',
                    otp: '0000',
                    qrCode: 'history_qr',
                    startTime: pastDate,
                    endTime: pastDate,
                    presentCount,
                    absentCount
                });

                // Create Attendance Records
                if (attendanceData.length > 0) {
                    await Attendance.insertMany(attendanceData);
                }
            }
        }

        console.log('Seeding Complete!');
        console.log('Credentials:');
        console.log('  Teacher (CSE): teacher1.cse@test.com / 111');
        console.log('  Teacher (ECE): teacher1.ece@test.com / 111');
        console.log('  Student (CSE): student1.cse@test.com / 111');

        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();
