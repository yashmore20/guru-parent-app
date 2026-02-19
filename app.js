/* ============================================
   GURU.AI PARENT PORTAL - MAIN APP LOGIC
   ============================================

   TESTING CHECKLIST:
   [ ] Login works (valid email + password)
   [ ] Login fails with wrong password (shows error)
   [ ] Signup works (new account created)
   [ ] Signup fails for duplicate email (shows error)
   [ ] Set Password works for legacy accounts
   [ ] Logout works (clears token, shows login)
   [ ] Auth guard: visiting dashboard without token redirects to login
   [ ] Token expiry: corrupting token redirects to login
   [ ] Add student (up to max 2)
   [ ] Delete student
   [ ] Upload textbook PDF
   [ ] Delete textbook
   [ ] Assign homework to a student
   [ ] View homework list
   [ ] View session summaries
   [ ] Filter summaries by student
   [ ] Pair device with 6-digit code
   [ ] Dashboard stats load correctly
   [ ] Parent A cannot see Parent B's data
   [ ] Homework from parent app reaches Guru hardware device
   [ ] Sessions from hardware appear in summaries
   [ ] Hardware code and parent portal code are completely separate
   [ ] Mobile responsive layout works
   ============================================ */

// ---- CACHED DATA ----
let cachedStudents = [];

// ============================================
// PAGE NAVIGATION
// ============================================

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }

    // Load data when navigating to a page
    switch (pageId) {
        case 'dashboard-page':
            loadDashboard();
            break;
        case 'students-page':
            loadStudents();
            break;
        case 'textbooks-page':
            loadTextbooks();
            break;
        case 'homework-page':
            loadHomework();
            break;
        case 'summaries-page':
            loadSummaries();
            break;
    }
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    const parent = getParent();
    if (parent) {
        document.getElementById('welcome-name').textContent = parent.name || 'Parent';
        document.getElementById('nav-parent-name').textContent = parent.name || '';
    }

    // Load stats in parallel
    const [studentsRes, textbooksRes, homeworkRes, summariesRes] = await Promise.all([
        apiGetStudents(),
        apiGetTextbooks(),
        apiGetHomework(),
        apiGetSummaries(null, 50)
    ]);

    if (studentsRes.students) {
        cachedStudents = studentsRes.students;
        document.getElementById('stat-students').textContent = studentsRes.students.length;
    }
    if (textbooksRes.books) {
        document.getElementById('stat-textbooks').textContent = textbooksRes.books.length;
    }
    if (homeworkRes.homework) {
        document.getElementById('stat-homework').textContent = homeworkRes.homework.length;
    }
    if (summariesRes.summaries) {
        document.getElementById('stat-sessions').textContent = summariesRes.summaries.length;
    }
}

// ============================================
// STUDENTS
// ============================================

async function loadStudents() {
    const listEl = document.getElementById('students-list');
    listEl.innerHTML = '<div class="loading">Loading students...</div>';

    const result = await apiGetStudents();

    if (result.error) {
        listEl.innerHTML = '<div class="msg msg-error">' + escapeHtml(result.error) + '</div>';
        return;
    }

    cachedStudents = result.students || [];
    const canAdd = result.can_add;
    const count = result.count || 0;
    const max = result.max || 2;

    // Show/hide add form and limit message
    const limitMsg = document.getElementById('student-limit-msg');
    const addSection = document.getElementById('add-student-section');

    if (!canAdd) {
        limitMsg.textContent = 'Maximum ' + max + ' students reached. Delete one to add another.';
        limitMsg.style.display = 'block';
        addSection.style.display = 'none';
    } else {
        limitMsg.style.display = 'none';
        addSection.style.display = 'block';
    }

    if (cachedStudents.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128101;</div><p>No students yet. Add your first student above!</p></div>';
        return;
    }

    listEl.innerHTML = cachedStudents.map(s => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-title">${escapeHtml(s.name)}</div>
                <div class="list-item-subtitle">${escapeHtml(s.class || '')} &middot; ${escapeHtml(s.board || 'CBSE')}</div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-small btn-danger" onclick="deleteStudent('${s.id}', '${escapeHtml(s.name)}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Add student form
document.getElementById('add-student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('add-student-error');
    errEl.style.display = 'none';

    const name = document.getElementById('student-name').value.trim();
    const cls = document.getElementById('student-class').value;
    const board = document.getElementById('student-board').value;
    const btn = e.target.querySelector('button[type="submit"]');

    if (!name || !cls) {
        errEl.textContent = 'Name and class are required';
        errEl.style.display = 'block';
        return;
    }

    setButtonLoading(btn, true);
    const result = await apiAddStudent(name, cls, board);
    setButtonLoading(btn, false);

    if (result.success) {
        document.getElementById('student-name').value = '';
        document.getElementById('student-class').value = '';
        loadStudents();
    } else {
        errEl.textContent = result.error || 'Failed to add student';
        errEl.style.display = 'block';
    }
});

async function deleteStudent(id, name) {
    if (!confirm('Delete student "' + name + '"? This also removes their homework and session data.')) {
        return;
    }
    const result = await apiDeleteStudent(id);
    if (result.success) {
        loadStudents();
    } else {
        alert(result.error || 'Failed to delete student');
    }
}

// ============================================
// TEXTBOOKS
// ============================================

async function loadTextbooks() {
    const listEl = document.getElementById('textbooks-list');
    listEl.innerHTML = '<div class="loading">Loading textbooks...</div>';

    const result = await apiGetTextbooks();

    if (result.error) {
        listEl.innerHTML = '<div class="msg msg-error">' + escapeHtml(result.error) + '</div>';
        return;
    }

    const books = result.books || [];

    if (books.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128218;</div><p>No textbooks uploaded yet.</p></div>';
        return;
    }

    listEl.innerHTML = books.map(b => `
        <div class="list-item">
            <div class="list-item-info">
                <div class="list-item-title">${escapeHtml(b.book_name)}</div>
                <div class="list-item-subtitle">${escapeHtml(b.subject)} &middot; ${escapeHtml(b.class_level || '')}</div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-small btn-danger" onclick="deleteTextbook('${escapeAttr(b.book_name)}', '${escapeAttr(b.subject)}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Upload textbook form
document.getElementById('upload-textbook-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('upload-error');
    const successEl = document.getElementById('upload-success');
    const progressEl = document.getElementById('upload-progress');
    errEl.style.display = 'none';
    successEl.style.display = 'none';

    const bookName = document.getElementById('tb-book-name').value.trim();
    const subject = document.getElementById('tb-subject').value;
    const classLevel = document.getElementById('tb-class').value;
    const fileInput = document.getElementById('tb-file');
    const file = fileInput.files[0];
    const btn = e.target.querySelector('button[type="submit"]');

    if (!bookName || !subject || !classLevel || !file) {
        errEl.textContent = 'All fields are required';
        errEl.style.display = 'block';
        return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
        errEl.textContent = 'Only PDF files are allowed';
        errEl.style.display = 'block';
        return;
    }

    setButtonLoading(btn, true);
    progressEl.style.display = 'block';

    const result = await apiUploadTextbook(file, subject, classLevel, bookName);

    setButtonLoading(btn, false);
    progressEl.style.display = 'none';

    if (result.success) {
        successEl.textContent = 'Textbook uploaded! ' + (result.pages_processed || 0) + ' pages processed.';
        successEl.style.display = 'block';
        document.getElementById('tb-book-name').value = '';
        document.getElementById('tb-subject').value = '';
        document.getElementById('tb-class').value = '';
        fileInput.value = '';
        loadTextbooks();
    } else {
        errEl.textContent = result.error || 'Upload failed';
        errEl.style.display = 'block';
    }
});

async function deleteTextbook(bookName, subject) {
    if (!confirm('Delete textbook "' + bookName + '"?')) {
        return;
    }
    const result = await apiDeleteTextbook(bookName, subject);
    if (result.success) {
        loadTextbooks();
    } else {
        alert(result.error || 'Failed to delete textbook');
    }
}

// ============================================
// HOMEWORK
// ============================================

async function loadHomework() {
    // Populate student dropdown
    await populateStudentDropdown('hw-student');

    const listEl = document.getElementById('homework-list');
    listEl.innerHTML = '<div class="loading">Loading homework...</div>';

    const result = await apiGetHomework();

    if (result.error) {
        listEl.innerHTML = '<div class="msg msg-error">' + escapeHtml(result.error) + '</div>';
        return;
    }

    const homework = result.homework || [];

    if (homework.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#9999;&#65039;</div><p>No homework assigned yet.</p></div>';
        return;
    }

    listEl.innerHTML = homework.map(h => {
        const studentName = getStudentName(h.student_id);
        return `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-title">${escapeHtml(h.subject || 'General')}</div>
                    <div class="list-item-subtitle">${escapeHtml(studentName)} &middot; Due: ${escapeHtml(h.deadline || 'Today')}</div>
                    <div class="list-item-subtitle" style="margin-top:4px; color:#555;">${escapeHtml(h.task || '')}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Add homework form
document.getElementById('add-homework-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('homework-error');
    const successEl = document.getElementById('homework-success');
    errEl.style.display = 'none';
    successEl.style.display = 'none';

    const studentId = document.getElementById('hw-student').value;
    const subject = document.getElementById('hw-subject').value;
    const text = document.getElementById('hw-text').value.trim();
    const btn = e.target.querySelector('button[type="submit"]');

    if (!studentId || !subject || !text) {
        errEl.textContent = 'All fields are required';
        errEl.style.display = 'block';
        return;
    }

    setButtonLoading(btn, true);
    const result = await apiAddHomework(studentId, subject, text);
    setButtonLoading(btn, false);

    if (result.success) {
        successEl.textContent = 'Homework assigned!';
        successEl.style.display = 'block';
        document.getElementById('hw-text').value = '';
        loadHomework();
        setTimeout(() => { successEl.style.display = 'none'; }, 3000);
    } else {
        errEl.textContent = result.error || 'Failed to save homework';
        errEl.style.display = 'block';
    }
});

// ============================================
// SESSION SUMMARIES
// ============================================

async function loadSummaries() {
    // Populate student filter dropdown
    await populateStudentDropdown('sum-student-filter', true);

    const listEl = document.getElementById('summaries-list');
    listEl.innerHTML = '<div class="loading">Loading session summaries...</div>';

    const studentId = document.getElementById('sum-student-filter').value || null;
    const result = await apiGetSummaries(studentId, 20);

    if (result.error) {
        listEl.innerHTML = '<div class="msg msg-error">' + escapeHtml(result.error) + '</div>';
        return;
    }

    const summaries = result.summaries || [];

    if (summaries.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128202;</div><p>No study sessions yet. Sessions appear here after your child uses the Guru device.</p></div>';
        return;
    }

    listEl.innerHTML = summaries.map(s => {
        const studentName = getStudentName(s.student_id);
        const topics = Array.isArray(s.topics_covered) ? s.topics_covered : [];
        const suggestions = Array.isArray(s.suggestions) ? s.suggestions : [];
        const level = s.understanding_level || 'unknown';
        const levelLabel = level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ');

        return `
            <div class="summary-card">
                <div class="summary-header">
                    <div>
                        <strong>${escapeHtml(studentName)}</strong>
                        <span class="badge badge-${level}">${escapeHtml(levelLabel)}</span>
                    </div>
                    <div class="summary-date">${escapeHtml(s.session_date || '')}</div>
                </div>
                ${topics.length > 0 ? `
                    <div class="tag-list">
                        ${topics.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('')}
                    </div>
                ` : ''}
                <div class="summary-text">${escapeHtml(s.summary || 'No summary available.')}</div>
                ${suggestions.length > 0 ? `
                    <ul class="suggestion-list">
                        ${suggestions.map(sg => '<li>' + escapeHtml(sg) + '</li>').join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Add event listener for student filter changes
document.getElementById('sum-student-filter').addEventListener('change', () => {
    loadSummaries();
});

// ============================================
// DEVICE PAIRING
// ============================================

document.getElementById('pair-device-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('pairing-error');
    const successEl = document.getElementById('pairing-success');
    errEl.style.display = 'none';
    successEl.style.display = 'none';

    const code = document.getElementById('device-code').value.trim();
    const btn = e.target.querySelector('button[type="submit"]');

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
        errEl.textContent = 'Please enter a valid 6-digit code';
        errEl.style.display = 'block';
        return;
    }

    setButtonLoading(btn, true);
    const result = await apiPairDevice(code);
    setButtonLoading(btn, false);

    if (result.success) {
        successEl.textContent = 'Device paired successfully! Your Guru device is now connected.';
        successEl.style.display = 'block';
        document.getElementById('device-code').value = '';
    } else {
        errEl.textContent = result.error || 'Pairing failed. Check the code and try again.';
        errEl.style.display = 'block';
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function populateStudentDropdown(selectId, includeAll) {
    // Use cached students if available, otherwise fetch
    if (cachedStudents.length === 0) {
        const result = await apiGetStudents();
        if (result.students) {
            cachedStudents = result.students;
        }
    }

    const select = document.getElementById(selectId);
    // Remember current selection
    const currentVal = select.value;

    // Clear options but keep first (placeholder)
    const firstOption = select.options[0];
    select.innerHTML = '';
    select.appendChild(firstOption);

    cachedStudents.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name + ' (' + (s.class || '') + ')';
        select.appendChild(opt);
    });

    // Restore selection if it still exists
    if (currentVal) {
        select.value = currentVal;
    }
}

function getStudentName(studentId) {
    const student = cachedStudents.find(s => s.id === studentId);
    return student ? student.name : 'Unknown';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
}

function showMsg(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.className = 'msg msg-' + type;
        el.style.display = 'block';
    }
}

function hideMsg(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.display = 'none';
    }
}

// ============================================
// APP INIT
// ============================================

(async function init() {
    // Setup auth form handlers
    initAuthForms();

    // Check if user is logged in
    const loggedIn = await checkAuth();

    if (loggedIn) {
        showPage('dashboard-page');
    }
    // If not logged in, checkAuth already shows login page
})();
