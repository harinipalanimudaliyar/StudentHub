const COURSES = ['App Dev', 'Web Sec', 'Dist Comp', 'AI', 'ML', 'Compiler', 'Networks'];

export function initAttendance() {
    const container = document.getElementById('attendance-cards-container');
    const exportBtn = document.getElementById('export-csv');

    let attendanceData = JSON.parse(localStorage.getItem('attendance_matrix')) || generateDefaultMatrix();

    function renderCards() {
        container.innerHTML = '';
        // Render in reverse chronological order so Today is at the top, Yesterday below
        const reversedData = [...attendanceData].reverse();

        reversedData.forEach((row, revIndex) => {
            const actualIndex = attendanceData.length - 1 - revIndex;
            const card = document.createElement('div');
            card.className = 'attendance-row-card';

            let checkboxesHtml = '';
            COURSES.forEach((course, courseIndex) => {
                const isChecked = row.statuses[courseIndex] ? 'checked' : '';
                checkboxesHtml += `
                    <label class="checkbox-pill">
                        <input type="checkbox" data-day="${actualIndex}" data-course="${courseIndex}" ${isChecked}>
                        <span>${course}</span>
                    </label>
                `;
            });

            card.innerHTML = `
                <div class="attendance-date-label">
                    <span><i class="fa-regular fa-calendar-days"></i> ${row.date}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${revIndex === 0 ? 'Today' : (revIndex === 1 ? 'Yesterday' : '')}</span>
                </div>
                <div class="attendance-checkboxes-grid">
                    ${checkboxesHtml}
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderCards();

    container.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const dayIdx = e.target.getAttribute('data-day');
            const courseIdx = e.target.getAttribute('data-course');
            attendanceData[dayIdx].statuses[courseIdx] = e.target.checked;
            localStorage.setItem('attendance_matrix', JSON.stringify(attendanceData));
        }
    });

    exportBtn.addEventListener('click', () => {
        let csvContent = "data:text/csv;charset=utf-8,Date," + COURSES.join(",") + "\n";
        attendanceData.forEach(row => {
            csvContent += row.date + "," + row.statuses.join(",") + "\r\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "student_attendance_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function generateDefaultMatrix() {
    const matrix = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        matrix.push({
            date: d.toISOString().split('T')[0],
            statuses: [false, false, false, false, false, false, false]
        });
    }
    return matrix;
}
