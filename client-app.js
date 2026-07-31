const API_BASE = 'https://smti.uk/tfila/api';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    document.getElementById('password-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
});

function checkAuth() {
    const pass = localStorage.getItem('admin_pass');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    
    if (!pass) {
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('flex');
        appContainer.classList.add('hidden');
        appContainer.classList.remove('flex');
        
        // וידוא שהפוקוס קופץ ישר לתיבת הסיסמה
        setTimeout(() => document.getElementById('password-input').focus(), 100);
    } else {
        loginScreen.classList.add('hidden');
        loginScreen.classList.remove('flex');
        appContainer.classList.remove('hidden');
        appContainer.classList.add('flex');
        
        switchView('reports');
    }
}

async function login() {
    const pass = document.getElementById('password-input').value;
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

        // ניסיון לחלץ את תוכן התשובה מהשרת
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            localStorage.setItem('admin_pass', pass);
            checkAuth();
        } else {
            // הצגת הודעת השגיאה המדויקת מהשרת
            errorMsg.innerText = data.error || data.message || 'שגיאה באימות נתונים מול השרת';
            errorMsg.classList.remove('hidden');
        }
    } catch (e) {
        // שגיאה שמוצגת רק אם השרת לא מגיב או שאין אינטרנט
        errorMsg.innerText = 'שגיאת תקשורת - השרת אינו מגיב';
        errorMsg.classList.remove('hidden');
    } finally {
        btn.innerHTML = 'היכנס';
        btn.disabled = false;
    }
}

function logout() {
    localStorage.removeItem('admin_pass');
    document.getElementById('password-input').value = '';
    checkAuth();
}

function switchView(viewName) {
    const views = ['reports', 'students', 'vacations'];
    const activeNavClass = "flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg font-bold transition-all border border-indigo-100 text-sm cursor-pointer";
    const inactiveNavClass = "flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg font-medium transition-all text-sm cursor-pointer";

    views.forEach(v => {
        const viewEl = document.getElementById(`${v}-view`);
        const navEl = document.getElementById(`nav-${v}`);
        
        if (v === viewName) {
            viewEl.classList.remove('hidden');
            if (v === 'students' || v === 'vacations') {
                viewEl.classList.add('flex');
            } else {
                viewEl.classList.add('block');
            }
            navEl.className = activeNavClass;
        } else {
            viewEl.classList.add('hidden');
            viewEl.classList.remove('flex', 'block');
            navEl.className = inactiveNavClass;
        }
    });

    if (viewName === 'reports' && typeof loadReports === 'function') loadReports();
    if (viewName === 'students' && typeof loadStudents === 'function') loadStudents();
    if (viewName === 'vacations' && typeof loadVacations === 'function') loadVacations();
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
