const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json

// In-memory data structures
let students = [
    { id: 's1', name: 'Ayşe Yılmaz' },
    { id: 's2', name: 'Can Demir' },
    { id: 's3', name: 'Elif Kaya' },
    { id: 's4', name: 'Deniz Arslan' },
    { id: 's5', name: 'Fatma Güneş' },
    { id: 's6', name: 'Mehmet Kaplan' },
    { id: 's7', name: 'Zeynep Çelik' },
    { id: 's8', name: 'Ali Can' },
];

let courses = [
    {
        id: 'c1',
        name: 'Web Programlama',
        time: 'Salı 10:00-12:00',
        date: '2025-12-02',
        studentIds: ['s1', 's2', 's5', 's7']
    },
    {
        id: 'c2',
        name: 'Veritabanı Yönetimi',
        time: 'Perşembe 14:00-16:00',
        date: '2025-12-04',
        studentIds: ['s3', 's4', 's6', 's8']
    },
    {
        id: 'c3',
        name: 'Mobil Uygulama Geliştirme',
        time: 'Cuma 09:00-11:00',
        date: '2025-12-05',
        studentIds: ['s1', 's3', 's6', 's7', 's8']
    }
];

// currentCourseAttendance will store attendance for the actively selected course
// Key: courseId, Value: { studentId: { name: 'Student Name', status: 'present'/'absent' } }
let currentCourseAttendance = {};

// Generate a simple unique ID
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// Routes
// GET /courses - Tüm derslerin listesini frontende veren endpoint
app.get('/courses', (req, res) => {
    res.json(courses.map(course => ({
        id: course.id,
        name: course.name,
        time: course.time,
        date: course.date
    })));
});

// GET /courses/:courseId/students - Belirli bir dersin öğrenci listesini frontende veren endpoint
app.get('/courses/:courseId/students', (req, res) => {
    const { courseId } = req.params;
    const course = courses.find(c => c.id === courseId);

    if (!course) {
        return res.status(404).json({ error: 'Course not found' });
    }

    const courseStudents = students.filter(s => course.studentIds.includes(s.id));
    res.json(courseStudents);
});


// POST /add-student - Öğretmenin elle öğrenci eklemek için endpoint
app.post('/add-student', (req, res) => {
    const { name, studentId, courseId } = req.body; // Now expecting studentId as well
    if (!name) {
        return res.status(400).json({ error: 'Student name is required' });
    }
    // Use provided studentId or generate a new one
    const newStudentId = studentId || generateId();
    const newStudent = { id: newStudentId, name };

    // Check if student with this ID already exists (important if frontend provides ID)
    if (students.some(s => s.id === newStudentId)) {
        return res.status(409).json({ error: 'Student with this ID already exists.' });
    }

    students.push(newStudent); // Add to global student list

    if (courseId) {
        const course = courses.find(c => c.id === courseId);
        if (course && !course.studentIds.includes(newStudent.id)) {
            course.studentIds.push(newStudent.id); // Add to specific course if provided
        }
    }
    res.status(201).json(newStudent);
});

// POST /mark-attendance - Öğretmenin öğrenciyi burada/yok işaretlemesi için endpoint
app.post('/mark-attendance', (req, res) => {
    const { courseId, studentId, status, name } = req.body;
    if (!courseId || !studentId || !status || !['present', 'absent'].includes(status)) {
        return res.status(400).json({ error: 'Course ID, Student ID, and valid status (present/absent) are required' });
    }

    if (!currentCourseAttendance[courseId]) {
        currentCourseAttendance[courseId] = {}; // Initialize for this course if not exists
    }

    // Find student name from global students list or use provided name
    const studentName = students.find(s => s.id === studentId)?.name || name;
    if (!studentName) {
        return res.status(404).json({ error: 'Student not found and name not provided for attendance.' });
    }

    currentCourseAttendance[courseId][studentId] = { name: studentName, status };
    res.json({ message: `Attendance marked for ${studentName} in course ${courseId} as ${status}` });
});

// GET /summary - Dersteki yoklama sonuçlarını tutmak için geçici RAM içi değişken (seçilen derse özel)
app.get('/summary/:courseId', (req, res) => {
    const { courseId } = req.params;
    const courseAttendance = currentCourseAttendance[courseId] || {};

    const summary = Object.keys(courseAttendance).map(studentId => ({
        id: studentId,
        name: courseAttendance[studentId].name,
        status: courseAttendance[studentId].status
    }));
    res.json(summary);
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
