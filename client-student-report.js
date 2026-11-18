// =============================================================
// דוח תלמיד - היסטוריית נוכחות, איחורים והתנהגות לטווח תאריכים
// =============================================================

let srStudents = [];
let srCurrentData = null;
let srOnlyExceptions = false;
let srInitialized = false;
let srPendingCode = null;

const SR_GREG_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const SR_STATUS = {
    ok:           { label: 'נכח',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'fa-check',            xl: 'FFD1FAE5' },
    late:         { label: 'איחור',        cls: 'bg-amber-50 text-amber-800 border-amber-200',       icon: 'fa-clock',            xl: 'FFFEF3C7' },
    absence:      { label: 'חיסור',        cls: 'bg-red-50 text-red-700 border-red-200',             icon: 'fa-times',            xl: 'FFFEE2E2' },
    vacation:     { label: 'אין לימודים',  cls: 'bg-slate-100 text-slate-500 border-slate-200',      icon: 'fa-umbrella-beach',   xl: 'FFF1F5F9' },
    future:       { label: 'טרם התקיים',   cls: 'bg-slate-50 text-slate-400 border-slate-200',       icon: 'fa-hourglass-half',   xl: 'FFF8FAFC' },
    before_start: { label: 'לפני הפעלה',   cls: 'bg-slate-50 text-slate-400 border-slate-200',       icon: 'fa-ban',              xl: 'FFF8FAFC' }
};

// ---------- עזרי תאריך ----------

function srISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function srGregDisplay(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function srGematria(num) {
    const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
    let n = num % 1000;
    let s = hundreds[Math.floor(n / 100)];
    n %= 100;
    if (n === 15) s += 'טו';
    else if (n === 16) s += 'טז';
    else s += tens[Math.floor(n / 10)] + ones[n % 10];
    if (s.length === 1) return s + '׳';
    return s.slice(0, -1) + '״' + s.slice(-1);
}

const srHebFormatter = (() => {
    try {
        return new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    } catch (e) { return null; }
})();

function srHebParts(iso) {
    if (!srHebFormatter) return null;
    const parts = srHebFormatter.formatToParts(new Date(iso + 'T12:00:00Z'));
    const get = t => (parts.find(p => p.type === t) || {}).value;
    const day = parseInt(get('day'), 10);
    const year = parseInt(get('year'), 10);
    const month = (get('month') || '').replace(/^ב/, '');
    if (!day || !year || !month) return null;
    return { day, month, year };
}

function srHebDate(iso, withYear = true) {
    const p = srHebParts(iso);
    if (!p) return '';
    return `${srGematria(p.day)} ${p.month}${withYear ? ' ' + srGematria(p.year) : ''}`;
}

function srMonthTitle(monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    const first = srHebParts(`${monthKey}-01`);
    const lastDay = new Date(y, m, 0).getDate();
    const last = srHebParts(`${monthKey}-${String(lastDay).padStart(2, '0')}`);
    let heb = '';
    if (first && last) {
        heb = first.month === last.month ? first.month : `${first.month}-${last.month}`;
        heb += ' ' + srGematria(last.year);
    }
    return { greg: `${SR_GREG_MONTHS[m - 1]} ${y}`, heb };
}

function srEscape(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function srFmtPct(v) {
    return v === null || v === undefined ? '—' : `${v}%`;
}

// ---------- טווחי זמן מוכנים ----------

function srPresetRange(preset) {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const today = srISO(now);
    switch (preset) {
        case 'this-month':  return { from: srISO(new Date(y, m, 1)), to: today };
        case 'last-month':  return { from: srISO(new Date(y, m - 1, 1)), to: srISO(new Date(y, m, 0)) };
        case '3-months':    return { from: srISO(new Date(y, m - 2, 1)), to: today };
        case '6-months':    return { from: srISO(new Date(y, m - 5, 1)), to: today };
        case 'school-year': return { from: srISO(new Date(m >= 8 ? y : y - 1, 8, 1)), to: today };
        default: return null;
    }
}

// ---------- בניית התצוגה ----------

function srBuildShell() {
    const view = document.getElementById('student-report-view');
    view.innerHTML = `
        <div class="w-full mb-5 bg-white px-5 py-4 rounded-xl shadow-sm border border-slate-200 no-print">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 class="text-2xl font-black text-indigo-700 flex items-center gap-3">
                    <i class="fas fa-id-card text-indigo-500"></i>
                    דוח תלמיד אישי
                </h2>
                <div class="flex items-center gap-2">
                    <button id="sr-excel-btn" onclick="srExportExcel()" disabled class="h-10 px-4 flex items-center gap-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                        <i class="fas fa-file-excel"></i> ייצוא לאקסל
                    </button>
                    <button id="sr-print-btn" onclick="srPrint()" disabled class="h-10 px-4 flex items-center gap-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                        <i class="fas fa-file-pdf"></i> הדפסה / PDF
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div class="lg:col-span-4">
                    <label class="block text-xs font-bold text-slate-500 mb-1">תלמיד</label>
                    <div class="relative">
                        <input id="sr-student-search" type="text" list="sr-student-list" autocomplete="off" placeholder="הקלד שם או קוד תלמיד..." class="w-full h-11 pr-10 pl-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800">
                        <i class="fas fa-search absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <datalist id="sr-student-list"></datalist>
                    </div>
                </div>

                <div class="lg:col-span-5">
                    <label class="block text-xs font-bold text-slate-500 mb-1">תקופה</label>
                    <div class="flex flex-wrap gap-1.5" id="sr-presets">
                        ${[
                            ['this-month', 'החודש'],
                            ['last-month', 'חודש קודם'],
                            ['3-months', '3 חודשים'],
                            ['6-months', 'חצי שנה'],
                            ['school-year', 'מתחילת השנה'],
                            ['custom', 'טווח מותאם']
                        ].map(([k, l]) => `<button type="button" data-preset="${k}" onclick="srSelectPreset('${k}')" class="sr-preset h-11 px-3 rounded-lg border text-sm font-bold transition-colors">${l}</button>`).join('')}
                    </div>
                </div>

                <div class="lg:col-span-3 flex items-end gap-2">
                    <div class="flex-1">
                        <label class="block text-xs font-bold text-slate-500 mb-1">מתאריך</label>
                        <input id="sr-from" type="date" onchange="srSelectPreset('custom', true)" class="w-full h-11 px-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm">
                    </div>
                    <div class="flex-1">
                        <label class="block text-xs font-bold text-slate-500 mb-1">עד תאריך</label>
                        <input id="sr-to" type="date" onchange="srSelectPreset('custom', true)" class="w-full h-11 px-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm">
                    </div>
                </div>
            </div>

            <div class="flex justify-end mt-4">
                <button id="sr-generate-btn" onclick="srGenerate()" class="h-11 px-8 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-md flex items-center gap-2">
                    <i class="fas fa-chart-pie"></i> הפק דוח
                </button>
            </div>
        </div>

        <div id="sr-output" class="w-full">
            <div class="bg-white rounded-xl border border-dashed border-slate-300 py-20 flex flex-col items-center text-slate-400">
                <i class="fas fa-user-graduate text-6xl mb-4 text-slate-300"></i>
                <p class="text-lg font-bold">בחר תלמיד ותקופה ולחץ על "הפק דוח"</p>
            </div>
        </div>
    `;

    document.getElementById('sr-student-search').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); srGenerate(); }
    });
    srSelectPreset('this-month');
}

function srSelectPreset(preset, fromInput = false) {
    document.querySelectorAll('.sr-preset').forEach(btn => {
        const active = btn.dataset.preset === preset;
        btn.className = `sr-preset h-11 px-3 rounded-lg border text-sm font-bold transition-colors ${active
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-indigo-600'}`;
    });
    if (fromInput || preset === 'custom') return;
    const range = srPresetRange(preset);
    if (range) {
        document.getElementById('sr-from').value = range.from;
        document.getElementById('sr-to').value = range.to;
    }
}

function srStudentLabel(s) {
    return `${s.first_name || ''} ${s.last_name || ''} · כיתה ${s.class_name || '-'} · קוד ${s.code}`.replace(/\s+/g, ' ').trim();
}

function srResolveStudent(text) {
    const t = (text || '').trim();
    if (!t) return null;
    const exact = srStudents.find(s => srStudentLabel(s) === t || String(s.code) === t);
    if (exact) return exact;
    const lower = t.toLowerCase();
    const matches = srStudents.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(lower));
    return matches.length === 1 ? matches[0] : null;
}

async function srLoadStudents() {
    const pass = localStorage.getItem('admin_pass');
    const res = await fetch(`${API_BASE}/students`, { headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass } });
    if (res.status === 401) { logout(); return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת רשימת התלמידים');
    srStudents = (data.data || []).slice().sort((a, b) =>
        String(a.class_name || '').localeCompare(String(b.class_name || ''), 'he') ||
        String(a.last_name || '').localeCompare(String(b.last_name || ''), 'he') ||
        String(a.first_name || '').localeCompare(String(b.first_name || ''), 'he'));
    document.getElementById('sr-student-list').innerHTML =
        srStudents.map(s => `<option value="${srEscape(srStudentLabel(s))}"></option>`).join('');
}

// נקודת כניסה מתפריט הצד
async function loadStudentReport() {
    if (!srInitialized) {
        srBuildShell();
        srInitialized = true;
    }
    try {
        await srLoadStudents();
    } catch (e) {
        showToast(e.message, 'error');
    }
    if (srPendingCode) {
        const s = srStudents.find(x => String(x.code) === String(srPendingCode));
        srPendingCode = null;
        if (s) {
            document.getElementById('sr-student-search').value = srStudentLabel(s);
            srGenerate();
        }
    }
}

// פתיחת דוח ישירות מטבלת התלמידים
function openStudentReport(code) {
    srPendingCode = code;
    switchView('student-report');
}

async function srGenerate() {
    const student = srResolveStudent(document.getElementById('sr-student-search').value);
    if (!student) return showToast('נא לבחור תלמיד מהרשימה', 'error');

    const from = document.getElementById('sr-from').value;
    const to = document.getElementById('sr-to').value;
    if (!from || !to) return showToast('נא לבחור טווח תאריכים', 'error');

    document.getElementById('sr-student-search').value = srStudentLabel(student);
    const btn = document.getElementById('sr-generate-btn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מפיק דוח...';
    btn.disabled = true;

    try {
        const pass = localStorage.getItem('admin_pass');
        const url = `${API_BASE}/student-report?code=${encodeURIComponent(student.code)}&from=${from}&to=${to}`;
        const res = await fetch(url, { headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass } });
        if (res.status === 401) { logout(); return; }
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error((data && data.error) || 'שגיאה בהפקת הדוח');

        srCurrentData = data;
        srRender();
        document.getElementById('sr-excel-btn').disabled = false;
        document.getElementById('sr-print-btn').disabled = false;
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
}

function srToggleExceptions(cb) {
    srOnlyExceptions = cb.checked;
    srRender();
}

function srKpi(icon, color, label, value, sub = '') {
    return `
        <div class="sr-kpi bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div class="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-${color}-50 text-${color}-600 border border-${color}-100">
                <i class="fas ${icon} text-lg"></i>
            </div>
            <div class="min-w-0">
                <div class="text-xs font-bold text-slate-500">${label}</div>
                <div class="text-2xl font-black text-slate-800 leading-tight">${value}</div>
                ${sub ? `<div class="text-[11px] font-bold text-slate-400">${sub}</div>` : ''}
            </div>
        </div>`;
}

function srRender() {
    const d = srCurrentData;
    if (!d) return;
    const s = d.summary;
    const st = d.student;
    const out = document.getElementById('sr-output');

    if (!d.days.length) {
        out.innerHTML = `
            <div class="bg-white rounded-xl border border-slate-200 py-16 flex flex-col items-center text-slate-500">
                <i class="fas fa-info-circle text-5xl mb-4 text-indigo-300"></i>
                <p class="text-lg font-bold">אין נתונים בטווח שנבחר</p>
                <p class="text-sm font-bold text-slate-400 mt-1">המערכת פועלת החל מ-${srGregDisplay(d.systemStartDate)} (${srHebDate(d.systemStartDate)})</p>
            </div>`;
        return;
    }

    const periodHeb = `${srHebDate(d.from)} – ${srHebDate(d.to)}`;
    const periodGreg = `${srGregDisplay(d.from)} – ${srGregDisplay(d.to)}`;

    // סיכום חודשי
    const monthlyRows = d.monthly.map(m => {
        const t = srMonthTitle(m.month);
        const rate = m.attendanceRate;
        const barColor = rate === null ? 'bg-slate-300' : rate >= 95 ? 'bg-emerald-500' : rate >= 85 ? 'bg-amber-500' : 'bg-red-500';
        return `
            <tr class="border-b border-slate-200">
                <td class="px-3 py-2 text-right">
                    <div class="font-bold text-slate-800">${t.heb || t.greg}</div>
                    <div class="text-[11px] text-slate-400 font-bold">${t.heb ? t.greg : ''}</div>
                </td>
                <td class="px-3 py-2 font-bold">${m.schoolDays}</td>
                <td class="px-3 py-2 font-bold text-emerald-700">${m.onTimeDays}</td>
                <td class="px-3 py-2 font-bold text-amber-700">${m.lateDays}${m.lateMinutes ? ` <span class="text-[11px] text-slate-400">(${m.lateMinutes} דק')</span>` : ''}</td>
                <td class="px-3 py-2 font-bold text-red-700">${m.absenceDays}</td>
                <td class="px-3 py-2 font-bold text-rose-700">${m.badBehaviorDays}</td>
                <td class="px-3 py-2 w-40">
                    <div class="flex items-center gap-2">
                        <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full ${barColor}" style="width:${rate || 0}%"></div></div>
                        <span class="text-xs font-black text-slate-700 w-11 text-left">${srFmtPct(rate)}</span>
                    </div>
                </td>
            </tr>`;
    }).join('');

    // שורות יומיות, מקובצות לפי חודש
    let dailyRows = '';
    let lastMonth = null;
    let shown = 0;
    d.days.forEach(day => {
        const isException = day.status === 'late' || day.status === 'absence' || day.behavior === 'ב';
        if (srOnlyExceptions && !isException) return;
        const monthKey = day.date.slice(0, 7);
        if (monthKey !== lastMonth) {
            lastMonth = monthKey;
            const t = srMonthTitle(monthKey);
            dailyRows += `
                <tr class="sr-month-row">
                    <td colspan="6" class="px-3 py-2 bg-indigo-50 text-indigo-800 font-black text-right border-y border-indigo-100">
                        <i class="far fa-calendar ml-1.5"></i>${t.heb || t.greg}
                        <span class="text-xs font-bold text-indigo-400 mr-2">${t.heb ? t.greg : ''}</span>
                    </td>
                </tr>`;
        }
        shown++;
        const meta = SR_STATUS[day.status] || SR_STATUS.ok;
        const muted = ['vacation', 'future', 'before_start'].includes(day.status);
        const isFriday = day.weekday === 5;
        let behaviorCell = '';
        if (day.behavior === 'ב') behaviorCell = '<span class="inline-block min-w-[28px] px-2 py-0.5 rounded text-xs font-black bg-red-500 text-white shadow-sm">ב</span>';
        else if (day.behavior === 'א') behaviorCell = '<span class="inline-block min-w-[28px] px-2 py-0.5 rounded text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">א</span>';

        dailyRows += `
            <tr class="border-b border-slate-200 ${muted ? 'bg-slate-50/70 text-slate-400' : 'bg-white'} ${day.date === d.today ? 'ring-2 ring-inset ring-indigo-300' : ''}">
                <td class="px-3 py-2 font-bold ${muted ? '' : 'text-slate-700'}" dir="ltr">${srGregDisplay(day.date)}</td>
                <td class="px-3 py-2 font-bold ${muted ? '' : 'text-slate-800'}">${srHebDate(day.date, false)}</td>
                <td class="px-3 py-2 font-bold ${isFriday ? 'text-slate-400' : ''}">${day.dayName}</td>
                <td class="px-3 py-2">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${meta.cls}">
                        <i class="fas ${meta.icon} text-[10px]"></i>${meta.label}
                    </span>
                </td>
                <td class="px-3 py-2 font-black ${day.minutes ? 'text-amber-700' : 'text-slate-300'}">${day.minutes ? `${day.minutes} דק'` : '—'}</td>
                <td class="px-3 py-2">${behaviorCell}</td>
            </tr>`;
    });

    if (!shown) {
        dailyRows = `<tr><td colspan="6" class="py-10 text-center text-slate-400 font-bold">${srOnlyExceptions ? 'אין חריגים בתקופה זו 👍' : 'אין ימים להצגה בטווח שנבחר'}</td></tr>`;
    }

    const generated = d.generatedAt ? `${srGregDisplay(d.generatedAt.date)} ${d.generatedAt.time}` : '';

    out.innerHTML = `
        <div id="sr-printable" class="flex flex-col gap-5 pb-10">
            <!-- כותרת הדוח -->
            <div class="sr-card bg-gradient-to-l from-indigo-700 to-indigo-500 text-white rounded-2xl shadow-md p-6 flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-3xl font-black">
                        ${srEscape((st.first_name || '?').charAt(0))}
                    </div>
                    <div>
                        <div class="text-xs font-bold text-indigo-100 mb-0.5">דוח נוכחות והתנהגות אישי</div>
                        <h3 class="text-3xl font-black leading-tight">${srEscape(st.first_name)} ${srEscape(st.last_name)}</h3>
                        <div class="flex flex-wrap gap-2 mt-1.5 text-xs font-bold">
                            <span class="bg-white/15 border border-white/25 px-2.5 py-0.5 rounded-full">כיתה ${srEscape(st.class_name || '-')}</span>
                            <span class="bg-white/15 border border-white/25 px-2.5 py-0.5 rounded-full">קוד ${srEscape(st.code)}</span>
                        </div>
                    </div>
                </div>
                <div class="text-left">
                    <div class="text-xs font-bold text-indigo-100">תקופת הדוח</div>
                    <div class="text-lg font-black">${periodHeb}</div>
                    <div class="text-sm font-bold text-indigo-100" dir="ltr">${periodGreg}</div>
                </div>
            </div>

            <!-- מדדים -->
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sr-kpis">
                ${srKpi('fa-school', 'indigo', 'ימי לימוד', s.schoolDays, s.vacationDays ? `${s.vacationDays} ימי חופשה` : '')}
                ${srKpi('fa-user-check', 'emerald', 'אחוז נוכחות', srFmtPct(s.attendanceRate), `${s.presentDays} ימים נכח`)}
                ${srKpi('fa-stopwatch', 'sky', 'הגעה בזמן', srFmtPct(s.punctualityRate), `${s.onTimeDays} ימים`)}
                ${srKpi('fa-clock', 'amber', 'איחורים', s.lateDays, s.lateDays ? `סה"כ ${s.lateMinutes} דק' · ממוצע ${s.avgLateMinutes}` : 'ללא איחורים')}
                ${srKpi('fa-user-times', 'red', 'חיסורים', s.absenceDays, '')}
                ${srKpi('fa-star', 'violet', 'התנהגות תקינה', srFmtPct(s.behaviorRate), s.badBehaviorDays ? `${s.badBehaviorDays} ימים לא תקינה` : 'ללא הערות')}
            </div>

            <!-- סיכום חודשי -->
            ${d.monthly.length > 1 ? `
            <div class="sr-card bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-200 bg-slate-50 font-black text-slate-800 flex items-center gap-2">
                    <i class="fas fa-calendar-alt text-indigo-500"></i> סיכום לפי חודשים
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-center text-sm">
                        <thead class="bg-slate-50 text-slate-500 text-xs">
                            <tr>
                                <th class="px-3 py-2 text-right">חודש</th>
                                <th class="px-3 py-2">ימי לימוד</th>
                                <th class="px-3 py-2">בזמן</th>
                                <th class="px-3 py-2">איחורים</th>
                                <th class="px-3 py-2">חיסורים</th>
                                <th class="px-3 py-2">התנהגות ב'</th>
                                <th class="px-3 py-2">נוכחות</th>
                            </tr>
                        </thead>
                        <tbody>${monthlyRows}</tbody>
                    </table>
                </div>
            </div>` : ''}

            <!-- פירוט יומי -->
            <div class="sr-card bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                    <div class="font-black text-slate-800 flex items-center gap-2">
                        <i class="fas fa-list-ol text-indigo-500"></i> פירוט יומי
                    </div>
                    <label class="no-print flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" ${srOnlyExceptions ? 'checked' : ''} onchange="srToggleExceptions(this)" class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500">
                        הצג חריגים בלבד
                    </label>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-center text-sm sr-daily">
                        <thead class="bg-slate-100 text-slate-600 text-xs">
                            <tr>
                                <th class="px-3 py-2.5">תאריך</th>
                                <th class="px-3 py-2.5">תאריך עברי</th>
                                <th class="px-3 py-2.5">יום</th>
                                <th class="px-3 py-2.5">נוכחות</th>
                                <th class="px-3 py-2.5">איחור</th>
                                <th class="px-3 py-2.5">התנהגות</th>
                            </tr>
                        </thead>
                        <tbody>${dailyRows}</tbody>
                    </table>
                </div>
            </div>

            <div class="text-center text-[11px] font-bold text-slate-400">
                הופק ממערכת ניהול הדוחות · ${generated}
            </div>
        </div>
    `;
}

// ---------- הדפסה / PDF ----------

function srPrint() {
    if (!srCurrentData) return;
    const st = srCurrentData.student;
    const prevTitle = document.title;
    document.title = `דוח תלמיד - ${st.first_name} ${st.last_name}`;
    document.body.classList.add('printing-student-report');
    const restore = () => {
        document.body.classList.remove('printing-student-report');
        document.title = prevTitle;
        window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
    setTimeout(restore, 1500);
}

// ---------- ייצוא לאקסל ----------

let srExcelJsPromise = null;
function srLoadExcelJs() {
    if (window.ExcelJS) return Promise.resolve();
    if (!srExcelJsPromise) {
        srExcelJsPromise = new Promise((resolve, reject) => {
            const sc = document.createElement('script');
            sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
            sc.onload = resolve;
            sc.onerror = () => { srExcelJsPromise = null; reject(new Error('טעינת רכיב האקסל נכשלה')); };
            document.head.appendChild(sc);
        });
    }
    return srExcelJsPromise;
}

async function srExportExcel() {
    const d = srCurrentData;
    if (!d) return;
    const btn = document.getElementById('sr-excel-btn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מכין קובץ...';
    btn.disabled = true;

    try {
        await srLoadExcelJs();
        const st = d.student;
        const s = d.summary;
        const wb = new ExcelJS.Workbook();
        wb.creator = 'מערכת ניהול דוחות';
        wb.created = new Date();

        const border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
        const headerStyle = (cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = border;
        };
        const addTitle = (ws, cols) => {
            ws.mergeCells(1, 1, 1, cols);
            const t = ws.getCell(1, 1);
            t.value = `דוח תלמיד: ${st.first_name} ${st.last_name}  |  כיתה ${st.class_name || '-'}  |  קוד ${st.code}`;
            t.font = { bold: true, size: 15, color: { argb: 'FF3730A3' }, name: 'Arial' };
            t.alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(1).height = 28;
            ws.mergeCells(2, 1, 2, cols);
            const p = ws.getCell(2, 1);
            p.value = `תקופה: ${srHebDate(d.from)} – ${srHebDate(d.to)}   (${srGregDisplay(d.from)} – ${srGregDisplay(d.to)})`;
            p.font = { bold: true, size: 11, color: { argb: 'FF64748B' }, name: 'Arial' };
            p.alignment = { horizontal: 'center' };
        };

        // --- גיליון סיכום ---
        const ws1 = wb.addWorksheet('סיכום', { views: [{ rightToLeft: true }] });
        ws1.columns = [{ width: 28 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
        addTitle(ws1, 7);
        ws1.addRow([]);
        const hdr = ws1.addRow(['מדד', 'ערך']);
        hdr.eachCell(headerStyle);
        const kpis = [
            ['ימי לימוד', s.schoolDays],
            ['ימים שנכח', s.presentDays],
            ['הגעה בזמן (ימים)', s.onTimeDays],
            ['איחורים (ימים)', s.lateDays],
            ['סה"כ דקות איחור', s.lateMinutes],
            ['ממוצע דקות לאיחור', s.avgLateMinutes],
            ['חיסורים', s.absenceDays],
            ['ימי התנהגות לא תקינה', s.badBehaviorDays],
            ['ימי חופשה בתקופה', s.vacationDays],
            ['אחוז נוכחות', s.attendanceRate === null ? '—' : s.attendanceRate / 100],
            ['אחוז הגעה בזמן', s.punctualityRate === null ? '—' : s.punctualityRate / 100],
            ['אחוז התנהגות תקינה', s.behaviorRate === null ? '—' : s.behaviorRate / 100]
        ];
        kpis.forEach(([k, v], i) => {
            const r = ws1.addRow([k, v]);
            r.getCell(1).font = { bold: true, name: 'Arial' };
            r.getCell(2).alignment = { horizontal: 'center' };
            r.getCell(2).font = { bold: true, name: 'Arial' };
            if (k.startsWith('אחוז') && typeof v === 'number') r.getCell(2).numFmt = '0.0%';
            r.eachCell(c => {
                c.border = border;
                if (i % 2) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            });
        });

        if (d.monthly.length) {
            ws1.addRow([]);
            const mh = ws1.addRow(['חודש', 'חודש לועזי', 'ימי לימוד', 'בזמן', 'איחורים', 'דקות איחור', 'חיסורים']);
            mh.eachCell(headerStyle);
            d.monthly.forEach(m => {
                const t = srMonthTitle(m.month);
                const r = ws1.addRow([t.heb || t.greg, t.greg, m.schoolDays, m.onTimeDays, m.lateDays, m.lateMinutes, m.absenceDays]);
                r.eachCell((c, col) => { c.border = border; if (col > 2) c.alignment = { horizontal: 'center' }; });
                r.getCell(1).font = { bold: true, name: 'Arial' };
            });
        }

        // --- גיליון פירוט יומי ---
        const ws2 = wb.addWorksheet('פירוט יומי', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 4 }] });
        ws2.columns = [{ width: 14 }, { width: 18 }, { width: 10 }, { width: 16 }, { width: 14 }, { width: 12 }];
        addTitle(ws2, 6);
        ws2.addRow([]);
        const dh = ws2.addRow(['תאריך', 'תאריך עברי', 'יום', 'נוכחות', 'דקות איחור', 'התנהגות']);
        dh.eachCell(headerStyle);
        ws2.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 6 } };

        d.days.forEach(day => {
            const meta = SR_STATUS[day.status] || SR_STATUS.ok;
            const [y, m, dd] = day.date.split('-').map(Number);
            const r = ws2.addRow([new Date(Date.UTC(y, m - 1, dd)), srHebDate(day.date), day.dayName, meta.label, day.minutes ?? '', day.behavior]);
            r.getCell(1).numFmt = 'dd/mm/yyyy';
            r.eachCell({ includeEmpty: true }, (c, col) => {
                c.border = border;
                c.alignment = { horizontal: 'center' };
                c.font = { name: 'Arial', color: { argb: ['vacation', 'future', 'before_start'].includes(day.status) ? 'FF94A3B8' : 'FF1E293B' } };
                if (col === 4) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: meta.xl } };
            });
            if (day.behavior === 'ב') {
                r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
                r.getCell(6).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
            }
        });

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `דוח תלמיד - ${st.first_name} ${st.last_name} - ${d.from} עד ${d.to}.xlsx`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        showToast('קובץ האקסל הורד בהצלחה', 'success');
    } catch (e) {
        showToast(e.message || 'שגיאה ביצירת קובץ האקסל', 'error');
    } finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
}
