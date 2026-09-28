document.addEventListener('deviceready', () => {
    initializeApp();
}, false);

if (!window.cordova) {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
    });
}

function initializeApp() {
    const authView = document.getElementById('auth-view');
    const workspaceView = document.getElementById('workspace-view');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    const currentUser = JSON.parse(localStorage.getItem('tjs_current_user'));

    if (currentUser) {
        launchWorkspace(currentUser);
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('login-name').value.trim();
        const dept = document.getElementById('login-dept').value.trim();
        const roll = document.getElementById('login-roll').value.trim();
        const role = document.getElementById('login-role').value;

        const userData = { name, dept, roll, role };
        localStorage.setItem('tjs_current_user', JSON.stringify(userData));
        launchWorkspace(userData);
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('tjs_current_user');
        workspaceView.classList.remove('active');
        authView.classList.add('active');
        loginForm.reset();
    });

    // Tab Navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));

            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Modal Control for CR Posting Task
    const taskModal = document.getElementById('task-modal');
    const openModalBtn = document.getElementById('open-new-task-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const taskForm = document.getElementById('task-form');

    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => taskModal.classList.add('active'));
        closeModalBtn.addEventListener('click', () => taskModal.classList.remove('active'));
    }

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const course = document.getElementById('task-course').value;
        const title = document.getElementById('task-title-input').value.trim();
        const deadline = document.getElementById('task-deadline-input').value;

        let tasks = JSON.parse(localStorage.getItem('tjs_tasks')) || [];
        tasks.push({ id: Date.now(), course, title, deadline, completedBy: [] });
        localStorage.setItem('tjs_tasks', JSON.stringify(tasks));

        taskModal.classList.remove('active');
        taskForm.reset();
        renderAssignments(currentUser);
    });

    // Student QR Scan Modal Control with Campus Wi-Fi Verification
    const qrModal = document.getElementById('qr-scan-modal');
    const openQrModalBtn = document.getElementById('student-qr-scan-btn');
    const closeQrModalBtn = document.getElementById('close-qr-modal');
    const qrForm = document.getElementById('qr-form');

    if (openQrModalBtn) {
        openQrModalBtn.addEventListener('click', () => qrModal.classList.add('active'));
        closeQrModalBtn.addEventListener('click', () => qrModal.classList.remove('active'));
    }

    qrForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredToken = document.getElementById('qr-token-input').value.trim();
        const activeQrToken = localStorage.getItem('tjs_active_qr_token') || "TJS-ATTEND-2026";

        // 1. Campus Wi-Fi Validation Check (Prototyping logic)
        const isOnCampusWifi = verifyCampusNetwork(); 
        if (!isOnCampusWifi) {
            alert("Check-in Denied: You must be connected to the official T.J.S. College Wi-Fi network to mark attendance.");
            return;
        }

        // 2. Validate QR Token
        if (enteredToken === activeQrToken) {
            alert("Success! Campus Wi-Fi verified and attendance marked for today.");
            qrModal.classList.remove('active');
            qrForm.reset();

            let weeklyLogs = JSON.parse(localStorage.getItem('tjs_student_weekly_logs')) || [];
            if (weeklyLogs.length > 0) {
                weeklyLogs[weeklyLogs.length - 1].status = "Present";
                localStorage.setItem('tjs_student_weekly_logs', JSON.stringify(weeklyLogs));
            }
            launchWorkspace(currentUser);
        } else {
            alert("Invalid QR session token. Please check the active code on the classroom board.");
        }
    });

    // Export Daily Attendance CSV for HOD Desk
    const exportCsvBtn = document.getElementById('export-csv');
    exportCsvBtn.addEventListener('click', () => {
        let students = JSON.parse(localStorage.getItem('tjs_students_roster')) || [];
        let csvContent = "data:text/csv;charset=utf-8,Roll Number,Student Name,Status (Today)\n";
        students.forEach(st => {
            csvContent += `${st.roll},"${st.name}",${st.status ? 'Present' : 'Absent'}\r\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `HOD_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// Simulated Campus Wi-Fi Check Function for Prototype Testing
function verifyCampusNetwork() {
    // In production via Cordova plugins, this checks device WiFi SSID (e.g., "TJS_Campus_Secure")
    // For local browser/app prototype testing, we simulate a successful connection.
    const simulateConnectedToCampusWifi = true; 
    return simulateConnectedToCampusWifi;
}

function launchWorkspace(user) {
    document.getElementById('auth-view').classList.remove('active');
    document.getElementById('workspace-view').classList.add('active');

    document.getElementById('header-username').textContent = user.name;
    document.getElementById('header-meta').textContent = `${user.dept} • ${user.roll}`;
    
    const badge = document.getElementById('user-display-badge');
    const exportCsvBtn = document.getElementById('export-csv');
    const studentQrBtn = document.getElementById('student-qr-scan-btn');
    const crBanner = document.getElementById('cr-controls-banner');

    if (user.role === 'cr') {
        badge.textContent = "CLASS REPRESENTATIVE (CR)";
        exportCsvBtn.style.display = 'flex';
        studentQrBtn.style.display = 'none';
        crBanner.style.display = 'block';
        document.getElementById('attendance-title').textContent = "Department Roster & Live QR Session";
        renderCRAttendanceView();
    } else {
        badge.textContent = "STUDENT PORTAL";
        exportCsvBtn.style.display = 'none';
        studentQrBtn.style.display = 'flex';
        crBanner.style.display = 'none';
        document.getElementById('attendance-title').textContent = "My 1-Week Daily Attendance Log & Percentage";
        renderStudentAttendanceView(user);
    }

    renderAssignments(user);
}

function renderStudentAttendanceView(user) {
    const container = document.getElementById('attendance-container');
    
    let weeklyLogs = JSON.parse(localStorage.getItem('tjs_student_weekly_logs')) || [
        { date: "Monday, Jul 27", status: "Present", hours: "6/6 Hours" },
        { date: "Tuesday, Jul 28", status: "Present", hours: "5/6 Hours" },
        { date: "Wednesday, Jul 29", status: "Absent", hours: "0/6 Hours" },
        { date: "Thursday, Jul 30", status: "Present", hours: "6/6 Hours" },
        { date: "Friday, Jul 31", status: "Present", hours: "6/6 Hours" },
        { date: "Saturday, Aug 01", status: "Present", hours: "4/4 Hours" }
    ];

    let totalDays = weeklyLogs.length;
    let presentDays = weeklyLogs.filter(l => l.status === "Present").length;
    let percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 100;

    let html = `
        <div class="attendance-matrix-card" style="border-left: 4px solid var(--accent);">
            <h4 style="margin-bottom:6px; color:var(--accent);">Weekly Attendance Summary</h4>
            <p style="font-size:1.1rem; font-weight:700;">Overall Weekly Percentage: ${percentage}% (${presentDays} / ${totalDays} Days Attended)</p>
        </div>
        <div class="attendance-matrix-card">
            <h4 style="margin-bottom:12px;">Day-by-Day Attendance Record (Past 1 Week)</h4>
    `;

    weeklyLogs.forEach(log => {
        const isPresent = log.status === "Present";
        html += `
            <div class="matrix-row-item">
                <span><i class="fa-regular fa-calendar-days"></i> <strong>${log.date}</strong> &nbsp;(${log.hours})</span>
                <span class="${isPresent ? 'status-present' : 'status-absent'}">${log.status.toUpperCase()}</span>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function renderCRAttendanceView() {
    const container = document.getElementById('attendance-container');
    
    let students = JSON.parse(localStorage.getItem('tjs_students_roster')) || [
        { name: "Harini Palani", roll: "TJS2026CSE01", status: true },
        { name: "Arun Kumar", roll: "TJS2026CSE02", status: true },
        { name: "Deepika Sharma", roll: "TJS2026CSE03", status: false }
    ];

    let currentQrToken = localStorage.getItem('tjs_active_qr_token') || "TJS-ATTEND-2026";

    let html = `
        <div class="qr-display-box">
            <p style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Active Live QR Attendance Session</p>
            <div class="qr-code-token" id="qr-token-display">${currentQrToken}</div>
            <p style="font-size:0.75rem; color:var(--text-muted);">Students within college Wi-Fi range can enter this code to check-in.</p>
            <button id="regenerate-qr" class="btn-secondary" style="margin-top:8px; font-size:0.75rem;"><i class="fa-solid fa-rotate"></i> Refresh Session Token</button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap:wrap; gap:10px;">
            <p style="font-size:0.8rem; color:var(--text-muted);">Manage official daily student presence & HOD report.</p>
            <div style="display:flex; gap:8px;">
                <button id="open-student-modal" class="btn-secondary"><i class="fa-solid fa-user-plus"></i> Add Student</button>
            </div>
        </div>
        <div id="cr-roster-stack">
    `;

    students.forEach((st, idx) => {
        html += `
            <div class="cr-student-row">
                <div class="cr-student-info">
                    <h4>${st.name}</h4>
                    <p>${st.roll}</p>
                </div>
                <label class="checkbox-pill" style="background:#fafafa; border:1px solid var(--border); padding:6px 10px; border-radius:6px; cursor:pointer;">
                    <input type="checkbox" class="cr-attendance-toggle" data-index="${idx}" ${st.status ? 'checked' : ''} style="accent-color:var(--primary);">
                    <span style="font-size:0.8rem; font-weight:600;">Present Today</span>
                </label>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;

    // QR Token Refresh
    document.getElementById('regenerate-qr').onclick = () => {
        const newToken = "TJS-" + Math.floor(1000 + Math.random() * 9000);
        localStorage.setItem('tjs_active_qr_token', newToken);
        document.getElementById('qr-token-display').textContent = newToken;
        alert("New QR session token generated successfully!");
    };

    container.querySelectorAll('.cr-attendance-toggle').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const idx = e.target.getAttribute('data-index');
            students[idx].status = e.target.checked;
            localStorage.setItem('tjs_students_roster', JSON.stringify(students));
        });
    });

    const studentModal = document.getElementById('student-modal');
    document.getElementById('open-student-modal').onclick = () => studentModal.classList.add('active');
    document.getElementById('close-student-modal').onclick = () => studentModal.classList.remove('active');

    document.getElementById('student-form').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('new-student-name').value.trim();
        const roll = document.getElementById('new-student-roll').value.trim();
        if (name && roll) {
            students.push({ name, roll, status: true });
            localStorage.setItem('tjs_students_roster', JSON.stringify(students));
            studentModal.classList.remove('active');
            document.getElementById('student-form').reset();
            renderCRAttendanceView();
        }
    };
}

function renderAssignments(user) {
    const container = document.getElementById('assignments-stack');
    let tasks = JSON.parse(localStorage.getItem('tjs_tasks')) || [
        { id: 1, course: "Deep Learning for Vision", title: "Back Propagation", deadline: "2026-06-15T23:59", completedBy: ["Harini Palani"] }
    ];

    container.innerHTML = '';
    if (tasks.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:20px;">No active assignments posted.</p>`;
        return;
    }

    tasks.forEach(task => {
        const isCompletedByMe = task.completedBy.includes(user.name);
        
        let actionsHtml = '';
        if (user.role === 'student') {
            if (isCompletedByMe) {
                actionsHtml = `<span class="completed-badge"><i class="fa-solid fa-check"></i> Completed & Notified</span>`;
            } else {
                actionsHtml = `
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="btn-secondary set-reminder-btn" data-title="${task.title}"><i class="fa-regular fa-bell"></i> Remind Me</button>
                        <button class="btn-accent mark-complete-btn" data-id="${task.id}"><i class="fa-regular fa-circle-check"></i> Mark Completed</button>
                    </div>
                `;
            }
        } else {
            let completedNames = task.completedBy.length > 0 ? task.completedBy.join(", ") : "None yet";
            actionsHtml = `
                <div style="text-align:right; display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
                    <span style="font-size:0.8rem; font-weight:600; color:var(--accent);"><i class="fa-solid fa-users"></i> ${task.completedBy.length} Completed</span>
                    <div class="completed-list-box">Students: ${completedNames}</div>
                    <button class="btn-secondary download-completed-btn" data-title="${task.title}" style="font-size:0.7rem; padding:4px 8px;"><i class="fa-solid fa-download"></i> Download Completed List</button>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = 'assignment-card';
        card.innerHTML = `
            <div class="assignment-details">
                <h4>${task.course}: ${task.title}</h4>
                <p><i class="fa-regular fa-clock"></i> Deadline: ${task.deadline.replace('T', ' ')}</p>
            </div>
            <div>${actionsHtml}</div>
        `;
        container.appendChild(card);
    });

    container.onclick = (e) => {
        const markBtn = e.target.closest('.mark-complete-btn');
        if (markBtn) {
            const taskId = Number(markBtn.getAttribute('data-id'));
            const targetTask = tasks.find(t => t.id === taskId);
            if (targetTask && !targetTask.completedBy.includes(user.name)) {
                targetTask.completedBy.push(user.name);
                localStorage.setItem('tjs_tasks', JSON.stringify(tasks));
                renderAssignments(user);
            }
        }

        const remindBtn = e.target.closest('.set-reminder-btn');
        if (remindBtn) {
            const title = remindBtn.getAttribute('data-title');
            alert(`Reminder scheduled for "${title}"! You will receive a notification alert ahead of the deadline.`);
            setTimeout(() => {
                alert(`🔔 REMINDER ALERT: Your assignment "${title}" is due soon. Make sure to complete and submit it on time!`);
            }, 6000);
        }

        const downloadCompletedBtn = e.target.closest('.download-completed-btn');
        if (downloadCompletedBtn) {
            const taskTitle = downloadCompletedBtn.getAttribute('data-title');
            const targetTask = tasks.find(t => t.title === taskTitle);
            
            let csvContent = "data:text/csv;charset=utf-8,Completed Students List\n";
            if (targetTask && targetTask.completedBy.length > 0) {
                targetTask.completedBy.forEach(name => {
                    csvContent += `"${name}"\r\n`;
                });
            } else {
                csvContent += `"No submissions recorded yet"\r\n`;
            }

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Completed_List_${taskTitle.replace(/\s+/g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
}
