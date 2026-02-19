/* ============================================
   GURU.AI PARENT PORTAL - API LAYER
   All backend communication goes through here.

   API_BASE: empty string = same origin (served from Flask)
   Change to full URL if hosting separately, e.g.:
   const API_BASE = 'https://guru-ai-k1so.onrender.com';
   ============================================ */

const API_BASE = 'https://guru-ai-mvp.onrender.com';

// ---- AUTH HEADER ----
function getAuthHeaders(isJSON = true) {
    const token = localStorage.getItem('guru_token');
    const headers = {};
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    if (isJSON) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

// ---- CORE API CALL ----
async function apiCall(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    const headers = getAuthHeaders(!isFormData);

    // Merge any extra headers (but don't set Content-Type for FormData)
    if (options.headers) {
        Object.assign(headers, options.headers);
    }
    if (isFormData) {
        delete headers['Content-Type']; // browser sets boundary automatically
    }

    try {
        const response = await fetch(API_BASE + endpoint, {
            ...options,
            headers: headers
        });

        // Handle 401 - token expired or invalid
        if (response.status === 401) {
            clearAuthData();
            showPage('login-page');
            return { error: 'Session expired. Please login again.', _status: 401 };
        }

        // Try to parse JSON, fall back to text error
        let data;
        const text = await response.text();
        try {
            data = JSON.parse(text);
        } catch (parseErr) {
            console.error('API non-JSON response:', endpoint, response.status, text.substring(0, 200));
            return { error: 'Server error (' + response.status + '). Please try again.', _status: response.status };
        }

        data._status = response.status;
        return data;

    } catch (error) {
        console.error('API Error:', endpoint, error.message);
        return { error: 'Network error: ' + error.message, _status: 0 };
    }
}

// ============================================
// AUTH API
// ============================================

async function apiLogin(email, password) {
    return apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

async function apiSignup(name, email, password) {
    return apiCall('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
}

async function apiSetPassword(email, password) {
    return apiCall('/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

async function apiGetMe() {
    return apiCall('/auth/me');
}

// ============================================
// STUDENTS API
// ============================================

async function apiGetStudents() {
    return apiCall('/select-student');
}

async function apiAddStudent(name, studentClass, board) {
    return apiCall('/add-student', {
        method: 'POST',
        body: JSON.stringify({ name: name, class: studentClass, board: board })
    });
}

async function apiDeleteStudent(studentId) {
    return apiCall('/delete-student', {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId })
    });
}

// ============================================
// HOMEWORK API
// ============================================

async function apiGetHomework() {
    return apiCall('/api/parent/homework');
}

async function apiAddHomework(studentId, subject, text) {
    return apiCall('/parent/homework', {
        method: 'POST',
        body: JSON.stringify({
            student_id: studentId,
            subject: subject,
            homework_text: text
        })
    });
}

// ============================================
// SESSION SUMMARIES API
// ============================================

async function apiGetSummaries(studentId, limit) {
    let url = '/api/session-summaries?limit=' + (limit || 20);
    if (studentId) {
        url += '&student_id=' + studentId;
    }
    return apiCall(url);
}

// ============================================
// TEXTBOOKS API
// ============================================

async function apiGetTextbooks() {
    return apiCall('/textbooks');
}

async function apiUploadTextbook(file, subject, classLevel, bookName) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    formData.append('class_level', classLevel);
    formData.append('book_name', bookName);

    return apiCall('/upload-textbook', {
        method: 'POST',
        body: formData
    });
}

async function apiDeleteTextbook(bookName, subject) {
    return apiCall('/delete-textbook', {
        method: 'POST',
        body: JSON.stringify({ book_name: bookName, subject: subject })
    });
}

// ============================================
// DEVICE PAIRING API
// ============================================

async function apiPairDevice(deviceCode) {
    return apiCall('/api/device/pair', {
        method: 'POST',
        body: JSON.stringify({ device_code: deviceCode })
    });
}
