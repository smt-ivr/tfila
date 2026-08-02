const API_BASE = 'https://smti.uk/tfila/api';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupModals();
});

async function checkAuth() {
    const pass = localStorage.getItem('admin_pass');
    const ipWhitelisted = localStorage.getItem('ip_whitelisted');
    
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const ipLoader = document.getElementById('ip-check-loader');
    const loginFormContainer = document.getElementById('login-form-container');
    
    if (pass || ipWhitelisted === 'true') {
        showApp(loginScreen, appContainer);
        return;
    }

    loginScreen.classList.remove('hidden');
    loginScreen.classList.add('flex');
    appContainer.classList.add('hidden');
    appContainer.classList.remove('flex');
    
    ipLoader.classList.remove('hidden');
    ipLoader.classList.add('flex');
    loginFormContainer.classList.add('hidden');
    loginFormContainer.classList.remove('flex');

    try {
        const res = await fetch(`${API_BASE}/check-ip`);
        const data = await res.json().catch(() => ({}));
        
        if (data.whitelisted === true) {
            localStorage.setItem('ip_whitelisted', 'true');
            showApp(loginScreen, appContainer);
        } else {
            showLoginForm(ipLoader, loginFormContainer);
        }
    } catch (e) {
        showLoginForm(ipLoader, loginFormContainer);
    }
}

function showApp(loginScreen, appContainer) {
    loginScreen.classList.add('hidden');
    loginScreen.classList.remove('flex');
    appContainer.classList.remove('hidden');
    appContainer.classList.add('flex');
    switchView('reports');
}

function showLoginForm(ipLoader, loginFormContainer) {
    ipLoader.classList.add('hidden');
    ipLoader.classList.remove('flex');
    loginFormContainer.classList.remove('hidden');
    loginFormContainer.classList.add('flex');
    setTimeout(() => document.getElementById('password-input').focus(), 100);
}

async function login() {
    const passInput = document.getElementById('password-input');
    const pass = passInput.value;
    const errorMsg = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    
    if (!pass) return;

    errorMsg.classList.add('hidden');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pass })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            localStorage.setItem('admin_pass', pass);
            checkAuth();
        } else {
            errorMsg.innerText = data.error || data.message || 'שגיאה באימות נתונים מול השרת';
            errorMsg.classList.remove('hidden');
            passInput.value = ''; 
            passInput.focus();
        }
    } catch (e) {
        errorMsg.innerText = 'שגיאת תקשורת - השרת אינו מגיב';
        errorMsg.classList.remove('hidden');
    } finally {
        btn.innerHTML = 'היכנס למערכת';
        btn.disabled = false;
    }
}

function logout() {
    localStorage.removeItem('admin_pass');
    localStorage.removeItem('ip_whitelisted');
    
    document.getElementById('password-input').value = '';
    document.getElementById('login-error').classList.add('hidden');
    
    checkAuth();
}

function switchView(viewName) {
    const views = ['reports', 'students', 'vacations', 'phone'];
    const activeNavClass = "flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg font-bold transition-all border border-indigo-100 text-sm cursor-pointer";
    const inactiveNavClass = "flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg font-medium transition-all text-sm cursor-pointer";

    views.forEach(v => {
        const viewEl = document.getElementById(`${v}-view`);
        const navEl = document.getElementById(`nav-${v}`);
        
        if (v === viewName) {
            viewEl.classList.remove('hidden');
            if (v === 'students' || v === 'vacations' || v === 'phone') {
                viewEl.classList.add('flex');
            } else {
                viewEl.classList.add('block');
            }
            if (navEl) navEl.className = activeNavClass;
        } else {
            viewEl.classList.add('hidden');
            viewEl.classList.remove('flex', 'block');
            if (navEl) navEl.className = inactiveNavClass;
        }
    });

    if (viewName === 'reports' && typeof loadReports === 'function') loadReports();
    if (viewName === 'students' && typeof loadStudents === 'function') loadStudents();
    if (viewName === 'vacations' && typeof loadVacations === 'function') loadVacations();
    if (viewName === 'phone' && typeof loadPhoneSettings === 'function') loadPhoneSettings();
}

function openEmailModal() {
    document.getElementById('email-modal').classList.remove('hidden');
    document.getElementById('email-modal').classList.add('flex');
}

function closeEmailModal() {
    document.getElementById('email-modal').classList.add('hidden');
    document.getElementById('email-modal').classList.remove('flex');
}

async function sendEmailAction(btn) {
    const email = document.getElementById('email-input').value.trim();
    if (!email) return showToast('נא להזין אימייל', 'error');
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        const pass = localStorage.getItem('admin_pass');
        let url = `${API_BASE}/send-email?email=${encodeURIComponent(email)}`;
        
        if (typeof currentFetchDate !== 'undefined' && currentFetchDate) {
            url += `&date=${currentFetchDate}`;
        }
        
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass }
        });
        
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'אירעה שגיאה בשליחת המייל');
        
        showToast('המייל נשלח בהצלחה!', 'success');
        closeEmailModal();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// -------------------------------------------------------------
// מערכת הודעות קופצות ומודלים מותאמים (במקום alert ו-prompt)
// -------------------------------------------------------------

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-600' : 'bg-emerald-600';
    const icon = type === 'error' ? 'fa-times-circle' : 'fa-check-circle';
    
    toast.className = `${bgColor} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0 border border-black/10`;
    toast.innerHTML = `<i class="fas ${icon} text-lg"></i><span class="font-bold text-sm">${msg}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-y-10', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

let activeConfirmCallback = null;
let activePromptCallback = null;

function setupModals() {
    // מודל אישור
    document.getElementById('confirm-btn-yes').addEventListener('click', () => {
        if (activeConfirmCallback) activeConfirmCallback();
        closeCustomConfirm();
    });
    
    // מודל קלט - כפתור שמירה
    document.getElementById('prompt-btn-save').addEventListener('click', () => {
        if (activePromptCallback) activePromptCallback(document.getElementById('custom-prompt-input').value);
        closeCustomPrompt();
    });
    
    // אנטר במודל קלט
    document.getElementById('custom-prompt-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('prompt-btn-save').click();
        }
    });
}

function customConfirm(msg, callback) {
    document.getElementById('custom-confirm-msg').innerText = msg;
    activeConfirmCallback = callback;
    document.getElementById('custom-confirm-modal').classList.replace('hidden', 'flex');
}

function closeCustomConfirm() {
    document.getElementById('custom-confirm-modal').classList.replace('flex', 'hidden');
    activeConfirmCallback = null;
}

function customPrompt(title, desc, defaultValue, callback) {
    document.getElementById('custom-prompt-title').innerText = title;
    document.getElementById('custom-prompt-desc').innerText = desc;
    const input = document.getElementById('custom-prompt-input');
    input.value = defaultValue || '';
    activePromptCallback = callback;
    
    document.getElementById('custom-prompt-modal').classList.replace('hidden', 'flex');
    setTimeout(() => input.focus(), 100);
}

function closeCustomPrompt() {
    document.getElementById('custom-prompt-modal').classList.replace('flex', 'hidden');
    activePromptCallback = null;
}
