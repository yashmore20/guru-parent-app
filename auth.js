/* ============================================================
   GURU.AI PARENT PORTAL - AUTH LAYER
   Token storage, login/signup form handlers, auth guard.
   Works with new screen system: showScreen()
   ============================================================ */

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
    localStorage.removeItem('guru_setup_done');
}

function isLoggedIn() {
    return !!getToken();
}

function isSetupDone() {
    return localStorage.getItem('guru_setup_done') === 'true';
}

function markSetupDone() {
    localStorage.setItem('guru_setup_done', 'true');
}

// ---- LOGOUT ----
function logout() {
    clearAuthData();
    toggleProfileMenu(true); // close menu
    showScreen('welcome-screen');
}

// ---- AUTH GUARD ----
async function checkAuth() {
    if (!isLoggedIn()) {
        return false;
    }
    const result = await apiGetMe();
    if (result.error || !result.parent) {
        clearAuthData();
        return false;
    }
    // Update stored parent data
    saveAuthData(getToken(), result.parent);
    return true;
}

// ---- PASSWORD TOGGLE ----
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '&#128584;'; // see-no-evil monkey
    } else {
        input.type = 'password';
        btn.innerHTML = '&#128065;'; // eye
    }
}

// ---- PASSWORD STRENGTH ----
function initPasswordStrength() {
    const pwInput = document.getElementById('signup-password');
    if (!pwInput) return;

    pwInput.addEventListener('input', () => {
        const val = pwInput.value;
        const fill = document.querySelector('#pw-strength .pw-fill');
        if (!fill) return;

        if (!val) {
            fill.style.width = '0%';
            fill.style.background = 'transparent';
            return;
        }

        if (val.length < 6) {
            fill.style.width = '25%';
            fill.style.background = '#F44336';
        } else if (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)) {
            fill.style.width = '100%';
            fill.style.background = '#4CAF50';
        } else if (val.length >= 6) {
            fill.style.width = '60%';
            fill.style.background = '#FF9800';
        }
    });
}

// ---- SET BUTTON LOADING STATE ----
function setButtonLoading(btn, loading) {
    if (!btn) return;
    const textEl = btn.querySelector('.btn-text');
    const loaderEl = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (loading) {
        if (textEl) textEl.style.display = 'none';
        if (loaderEl) loaderEl.style.display = 'inline-block';
    } else {
        if (textEl) textEl.style.display = 'inline';
        if (loaderEl) loaderEl.style.display = 'none';
    }
}

// ---- SHOW/HIDE ERROR/SUCCESS MESSAGES ----
function showMsg(elId, msg) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

function hideMsg(elId) {
    const el = document.getElementById(elId);
    if (el) el.style.display = 'none';
}

// ---- AUTH FORM HANDLERS ----
function initAuthForms() {
    initPasswordStrength();

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideMsg('login-error');

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const btn = loginForm.querySelector('button[type="submit"]');

            if (!email || !password) {
                showMsg('login-error', 'Please enter email and password');
                return;
            }

            setButtonLoading(btn, true);
            const result = await apiLogin(email, password);
            setButtonLoading(btn, false);

            if (result.success && result.token) {
                saveAuthData(result.token, result.parent);
                // Check if user has students already (returning user)
                const studentsRes = await apiGetStudents();
                if (studentsRes.students && studentsRes.students.length > 0) {
                    markSetupDone();
                    showScreen('app-shell');
                    initAppShell();
                } else {
                    // New user or no students - go to setup
                    showScreen('setup-device-screen');
                }
            } else {
                showMsg('login-error', result.error || 'Login failed. Check your email and password.');
            }
        });
    }

    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideMsg('signup-error');

            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const phone = document.getElementById('signup-phone').value.trim();
            const password = document.getElementById('signup-password').value;
            const btn = signupForm.querySelector('button[type="submit"]');

            if (!name || !email || !password) {
                showMsg('signup-error', 'Please fill in all required fields');
                return;
            }
            if (password.length < 6) {
                showMsg('signup-error', 'Password must be at least 6 characters');
                return;
            }

            setButtonLoading(btn, true);
            const result = await apiSignup(name, email, password, phone);
            setButtonLoading(btn, false);

            if (result.success && result.token) {
                saveAuthData(result.token, result.parent);
                // New user - start setup flow
                showScreen('setup-device-screen');
            } else {
                showMsg('signup-error', result.error || 'Failed to create account. Please try again.');
            }
        });
    }
}
