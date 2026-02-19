/* ============================================
   GURU.AI PARENT PORTAL - AUTH LAYER
   Handles login, signup, logout, token storage,
   and auth guard (redirect if not logged in).
   ============================================ */

// ---- TOKEN STORAGE ----
function saveAuthData(token, parent) {
    localStorage.setItem('guru_token', token);
    localStorage.setItem('guru_parent', JSON.stringify(parent));
}

function getToken() {
    return localStorage.getItem('guru_token');
}

function getParent() {
    try {
        return JSON.parse(localStorage.getItem('guru_parent'));
    } catch {
        return null;
    }
}

function clearAuthData() {
    localStorage.removeItem('guru_token');
    localStorage.removeItem('guru_parent');
}

function isLoggedIn() {
    return !!getToken();
}

// ---- LOGOUT ----
function logout() {
    clearAuthData();
    showPage('login-page');
}

// ---- AUTH GUARD ----
// Called on app init. Validates token with backend.
async function checkAuth() {
    if (!isLoggedIn()) {
        showPage('login-page');
        return false;
    }

    // Validate token with backend
    const result = await apiGetMe();
    if (result.error || !result.parent) {
        clearAuthData();
        showPage('login-page');
        return false;
    }

    // Update stored parent data (in case name changed etc.)
    saveAuthData(getToken(), result.parent);
    return true;
}

// ---- AUTH FORM HANDLERS ----

function initAuthForms() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            hideAuthMessages();
        });
    });

    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthMessages();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = e.target.querySelector('button[type="submit"]');

        setButtonLoading(btn, true);

        const result = await apiLogin(email, password);

        setButtonLoading(btn, false);

        if (result.success && result.token) {
            saveAuthData(result.token, result.parent);
            showPage('dashboard-page');
            loadDashboard();
        } else {
            showAuthError(result.error || 'Login failed');
        }
    });

    // Signup form
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthMessages();

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const btn = e.target.querySelector('button[type="submit"]');

        if (password.length < 6) {
            showAuthError('Password must be at least 6 characters');
            return;
        }

        setButtonLoading(btn, true);

        const result = await apiSignup(name, email, password);

        setButtonLoading(btn, false);

        if (result.success && result.token) {
            saveAuthData(result.token, result.parent);
            showPage('dashboard-page');
            loadDashboard();
        } else {
            showAuthError(result.error || 'Signup failed');
        }
    });

    // Set Password form
    document.getElementById('setpw-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthMessages();

        const email = document.getElementById('setpw-email').value.trim();
        const password = document.getElementById('setpw-password').value;
        const btn = e.target.querySelector('button[type="submit"]');

        if (password.length < 6) {
            showAuthError('Password must be at least 6 characters');
            return;
        }

        setButtonLoading(btn, true);

        const result = await apiSetPassword(email, password);

        setButtonLoading(btn, false);

        if (result.success && result.token) {
            saveAuthData(result.token, result.parent);
            showAuthSuccess('Password set! Redirecting...');
            setTimeout(() => {
                showPage('dashboard-page');
                loadDashboard();
            }, 1000);
        } else {
            showAuthError(result.error || 'Failed to set password');
        }
    });

    // Logout buttons
    document.getElementById('logout-btn').addEventListener('click', logout);
}

// ---- AUTH UI HELPERS ----

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
}

function showAuthSuccess(msg) {
    const el = document.getElementById('auth-success');
    el.textContent = msg;
    el.style.display = 'block';
}

function hideAuthMessages() {
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('auth-success').style.display = 'none';
}

function setButtonLoading(btn, loading) {
    const textEl = btn.querySelector('.btn-text');
    const loadingEl = btn.querySelector('.btn-loading');
    if (loading) {
        btn.disabled = true;
        if (textEl) textEl.style.display = 'none';
        if (loadingEl) loadingEl.style.display = 'inline';
    } else {
        btn.disabled = false;
        if (textEl) textEl.style.display = 'inline';
        if (loadingEl) loadingEl.style.display = 'none';
    }
}
