/* ============================================================
   GURU.AI PARENT PORTAL - MAIN APP LOGIC
   Screen navigation, setup flow, tab switching, data loading,
   student switcher, profile menu, form handlers.
   ============================================================ */

// ---- CACHED DATA ----
let cachedStudents = [];
let activeStudentId = null;

// ============================================================
// SCREEN NAVIGATION
// ============================================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
    // Scroll to top
    window.scrollTo(0, 0);
}

// ============================================================
// TAB SWITCHING (bottom nav within app-shell)
// ============================================================
function switchTab(tabName) {
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById('tab-' + tabName);
    if (tab) tab.classList.add('active');

    // Update bottom nav active state
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Scroll main content to top
    const main = document.getElementById('main-content');
    if (main) main.scrollTop = 0;

    // Load data for the tab
    switch (tabName) {
        case 'home':      loadHomeTab(); break;
        case 'homework':  loadHomeworkTab(); break;
        case 'textbooks': loadTextbooksTab(); break;
        case 'summaries': loadSummariesTab(); break;
    }
}

// ============================================================
// STUDENT SWITCHER
// ============================================================
function toggleStudentDropdown() {
    const dd = document.getElementById('student-dropdown');
    if (!dd) return;
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function buildStudentDropdown() {
    const dd = document.getElementById('student-dropdown');
    if (!dd) return;

    if (cachedStudents.length === 0) {
        dd.innerHTML = '<div class="student-dropdown-item">No students added</div>';
        return;
    }

    dd.innerHTML = cachedStudents.map(s => {
        const isActive = s.id === activeStudentId;
        return `<div class="student-dropdown-item${isActive ? ' active' : ''}" onclick="selectStudent('${s.id}')">
            <span>${escapeHtml(s.name)}</span>
            <span style="font-size:12px;color:#888;">${escapeHtml(s.class || '')}</span>
        </div>`;
    }).join('');

    // Add "All Students" option
    dd.innerHTML = `<div class="student-dropdown-item${!activeStudentId ? ' active' : ''}" onclick="selectStudent(null)">
        <span>All Students</span>
    </div>` + dd.innerHTML;
}

function selectStudent(studentId) {
    activeStudentId = studentId;
    const nameEl = document.getElementById('current-student-name');
    if (studentId) {
        const student = cachedStudents.find(s => s.id === studentId);
        if (nameEl) nameEl.textContent = student ? student.name : 'Student';
    } else {
        if (nameEl) nameEl.textContent = 'All Students';
    }
    toggleStudentDropdown();
    buildStudentDropdown();
    // Reload current tab data
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) switchTab(activeTab.dataset.tab);
}

// ============================================================
// PROFILE MENU
// ============================================================
function toggleProfileMenu(forceClose) {
    const menu = document.getElementById('profile-menu');
    if (!menu) return;
    if (forceClose) {
        menu.style.display = 'none';
    } else {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    const dd = document.getElementById('student-dropdown');
    const switcher = document.getElementById('student-switcher');
    if (dd && dd.style.display !== 'none' && !switcher.contains(e.target) && !dd.contains(e.target)) {
        dd.style.display = 'none';
    }

    const menu = document.getElementById('profile-menu');
    const profileBtn = document.querySelector('.nav-profile');
    if (menu && menu.style.display !== 'none' && profileBtn && !profileBtn.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

// ============================================================
// SETUP FLOW
// ============================================================

// Step 1: Pair Device
async function setupPairDevice() {
    const code = document.getElementById('setup-device-code').value.trim();
    const btn = document.querySelector('#setup-device-screen .btn-primary');
    hideMsg('setup-device-error');
    hideMsg('setup-device-success');

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
        showMsg('setup-device-error', 'Please enter a valid 6-digit code');
        return;
    }

    setButtonLoading(btn, true);
    const result = await apiPairDevice(code);
    setButtonLoading(btn, false);

    if (result.success) {
        showMsg('setup-device-success', 'Device connected successfully!');
        setTimeout(() => showScreen('setup-students-screen'), 1200);
    } else {
        showMsg('setup-device-error', result.error || 'Pairing failed. Check the code and try again.');
    }
}

// Step 2: Show/hide second student
function showSecondStudent() {
    document.getElementById('setup-s2-section').style.display = 'block';
    document.getElementById('add-s2-btn').style.display = 'none';
}

function hideSecondStudent() {
    document.getElementById('setup-s2-section').style.display = 'none';
    document.getElementById('add-s2-btn').style.display = 'block';
    document.getElementById('setup-s2-name').value = '';
    document.getElementById('setup-s2-class').value = '';
}

// Step 2: Add Students
async function setupAddStudents() {
    const btn = document.querySelector('#setup-students-screen .btn-primary');
    hideMsg('setup-students-error');

    const name1 = document.getElementById('setup-s1-name').value.trim();
    const class1 = document.getElementById('setup-s1-class').value;
    const board1 = document.getElementById('setup-s1-board').value;

    if (!name1 || !class1) {
        showMsg('setup-students-error', 'Please enter name and class for at least one student');
        return;
    }

    setButtonLoading(btn, true);

    // Add Student 1
    const result1 = await apiAddStudent(name1, class1, board1);
    if (!result1.success) {
        setButtonLoading(btn, false);
        showMsg('setup-students-error', result1.error || 'Failed to add student');
        return;
    }

    // Add Student 2 if filled
    const name2 = document.getElementById('setup-s2-name').value.trim();
    const class2 = document.getElementById('setup-s2-class').value;
    const board2 = document.getElementById('setup-s2-board').value;

    if (name2 && class2) {
        const result2 = await apiAddStudent(name2, class2, board2);
        if (!result2.success) {
            // Student 1 was added, continue anyway
            console.warn('Student 2 add failed:', result2.error);
        }
    }

    setButtonLoading(btn, false);
    showScreen('setup-textbooks-screen');
}

// Step 3: Upload Textbook in Setup
function triggerSubjectUpload(btnEl) {
    const card = btnEl.closest('.subject-upload-card');
    const fileInput = card.querySelector('.subject-file-input');
    if (!fileInput) return;

    fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            alert('Only PDF files are allowed');
            return;
        }

        const subject = card.dataset.subject;
        const statusEl = card.querySelector('.upload-status');
        const uploadBtn = card.querySelector('.upload-btn');

        uploadBtn.textContent = '...';
        uploadBtn.disabled = true;
        statusEl.textContent = 'Uploading...';

        // Get student class for class_level
        const parent = getParent();
        const studentsRes = await apiGetStudents();
        const students = studentsRes.students || [];
        const classLevel = students.length > 0 ? students[0].class : 'Class 5';

        const result = await apiUploadTextbook(file, subject, classLevel, subject + ' Textbook');

        if (result.success) {
            statusEl.textContent = 'Uploaded!';
            card.classList.add('uploaded');
            uploadBtn.textContent = 'Done';
            uploadBtn.disabled = true;

            const progressEl = document.getElementById('setup-upload-progress');
            if (progressEl) {
                progressEl.textContent = `${subject} uploaded: ${result.pages_processed || 0} pages processed`;
                progressEl.style.display = 'block';
                setTimeout(() => { progressEl.style.display = 'none'; }, 3000);
            }
        } else {
            statusEl.textContent = 'Failed';
            uploadBtn.textContent = 'Retry';
            uploadBtn.disabled = false;
            alert(result.error || 'Upload failed. Try again.');
        }
    };

    fileInput.click();
}

// Step 4: Finish Setup
function finishSetup() {
    markSetupDone();
    showScreen('app-shell');
    initAppShell();
}

// ============================================================
// INIT APP SHELL
// ============================================================
async function initAppShell() {
    const parent = getParent();

    // Set profile info
    if (parent) {
        const initial = (parent.name || 'P').charAt(0).toUpperCase();
        const initialEl = document.getElementById('nav-parent-initial');
        if (initialEl) initialEl.textContent = initial;

        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        if (profileName) profileName.textContent = parent.name || 'Parent';
        if (profileEmail) profileEmail.textContent = parent.email || '';
    }

    // Load students for switcher
    const studentsRes = await apiGetStudents();
    if (studentsRes.students) {
        cachedStudents = studentsRes.students;
    }

    // Set first student as active
    if (cachedStudents.length > 0 && !activeStudentId) {
        activeStudentId = cachedStudents[0].id;
        const nameEl = document.getElementById('current-student-name');
        if (nameEl) nameEl.textContent = cachedStudents[0].name;
    }

    buildStudentDropdown();

    // Load home tab
    switchTab('home');
}

// ============================================================
// HOME TAB
// ============================================================
async function loadHomeTab() {
    // Load summaries for charts and stats
    const summariesRes = await apiGetSummaries(activeStudentId, 50);
    const summaries = summariesRes.summaries || [];

    // Load homework for stats
    const homeworkRes = await apiGetHomework();
    const homework = homeworkRes.homework || [];

    // Update stats
    updateQuickStats(summaries, homework);

    // Update chart subtitle
    if (activeStudentId) {
        const student = cachedStudents.find(s => s.id === activeStudentId);
        const subEl = document.getElementById('chart-sub-name');
        if (subEl && student) subEl.textContent = `See how ${student.name} is using Guru`;
    }

    // Render charts
    renderAllCharts(summaries);

    // Render recent sessions
    renderRecentSessions(summaries.slice(0, 5));
}

function updateQuickStats(summaries, homework) {
    // Study time (estimate: 15 min per session today)
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = summaries.filter(s => (s.session_date || s.created_at || '').startsWith(today));
    const studyTime = todaySessions.length * 15;
    document.getElementById('stat-study-time').textContent = studyTime > 0 ? studyTime + ' min' : '0 min';

    // Homework done (count completed or total assigned)
    document.getElementById('stat-hw-done').textContent = homework.length;

    // Quiz average (derive from understanding levels)
    if (summaries.length > 0) {
        const scores = summaries.map(s => {
            const level = s.understanding_level || 'unknown';
            return level === 'strong' ? 90 : level === 'moderate' ? 65 : level === 'needs_help' ? 35 : 0;
        }).filter(s => s > 0);
        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        document.getElementById('stat-quiz-avg').textContent = avg > 0 ? avg + '%' : '-';
    } else {
        document.getElementById('stat-quiz-avg').textContent = '-';
    }

    // Streak (consecutive days with sessions in last 7 days)
    let streak = 0;
    const todayDate = new Date();
    for (let i = 0; i < 30; i++) {
        const d = new Date(todayDate);
        d.setDate(todayDate.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const hasSession = summaries.some(s => (s.session_date || s.created_at || '').startsWith(dateStr));
        if (hasSession) {
            streak++;
        } else if (i > 0) {
            break; // Streak broken
        }
    }
    document.getElementById('stat-streak').textContent = streak;
}

function renderRecentSessions(summaries) {
    const container = document.getElementById('recent-sessions');
    if (!container) return;

    if (summaries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">&#128218;</div>
                <p>No study sessions yet</p>
                <p class="empty-sub">Sessions appear after your child uses Guru</p>
            </div>`;
        return;
    }

    const levelBadge = (level) => {
        const l = level || 'unknown';
        const labels = { strong: 'Strong', moderate: 'Moderate', needs_help: 'Needs Help', unknown: '-' };
        return `<span class="badge badge-${l}">${labels[l] || '-'}</span>`;
    };

    container.innerHTML = summaries.map(s => {
        const student = cachedStudents.find(st => st.id === s.student_id);
        const name = student ? student.name : '';
        const date = new Date(s.session_date || s.created_at);
        const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const topics = (Array.isArray(s.topics_covered) ? s.topics_covered : []).slice(0, 2).join(', ') || 'Study session';

        return `
            <div class="summary-card">
                <div class="summary-header">
                    <div>
                        <strong>${escapeHtml(name)}</strong>
                        ${levelBadge(s.understanding_level)}
                    </div>
                    <div class="summary-date">${escapeHtml(dateStr)}</div>
                </div>
                <div class="summary-text">${escapeHtml(topics)}</div>
                ${s.summary ? `<div class="summary-text" style="font-size:13px;color:#777;">${escapeHtml(s.summary.substring(0, 100))}${s.summary.length > 100 ? '...' : ''}</div>` : ''}
            </div>`;
    }).join('');
}

// ============================================================
// HOMEWORK TAB
// ============================================================
async function loadHomeworkTab() {
    // Populate student dropdown for homework form
    await populateStudentSelect('hw-student');

    // Load homework list
    const listEl = document.getElementById('hw-list');
    listEl.innerHTML = '<div class="skeleton-loader"></div>';

    const result = await apiGetHomework();

    if (result.error) {
        listEl.innerHTML = `<div class="msg-error">${escapeHtml(result.error)}</div>`;
        return;
    }

    const homework = result.homework || [];

    if (homework.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">&#9999;&#65039;</div>
                <p>No homework assigned yet</p>
                <p class="empty-sub">Use the form above to assign homework</p>
            </div>`;
        return;
    }

    const subjectIcons = {
        Mathematics: '&#128208;', Science: '&#128300;', English: '&#128214;',
        Hindi: '&#127470;&#127475;', 'Social Studies': '&#127758;', General: '&#128221;'
    };

    listEl.innerHTML = homework.map(h => {
        const icon = subjectIcons[h.subject] || '&#128221;';
        const studentName = getStudentName(h.student_id);
        return `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-title">${icon} ${escapeHtml(h.subject || 'General')}</div>
                    <div class="list-item-sub">${escapeHtml(studentName)} &middot; ${escapeHtml(h.deadline || 'Today')}</div>
                    <div class="list-item-sub" style="margin-top:4px;color:#555;">${escapeHtml(h.task || '')}</div>
                </div>
            </div>`;
    }).join('');
}

// Homework form handler
function initHomeworkForm() {
    const form = document.getElementById('hw-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMsg('hw-error');
        hideMsg('hw-success');

        const studentId = document.getElementById('hw-student').value;
        const subject = document.getElementById('hw-subject').value;
        const text = document.getElementById('hw-text').value.trim();
        const btn = form.querySelector('button[type="submit"]');

        if (!studentId || !subject || !text) {
            showMsg('hw-error', 'All fields are required');
            return;
        }

        setButtonLoading(btn, true);
        const result = await apiAddHomework(studentId, subject, text);
        setButtonLoading(btn, false);

        if (result.success) {
            showMsg('hw-success', 'Homework assigned successfully!');
            document.getElementById('hw-text').value = '';
            loadHomeworkTab();
            setTimeout(() => hideMsg('hw-success'), 3000);
        } else {
            showMsg('hw-error', result.error || 'Failed to assign homework');
        }
    });
}

// ============================================================
// TEXTBOOKS TAB
// ============================================================
async function loadTextbooksTab() {
    const listEl = document.getElementById('tb-list');
    listEl.innerHTML = '<div class="skeleton-loader"></div>';

    const result = await apiGetTextbooks();

    if (result.error) {
        listEl.innerHTML = `<div class="msg-error">${escapeHtml(result.error)}</div>`;
        return;
    }

    const books = result.books || [];

    if (books.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">&#128218;</div>
                <p>No textbooks uploaded yet</p>
                <p class="empty-sub">Upload your child's textbooks so Guru can help with studies</p>
            </div>`;
        return;
    }

    const subjectIcons = {
        Mathematics: '&#128208;', Science: '&#128300;', English: '&#128214;',
        Hindi: '&#127470;&#127475;', 'Social Studies': '&#127758;', EVS: '&#127793;'
    };

    listEl.innerHTML = books.map(b => {
        const icon = subjectIcons[b.subject] || '&#128196;';
        return `
            <div class="list-item">
                <div class="list-item-info">
                    <div class="list-item-title">${icon} ${escapeHtml(b.book_name)}</div>
                    <div class="list-item-sub">${escapeHtml(b.subject)} &middot; ${escapeHtml(b.class_level || '')}</div>
                </div>
                <button class="btn btn-small btn-danger" onclick="deleteTextbook('${escapeAttr(b.book_name)}', '${escapeAttr(b.subject)}')">&#128465;</button>
            </div>`;
    }).join('');
}

// Textbook upload form handler
function initTextbookForm() {
    const form = document.getElementById('tb-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMsg('tb-error');
        hideMsg('tb-success');

        const bookName = document.getElementById('tb-name').value.trim();
        const subject = document.getElementById('tb-subject').value;
        const classLevel = document.getElementById('tb-class').value;
        const fileInput = document.getElementById('tb-file');
        const file = fileInput.files[0];
        const btn = form.querySelector('button[type="submit"]');

        if (!bookName || !subject || !classLevel || !file) {
            showMsg('tb-error', 'All fields are required');
            return;
        }
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            showMsg('tb-error', 'Only PDF files are allowed');
            return;
        }
        // File size check
        const fileMB = (file.size / (1024 * 1024)).toFixed(1);
        if (file.size > 50 * 1024 * 1024) {
            showMsg('tb-error', 'File too large (' + fileMB + 'MB). Maximum is 50MB.');
            return;
        }

        setButtonLoading(btn, true);
        const progressEl = document.getElementById('tb-upload-progress');
        if (progressEl) progressEl.style.display = 'block';
        showMsg('tb-success', 'Uploading ' + fileMB + 'MB... This may take a minute for large files.');

        const result = await apiUploadTextbook(file, subject, classLevel, bookName);

        setButtonLoading(btn, false);
        if (progressEl) progressEl.style.display = 'none';
        hideMsg('tb-success');

        if (result.success) {
            showMsg('tb-success', `Textbook uploaded! ${result.pages_processed || 0} pages processed.`);
            document.getElementById('tb-name').value = '';
            document.getElementById('tb-subject').value = '';
            document.getElementById('tb-class').value = '';
            fileInput.value = '';
            loadTextbooksTab();
            setTimeout(() => hideMsg('tb-success'), 4000);
        } else {
            showMsg('tb-error', result.error || 'Upload failed. Try again.');
        }
    });
}

async function deleteTextbook(bookName, subject) {
    if (!confirm(`Delete "${bookName}"?`)) return;
    const result = await apiDeleteTextbook(bookName, subject);
    if (result.success) {
        loadTextbooksTab();
    } else {
        alert(result.error || 'Delete failed');
    }
}

// ============================================================
// SUMMARIES TAB
// ============================================================
async function loadSummariesTab() {
    await populateStudentSelect('sum-student-filter', true);

    const listEl = document.getElementById('sum-list');
    listEl.innerHTML = '<div class="skeleton-loader"></div>';

    const filterStudentId = document.getElementById('sum-student-filter').value || activeStudentId || null;
    const result = await apiGetSummaries(filterStudentId, 20);

    if (result.error) {
        listEl.innerHTML = `<div class="msg-error">${escapeHtml(result.error)}</div>`;
        return;
    }

    const summaries = result.summaries || [];

    if (summaries.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">&#128202;</div>
                <p>No session summaries yet</p>
                <p class="empty-sub">Summaries appear after your child uses the Guru device</p>
            </div>`;
        return;
    }

    const levelLabels = { strong: 'Strong', moderate: 'Moderate', needs_help: 'Needs Help', unknown: '-' };

    listEl.innerHTML = summaries.map(s => {
        const studentName = getStudentName(s.student_id);
        const topics = Array.isArray(s.topics_covered) ? s.topics_covered : [];
        const suggestions = Array.isArray(s.suggestions) ? s.suggestions : [];
        const level = s.understanding_level || 'unknown';
        const levelLabel = levelLabels[level] || '-';

        return `
            <div class="summary-card">
                <div class="summary-header">
                    <div>
                        <strong>${escapeHtml(studentName)}</strong>
                        <span class="badge badge-${level}" style="margin-left:8px;">${escapeHtml(levelLabel)}</span>
                    </div>
                    <div class="summary-date">${escapeHtml(s.session_date || '')}</div>
                </div>
                ${topics.length > 0 ? `
                    <div class="tag-list">
                        ${topics.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('')}
                    </div>` : ''}
                <div class="summary-text">${escapeHtml(s.summary || 'No summary available.')}</div>
                ${suggestions.length > 0 ? `
                    <div style="margin-top:8px;font-size:13px;color:#555;">
                        <strong>Suggestions:</strong>
                        <ul style="margin:4px 0 0 16px;padding:0;">
                            ${suggestions.map(sg => '<li>' + escapeHtml(sg) + '</li>').join('')}
                        </ul>
                    </div>` : ''}
            </div>`;
    }).join('');
}

// Summaries filter change
function initSummariesFilter() {
    const filter = document.getElementById('sum-student-filter');
    if (filter) {
        filter.addEventListener('change', () => loadSummariesTab());
    }
}

// ============================================================
// HELPER: Populate Student Dropdown
// ============================================================
async function populateStudentSelect(selectId, includeAll) {
    if (cachedStudents.length === 0) {
        const result = await apiGetStudents();
        if (result.students) cachedStudents = result.students;
    }

    const select = document.getElementById(selectId);
    if (!select) return;

    const currentVal = select.value;

    // Keep first option if it exists
    const firstOptionText = includeAll ? 'All Students' : 'Select Student';
    select.innerHTML = `<option value="">${firstOptionText}</option>`;

    cachedStudents.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name + ' (' + (s.class || '') + ')';
        select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function getStudentName(studentId) {
    const student = cachedStudents.find(s => s.id === studentId);
    return student ? student.name : 'Student';
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

// ============================================================
// LOAD SUMMARIES (for Refresh button in HTML)
// ============================================================
function loadSummaries() {
    loadSummariesTab();
}

// ============================================================
// APP INITIALIZATION
// ============================================================
(async function init() {
    // Initialize auth forms (login/signup handlers)
    initAuthForms();

    // Initialize form handlers
    initHomeworkForm();
    initTextbookForm();
    initSummariesFilter();

    // Check if user is already logged in
    const loggedIn = await checkAuth();
    if (loggedIn) {
        // Check if setup is done
        if (isSetupDone()) {
            showScreen('app-shell');
            initAppShell();
        } else {
            // Check if they have students (setup might have been done in another session)
            const studentsRes = await apiGetStudents();
            if (studentsRes.students && studentsRes.students.length > 0) {
                markSetupDone();
                showScreen('app-shell');
                initAppShell();
            } else {
                showScreen('setup-device-screen');
            }
        }
    } else {
        showScreen('welcome-screen');
    }
})();
