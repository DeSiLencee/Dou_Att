const API_BASE_URL = 'http://localhost:3000';

// Get elements
const loginScreen = document.getElementById('login-screen');
const courseSelectionScreen = document.getElementById('course-selection-screen');
const attendanceScreen = document.getElementById('attendance-screen');
const summaryScreen = document.getElementById('summary-screen');

const studentLoginBtn = document.getElementById('student-login-btn');
const teacherLoginBtn = document.getElementById('teacher-login-btn');

const courseListDiv = document.getElementById('course-list');
const selectedCourseNameDisplay = document.getElementById('selected-course-name');
const selectedCourseTimeDisplay = document.getElementById('selected-course-time');
const selectedCourseDateDisplay = document.getElementById('selected-course-date');
const startAttendanceForSelectedCourseBtn = document.getElementById('start-attendance-for-selected-course-btn');

const attendanceCourseName = document.getElementById('attendance-course-name');
const attendanceCourseTime = document.getElementById('attendance-course-time');
const attendanceCourseDate = document.getElementById('attendance-course-date');
const qrcodeDiv = document.getElementById('qrcode');

const studentListDiv = document.getElementById('student-list');
const manualStudentNameInput = document.getElementById('manual-student-name-input');
const manualStudentIdInput = document.getElementById('manual-student-id-input');
const addManualStudentBtn = document.getElementById('add-manual-student-btn');
const finishAttendanceBtn = document.getElementById('finish-attendance-btn');

const summaryCourseName = document.getElementById('summary-course-name');
const summaryCourseTime = document.getElementById('summary-course-time');
const summaryCourseDate = document.getElementById('summary-course-date');
const summaryListDiv = document.getElementById('summary-list');
const restartBtn = document.getElementById('restart-btn');

const leftMenu = document.querySelector('.left-menu'); // Reference to the left menu container
const academicMenuList = document.getElementById('academic-menu-list'); // Reference to the ul inside the left menu

let allCourses = []; // Store all fetched courses
let currentAttendance = {}; // { studentId: { name: 'Student Name', id: 's123', status: 'present'/'absent' }}
let studentsData = []; // Store the students for the selected course
let selectedCourseId = null;
let selectedCourse = null;

// --- Screen Navigation ---
function showScreen(screenToShow) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    screenToShow.classList.add('active');
}

// --- API Calls ---
async function fetchCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/courses`);
        if (!response.ok) throw new Error('Failed to fetch courses');
        allCourses = await response.json();
        renderCourseList(allCourses); // Render in the main course selection panel
        renderAcademicMenu(allCourses); // Render in the left menu
    } catch (error) {
        console.error('Error fetching courses:', error);
        alert('Ders listesi yüklenirken bir hata oluştu.');
    }
}

async function fetchStudentsForCourse(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/students`);
        if (!response.ok) throw new Error('Failed to fetch students for course');
        studentsData = await response.json();
        renderStudentList();
    } catch (error) {
        console.error('Error fetching students for course:', error);
        alert('Dersin öğrenci listesi yüklenirken bir hata oluştu.');
    }
}

async function addStudent(name, studentId, courseId) {
    try {
        // First add to global students list in backend
        const response = await fetch(`${API_BASE_URL}/add-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, studentId, courseId }) // Pass studentId and courseId
        });
        if (!response.ok) throw new Error('Failed to add student');
        const newStudent = await response.json();

        // Update local studentsData and currentAttendance if it's the active course
        if (selectedCourseId === courseId) {
            // Ensure the studentId from backend is used
            studentsData.push({ id: newStudent.id, name: newStudent.name });
            currentAttendance[newStudent.id] = { name: newStudent.name, id: newStudent.id, status: 'pending' };
            renderStudentList(); // Re-render to include the new student
        }
        manualStudentNameInput.value = ''; // Clear inputs
        manualStudentIdInput.value = '';
        return newStudent;
    } catch (error) {
        console.error('Error adding student:', error);
        alert('Öğrenci eklenirken bir hata oluştu.');
        return null;
    }
}

async function markAttendance(courseId, studentId, status, studentName) {
    try {
        const response = await fetch(`${API_BASE_URL}/mark-attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, studentId, status, name: studentName })
        });
        if (!response.ok) throw new Error('Failed to mark attendance');
        const result = await response.json();
        console.log(result.message);
        currentAttendance[studentId] = { name: studentName, id: studentId, status };
        updateStudentCardStatus(studentId, status);
    } catch (error) {
        console.error('Error marking attendance:', error);
        alert('Yoklama kaydedilirken bir hata oluştu.');
    }
}

async function fetchSummary(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/summary/${courseId}`);
        if (!response.ok) throw new Error('Failed to fetch summary');
        const summary = await response.json();
        renderSummary(summary);
    } catch (error) {
        console.error('Error fetching summary:', error);
        alert('Özet yüklenirken bir hata oluştu.');
    }
}

// --- Rendering Functions ---
function renderCourseList(courses) {
    courseListDiv.innerHTML = '';
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.dataset.id = course.id;
        courseCard.innerHTML = `
            <h3>${course.name}</h3>
            <p>${course.time}</p>
            <p>${course.date}</p>
        `;
        courseListDiv.appendChild(courseCard);

        courseCard.addEventListener('click', () => selectCourse(course.id));
    });
}

function renderAcademicMenu(courses) {
    academicMenuList.innerHTML = ''; // Clear previous menu items

    // Add courses to the left menu
    courses.forEach(course => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = course.name;
        link.dataset.courseId = course.id;
        link.addEventListener('click', (event) => {
            event.preventDefault();
            selectCourse(course.id);
            showScreen(courseSelectionScreen); // Ensure course selection screen is visible
            highlightSelectedCourseInMenu(course.id);
        });
        listItem.appendChild(link);
        academicMenuList.appendChild(listItem);
    });

    // Add Logout option
    const logoutListItem = document.createElement('li');
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.textContent = 'Çıkış Yap';
    logoutLink.id = 'logout-btn'; // Give it an ID for specific styling/selection if needed
    logoutLink.addEventListener('click', (event) => {
        event.preventDefault();
        logout();
    });
    logoutListItem.appendChild(logoutLink);
    academicMenuList.appendChild(logoutListItem);

    leftMenu.classList.remove('hidden'); // Show the left menu
    document.body.classList.add('body-menu-active'); // Add class to body when menu is active
}

function selectCourse(courseId) {
    // Remove 'selected' class from previously selected course in the main panel
    const prevSelectedMain = document.querySelector('.course-card.selected');
    if (prevSelectedMain) {
        prevSelectedMain.classList.remove('selected');
    }

    // Add 'selected' class to the clicked course in the main panel
    const newSelectedMain = document.querySelector(`.course-card[data-id="${courseId}"]`);
    if (newSelectedMain) {
        newSelectedMain.classList.add('selected');
    }

    selectedCourse = allCourses.find(course => course.id === courseId);
    selectedCourseId = courseId;

    if (selectedCourse) {
        selectedCourseNameDisplay.textContent = selectedCourse.name;
        selectedCourseTimeDisplay.textContent = selectedCourse.time;
        selectedCourseDateDisplay.textContent = selectedCourse.date;
        startAttendanceForSelectedCourseBtn.textContent = `${selectedCourse.name} Yoklama Başlat`;
        startAttendanceForSelectedCourseBtn.classList.remove('hidden');
    } else {
        selectedCourseNameDisplay.textContent = 'Yok';
        selectedCourseTimeDisplay.textContent = 'Yok';
        selectedCourseDateDisplay.textContent = 'Yok';
        startAttendanceForSelectedCourseBtn.classList.add('hidden');
    }
    highlightSelectedCourseInMenu(courseId); // Also highlight in left menu
}

function highlightSelectedCourseInMenu(courseId) {
    // Remove 'selected-menu-item' class from previously selected menu item
    const prevSelected = academicMenuList.querySelector('.selected-menu-item');
    if (prevSelected) {
        prevSelected.classList.remove('selected-menu-item');
    }

    // Add 'selected-menu-item' class to the newly selected menu item
    const newSelected = academicMenuList.querySelector(`[data-course-id="${courseId}"]`);
    if (newSelected) {
        newSelected.classList.add('selected-menu-item');
    }
}

function startAttendanceFlow() {
    if (!selectedCourse) {
        alert('Lütfen önce bir ders seçin.');
        return;
    }

    attendanceCourseName.textContent = selectedCourse.name;
    attendanceCourseTime.textContent = selectedCourse.time;
    attendanceCourseDate.textContent = selectedCourse.date;

    // Generate QR code for the course
    generateQRCode(selectedCourse.id); // QR code content is courseId for now

    currentAttendance = {}; // Reset attendance for the new course
    fetchStudentsForCourse(selectedCourse.id);
    showScreen(attendanceScreen);
}

function renderStudentList() {
    studentListDiv.innerHTML = ''; // Clear previous list
    studentsData.forEach(student => {
        // Initialize attendance status if not already set for this student in this course
        if (!currentAttendance[student.id]) {
            currentAttendance[student.id] = { name: student.name, id: student.id, status: 'pending' };
        }
    });

    // Sort students by name for consistent display
    const sortedStudents = Object.values(currentAttendance).sort((a, b) => a.name.localeCompare(b.name));

    sortedStudents.forEach(student => {
        const studentCard = document.createElement('div');
        studentCard.className = `student-card ${student.status}`;
        studentCard.dataset.id = student.id;
        studentCard.innerHTML = `
            <h3>${student.name}</h3>
            <p class="student-id">${student.id}</p>
            <div class="actions">
                <button class="btn success mark-present" data-id="${student.id}" data-name="${student.name}">✓ Burada</button>
                <button class="btn danger mark-absent" data-id="${student.id}" data-name="${student.name}">✗ Yok</button>
            </div>
        `;
        studentListDiv.appendChild(studentCard);
    });

    // Attach event listeners to the new buttons
    document.querySelectorAll('.mark-present').forEach(button => {
        button.onclick = (e) => markAttendance(selectedCourseId, e.target.dataset.id, 'present', e.target.dataset.name);
    });
    document.querySelectorAll('.mark-absent').forEach(button => {
        button.onclick = (e) => markAttendance(selectedCourseId, e.target.dataset.id, 'absent', e.target.dataset.name);
    });
}

function updateStudentCardStatus(studentId, status) {
    const card = studentListDiv.querySelector(`.student-card[data-id="${studentId}"]`);
    if (card) {
        card.classList.remove('present', 'absent', 'pending');
        card.classList.add(status);
        currentAttendance[studentId].status = status; // Update local state
    }
}

function renderSummary(summary) {
    summaryCourseName.textContent = selectedCourse.name;
    summaryCourseTime.textContent = selectedCourse.time;
    summaryCourseDate.textContent = selectedCourse.date;

    summaryListDiv.innerHTML = '';
    summary.forEach(item => {
        const summaryItem = document.createElement('div');
        summaryItem.className = 'summary-item';
        summaryItem.innerHTML = `
            <span>${item.name} (${item.id})</span>
            <span class="status ${item.status}">${item.status === 'present' ? 'Burada' : 'Yok'}</span>
        `;
        summaryListDiv.appendChild(summaryItem);
    });
}

function generateQRCode(text) {
    qrcodeDiv.innerHTML = ''; // Clear previous QR code
    new QRCode(qrcodeDiv, {
        text: text,
        width: 128,
        height: 128,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

function logout() {
    currentAttendance = {}; // Clear attendance
    studentsData = []; // Clear students data
    selectedCourseId = null;
    selectedCourse = null;
    allCourses = []; // Clear courses

    // Clear selected course info display
    selectedCourseNameDisplay.textContent = 'Yok';
    selectedCourseTimeDisplay.textContent = 'Yok';
    selectedCourseDateDisplay.textContent = 'Yok';
    startAttendanceForSelectedCourseBtn.classList.add('hidden'); // Hide the start button
    
    academicMenuList.innerHTML = ''; // Clear menu
    leftMenu.classList.add('hidden'); // Hide the left menu
    document.body.classList.remove('body-menu-active'); // Remove class from body when logging out
    showScreen(loginScreen); // Go back to login screen
}

// --- Event Listeners ---
teacherLoginBtn.addEventListener('click', () => {
    fetchCourses();
    showScreen(courseSelectionScreen);
});

studentLoginBtn.addEventListener('click', () => {
    alert('Öğrenci girişi özelliği henüz aktif değildir. Lütfen daha sonra tekrar deneyin.');
});

// New event listener for the left menu "Akademik Giriş" link
academicLoginMenuLink.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default anchor link behavior
    teacherLoginBtn.click(); // Simulate a click on the existing teacher login button
});

startAttendanceForSelectedCourseBtn.addEventListener('click', startAttendanceFlow);

addManualStudentBtn.addEventListener('click', async () => {
    const name = manualStudentNameInput.value.trim();
    const studentId = manualStudentIdInput.value.trim();
    if (name && studentId && selectedCourseId) {
        await addStudent(name, studentId, selectedCourseId);
    } else if (!name || !studentId) {
        alert('Lütfen öğrenci adı ve numarasını girin.');
    } else {
        alert('Önce bir ders seçmelisiniz.');
    }
});

finishAttendanceBtn.addEventListener('click', () => {
    if (selectedCourseId) {
        fetchSummary(selectedCourseId);
        showScreen(summaryScreen);
    } else {
        alert('Önce bir dersin yoklamasını almalısınız.');
    }
});

restartBtn.addEventListener('click', () => {
    currentAttendance = {}; // Clear attendance
    studentsData = []; // Clear students data
    selectedCourseId = null;
    selectedCourse = null;
    // Clear selected course info display
    selectedCourseNameDisplay.textContent = 'Yok';
    selectedCourseTimeDisplay.textContent = 'Yok';
    selectedCourseDateDisplay.textContent = 'Yok';
    startAttendanceForSelectedCourseBtn.classList.add('hidden'); // Hide the start button
    
    showScreen(loginScreen);
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    showScreen(loginScreen);
});
