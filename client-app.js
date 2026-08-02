const API_BASE = 'https://smti.uk/tfila/api';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

async function checkAuth() {
    const pass = localStorage.getItem('admin_pass');
    const ipWhitelisted = localStorage.getItem('ip_whitelisted');
    
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const ipLoader = document.getElementById('ip-check-loader');
    const loginFormContainer = document.getElementById('login-form-container');
    
    // אם יש אימות קודם (סיסמה או IP מאושר מהזיכרון), כנס ישירות
    if (pass || ipWhitelisted === 'true') {
        showApp(loginScreen, appContainer);
        return;
    }

    // הצגת מסך ההתחברות עם מסך הטעינה של בדיקת ה-IP
    loginScreen.classList.remove('hidden');
    loginScreen.classList.add('flex');
    appContainer.classList.add('hidden');
    appContainer.classList.remove('flex');
    
    ipLoader.classList.remove('hidden');
    ipLoader.classList.add('flex');
    loginFormContainer.classList.add('hidden');
    loginFormContainer.classList.remove('flex');

    try {
        // בדיקת הרשאת IP מול השרת
        const res = await fetch(`${API_BASE}/check-ip`);
        const data = await res.json().catch(() => ({}));
        
        if (data.whitelisted === true) {
            // ה-IP מורשה, שומרים בזיכרון ופותחים את המערכת
            localStorage.setItem('ip_whitelisted', 'true');
            showApp(loginScreen, appContainer);
        } else {
            // ה-IP אינו מורשה, מציגים את שדה הסיסמה
            showLoginForm(ipLoader, loginFormContainer);
        }
    } catch (e) {
        // במקרה של שגיאת רשת, נפול חזרה לבקשת סיסמה
        showLoginForm(ipLoader, loginFormContainer);
    }
}

// פונקציית עזר להצגת האפליקציה המרכזית
function showApp(loginScreen, appContainer) {
    loginScreen.classList.add('hidden');
    loginScreen.classList.remove('flex');
    appContainer.classList.remove('hidden');
    appContainer.classList.add('flex');
    switchView('reports');
}

// פונקציית עזר להצגת שדה הסיסמה
function showLoginForm(ipLoader, loginFormContainer) {
    ipLoader.classList.add('hidden');
    ipLoader.classList.remove('flex');
    loginFormContainer.classList.remove('hidden');
    loginFormContainer.classList.add('flex');
    // מיקוד אוטומטי על תיבת הסיסמה
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
            // הצגת השגיאה ומחיקת תוכן הסיסמה המוטעה מהשדה
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
    // מחיקת כל ההרשאות מהזיכרון
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

// שליחת הדוח למייל בפועל מול ה-API
async function sendEmailAction(btn) {
    const email = document.getElementById('email-input').value.trim();
    if (!email) return alert('נא להזין אימייל');
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        const pass = localStorage.getItem('admin_pass');
        let url = `${API_BASE}/send-email?email=${encodeURIComponent(email)}`;
        
        // צירוף תאריך אם משתמשים בתאריך ספציפי (ולא בשבוע נוכחי)
        if (typeof currentFetchDate !== 'undefined' && currentFetchDate) {
            url += `&date=${currentFetchDate}`;
        }
        
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Admin-Pass': pass
            }
        });
        
        const data = await res.json().catch(() => ({}));
        
        if (!res.ok) {
            throw new Error(data.error || 'אירעה שגיאה בשליחת המייל');
        }
        
        alert('המייל נשלח בהצלחה!');
        closeEmailModal();
        
    } catch (error) {
        alert(error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
