let currentFetchDate = null;
let currentLoadedWeekStart = null;
let isFirstLoad = true;

async function loadReports(dateParam = null) {
    currentFetchDate = dateParam; 
    const contentDiv = document.getElementById('reports-view');

    if (isFirstLoad) {
        contentDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-indigo-600 mt-20">
                <i class="fas fa-circle-notch fa-spin text-5xl mb-4"></i>
                <span class="text-slate-600 font-bold text-lg">טוען נתונים מהשרת...</span>
            </div>
        `;
    } else {
        const overlay = document.getElementById('spinner-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    try {
        const pass = localStorage.getItem('admin_pass');
        let url = `${API_BASE}/reports`;
        
        if (dateParam) {
            url += `?date=${dateParam}`;
        }

        const response = await fetch(url, {
            headers: { 
                'Content-Type': 'application/json',
                'X-Admin-Pass': pass
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) throw new Error('שגיאה בתקשורת מול השרת');

        const data = await response.json();
        
        currentLoadedWeekStart = data.weekStart;
        isFirstLoad = false;
        
        renderReports(data);
    } catch (error) {
        contentDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 p-6 rounded-xl shadow-sm mt-4 mx-auto max-w-3xl text-center">
                <h3 class="text-red-800 font-bold text-lg"><i class="fas fa-exclamation-triangle ml-2"></i>שגיאה בטעינת הנתונים</h3>
                <p class="text-red-600 mt-2">${error.message}</p>
                <button onclick="loadReports(currentFetchDate)" class="mt-4 px-4 py-2 bg-red-100 text-red-700 font-bold rounded hover:bg-red-200 transition">נסה שוב</button>
            </div>
        `;
    }
}

function navigateWeek(daysOffset) {
    if (!currentLoadedWeekStart) return;
    const dateObj = new Date(currentLoadedWeekStart);
    dateObj.setDate(dateObj.getDate() + daysOffset);
    const newDateStr = dateObj.toISOString().split('T')[0];
    loadReports(newDateStr);
}

function renderReports(data) {
    const contentDiv = document.getElementById('reports-view');
    
    let headersHTML = '';
    let subHeadersHTML = '';
    
    data.daysToShow.forEach((d) => {
        const isToday = d.isToday === true;
        const isVacation = d.isVacation;
        
        const headerBg = isToday ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-100 text-slate-800';
        const todayBadge = isToday ? '<span class="mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white leading-none">היום</span>' : '';
        const hebDateText = d.hebDate ? `<div class="text-[11px] font-normal text-slate-500 mt-0.5 leading-none">${d.hebDate}</div>` : '';
        const vacationText = isVacation ? `<div class="text-[10px] font-bold text-slate-500 bg-slate-200/80 rounded px-1.5 py-0.5 mt-1 leading-none inline-block">אין לימודים</div>` : '';
        
        headersHTML += `
            <th colspan="2" class="px-1 py-1.5 border border-slate-300 text-center ${headerBg}">
                <div class="flex flex-col items-center justify-center h-full">
                    <div class="flex items-center justify-center font-bold text-sm">${d.name} ${todayBadge}</div>
                    ${hebDateText}
                    ${vacationText}
                </div>
            </th>
        `;

        subHeadersHTML += `
            <th class="px-1 py-1 text-center text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-300 w-16">זמן</th>
            <th class="px-1 py-1 text-center text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-300 w-16">התנהגות</th>
        `;
    });

    let rowsHTML = '';
    
    if (data.report && data.report.length > 0) {
        data.report.forEach((student) => {
            let cellsHTML = '';
            
            data.daysToShow.forEach((day) => {
                const isToday = day.isToday === true;
                const isVacation = day.isVacation;
                const isFuture = day.isFuture === true;
                const status = student.weeklyStatus[day.index];
                
                const cellBg = isVacation ? 'bg-slate-100 vacation-pattern' : (isToday ? 'bg-indigo-50/40' : 'bg-white');
                const hasExplicitReport = status && (status.type === 'absence' || status.type === 'late' || status.badBehavior);

                if (isVacation && !hasExplicitReport) {
                    cellsHTML += `
                        <td class="px-2 py-2 border border-slate-300 ${cellBg}"></td>
                        <td class="px-2 py-2 border border-slate-300 ${cellBg}"></td>
                    `;
                } else if (isFuture && !hasExplicitReport) {
                    cellsHTML += `
                        <td class="px-2 py-2 border border-slate-300 bg-slate-100/70"></td>
                        <td class="px-2 py-2 border border-slate-300 bg-slate-100/70"></td>
                    `;
                } else {
                    let timeContent = '';
                    if (status.type === 'absence') {
                        timeContent = '<span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-bold shadow-sm border border-red-200">חיסור</span>';
                    } else if (status.type === 'late') {
                        timeContent = `<span class="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-xs font-bold shadow-sm border border-amber-200">${status.minutes}'</span>`;
                    } else if (status.type === 'ok') {
                        timeContent = '<span class="text-emerald-500 font-bold text-sm"><i class="fas fa-check"></i></span>';
                    }

                    let behaviorContent = status.behaviorMark || '';
                    let behaviorClass = 'text-slate-600 font-bold';
                    
                    if (status.badBehavior || status.behaviorMark === 'ב') {
                        behaviorContent = 'ב';
                        behaviorClass = 'text-white bg-red-500 px-2 py-0.5 rounded text-xs font-bold shadow-sm';
                    } else if (status.behaviorMark === 'א') {
                        behaviorClass = 'text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200';
                    }

                    cellsHTML += `
                        <td class="px-2 py-2 text-center align-middle border border-slate-300 ${cellBg}">${timeContent}</td>
                        <td class="px-2 py-2 text-center align-middle border border-slate-300 ${cellBg}"><span class="${behaviorClass}">${behaviorContent}</span></td>
                    `;
                }
            });

            rowsHTML += `
                <tr class="hover:bg-slate-50 transition-colors bg-white">
                    <td class="px-3 py-2 border border-slate-300 font-bold text-slate-800 text-center text-sm whitespace-nowrap w-28">${student.first_name}</td>
                    <td class="px-3 py-2 border border-slate-300 font-bold text-slate-800 text-center text-sm whitespace-nowrap w-28">${student.last_name}</td>
                    <td class="px-2 py-2 border border-slate-300 text-center w-16">
                        <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 text-xs font-bold">${student.class_name || '-'}</span>
                    </td>
                    ${cellsHTML}
                </tr>
            `;
        });
    }

    const parashaText = data.parasha || '';
    const yearText = data.heYear || '';

    const currentWeekBtn = data.isCurrentWeek 
        ? `<div class="px-2 h-10 w-36 flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-400 rounded-lg text-sm font-bold select-none cursor-not-allowed">שבוע נוכחי</div>`
        : `<button onclick="loadReports(null)" class="px-2 h-10 w-36 flex items-center justify-center bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm text-sm font-bold" title="חזור לשבוע הנוכחי">חזור לשבוע הנוכחי</button>`;

    const htmlOutput = `
        <div class="max-w-[1400px] mx-auto w-full flex flex-col items-center">
            <!-- נוסף ה-class של no-print כדי שלא יודפס סרגל הכלים -->
            <div class="w-full h-20 mb-5 flex justify-between items-center bg-white px-4 rounded-xl shadow-sm border border-slate-200 relative no-print">
                
                <div class="flex gap-2 z-10 shrink-0">
                    <button onclick="navigateWeek(-7)" class="w-10 h-10 shrink-0 flex items-center justify-center bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm" title="שבוע קודם">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    ${currentWeekBtn}
                    <button onclick="navigateWeek(7)" class="w-10 h-10 shrink-0 flex items-center justify-center bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm" title="שבוע הבא">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>

                <div class="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                    <h2 class="text-2xl sm:text-3xl font-black text-indigo-700 flex items-center justify-center gap-3 whitespace-nowrap">
                        <i class="fas fa-file-alt text-indigo-500 text-2xl"></i>
                        דוח ${parashaText} ${yearText}
                    </h2>
                    ${data.isFutureWeek ? `<span class="mt-1 text-slate-400 font-bold text-[10px] bg-slate-100 px-3 py-0.5 rounded-full border border-slate-200 shadow-sm pointer-events-auto">שבוע עתידי</span>` : ''}
                </div>

                <div class="flex gap-2 z-10 shrink-0">
                    <button onclick="loadReports(currentFetchDate)" class="w-10 h-10 flex items-center justify-center bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm" title="רענון נתונים">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button onclick="openEmailModal()" class="w-10 h-10 flex items-center justify-center bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm" title="שלח במייל">
                        <i class="fas fa-envelope"></i>
                    </button>
                    <button onclick="window.print()" class="w-10 h-10 flex items-center justify-center bg-indigo-600 border border-transparent text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm" title="הדפסה">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </div>
            
            <div id="table-wrapper" class="w-full bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden mb-8 relative min-h-[300px]">
                
                <div id="spinner-overlay" class="hidden absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-50 transition-opacity">
                    <i class="fas fa-circle-notch fa-spin text-5xl text-indigo-600 drop-shadow-md mb-3"></i>
                    <span class="text-indigo-800 font-bold text-lg">מעדכן נתונים...</span>
                </div>

                <div class="overflow-x-auto flex justify-center">
                    <table class="border-collapse mx-auto w-full text-center" style="table-layout: auto;">
                        <thead>
                            <tr>
                                <th rowspan="2" class="px-3 py-3 text-center font-bold text-slate-800 bg-slate-100 border border-slate-300 w-28 text-sm">שם פרטי</th>
                                <th rowspan="2" class="px-3 py-3 text-center font-bold text-slate-800 bg-slate-100 border border-slate-300 w-28 text-sm">משפחה</th>
                                <th rowspan="2" class="px-2 py-3 text-center font-bold text-slate-800 bg-slate-100 border border-slate-300 w-16 text-sm">כיתה</th>
                                ${headersHTML}
                            </tr>
                            <tr>${subHeadersHTML}</tr>
                        </thead>
                        <tbody>${rowsHTML}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    contentDiv.innerHTML = htmlOutput;
}