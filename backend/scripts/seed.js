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
                    section: 'A', // All in Section A for simplicity
                    currentSemester: 3
                });
                studentsByDept[dept].push(student);
            }
        }

        // --- Create Routines ---
        console.log('Creating Class Routines...');
        const routines = [];

        const deptSubjects = {
            'CSE': ['Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Computer Networks', 'Software Engineering'],
            'ECE': ['Circuit Theory', 'Digital Logic', 'Signals & Systems', 'Microprocessors', 'Analog Electronics', 'Control Systems'],
            'MECH': ['Thermodynamics', 'Fluid Mechanics', 'Strength of Materials', 'Machine Design', 'Manufacturing Tech', 'Heat Transfer']
        };

        for (const dept of departments) {
            const deptTeachers = teachersByDept[dept];
            const subjects = deptSubjects[dept];

            for (const day of days) {
                // strict ordered slots 0 to 5
                for (let slot = 0; slot < 6; slot++) {
                    // Alternate teachers: Slots 0,2,4 -> Teacher 1; Slots 1,3,5 -> Teacher 2
                    const teacherIndex = slot % 2;
                    const teacher = deptTeachers[teacherIndex];

                    routines.push({
                        teacher: teacher._id,
                        subject: subjects[slot], // Assign specific subject to slot
                        section: 'A',
                        day: day,
                        startTime: timeSlots[slot].start,
                        endTime: timeSlots[slot].end
                    });
                }
            }
        }

        await ClassRoutine.insertMany(routines);

        // --- Create History (Past Sessions & Attendance) ---
        console.log('Generating History for Semesters 1, 2, 3...');

        const semesters = [
            { sem: 1, offsetMonths: 12 },
            { sem: 2, offsetMonths: 6 },
            { sem: 3, offsetMonths: 0 } // Current
        ];

        for (const semesterData of semesters) {
            const { sem, offsetMonths } = semesterData;

            // Generate 5 days of history per semester for demo
            for (let i = 0; i < 5; i++) {
                const today = new Date();
                today.setMonth(today.getMonth() - offsetMonths);
                today.setDate(today.getDate() - i); // Go back i days
                const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

                // Pick just CSE routines matching the day
                const relevantRoutines = routines.filter(r =>
                    r.day === dayName &&
                    teachersByDept['CSE'].some(t => t._id.equals(r.teacher))
                );

                if (relevantRoutines.length === 0) continue;

                for (const routine of relevantRoutines) {
                    const sessionId = new mongoose.Types.ObjectId();
                    const cseStudents = studentsByDept['CSE'];

                    const attendanceData = [];
                    let presentCount = 0;
                    let absentCount = 0;

                    for (const student of cseStudents) {
                        const chance = sem === 1 ? 0.9 : sem === 2 ? 0.7 : 0.85;
                        const isPresent = Math.random() < chance;

                        if (isPresent) {
                            presentCount++;
                            attendanceData.push({
                                session: sessionId,
                                student: student._id,
                                status: 'present',
                                method: 'qr',
                                createdAt: today
                            });
                        } else {
                            absentCount++;
                            attendanceData.push({
                                session: sessionId,
                                student: student._id,
                                status: 'absent',
                                method: 'manual',
                                verified: true,
                                createdAt: today
                            });
                        }
                    }

                    await ClassHistory.create({
                        _id: sessionId,
                        teacher: routine.teacher,
                        subject: routine.subject,
                        section: routine.section,
                        semester: sem,
                        bssid: 'HISTORY_BSSID',
                        ssid: 'HISTORY_WIFI',
                        otp: '0000',
                        qrCode: 'history_qr',
                        startTime: today,
                        endTime: today,
                        presentCount,
                        absentCount
                    });

                    if (attendanceData.length > 0) {
                        await Attendance.insertMany(attendanceData);
                    }
                }
            }
        }

        console.log('Seeding Complete!');
        console.log('Credentials:');
        console.log('  Teacher (ECE): teacher1.ece@test.com / 111');
        console.log('  Student (CSE): student1.cse@test.com / 111');

        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();
