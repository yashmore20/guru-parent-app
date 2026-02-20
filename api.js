/* ============================================
   GURU.AI PARENT PORTAL - API LAYER
   All backend communication goes through here.
   API_BASE points to the Render-hosted Flask backend.
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

// ---- CORE API CALL (with auto-retry for Render cold starts) ----
async function apiCall(endpoint, options = {}, _retryCount = 0) {
    const isFormData = options.body instanceof FormData;
    const headers = getAuthHeaders(!isFormData);

    if (options.headers) {
        Object.assign(headers, options.headers);
    }
    if (isFormData) {
        delete headers['Content-Type'];
    }

    try {
        const response = await fetch(API_BASE + endpoint, {
            ...options,
            headers: headers
        });

        // Handle 401 - token expired or invalid
        if (response.status === 401) {
            clearAuthData();
            showScreen('welcome-screen');
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
        console.error('API Error:', endpoint, error.message, 'retry:', _retryCount);

        // Render free tier sleeps after inactivity - auto retry up to 2 times
        if (_retryCount < 2) {
            console.log('Server may be waking up... retrying in ' + ((_retryCount + 1) * 3) + 's');
            showServerWaking(true);
            await new Promise(r => setTimeout(r, (_retryCount + 1) * 3000));
            return apiCall(endpoint, options, _retryCount + 1);
        }

        showServerWaking(false);
        return { error: 'Server is starting up. Please wait 30 seconds and try again.', _status: 0 };
    }
}

// ---- Show/hide "server waking up" banner ----
function showServerWaking(show) {
    let banner = document.getElementById('server-waking-banner');
    if (show) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'server-waking-banner';
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#FF9800;color:#fff;text-align:center;padding:10px 16px;font-size:14px;font-weight:600;animation:pulse 1.5s infinite;';
            banner.textContent = 'Waking up server... please wait a moment';
            document.body.prepend(banner);
        }
    } else {
        if (banner) banner.remove();
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

async function apiSignup(name, email, password, phone) {
    const payload = { name, email, password };
    if (phone) payload.phone = phone;
    return apiCall('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload)
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
