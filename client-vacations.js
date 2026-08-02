let vacationDates = new Set();
let currentCalendarDate = new Date();

async function loadVacations() {
    const container = document.getElementById('calendar-grid-container');
    container.innerHTML = `<div class="flex flex-col items-center justify-center h-64 text-indigo-600"><i class="fas fa-circle-notch fa-spin text-4xl mb-4"></i><span class="font-bold">טוען יומן חופשות...</span></div>`;
    
    try {
        const pass = localStorage.getItem('admin_pass');
        const res = await fetch(`${API_BASE}/vacations`, {
            headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass }
        });
        
        if (res.status === 401) {
            logout();
            return;
        }
        
        if (!res.ok) throw new Error('שגיאה בטעינת נתוני החופשות');
        
        const data = await res.json();
        vacationDates = new Set(data); 
        
        renderCalendar();
    } catch (error) {
        container.innerHTML = `<div class="text-center text-red-600 font-bold bg-red-50 p-6 rounded-lg mt-10">${error.message}</div>`;
    }
}

// פונקציה חכמה הממירה מספרי ימים לאותיות עבריות תקניות
function numberToHebrewLetters(num) {
    if (num === 15) return 'ט"ו';
    if (num === 16) return 'ט"ז';
    
    const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    const units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    
    let result = tens[Math.floor(num / 10)] + units[num % 10];
    
    if (result.length === 1) return result + "'";
    return result.slice(0, -1) + '"' + result.slice(-1);
}

// פונקציה הממירה את השנה (למשל 5786) לאותיות (תשפ"ו)
function yearToHebrewLetters(year) {
    let remaining = year % 1000; // מתעלמים מהאלפים (ה' אלפים)
    let result = '';

    if (remaining >= 400) { result += 'ת'; remaining -= 400; }
    if (remaining >= 400) { result += 'ת'; remaining -= 400; } 
    if (remaining >= 300) { result += 'ש'; remaining -= 300; }
    if (remaining >= 200) { result += 'ר'; remaining -= 200; }
    if (remaining >= 100) { result += 'ק'; remaining -= 100; }

    if (remaining === 15) {
        result += 'טו';
    } else if (remaining === 16) {
        result += 'טז';
    } else {
        const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
        const units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
        result += tens[Math.floor(remaining / 10)];
        result += units[remaining % 10];
    }

    if (result.length === 1) return result + "'";
    return result.slice(0, -1) + '"' + result.slice(-1);
}

// מחלץ ומרכיב כותרת עברית מלאה (חודשים + שנה)
function getHebrewTitle(year, month) {
    const formatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); 
    
    const firstParts = formatter.formatToParts(firstDay);
    const lastParts = formatter.formatToParts(lastDay);
    
    const m1 = firstParts.find(p => p.type === 'month')?.value || '';
    const m2 = lastParts.find(p => p.type === 'month')?.value || '';
    
    // משיכת השנה כמספר (5786) והמרתה לאותיות בצורה ידנית
    const yNumStr = lastParts.find(p => p.type === 'year')?.value;
    const yNum = yNumStr ? parseInt(yNumStr) : 5786;
    const hebYearStr = yearToHebrewLetters(yNum);
    
    if (m1 === m2) {
        return `${m1} ${hebYearStr}`;
    }
    return `${m1} - ${m2} ${hebYearStr}`;
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthFormatter = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });
    const titleGregorian = monthFormatter.format(currentCalendarDate);
    const titleHebrew = getHebrewTitle(year, month);
    
    document.getElementById('calendar-title').innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fas fa-calendar-alt text-indigo-500"></i>
            <span>${titleGregorian}</span>
            <span class="text-slate-300">|</span>
            <span class="text-slate-600 text-xl font-black">${titleHebrew}</span>
        </div>
    `;
    
    let html = '<div class="grid grid-cols-7 gap-1.5 mb-1.5">';
    const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    daysOfWeek.forEach(d => {
        html += `<div class="text-center font-bold text-slate-500 text-sm py-1 bg-slate-50 rounded border border-slate-200">${d}</div>`;
    });
    html += '</div><div class="grid grid-cols-7 gap-1.5 pb-2">';
    
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="bg-slate-50/30 rounded-md border border-transparent min-h-[60px]"></div>`;
    }
    
    const hebDayFormatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric' });
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const isVacation = vacationDates.has(dateStr);
        const isToday = dateStr === todayStr;
        
        // שליפת היום העברי כמספר והמרתו ידנית לאותיות למניעת תצוגת מספרים
        const parts = hebDayFormatter.formatToParts(dateObj);
        const hebDayNumStr = parts.find(p => p.type === 'day')?.value;
        const hebDayNum = hebDayNumStr ? parseInt(hebDayNumStr) : 1;
        const hebDayStr = numberToHebrewLetters(hebDayNum);
        
        let bgClass = isVacation ? 'bg-indigo-50 border-indigo-300 vacation-pattern ring-1 ring-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md';
        if (isToday && !isVacation) bgClass = 'bg-slate-50 border-indigo-500 ring-2 ring-indigo-500';
        
        const vacationBadge = isVacation ? `<span class="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">חופשה</span>` : '';
        const todayBadge = (isToday && !isVacation) ? `<span class="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">היום</span>` : '';
        
        html += `
            <div onclick="toggleVacationDay('${dateStr}', ${isVacation}, this)" class="relative p-1.5 rounded-md border shadow-sm min-h-[60px] cursor-pointer transition-all flex flex-col justify-between select-none overflow-hidden ${bgClass}">
                <div class="flex justify-between items-start w-full">
                    <span class="text-lg font-bold ${isVacation ? 'text-indigo-800' : 'text-slate-700'} leading-none">${day}</span>
                    <div class="flex flex-col gap-0.5 items-end">
                        ${todayBadge}
                        ${vacationBadge}
                    </div>
                </div>
                <div class="text-left w-full mt-1">
                    <span class="text-xs font-semibold ${isVacation ? 'text-indigo-700' : 'text-slate-500'} bg-white/60 px-1 py-0.5 rounded">${hebDayStr}</span>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    document.getElementById('calendar-grid-container').innerHTML = html;
}

function navigateMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
}

async function toggleVacationDay(dateStr, currentState, cellElement) {
    if (cellElement.dataset.loading === 'true') return; 
    cellElement.dataset.loading = 'true';
    
    const originalHTML = cellElement.innerHTML;
    
    cellElement.innerHTML += `
        <div class="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
            <i class="fas fa-circle-notch fa-spin text-2xl text-indigo-600 drop-shadow-md"></i>
        </div>
    `;
    
    const newState = !currentState;
    
    try {
        const pass = localStorage.getItem('admin_pass');
        const res = await fetch(`${API_BASE}/toggle-vacation`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Admin-Pass': pass
            },
            body: JSON.stringify({ date: dateStr, isVacation: newState })
        });
        
        if (!res.ok) throw new Error('שגיאה בעדכון יום החופשה מול השרת');
        
        if (newState) {
            vacationDates.add(dateStr);
        } else {
            vacationDates.delete(dateStr);
        }
        
        renderCalendar();
        
    } catch (error) {
        alert(error.message);
        cellElement.innerHTML = originalHTML;
        delete cellElement.dataset.loading;
    }
}
