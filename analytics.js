/* ============================================================
   GURU.AI PARENT PORTAL - ANALYTICS DASHBOARD
   Data-driven visualizations powered by the /api/analytics endpoint.

   5 Visualizations:
   1. Progress Trend    - Line chart (7-day accuracy trend)
   2. Subject Performance - Horizontal bar chart (per-subject accuracy)
   3. Weakest Topics    - Styled HTML list with progress bars
   4. Study Consistency - 28-day heatmap grid
   5. Exam Readiness    - Circular gauge

   Top Stats Row (5 cards):
   Streak | Avg Time | Accuracy | Exam Readiness | Homework Status
   ============================================================ */

let progressChartInstance = null;
let subjectChartInstance = null;

// Chart.js global defaults
if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#888888';
}

// ---- CHART COLORS ----
const chartColors = {
    blue: 'rgba(135, 206, 235, 0.8)',
    blueBorder: '#5bb5d6',
    blueFill: 'rgba(135, 206, 235, 0.15)',
    brown: 'rgba(210, 180, 140, 0.8)',
    brownBorder: '#b89468',
    green: 'rgba(76, 175, 80, 0.8)',
    greenBorder: '#388e3c',
    orange: 'rgba(255, 152, 0, 0.8)',
    orangeBorder: '#f57c00',
    red: 'rgba(244, 67, 54, 0.7)',
    redBorder: '#d32f2f',
    purple: 'rgba(156, 39, 176, 0.7)',
    purpleBorder: '#7b1fa2'
};

const subjectColorMap = {
    'Mathematics': { bg: chartColors.blue, border: chartColors.blueBorder },
    'Science': { bg: chartColors.green, border: chartColors.greenBorder },
    'English': { bg: chartColors.orange, border: chartColors.orangeBorder },
    'Hindi': { bg: chartColors.brown, border: chartColors.brownBorder },
    'Social Studies': { bg: chartColors.purple, border: chartColors.purpleBorder },
    'General': { bg: chartColors.red, border: chartColors.redBorder },
    'GK': { bg: 'rgba(0,188,212,0.7)', border: '#00838f' },
    'EVS': { bg: 'rgba(139,195,74,0.7)', border: '#558b2f' }
};

function getSubjectColor(subject) {
    return subjectColorMap[subject] || { bg: chartColors.blue, border: chartColors.blueBorder };
}

// ============================================================
// MASTER RENDER FUNCTION
// ============================================================
function renderAnalytics(data) {
    if (!data) return;

    // Update top stat cards
    updateStatCards(data);

    // Render 5 visualizations
    renderProgressTrend(data.progress_trend || []);
    renderSubjectPerformance(data.subject_performance || []);
    renderWeakestTopics(data.weakest_topics || []);
    renderStudyConsistency(data.study_consistency || []);
    renderExamReadiness(data.exam_readiness || 0);
}

// ============================================================
// TOP STAT CARDS
// ============================================================
function updateStatCards(data) {
    // Streak
    const streakEl = document.getElementById('stat-streak');
    if (streakEl) {
        streakEl.textContent = (data.streak || 0) + ' days';
    }

    // Avg Time
    const avgTimeEl = document.getElementById('stat-avg-time');
    if (avgTimeEl) {
        const mins = data.avg_time || 0;
        avgTimeEl.textContent = mins > 0 ? mins + ' min' : '0 min';
    }

    // Accuracy
    const accEl = document.getElementById('stat-accuracy');
    if (accEl) {
        accEl.textContent = data.total_attempts > 0 ? data.accuracy + '%' : '-';
    }

    // Exam Readiness
    const erEl = document.getElementById('stat-exam-readiness');
    if (erEl) {
        erEl.textContent = data.total_attempts > 0 ? data.exam_readiness + '%' : '-';
    }

    // Homework Status
    const hwEl = document.getElementById('stat-hw-status');
    const hwCard = document.getElementById('stat-hw-card');
    if (hwEl && data.homework_status) {
        const hw = data.homework_status;
        if (hw.status === 'done') {
            hwEl.textContent = 'Done';
            if (hwCard) hwCard.className = 'stat-card stat-hw hw-done';
        } else if (hw.status === 'pending') {
            hwEl.textContent = 'Pending';
            if (hwCard) hwCard.className = 'stat-card stat-hw hw-pending';
        } else {
            hwEl.textContent = 'None';
            if (hwCard) hwCard.className = 'stat-card stat-hw hw-none';
        }
        // Show count detail below
        const hwDetail = document.getElementById('stat-hw-detail');
        if (hwDetail) {
            if (hw.total > 0) {
                hwDetail.textContent = hw.done + ' done / ' + hw.pending + ' left';
            } else {
                hwDetail.textContent = 'Not assigned';
            }
        }
    }
}

// ============================================================
// 1. PROGRESS TREND - Line Chart (7-day accuracy)
// ============================================================
function renderProgressTrend(trend) {
    const canvas = document.getElementById('progressChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (progressChartInstance) {
        progressChartInstance.destroy();
        progressChartInstance = null;
    }

    const labels = trend.map(d => {
        const dt = new Date(d.date + 'T00:00:00');
        return dt.toLocaleDateString('en-IN', { weekday: 'short' });
    });

    const accuracyData = trend.map(d => d.accuracy);
    const attemptsData = trend.map(d => d.attempts);
    const hasData = attemptsData.some(v => v > 0);

    progressChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Accuracy %',
                data: accuracyData,
                borderColor: chartColors.blueBorder,
                backgroundColor: chartColors.blueFill,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: chartColors.blueBorder,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(44,44,44,0.9)',
                    cornerRadius: 8,
                    callbacks: {
                        label: function(ctx) {
                            const idx = ctx.dataIndex;
                            const acc = ctx.raw;
                            const att = attemptsData[idx] || 0;
                            if (acc === null || acc === undefined) return ' No activity';
                            return ` ${acc}% accuracy (${att} questions)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    border: { display: false },
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: v => v + '%',
                        stepSize: 25
                    }
                }
            }
        }
    });

    // Show empty state overlay if no data
    const wrap = canvas.closest('.chart-card');
    if (wrap) {
        let overlay = wrap.querySelector('.chart-empty-overlay');
        if (!hasData) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'chart-empty-overlay';
                overlay.innerHTML = '<p>No quiz data yet. Progress will appear after your child takes quizzes.</p>';
                wrap.querySelector('.chart-wrap').appendChild(overlay);
            }
            overlay.style.display = 'flex';
        } else if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// ============================================================
// 2. SUBJECT PERFORMANCE - Horizontal Bar Chart
// ============================================================
function renderSubjectPerformance(subjects) {
    const canvas = document.getElementById('subjectChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (subjectChartInstance) {
        subjectChartInstance.destroy();
        subjectChartInstance = null;
    }

    if (subjects.length === 0) {
        const wrap = canvas.closest('.chart-card');
        if (wrap) {
            const chartWrap = wrap.querySelector('.chart-wrap');
            chartWrap.innerHTML = '<div class="chart-empty-state"><p>No subject data yet</p></div>';
        }
        return;
    }

    const labels = subjects.map(s => s.subject);
    const data = subjects.map(s => s.accuracy);
    const bgColors = subjects.map(s => getSubjectColor(s.subject).bg);
    const borderColors = subjects.map(s => getSubjectColor(s.subject).border);

    subjectChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Accuracy',
                data: data,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const idx = ctx.dataIndex;
                            const att = subjects[idx].attempts || 0;
                            return ` ${ctx.raw}% accuracy (${att} Qs)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    border: { display: false },
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: v => v + '%' }
                },
                y: {
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });
}

// ============================================================
// 3. WEAKEST TOPICS - HTML List with Progress Bars
// ============================================================
function renderWeakestTopics(topics) {
    const container = document.getElementById('weakest-topics');
    if (!container) return;

    if (topics.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:20px 8px;">
                <p style="color:#888;font-size:14px;">No focus areas identified yet.</p>
                <p class="empty-sub">Topics that need more practice will appear here.</p>
            </div>`;
        return;
    }

    container.innerHTML = topics.map((t, i) => {
        const color = getSubjectColor(t.subject);
        const barWidth = Math.max(t.accuracy, 5); // minimum 5% for visibility
        const accColor = t.accuracy < 40 ? '#d32f2f' : t.accuracy < 60 ? '#f57c00' : '#388e3c';
        return `
            <div class="topic-item">
                <div class="topic-info">
                    <span class="topic-name">${escapeHtml(t.topic)}</span>
                    <span class="topic-subject-tag" style="background:${color.bg};color:${color.border};">${escapeHtml(t.subject)}</span>
                </div>
                <div class="topic-bar-row">
                    <div class="topic-bar">
                        <div class="topic-bar-fill" style="width:${barWidth}%;background:${accColor};"></div>
                    </div>
                    <span class="topic-acc" style="color:${accColor};">${t.accuracy}%</span>
                </div>
                <div class="topic-meta">${t.attempts} attempts</div>
            </div>`;
    }).join('');
}

// ============================================================
// 4. STUDY CONSISTENCY - 28-Day Heatmap Grid
// ============================================================
function renderStudyConsistency(days) {
    const container = document.getElementById('study-heatmap');
    if (!container) return;

    if (days.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No activity data yet</p></div>';
        return;
    }

    // Find max count for color scaling
    const maxCount = Math.max(...days.map(d => d.count), 1);

    // Day labels
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    // Build the grid HTML (4 weeks x 7 days)
    let html = '<div class="heatmap-grid">';

    // Day headers
    html += '<div class="heatmap-row heatmap-header">';
    dayLabels.forEach(label => {
        html += `<div class="heatmap-label">${label}</div>`;
    });
    html += '</div>';

    // Data rows (4 weeks)
    for (let week = 0; week < 4; week++) {
        html += '<div class="heatmap-row">';
        for (let day = 0; day < 7; day++) {
            const idx = week * 7 + day;
            if (idx < days.length) {
                const d = days[idx];
                const count = d.count || 0;
                const intensity = count === 0 ? 0 : Math.min(Math.ceil(count / maxCount * 4), 4);
                const dateObj = new Date(d.date + 'T00:00:00');
                const dateLabel = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                const title = `${dateLabel}: ${count} activit${count === 1 ? 'y' : 'ies'}`;
                html += `<div class="heatmap-cell level-${intensity}" title="${title}"></div>`;
            } else {
                html += '<div class="heatmap-cell level-0"></div>';
            }
        }
        html += '</div>';
    }

    html += '</div>';

    // Legend
    html += `
        <div class="heatmap-legend">
            <span class="heatmap-legend-label">Less</span>
            <div class="heatmap-cell-small level-0"></div>
            <div class="heatmap-cell-small level-1"></div>
            <div class="heatmap-cell-small level-2"></div>
            <div class="heatmap-cell-small level-3"></div>
            <div class="heatmap-cell-small level-4"></div>
            <span class="heatmap-legend-label">More</span>
        </div>`;

    container.innerHTML = html;
}

// ============================================================
// 5. EXAM READINESS - Circular Gauge
// ============================================================
function renderExamReadiness(score) {
    const container = document.getElementById('exam-readiness-gauge');
    if (!container) return;

    score = Math.max(0, Math.min(100, score || 0));

    // Determine color and label
    let color, label;
    if (score >= 80) {
        color = '#4CAF50';
        label = 'Excellent';
    } else if (score >= 60) {
        color = '#FF9800';
        label = 'Good';
    } else if (score >= 40) {
        color = '#f57c00';
        label = 'Improving';
    } else if (score > 0) {
        color = '#F44336';
        label = 'Needs Work';
    } else {
        color = '#ccc';
        label = 'No Data';
    }

    // SVG circular gauge
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    container.innerHTML = `
        <div class="gauge-wrap">
            <svg class="gauge-svg" viewBox="0 0 180 180">
                <circle class="gauge-bg" cx="90" cy="90" r="${radius}" />
                <circle class="gauge-fill" cx="90" cy="90" r="${radius}"
                    stroke="${color}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"
                    style="transition: stroke-dashoffset 1s ease;"
                />
            </svg>
            <div class="gauge-center">
                <span class="gauge-value" style="color:${color};">${score > 0 ? score + '%' : '-'}</span>
                <span class="gauge-label">${label}</span>
            </div>
        </div>
        <div class="gauge-breakdown">
            <div class="gauge-factor">
                <span class="gauge-factor-dot" style="background:#5bb5d6;"></span>
                <span>Accuracy (40%)</span>
            </div>
            <div class="gauge-factor">
                <span class="gauge-factor-dot" style="background:#FF9800;"></span>
                <span>Consistency (30%)</span>
            </div>
            <div class="gauge-factor">
                <span class="gauge-factor-dot" style="background:#4CAF50;"></span>
                <span>Coverage (30%)</span>
            </div>
        </div>`;
}

// ============================================================
// HELPER: Escape HTML (fallback if not defined in app.js)
// ============================================================
if (typeof escapeHtml === 'undefined') {
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
