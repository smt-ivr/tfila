let currentStudents = [];
let selectedStudents = new Set(); 

async function loadStudents() {
    const tbody = document.getElementById('students-table-body');
    tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-indigo-600"><i class="fas fa-circle-notch fa-spin text-4xl"></i></td></tr>`;
    
    selectedStudents.clear();
    updateBulkUI();
    
    try {
        const pass = localStorage.getItem('admin_pass');
        const res = await fetch(`${API_BASE}/students`, {
            headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass }
        });
        
        if (res.status === 401) {
            logout();
            return;
        }
        
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת רשימת התלמידים');
        
        currentStudents = data.data || [];
        
        document.getElementById('total-students-count').innerText = data.total_students || currentStudents.length;
        
        let rows = '';
        if (currentStudents.length === 0) {
            rows = `<tr><td colspan="6" class="py-6 text-center text-slate-500 font-bold">לא נמצאו תלמידים</td></tr>`;
        } else {
            currentStudents.forEach(student => {
                rows += `
                <tr class="hover:bg-indigo-50/30 bg-white border-b border-slate-200 transition-colors">
                    <td class="px-4 py-3 border-x border-slate-300 text-center align-middle no-print">
                        <input type="checkbox" value="${student.code}" class="student-cb cursor-pointer w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" onchange="toggleStudentSelection(this)">
                    </td>
                    <td class="px-4 py-3 border-x border-slate-300 font-medium text-slate-600">${student.code}</td>
                    <td class="px-4 py-3 border-x border-slate-300 font-bold text-slate-800">${student.first_name}</td>
                    <td class="px-4 py-3 border-x border-slate-300 font-bold text-slate-800">${student.last_name}</td>
                    <td class="px-4 py-3 border-x border-slate-300">
                        <span class="bg-slate-100 px-3 py-1 rounded-md text-sm font-bold border border-slate-200 text-slate-600">${student.class_name || '-'}</span>
                    </td>
                    <td class="px-4 py-3 border-x border-slate-300 text-center no-print">
                        <button onclick="openStudentModal('${student.code}')" class="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-bold text-sm transition-colors border border-indigo-200 shadow-sm">
                            <i class="fas fa-edit ml-1.5"></i>ערוך
                        </button>
                    </td>
                </tr>
                `;
            });
        }
        tbody.innerHTML = rows;
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-red-600 font-bold bg-red-50">${error.message}</td></tr>`;
    }
}

function toggleStudentSelection(checkbox) {
    if (checkbox.checked) {
        selectedStudents.add(checkbox.value);
    } else {
        selectedStudents.delete(checkbox.value);
    }
    updateBulkUI();
}

function toggleAllStudents(masterCb) {
    const checkboxes = document.querySelectorAll('.student-cb');
    checkboxes.forEach(cb => {
        cb.checked = masterCb.checked;
        if (masterCb.checked) {
            selectedStudents.add(cb.value);
        } else {
            selectedStudents.delete(cb.value);
        }
    });
    updateBulkUI();
}

function updateBulkUI() {
    const container = document.getElementById('bulk-action-container');
    const countSpan = document.getElementById('selected-count');
    const masterCb = document.getElementById('select-all-cb');

    countSpan.innerText = selectedStudents.size;

    if (selectedStudents.size > 0) {
        container.classList.remove('hidden');
        container.classList.add('flex');
    } else {
        container.classList.add('hidden');
        container.classList.remove('flex');
    }

    if (masterCb && currentStudents.length > 0) {
        masterCb.checked = selectedStudents.size === currentStudents.length;
    }
}

async function executeBulkUpdate() {
    if (selectedStudents.size === 0) return;
    
    const className = document.getElementById('bulk-class-input').value.trim();
    if (!className) {
        return alert('נא להזין שם כיתה לעדכון');
    }

    const btn = document.querySelector('#bulk-action-container button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const pass = localStorage.getItem('admin_pass');
        const res = await fetch(`${API_BASE}/bulk-update-students`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Admin-Pass': pass
            },
            body: JSON.stringify({
                studentCodes: Array.from(selectedStudents),
                className: className
            })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'שגיאה בעדכון התלמידים בשרת');
        
        alert(data.message || 'העדכון בוצע בהצלחה');
        
        document.getElementById('bulk-class-input').value = ''; 
        loadStudents(); 
        
    } catch (error) {
        alert(error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function openStudentModal(studentCode = null) {
    const modal = document.getElementById('student-modal');
    const title = document.getElementById('student-modal-title');
    const modeInput = document.getElementById('student-mode');
    const codeInput = document.getElementById('student-code');
    const firstNameInput = document.getElementById('student-first-name');
    const lastNameInput = document.getElementById('student-last-name');
    const classInput = document.getElementById('student-class');

    if (studentCode) {
        const student = currentStudents.find(s => s.code === studentCode);
        if (student) {
            title.innerText = 'עריכת תלמיד';
            modeInput.value = 'edit';
            codeInput.value = student.code;
            codeInput.readOnly = true; 
            codeInput.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
            firstNameInput.value = student.first_name;
            lastNameInput.value = student.last_name;
            classInput.value = student.class_name;
        }
    } else {
        title.innerText = 'הוספת תלמיד חדש';
        modeInput.value = 'add';
        codeInput.value = '';
        codeInput.readOnly = false;
        codeInput.classList.remove('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
        firstNameInput.value = '';
        lastNameInput.value = '';
        classInput.value = '';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeStudentModal() {
    const modal = document.getElementById('student-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function saveStudent(event) {
    event.preventDefault(); 
    
    const btn = document.getElementById('student-save-btn');
    const mode = document.getElementById('student-mode').value;
    
    const payload = {
        code: document.getElementById('student-code').value,
        first_name: document.getElementById('student-first-name').value,
        last_name: document.getElementById('student-last-name').value,
        class_name: document.getElementById('student-class').value
    };
    
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    const endpoint = mode === 'edit' ? '/update-student' : '/add-student';
    
    try {
        const pass = localStorage.getItem('admin_pass');
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Admin-Pass': pass
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'אירעה שגיאה בשמירת הנתונים. נסה שוב.');
        
        closeStudentModal();
        loadStudents(); 
        
    } catch(error) {
        alert(error.message);
    } finally {
        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
    }
}
