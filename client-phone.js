let currentWhitelist = [];
let currentEmails = [];

async function loadPhoneSettings() {
    const didEl = document.getElementById('phone-did');
    const extEl = document.getElementById('phone-ext');
    const statusDiv = document.getElementById('api-status-result');
    const emailsTbody = document.getElementById('emails-table-body');
    
    didEl.innerHTML = '<i class="fas fa-spinner fa-spin text-indigo-300"></i>';
    extEl.innerText = 'טוען נתונים...';
    statusDiv.innerHTML = '<div class="text-slate-400 font-bold"><i class="fas fa-circle-notch fa-spin ml-2"></i>קורא נתוני שלוחה...</div>';
    emailsTbody.innerHTML = `<tr><td colspan="2" class="py-4 text-center text-indigo-600"><i class="fas fa-circle-notch fa-spin text-2xl"></i></td></tr>`;
    
    try {
        const pass = localStorage.getItem('admin_pass');
        const res = await fetch(`${API_BASE}/phone-settings/routing-info`, {
            headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass }
        });
        
        if (res.status === 401) return logout();
        
        const data = await res.json();
        if (data.success) {
            didEl.innerText = data.data.did || 'לא נמצא מספר';
            extEl.innerText = data.data.extension ? `שלוחה: /${data.data.extension}` : 'לא נמצא ניתוב מוגדר';
            
            analyzeExtensionSettings(data.data.extSettings);
        } else {
            throw new Error('שגיאה בטעינת נתוני הניתוב');
        }
        
        loadWhitelist();
    } catch (error) {
        didEl.innerText = 'שגיאה';
        extEl.innerText = 'לא ניתן לטעון נתונים';
        statusDiv.innerHTML = '<div class="text-red-500 font-bold">שגיאת רשת בטעינת הנתונים</div>';
        emailsTbody.innerHTML = `<tr><td colspan="2" class="py-4 text-center text-red-500 font-bold">שגיאה בטעינת מיילים</td></tr>`;
    }
}

function analyzeExtensionSettings(iniData) {
    const statusDiv = document.getElementById('api-status-result');
    const emailsTbody = document.getElementById('emails-table-body');
    currentEmails = [];

    if (!iniData) {
        statusDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-bold flex flex-col gap-2 shadow-sm text-right">
                <div class="flex items-center gap-2"><i class="fas fa-times-circle text-lg"></i><span>לא ניתן לקרוא הגדרות!</span></div>
                <div class="text-sm font-normal">לא נמצא קובץ ext.ini או שהשלוחה ריקה. נא לפנות למתכנת.</div>
            </div>`;
        emailsTbody.innerHTML = `<tr><td colspan="2" class="py-4 text-center text-slate-500 font-bold">לא נמצאו הגדרות לשלוחה</td></tr>`;
        document.getElementById('total-emails-count').innerText = "0";
        return;
    }

    // ניתוח סטטוס השלוחה
    const isApi = iniData.includes('type=api');
    const hasLink = iniData.includes('api_link=') || iniData.includes('api_link =');
    const isWhitelistOn = iniData.includes('white_list=yes');
    
    let linkMatch = iniData.match(/api_link\s*=\s*(.+)/);
    let apiLink = linkMatch ? linkMatch[1].trim() : 'חסר קישור';

    let htmlStatus = '';
    
    if (isApi && hasLink && apiLink.includes('smti.uk/tfila/api')) {
        htmlStatus += `<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 mb-2 shadow-sm"><i class="fas fa-check-circle"></i>השלוחה מוגדרת כראוי כ-API</div>`;
        htmlStatus += `<div class="text-xs bg-slate-50 text-slate-500 border border-slate-200 px-3 py-1.5 rounded text-left font-mono" dir="ltr" title="נתיב ה-API">${apiLink}</div>`;
    } else {
        htmlStatus += `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-bold flex items-start gap-2 shadow-sm text-right"><i class="fas fa-exclamation-triangle text-lg mt-0.5"></i><div>תקלה בהגדרות ה-API בשלוחה! ייתכן ואין קישור תקין או שהשלוחה אינה מוגדרת כ-API. נא לפנות למתכנת.</div></div>`;
    }

    if (!isWhitelistOn) {
        htmlStatus += `<div class="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 mt-3 shadow-sm"><i class="fas fa-shield-alt"></i>אזהרה: הרשימה הלבנה מנותקת! (חסר white_list=yes). כל אחד יכול לחייג למערכת.</div>`;
    } else {
        htmlStatus += `<div class="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 mt-3 shadow-sm"><i class="fas fa-lock"></i>הרשימה הלבנה פעילה ומגינה על המערכת</div>`;
    }
    
    statusDiv.innerHTML = htmlStatus;

    // ניתוח מיילים
    const regex = /^api_add_\d+=email\d*=(.+)$/gmi;
    let match;
    while ((match = regex.exec(iniData)) !== null) {
        if(match[1]) currentEmails.push(match[1].trim());
    }
    
    document.getElementById('total-emails-count').innerText = currentEmails.length;
    renderEmails();
}

function renderEmails() {
    const tbody = document.getElementById('emails-table-body');
    let rows = '';
    
    if (currentEmails.length === 0) {
        rows = `<tr><td colspan="2" class="py-6 text-center text-slate-500 font-bold">לא מוגדרים מיילים בשלוחה</td></tr>`;
    } else {
        currentEmails.forEach((email, index) => {
            rows += `
            <tr class="hover:bg-indigo-50/30 bg-white border-b border-slate-200 transition-colors">
                <td class="px-4 py-3 border-x border-slate-300 font-bold text-slate-700 tracking-wider text-sm text-left" dir="ltr">${email}</td>
                <td class="px-2 py-3 border-x border-slate-300 text-center w-24">
                    <button onclick="editEmail(${index})" class="text-slate-400 hover:text-indigo-600 p-2 transition-colors" title="ערוך"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteEmail(${index})" class="text-slate-400 hover:text-red-500 p-2 transition-colors" title="מחק"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = rows;
}

async function saveEmailsToBackend() {
    try {
        const pass = localStorage.getItem('admin_pass');
        const res = await fetch(`${API_BASE}/phone-settings/update-emails`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass },
            body: JSON.stringify({ emails: currentEmails })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'שגיאה בעדכון המיילים');
        
        document.getElementById('total-emails-count').innerText = currentEmails.length;
        renderEmails();
        showToast('המיילים עודכנו בהצלחה במערכת הטלפונית', 'success');
    } catch (error) {
        showToast(error.message, 'error');
        // טעינה מחדש של הדף כדי לאפס במקרה של שגיאה
        loadPhoneSettings(); 
    }
}

function addEmailAction() {
    customPrompt('הוספת כתובת מייל', 'הזן את כתובת האימייל החדשה שברצונך להוסיף:', '', (newEmail) => {
        newEmail = newEmail.trim();
        if (!newEmail || !newEmail.includes('@')) return showToast('כתובת אימייל לא חוקית', 'error');
        
        if (currentEmails.includes(newEmail)) return showToast('המייל כבר קיים ברשימה', 'error');
        
        currentEmails.push(newEmail);
        saveEmailsToBackend();
    });
}

function deleteEmail(index) {
    customConfirm(`האם אתה בטוח שברצונך למחוק את המייל:\n${currentEmails[index]}?`, () => {
        currentEmails.splice(index, 1);
        saveEmailsToBackend();
    });
}

function editEmail(index) {
    const oldEmail = currentEmails[index];
    customPrompt('עריכת כתובת מייל', `הזן את הכתובת החדשה במקום:\n${oldEmail}`, oldEmail, (newEmail) => {
        newEmail = newEmail.trim();
        if (!newEmail || newEmail === oldEmail) return;
        if (!newEmail.includes('@')) return showToast('כתובת אימייל לא חוקית', 'error');
        
        currentEmails[index] = newEmail;
        saveEmailsToBackend();
    });
}


async function loadWhitelist() {
    const tbody = document.getElementById('whitelist-table-body');
    tbody.innerHTML = `<tr><td colspan="2" class="py-8 text-center text-indigo-600"><i class="fas fa-circle-notch fa-spin text-3xl"></i></td></tr>`;
    
    try {
        const pass = localStorage.getItem('admin_pass');
        const res = await fetch(`${API_BASE}/phone-settings/whitelist`, {
            headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת הרשימה הלבנה');
        
        currentWhitelist = data.data || [];
        document.getElementById('total-whitelist-count').innerText = currentWhitelist.length;
        renderWhitelist();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="2" class="py-6 text-center text-red-600 font-bold bg-red-50">שגיאה בטעינת הרשימה: ${error.message}</td></tr>`;
    }
}

function renderWhitelist() {
    const tbody = document.getElementById('whitelist-table-body');
    let rows = '';
    
    if (currentWhitelist.length === 0) {
        rows = `<tr><td colspan="2" class="py-6 text-center text-slate-500 font-bold">הרשימה הלבנה ריקה</td></tr>`;
    } else {
        currentWhitelist.forEach(num => {
            rows += `
            <tr class="hover:bg-indigo-50/30 bg-white border-b border-slate-200 transition-colors">
                <td class="px-6 py-3 border-x border-slate-300 font-bold text-slate-700 text-lg tracking-wider text-left" dir="ltr">${num}</td>
                <td class="px-6 py-3 border-x border-slate-300 text-center w-32">
                    <button onclick="editWhitelistNumber('${num}')" class="text-slate-400 hover:text-indigo-600 p-2 transition-colors" title="ערוך"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteWhitelistNumber('${num}')" class="text-slate-400 hover:text-red-500 p-2 transition-colors ml-2" title="מחק"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = rows;
}

function addWhitelistNumber() {
    const input = document.getElementById('new-whitelist-num');
    const number = input.value.trim();
    
    if (!number) return showToast('נא להזין מספר טלפון', 'error');
    
    const btn = document.getElementById('add-whitelist-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    const pass = localStorage.getItem('admin_pass');
    fetch(`${API_BASE}/phone-settings/whitelist/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass },
        body: JSON.stringify({ number })
    }).then(res => res.json()).then(data => {
        if (!data.success) throw new Error(data.error || data.message || 'שגיאה בהוספה');
        input.value = '';
        currentWhitelist = data.data;
        document.getElementById('total-whitelist-count').innerText = currentWhitelist.length;
        renderWhitelist();
        showToast('המספר התווסף בהצלחה', 'success');
    }).catch(err => {
        showToast(err.message, 'error');
    }).finally(() => {
        btn.innerHTML = 'הוסף <i class="fas fa-plus mr-1"></i>';
        btn.disabled = false;
    });
}

function deleteWhitelistNumber(number) {
    customConfirm(`האם אתה בטוח שברצונך למחוק את המספר ${number} מהרשימה המורשית?`, () => {
        const pass = localStorage.getItem('admin_pass');
        fetch(`${API_BASE}/phone-settings/whitelist/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass },
            body: JSON.stringify({ number })
        }).then(res => res.json()).then(data => {
            if (!data.success) throw new Error(data.error || 'שגיאה במחיקה');
            currentWhitelist = data.data;
            document.getElementById('total-whitelist-count').innerText = currentWhitelist.length;
            renderWhitelist();
            showToast('המספר נמחק בהצלחה', 'success');
        }).catch(err => showToast(err.message, 'error'));
    });
}

function editWhitelistNumber(oldNumber) {
    customPrompt('עריכת מספר מורשה', `הזן את המספר החדש במקום:\n${oldNumber}`, oldNumber, (newNumber) => {
        newNumber = newNumber.trim();
        if (!newNumber || newNumber === oldNumber) return;
        
        const pass = localStorage.getItem('admin_pass');
        fetch(`${API_BASE}/phone-settings/whitelist/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass },
            body: JSON.stringify({ oldNumber: oldNumber, newNumber: newNumber })
        }).then(res => res.json()).then(data => {
            if (!data.success) throw new Error(data.error || 'שגיאה בעדכון');
            currentWhitelist = data.data;
            document.getElementById('total-whitelist-count').innerText = currentWhitelist.length;
            renderWhitelist();
            showToast('המספר עודכן בהצלחה', 'success');
        }).catch(err => showToast(err.message, 'error'));
    });
}
