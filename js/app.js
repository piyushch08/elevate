// ===== STATE =====
const D = window.D = {
  settings: { anim: true, tilt: true, ripple: true, fontSize: 16 },
  profile: { name: 'Explorer', status: 'On a roll today 🔥' },
  goals: { study: 120, cal: 2200, prot: 150, carb: 250, water: 2000, weeklyWorkouts: 0 },
  today: { study: 0, cal: 0, prot: 0, carb: 0, water: 0 },
  tasks: [], events: [], deadlines: [], studyLog: [], meals: [],
  exercises: [{ name: 'Bench Press', sets: '4×8', done: false }, { name: 'Overhead Press', sets: '3×10', done: false }, { name: 'Tricep Pushdown', sets: '3×12', done: false }],
  streak: [0, 0, 0, 0, 0, 0, 0], habits: [], notes: [],
  filter: 'all', theme: 'dark',
  calY: new Date().getFullYear(), calM: new Date().getMonth(), calEvents: {},
  timerSec: 25 * 60, timerBase: 25 * 60, timerOn: false, workoutOn: false,
  editNoteId: null, noteColor: '#00f2fe',
  lastUid: 'guest', lastActiveDate: new Date().toDateString(),
  subjects: ['Mathematics', 'Programming', 'Physics', 'Data Science', 'English', 'Other']
};

// ===== REPORT BUG =====
window.sendBugReport = function(e) {
  e.preventDefault();
  const title = document.getElementById('bug-title').value;
  const desc = document.getElementById('bug-desc').value;
  const mailto = `mailto:piyush.ch407@gmail.com?subject=Bug Report: ${encodeURIComponent(title)}&body=${encodeURIComponent(desc)}`;
  window.location.href = mailto;
};

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0,0,0,0);
  return d.getTime();
}

window.checkNewDay = function() {
  const today = new Date().toDateString();
  if (D.lastActiveDate !== today) {
    D.today = { study: 0, cal: 0, prot: 0, carb: 0, water: 0 };
    if (getWeekStart(new Date()) > getWeekStart(new Date(D.lastActiveDate))) {
      D.streak = [0, 0, 0, 0, 0, 0, 0];
      D.habits.forEach(h => h.days = [0, 0, 0, 0, 0, 0, 0]);
    }
    D.lastActiveDate = today;
    return true; // indicates it was reset
  }
  return false;
};

const QUOTES = [
  { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
  { q: "Small daily improvements are the key to staggering long-term results.", a: "Unknown" },
  { q: "Discipline is the bridge between goals and accomplishment.", a: "Jim Rohn" },
  { q: "You don't have to be great to start, but you have to start to be great.", a: "Zig Ziglar" },
  { q: "The body achieves what the mind believes.", a: "Napoleon Hill" },
  { q: "Focus on being productive instead of busy.", a: "Tim Ferriss" },
  { q: "Success is the sum of small efforts repeated day in and day out.", a: "Robert Collier" },
  { q: "An investment in knowledge pays the best interest.", a: "Benjamin Franklin" },
];

const PAGES = { dashboard: 'Dashboard', todo: 'To-Do List', calendar: 'Calendar', study: 'Study Hub', diet: 'Diet & Nutrition', exercise: 'Exercise Hub', habits: 'Habit Tracker', notes: 'Notes & Journal', personalize: 'Personalization' };
const WDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  load();
  goTo('dashboard');
  setupNav();
  setupRipple();
  setupTilt();
  setupEditable();
  setupSearch();
  setupColorPicker();
  applyFontSize();
  tick(); setInterval(tick, 1000);
  updateGreeting(); setInterval(updateGreeting, 60000);
  renderAll();
  newQuote();
  // close overlays on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#notif-btn') && !e.target.closest('#notif-panel')) closePop('notif-panel');
    if (!e.target.closest('.tb-search') && !e.target.closest('#search-drop')) closePop('search-drop');
    if (!e.target.closest('.sidebar') && !e.target.closest('.hamburger') && !e.target.closest('#mobile-menu-btn') && document.getElementById('sidebar').classList.contains('open')) {
      // Allow the overlay click to handle closing, or close it here safely if overlay isn't clicked
      if(!e.target.closest('.sidebar-overlay')) toggleSidebar();
    }
  });
  // restore theme
  applyTheme(D.theme, document.querySelector(`.theme-card[data-t="${D.theme}"]`), true);
});

function renderAll() {
  renderTasks(); renderEvents(); renderDeadlines();
  renderStudyLog(); renderMeals(); renderExercises();
  renderStreak(); renderHabits(); renderNotes();
  renderCalendar(); updateRings(); updateMacros(); updateWaterUI();
  renderSubjects();
}
let localSaveTimeout = null;
let firestoreSaveTimeout = null;
function save() {
  D.lastUid = window.currentUserUid || 'guest';
  
  // Debounce localStorage writes (300ms) to prevent micro-stutters
  clearTimeout(localSaveTimeout);
  localSaveTimeout = setTimeout(() => {
    try {
      localStorage.setItem('elevate2', JSON.stringify(D));
    } catch (e) { console.error('Error saving state:', e); }
  }, 300);

  // Sync to Firebase if the user is logged in (debounced to 1000ms)
  if (window.saveToFirestore) {
    clearTimeout(firestoreSaveTimeout);
    firestoreSaveTimeout = setTimeout(() => {
      window.saveToFirestore();
    }, 1000);
  }
}
function load() {
  try { const s = localStorage.getItem('elevate2'); if (s) Object.assign(D, JSON.parse(s)); } catch (e) { }
  window.checkNewDay();
}

// ===== TOAST =====
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast';
  const ico = type === 'success' ? 'checkbox-circle' : type === 'error' ? 'close-circle' : 'information';
  el.innerHTML = `<i class="ri-${ico}-line"></i> ${msg}`;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(120%)'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ===== NAV =====
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(li => li.addEventListener('click', () => goTo(li.dataset.page)));
  document.querySelectorAll('.bn-item').forEach(b => b.addEventListener('click', () => goTo(b.dataset.page)));
}
function goTo(pg) {
  document.querySelectorAll('.nav-item,.bn-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll(`[data-page="${pg}"]`).forEach(n => n.classList.add('active'));
  const pg_el = document.getElementById('page-' + pg);
  if (pg_el) pg_el.classList.add('active');
  const bc = document.getElementById('bc-page'); if (bc) bc.textContent = PAGES[pg] || pg;
  if (document.getElementById('sidebar').classList.contains('open')) toggleSidebar();
}
function toggleSidebar() { 
  document.getElementById('sidebar').classList.toggle('open');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.toggle('show');
}

// ===== CLOCK & GREETING =====
let timerInterval;
let cachedTbTime = null;
function tick() {
  const now = new Date();
  if (!cachedTbTime) cachedTbTime = document.getElementById('tb-time');
  if (cachedTbTime) {
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if (cachedTbTime.textContent !== timeStr) cachedTbTime.textContent = timeStr;
  }
  
  if (D.timerOn) { 
    D.timerSec--; 
    if (D.timerSec <= 0) { 
      D.timerSec = 0; 
      D.timerOn = false; 
      const b = document.getElementById('timer-btn'); 
      if (b) b.innerHTML = '<i class="ri-play-fill"></i> Start'; 
      try {
        const a = new (window.AudioContext || window.webkitAudioContext)();
        const o = a.createOscillator(), g = a.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(523.25, a.currentTime);
        g.gain.setValueAtTime(0, a.currentTime);
        g.gain.linearRampToValueAtTime(0.06, a.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.5);
        o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.5);
      } catch (e) {}
      toast('⏰ Timer done! Great work!', 'success'); 
    } 
  }
  const td = document.getElementById('timer-disp'); 
  const tStr = fmtSec(D.timerSec);
  if (td && td.textContent !== tStr) td.textContent = tStr;
}
function pad(n) { return String(n).padStart(2, '0') }
function fmtSec(s) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }
function updateGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good Morning ☀️' : h < 17 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙';
  const name = document.getElementById('u-name')?.textContent || 'Explorer';
  const el = document.getElementById('greeting'); if (el) el.textContent = `${g}, ${name}!`;
  const de = document.getElementById('today-date'); if (de) de.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ===== MODALS =====
function openM(id) { document.getElementById(id).classList.remove('hide') }
function closeM(id) { document.getElementById(id).classList.add('hide') }

// ===== RIPPLE =====
function setupRipple() {
  document.addEventListener('click', e => {
    if (!D.settings.ripple) return;
    const btn = e.target.closest('.btn'); if (!btn) return;
    const r = btn.getBoundingClientRect(), d = Math.max(r.width, r.height), sp = document.createElement('span');
    sp.className = 'ripple'; sp.style.width = sp.style.height = d + 'px';
    sp.style.left = (e.clientX - r.left - d / 2) + 'px'; sp.style.top = (e.clientY - r.top - d / 2) + 'px';
    btn.appendChild(sp); setTimeout(() => sp.remove(), 600);
  });
}

// ===== TILT =====
function setupTilt() {
  // Tilting effect removed per user request. Simple hover effects are handled in CSS.
}

// ===== EDITABLE PROFILE =====
function setupEditable() {
  const nameEl = document.getElementById('u-name');
  if (nameEl && D.profile?.name) nameEl.textContent = D.profile.name;
  if (nameEl) {
    nameEl.addEventListener('blur', () => { D.profile = D.profile || {}; D.profile.name = nameEl.textContent; save(); updateGreeting(); toast('Profile updated!', 'success'); });
    nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } });
  }

  const statusEl = document.getElementById('u-status');
  if (statusEl && D.profile?.status) statusEl.textContent = D.profile.status;
  if (statusEl) {
    statusEl.addEventListener('blur', () => { D.profile = D.profile || {}; D.profile.status = statusEl.textContent; save(); toast('Profile updated!', 'success'); });
    statusEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); statusEl.blur(); } });
  }
  // quick task enter
  const qi = document.getElementById('quick-input');
  if (qi) qi.addEventListener('keydown', e => { if (e.key === 'Enter' && qi.value.trim()) { D.tasks.push({ id: Date.now(), name: qi.value.trim(), done: false, cat: 'General', pri: 'normal', mins: 0 }); qi.value = ''; renderTasks(); updateRings(); save(); toast('Task added!', 'success'); } });
}

// ===== DASHBOARD STATS & CHARTS =====
let progressChartInst = null;
let pieChartInst = null;

function updateRings() {
  // Update the 4 top cards
  const focusHours = Number(((D.today.study || 0) / 60).toFixed(1));
  const tasksDone = D.tasks.filter(t => t.done).length;
  const mealsToday = D.meals.filter(m => m.id >= new Date().setHours(0,0,0,0)).length;
  const activeDays = D.streak.filter(Boolean).length;
  
  const elFocus = document.getElementById('stat-focus'); if(elFocus) elFocus.textContent = focusHours;
  const elTasks = document.getElementById('stat-tasks'); if(elTasks) elTasks.textContent = tasksDone;
  const elMeals = document.getElementById('stat-meals'); if(elMeals) elMeals.textContent = mealsToday;
  const elActive = document.getElementById('stat-active'); if(elActive) elActive.textContent = activeDays;
  
  if (typeof Chart !== 'undefined') {
    updateProgressChart();
    updatePieChart();
  } else {
    // If Chart.js isn't loaded yet, try again in 200ms
    setTimeout(updateRings, 200);
  }
}

window.updateProgressChart = function() {
  const period = document.getElementById('progress-period')?.value || 'weekly';
  const ctx = document.getElementById('progressChart');
  if(!ctx) return;
  
  let labels = [];
  let data1 = [];
  let data2 = [];
  let xAxisTitle = 'Days of the Week';
  const now = Date.now();
  const currWeekStart = getWeekStart(now);
  
  if (period === 'weekly') {
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const focusWeek = [0,0,0,0,0,0,0];
    const sessionsWeek = [0,0,0,0,0,0,0];
    
    D.studyLog.forEach(s => {
      if(s.id >= currWeekStart) {
        let d = new Date(s.id).getDay();
        let day = (d + 6) % 7; // Mon=0
        focusWeek[day] += (s.mins / 60);
        sessionsWeek[day] += 1;
      }
    });
    
    data1 = focusWeek.map(v => Number(v.toFixed(1))); // Real focus hours per day
    data2 = sessionsWeek; // Real study sessions per day
  } else if (period === 'monthly') {
    xAxisTitle = 'Weeks of the Month';
    labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    data1 = [0,0,0,0];
    data2 = [0,0,0,0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    D.studyLog.forEach(s => {
      if(s.id >= monthStart) {
        let w = Math.floor(new Date(s.id).getDate() / 7);
        if(w > 3) w = 3;
        data1[w] += (s.mins / 60);
        data2[w] += 1; // Count of study sessions
      }
    });
    data1 = data1.map(v => Number(v.toFixed(1)));
  } else { // yearly
    xAxisTitle = 'Months of the Year';
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    data1 = Array(12).fill(0);
    data2 = Array(12).fill(0);
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    D.studyLog.forEach(s => {
      if(s.id >= yearStart) {
        let m = new Date(s.id).getMonth();
        data1[m] += (s.mins / 60);
        data2[m] += 1;
      }
    });
    data1 = data1.map(v => Number(v.toFixed(1)));
  }
  
  if (progressChartInst) {
    progressChartInst.data.labels = labels;
    progressChartInst.data.datasets[0].data = data1;
    progressChartInst.data.datasets[1].data = data2;
    progressChartInst.options.scales.x.title.text = xAxisTitle;
    progressChartInst.update();
  } else {
    const canvasCtx = ctx.getContext('2d');
    const grad1 = canvasCtx.createLinearGradient(0, 0, 0, 250);
    grad1.addColorStop(0, '#1A73E8'); 
    grad1.addColorStop(1, 'rgba(26, 115, 232, 0.1)'); 
    
    const grad2 = canvasCtx.createLinearGradient(0, 0, 0, 250);
    grad2.addColorStop(0, 'rgba(52, 168, 83, 0.4)'); 
    grad2.addColorStop(1, 'rgba(52, 168, 83, 0.0)'); 

    progressChartInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Focus Hours',
            data: data1,
            backgroundColor: grad1,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.5,
            categoryPercentage: 0.7,
            yAxisID: 'y'
          },
          {
            label: 'Study Sessions',
            data: data2,
            type: 'line',
            backgroundColor: grad2,
            borderColor: '#34A853',
            borderWidth: 3,
            tension: 0.4, // Smooth curve
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#34A853',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            titleFont: { family: "'Outfit', sans-serif", size: 13 },
            bodyFont: { family: "'Outfit', sans-serif", size: 13 },
            padding: 12,
            cornerRadius: 8,
            boxPadding: 4,
            usePointStyle: true
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Focus Hours',
              color: 'var(--ts)',
              font: { size: 12, family: "'Outfit', sans-serif" }
            },
            beginAtZero: true,
            grid: { 
              color: 'rgba(150,150,150,0.1)',
              borderDash: [5, 5]
            },
            border: { display: false },
            ticks: {
              stepSize: 1, // Only show whole numbers (1hr, 2hr)
              callback: function(value) {
                return value + 'hr';
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Study Sessions',
              color: 'var(--ts)',
              font: { size: 12, family: "'Outfit', sans-serif" }
            },
            beginAtZero: true,
            grid: { drawOnChartArea: false }, // Prevent gridline overlap
            border: { display: false },
            ticks: {
              stepSize: 1, // Whole numbers only
              callback: function(value) {
                return value;
              }
            }
          },
          x: {
            title: {
              display: true,
              text: xAxisTitle,
              color: 'var(--ts)',
              font: { size: 12, family: "'Outfit', sans-serif" }
            },
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });
  }
};

window.updatePieChart = function() {
  const period = document.getElementById('breakdown-period')?.value || 'today';
  const ctx = document.getElementById('pieChart');
  if(!ctx) return;
  
  let data = [];
  if (period === 'today') {
    const todayStudyHours = Number(((D.today.study || 0) / 60).toFixed(1));
    data = [todayStudyHours, D.tasks.filter(t=>t.cat==='Exercise' && t.done).length || 0, D.meals.filter(m=>m.id >= new Date().setHours(0,0,0,0)).length || 0];
  } else {
    // weekly
    const currWeekStart = getWeekStart(Date.now());
    const weekStudyMins = D.studyLog.reduce((s, log) => log.id >= currWeekStart ? s + log.mins : s, 0);
    const weekStudyHours = Number((weekStudyMins / 60).toFixed(1));
    const weekMeals = D.meals.filter(m => m.id >= currWeekStart).length;
    const weekWorkouts = D.streak.filter(Boolean).length;
    data = [weekStudyHours, weekWorkouts, weekMeals];
  }
  // Ensure chart renders something if all values are 0
  if(data[0]===0 && data[1]===0 && data[2]===0) data = [1,1,1];
  
  let labels = ['Study', 'Exercise', 'Diet'];
  let colors = ['#1A73E8', '#34A853', '#FBBC04'];
  
  if (pieChartInst) {
    pieChartInst.data.labels = labels;
    pieChartInst.data.datasets[0].data = data;
    pieChartInst.data.datasets[0].backgroundColor = colors;
    pieChartInst.update();
  } else {
    pieChartInst = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: 'transparent',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            titleFont: { family: "'Outfit', sans-serif", size: 14 },
            bodyFont: { family: "'Outfit', sans-serif", size: 13 },
            padding: 12,
            cornerRadius: 8,
            boxPadding: 4,
            usePointStyle: true
          }
        }
      }
    });
  }
  
  // Update custom legend
  const leg = document.getElementById('pie-legend');
  if (leg) {
    const total = data.reduce((a,b)=>a+b, 0);
    leg.innerHTML = data.map((d, i) => {
      const pct = Math.round((d/total)*100) || 0;
      return `<div class="pie-legend-item">
                <div class="pie-legend-label"><div class="pie-legend-dot" style="background:${colors[i]}"></div>${labels[i]}</div>
                <div class="pie-legend-val">${d} <span class="pie-badge ${pct > 30 ? 'up' : ''}">${pct}%</span></div>
              </div>`;
    }).join('');
  }
};

// ===== TASKS =====
function saveTask() {
  const name = document.getElementById('t-name-inp').value.trim();
  if (!name) { toast('Enter task name.', 'error'); return; }
  try { playClick(); } catch (e) { }
  D.tasks.push({ id: Date.now(), name, done: false, cat: document.getElementById('t-cat').value, pri: document.getElementById('t-pri').value, mins: parseInt(document.getElementById('t-timer').value) || 0 });
  document.getElementById('t-name-inp').value = ''; document.getElementById('t-timer').value = '';
  closeM('m-task'); renderTasks(); updateRings(); save(); toast('Task added!', 'success');
}
function renderTasks() {
  const list = document.getElementById('todo-list'); const empty = document.getElementById('todo-empty'); if (!list) return;
  list.innerHTML = '';
  const filtered = D.tasks.filter(t => D.filter === 'active' ? !t.done : D.filter === 'done' ? t.done : true);
  empty.style.display = filtered.length ? 'none' : 'block';
  filtered.forEach(t => {
    const li = document.createElement('li'); li.className = 'task-item' + (t.done ? ' done' : '');
    li.innerHTML = `<div class="chk${t.done ? ' on' : ''}" onclick="toggleTask(${t.id})"></div><span class="t-name">${t.name}</span><span class="badge ${t.pri === 'urgent' ? 'b-urg' : 'b-norm'}">${t.cat}</span>${t.mins ? `<span class="muted">${t.mins}m</span>` : ''}<div class="t-actions"><button class="btn ico dng" onclick="delTask(${t.id})"><i class="ri-delete-bin-line"></i></button></div>`;
    list.appendChild(li);
  });
  const cnt = document.getElementById('todo-count'); if (cnt) cnt.textContent = `${D.tasks.length} tasks · ${D.tasks.filter(t => t.done).length} done`;
  // dash summary
  const dash = document.getElementById('dash-tasks'); if (!dash) return;
  const rec = D.tasks.slice(-4).reverse();
  dash.innerHTML = rec.length ? rec.map(t => `<div class="task-item${t.done ? ' done' : ''}"><div class="chk${t.done ? ' on' : ''}" onclick="toggleTask(${t.id})"></div><span class="t-name">${t.name}</span></div>`).join('') : '<div class="muted">No tasks yet — add some!</div>';
}
function toggleTask(id) { const t = D.tasks.find(t => t.id === id); if (t) { t.done = !t.done; try { if (t.done) playSuccess(); else playClick(); } catch (e) { } renderTasks(); updateRings(); save(); } }
function delTask(id) { D.tasks = D.tasks.filter(t => t.id !== id); renderTasks(); updateRings(); save(); toast('Task removed.', 'info'); }
function setFilter(f) {
  D.filter = f;
  ['all', 'active', 'done'].forEach(x => { const el = document.getElementById('f-' + x); if (el) el.classList.toggle('prim', x === f); });
  renderTasks();
}

// ===== CALENDAR =====
function renderCalendar() {
  const grid = document.getElementById('cal-grid'); const lbl = document.getElementById('cal-label'); if (!grid) return;
  grid.innerHTML = '';
  const d = new Date(D.calY, D.calM, 1);
  lbl.textContent = d.toLocaleString('default', { month: 'long' }) + ' ' + D.calY;
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(dy => { const h = document.createElement('div'); h.className = 'cal-hd'; h.textContent = dy; grid.appendChild(h); });
  for (let i = 0; i < d.getDay(); i++) { const e = document.createElement('div'); e.className = 'cal-cell cal-empty'; grid.appendChild(e); }
  const days = new Date(D.calY, D.calM + 1, 0).getDate(), today = new Date();
  for (let day = 1; day <= days; day++) {
    const cell = document.createElement('div'); cell.className = 'cal-cell';
    const isToday = day === today.getDate() && D.calM === today.getMonth() && D.calY === today.getFullYear();
    if (isToday) cell.classList.add('cal-today');
    const dateStr = `${D.calY}-${String(D.calM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = D.events.filter(e => e.date === dateStr);

    cell.innerHTML = `<span>${day}</span>`;
    if (dayEvents.length > 0) {
      cell.classList.add('has-evt');
      cell.innerHTML += `<span class="evt-count">${dayEvents.length}</span>`;
      cell.title = dayEvents.map(e => e.name).join(', ');
    }
    cell.onclick = () => {
      document.getElementById('ev-date').value = dateStr;
      openM('m-event');
    };
    grid.appendChild(cell);
  }
}
function calNav(dir) { D.calM += dir; if (D.calM > 11) { D.calM = 0; D.calY++; } if (D.calM < 0) { D.calM = 11; D.calY--; } renderCalendar(); }
function saveEvent() {
  const date = document.getElementById('ev-date').value, name = document.getElementById('ev-name').value.trim();
  if (!date || !name) { toast('Fill in date and name.', 'error'); return; }
  D.events.push({ id: Date.now(), date, name }); D.events.sort((a, b) => a.date.localeCompare(b.date));
  document.getElementById('ev-name').value = ''; closeM('m-event'); renderEvents(); renderCalendar(); save(); toast('Event saved!', 'success');
}

// ===== BUG REPORT =====
window.sendBugReport = function() {
  const title = document.getElementById('bug-title').value.trim();
  const desc = document.getElementById('bug-desc').value.trim();
  if (!title || !desc) {
    if (typeof toast === 'function') toast('Please fill in both title and description', 'error');
    return;
  }
  
  const subject = encodeURIComponent("Bug Report: " + title);
  const body = encodeURIComponent("Description & Steps to Reproduce:\n" + desc + "\n\n---\nReported via ELEVATE Planner App");
  
  // Clear the fields
  document.getElementById('bug-title').value = '';
  document.getElementById('bug-desc').value = '';
  
  if (typeof toast === 'function') toast('Opening email client...', 'success');
  
  // Trigger mailto link
  window.location.href = `mailto:piyush.ch407@gmail.com?subject=${subject}&body=${body}`;
};
function renderEvents() {
  const list = document.getElementById('event-list'); const empty = document.getElementById('event-empty'); if (!list) return;
  list.innerHTML = ''; empty.style.display = D.events.length ? 'none' : 'block';
  D.events.forEach(ev => {
    const li = document.createElement('li');
    li.className = 'task-item';
    const dateObj = new Date(ev.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    li.innerHTML = `<div class="h-ico" style="background:rgba(0,242,254,.15);color:var(--accent);width:32px;height:32px;border-radius:8px;font-size:1.1rem;display:flex;align-items:center;justify-content:center;"><i class="ri-calendar-event-fill"></i></div><div style="flex:1;"><span class="t-name" style="display:block;font-weight:600;">${ev.name}</span><span class="muted"><i class="ri-time-line"></i> ${formattedDate}</span></div><button class="btn ico dng" onclick="delEvent(${ev.id})"><i class="ri-delete-bin-line"></i></button>`;
    list.appendChild(li);
  });
}
function delEvent(id) { D.events = D.events.filter(e => e.id !== id); renderEvents(); save(); toast('Event removed.', 'info'); }

// ===== STUDY TIMER =====
const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
function setMode(m, btn) { D.timerSec = MODES[m]; D.timerBase = MODES[m]; D.timerOn = false; const b = document.getElementById('timer-btn'); if (b) b.innerHTML = '<i class="ri-play-fill"></i> Start'; document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('on')); btn.classList.add('on'); }
function applyCustomTimer() { const v = parseInt(document.getElementById('custom-min').value); if (!v || v < 1) { toast('Enter valid minutes.', 'error'); return; } D.timerSec = v * 60; D.timerBase = v * 60; D.timerOn = false; const b = document.getElementById('timer-btn'); if (b) b.innerHTML = '<i class="ri-play-fill"></i> Start'; document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('on')); toast(`Timer set to ${v} min`, 'success'); }
function toggleTimer() { D.timerOn = !D.timerOn; const b = document.getElementById('timer-btn'); if (b) b.innerHTML = D.timerOn ? '<i class="ri-pause-fill"></i> Pause' : '<i class="ri-play-fill"></i> Resume'; }
function resetTimer() { D.timerOn = false; D.timerSec = D.timerBase; const b = document.getElementById('timer-btn'); if (b) b.innerHTML = '<i class="ri-play-fill"></i> Start'; }

// Subjects
function renderSubjects() {
  const sel = document.getElementById('subj');
  if (sel) sel.innerHTML = (D.subjects || []).map(s => `<option value="${s}">${s}</option>`).join('');
  const list = document.getElementById('subject-list');
  if (list) {
    list.innerHTML = (D.subjects || []).map((s, i) => `<li class="task-item"><span class="t-name">${s}</span><button class="btn ico dng" onclick="delSubject(${i})"><i class="ri-delete-bin-line"></i></button></li>`).join('');
  }
}
function addSubject() {
  const name = document.getElementById('new-subj-name').value.trim();
  if (!name) { toast('Enter subject name.', 'error'); return; }
  if (!D.subjects) D.subjects = [];
  if (D.subjects.includes(name)) { toast('Subject already exists.', 'error'); return; }
  D.subjects.push(name);
  document.getElementById('new-subj-name').value = '';
  renderSubjects(); save(); toast('Subject added!', 'success');
}
function delSubject(idx) {
  D.subjects.splice(idx, 1);
  renderSubjects(); save(); toast('Subject removed.', 'info');
}

function logStudy() {
  const mins = parseInt(document.getElementById('study-mins').value); const subj = document.getElementById('subj').value; const notes = document.getElementById('study-notes').value;
  if (!mins || mins < 1) { toast('Enter valid duration.', 'error'); return; }
  D.today.study += mins; D.studyLog.push({ id: Date.now(), subj, mins, notes });
  document.getElementById('study-mins').value = ''; document.getElementById('study-notes').value = '';
  renderStudyLog(); updateRings(); save(); toast(`Logged ${mins}min of ${subj}!`, 'success');
}
function renderStudyLog() {
  const list = document.getElementById('study-log'); const empty = document.getElementById('study-log-empty'); if (!list) return;
  list.innerHTML = ''; empty.style.display = D.studyLog.length ? 'none' : 'block';
  D.studyLog.slice().reverse().forEach(s => { const li = document.createElement('li'); li.className = 'task-item'; li.innerHTML = `<i class="ri-book-open-line" style="color:var(--accent)"></i><span class="t-name">${s.subj}</span><span class="muted">${s.mins}min</span>${s.notes ? `<span class="muted">${s.notes}</span>` : ''}<button class="btn ico dng" onclick="delStudyLog(${s.id})"><i class="ri-delete-bin-line"></i></button>`; list.appendChild(li); });
}
function delStudyLog(id) { const s = D.studyLog.find(x => x.id === id); if (s) D.today.study = Math.max(0, D.today.study - s.mins); D.studyLog = D.studyLog.filter(x => x.id !== id); renderStudyLog(); updateRings(); save(); }
function saveDeadline() {
  const name = document.getElementById('dl-name').value.trim(); const date = document.getElementById('dl-date').value;
  if (!name || !date) { toast('Fill in name and date.', 'error'); return; }
  D.deadlines.push({ id: Date.now(), name, date, pri: document.getElementById('dl-pri').value, done: false });
  D.deadlines.sort((a, b) => a.date.localeCompare(b.date));
  document.getElementById('dl-name').value = ''; document.getElementById('dl-date').value = '';
  closeM('m-deadline'); renderDeadlines(); save(); toast('Deadline saved!', 'success');
}
function renderDeadlines() {
  const list = document.getElementById('deadline-list'); const empty = document.getElementById('deadline-empty'); if (!list) return;
  list.innerHTML = ''; empty.style.display = D.deadlines.length ? 'none' : 'block';
  D.deadlines.forEach(dl => { const li = document.createElement('li'); li.className = 'task-item' + (dl.done ? ' done' : ''); li.innerHTML = `<div class="chk${dl.done ? ' on' : ''}" onclick="toggleDL(${dl.id})"></div><span class="t-name">${dl.name}</span><span class="badge ${dl.pri === 'urgent' ? 'b-urg' : 'b-norm'}">${dl.date}</span><button class="btn ico dng" onclick="delDL(${dl.id})"><i class="ri-delete-bin-line"></i></button>`; list.appendChild(li); });
}
function toggleDL(id) { const dl = D.deadlines.find(x => x.id === id); if (dl) { dl.done = !dl.done; renderDeadlines(); save(); } }
function delDL(id) { D.deadlines = D.deadlines.filter(x => x.id !== id); renderDeadlines(); save(); }

// ===== DIET =====
function logMeal() {
  const name = document.getElementById('meal-name').value.trim(); if (!name) { toast('Enter meal name.', 'error'); return; }
  const cal = parseInt(document.getElementById('meal-cal').value) || 0; const prot = parseInt(document.getElementById('meal-prot').value) || 0; const carb = parseInt(document.getElementById('meal-carb').value) || 0;
  D.meals.push({ id: Date.now(), name, cal, prot, carb }); D.today.cal += cal; D.today.prot += prot; D.today.carb += carb;
  ['meal-name', 'meal-cal', 'meal-prot', 'meal-carb'].forEach(id => { document.getElementById(id).value = ''; });
  renderMeals(); updateMacros(); updateRings(); save(); toast('Meal logged!', 'success');
}
function renderMeals() {
  const list = document.getElementById('meal-list'); const empty = document.getElementById('meal-empty'); if (!list) return;
  list.innerHTML = ''; empty.style.display = D.meals.length ? 'none' : 'block';
  D.meals.slice().reverse().forEach(m => { const li = document.createElement('li'); li.className = 'task-item'; li.innerHTML = `<i class="ri-restaurant-line" style="color:var(--accent)"></i><span class="t-name">${m.name}</span><span class="muted">${m.cal}kcal·P:${m.prot}g·C:${m.carb}g</span><button class="btn ico dng" onclick="delMeal(${m.id})"><i class="ri-delete-bin-line"></i></button>`; list.appendChild(li); });
}
function delMeal(id) { const m = D.meals.find(x => x.id === id); if (m) { D.today.cal -= m.cal; D.today.prot -= m.prot; D.today.carb -= m.carb; } D.meals = D.meals.filter(x => x.id !== id); renderMeals(); updateMacros(); updateRings(); save(); }
function updateMacros() {
  const set = (bar, lbl, val, max, unit) => { const b = document.getElementById(bar); if (b) b.style.width = Math.min(100, val / max * 100) + '%'; const l = document.getElementById(lbl); if (l) l.textContent = `${Math.round(val)} / ${max} ${unit}`; };
  set('cal-bar', 'cal-lbl', D.today.cal, D.goals.cal, 'kcal');
  set('prot-bar', 'prot-lbl', D.today.prot, D.goals.prot, 'g');
  set('carb-bar', 'carb-lbl', D.today.carb, D.goals.carb, 'g');
}
function addWater(ml) { D.today.water = Math.min(D.today.water + ml, D.goals.water * 1.5); updateWaterUI(); save(); toast(`+${ml}ml logged!`, 'success'); }
function resetWater() { D.today.water = 0; updateWaterUI(); save(); }
function updateWaterUI() {
  const f = document.getElementById('water-fill'); if (f) f.style.height = Math.min(100, D.today.water / D.goals.water * 100) + '%';
  const l = document.getElementById('water-lbl'); if (l) l.textContent = `${D.today.water} / ${D.goals.water} ml`;
}

// ===== EXERCISE =====
function renderExercises() {
  const list = document.getElementById('ex-list'); if (!list) return; list.innerHTML = '';
  D.exercises.forEach((ex, i) => {
    const row = document.createElement('div'); row.className = 'ex-row' + (ex.done ? ' done' : '');
    row.innerHTML = `<div><div class="ex-name">${ex.name}</div><div class="ex-meta">${ex.sets}</div></div><div class="ex-acts"><button class="btn sm${ex.done ? ' prim' : ''}" onclick="checkEx(${i})">${ex.done ? '✓ Done' : 'Mark Done'}</button><button class="btn ico dng" onclick="delEx(${i})"><i class="ri-delete-bin-line"></i></button></div>`;
    list.appendChild(row);
  });
  updateRings();
}
function checkEx(i) { D.exercises[i].done = !D.exercises[i].done; renderExercises(); save(); }
function delEx(i) { D.exercises.splice(i, 1); renderExercises(); save(); }
function addExercise() {
  const name = document.getElementById('new-ex').value.trim(); const sets = document.getElementById('new-sets').value.trim();
  if (!name || !sets) { toast('Fill exercise name and sets.', 'error'); return; }
  D.exercises.push({ name, sets, done: false }); document.getElementById('new-ex').value = ''; document.getElementById('new-sets').value = '';
  renderExercises(); save(); toast('Exercise added!', 'success');
}
function toggleWorkout() {
  D.workoutOn = !D.workoutOn; const btn = document.getElementById('workout-btn');
  if (btn) btn.innerHTML = D.workoutOn ? '<i class="ri-stop-fill"></i> Finish Workout' : '<i class="ri-play-fill"></i> Start Workout';
  if (btn) btn.classList.toggle('prim', !D.workoutOn);
  toast(D.workoutOn ? 'Workout started! 🔥' : 'Workout complete! 💪', D.workoutOn ? 'info' : 'success');
}
function renderStreak() {
  const row = document.getElementById('streak-row'); if (!row) return; row.innerHTML = '';
  WDAYS.forEach((d, i) => { const dot = document.createElement('div'); dot.className = 's-dot' + (D.streak[i] ? ' lit' : ''); dot.textContent = d; dot.onclick = () => { D.streak[i] = D.streak[i] ? 0 : 1; renderStreak(); save(); }; row.appendChild(dot); });
}
function logToday() { const d = (new Date().getDay() + 6) % 7; D.streak[d] = 1; renderStreak(); save(); toast('Today logged! 🎉', 'success'); }
function saveGoal() { const v = parseInt(document.getElementById('goal-wk').value); if (!v) { toast('Enter a number.', 'error'); return; } D.goals.weeklyWorkouts = v; const done = D.streak.filter(Boolean).length; document.getElementById('goal-disp').textContent = `${done} / ${v} workouts done this week`; save(); toast('Goal saved!', 'success'); }

// ===== HABITS =====
function showHabitForm() { document.getElementById('habit-form').style.display = 'block'; }
function hideHabitForm() { document.getElementById('habit-form').style.display = 'none'; }
function saveHabit() {
  const name = document.getElementById('h-name').value.trim(); if (!name) { toast('Enter habit name.', 'error'); return; }
  D.habits.push({ id: Date.now(), name, icon: document.getElementById('h-icon').value, days: [0, 0, 0, 0, 0, 0, 0] });
  document.getElementById('h-name').value = ''; hideHabitForm(); renderHabits(); save(); toast('Habit added! 🌱', 'success');
}
function renderHabits() {
  const con = document.getElementById('habit-list'); const empty = document.getElementById('habit-empty'); if (!con) return;
  con.innerHTML = ''; empty.style.display = D.habits.length ? 'none' : 'block';
  D.habits.forEach((h, hi) => {
    const streak = calcStreak(h.days);
    const row = document.createElement('div'); row.className = 'habit-row';
    row.innerHTML = `<div class="habit-info"><div class="h-ico" style="background:rgba(0,242,254,.1)">${h.icon}</div><div><div class="h-name">${h.name}</div><div class="h-streak">🔥 ${streak} day streak</div></div></div><div style="display:flex;align-items:center;gap:8px"><div class="h-checks" id="hc-${hi}"></div><button class="btn ico dng" onclick="delHabit(${h.id})"><i class="ri-delete-bin-line"></i></button></div>`;
    con.appendChild(row);
    const hc = document.getElementById('hc-' + hi);
    WDAYS.forEach((day, di) => { const box = document.createElement('div'); box.className = 'h-chk' + (h.days[di] ? ' on' : ''); box.textContent = day; box.onclick = () => { h.days[di] = h.days[di] ? 0 : 1; renderHabits(); save(); }; hc.appendChild(box); });
  });
}
function calcStreak(days) { const td = (new Date().getDay() + 6) % 7; let s = 0; for (let i = td; i >= 0; i--) { if (days[i]) s++; else break; } return s; }
function delHabit(id) { D.habits = D.habits.filter(h => h.id !== id); renderHabits(); save(); toast('Habit removed.', 'info'); }

// ===== NOTES =====
function setupColorPicker() {
  document.querySelectorAll('.cp-dot').forEach(dot => {
    dot.addEventListener('click', () => { document.querySelectorAll('.cp-dot').forEach(d => d.classList.remove('sel')); dot.classList.add('sel'); D.noteColor = dot.dataset.c; });
  });
}
function openNoteForm() {
  D.editNoteId = null; D.noteColor = '#00f2fe';
  document.getElementById('m-note-title').textContent = 'New Note';
  document.getElementById('n-title').value = ''; document.getElementById('n-body').value = '';
  document.querySelectorAll('.cp-dot').forEach((d, i) => d.classList.toggle('sel', i === 0));
  openM('m-note'); document.getElementById('n-title').focus();
}
function saveNote() {
  const title = document.getElementById('n-title').value.trim(); const body = document.getElementById('n-body').value.trim();
  if (!title && !body) { toast('Note cannot be empty.', 'error'); return; }
  const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (D.editNoteId) { const n = D.notes.find(x => x.id === D.editNoteId); if (n) { n.title = title; n.body = body; n.color = D.noteColor; n.date = now; } }
  else D.notes.unshift({ id: Date.now(), title, body, color: D.noteColor, date: now });
  closeM('m-note'); renderNotes(); save(); toast(D.editNoteId ? 'Note updated!' : 'Note saved!', 'success'); D.editNoteId = null;
}
function renderNotes() {
  const grid = document.getElementById('notes-grid'); const empty = document.getElementById('notes-empty'); if (!grid) return;
  grid.innerHTML = ''; empty.style.display = D.notes.length ? 'none' : 'block';
  D.notes.forEach(n => {
    const card = document.createElement('div'); card.className = 'note-card';
    const bar = document.createElement('div'); bar.className = 'color-bar'; bar.style.background = n.color; card.appendChild(bar);
    const inner = document.createElement('div'); inner.style.paddingTop = '6px';
    inner.innerHTML = `<h4>${n.title || 'Untitled'}</h4><p>${n.body || '<em>No content</em>'}</p><div class="n-footer"><span class="n-date">${n.date}</span></div>`;
    card.appendChild(inner);
    const del = document.createElement('button'); del.className = 'btn ico dng n-del'; del.innerHTML = '<i class="ri-delete-bin-line"></i>'; del.onclick = e => { e.stopPropagation(); delNote(n.id); };
    card.appendChild(del);
    card.onclick = () => editNote(n.id); grid.appendChild(card);
  });
}
function editNote(id) {
  const n = D.notes.find(x => x.id === id); if (!n) return;
  D.editNoteId = id; D.noteColor = n.color;
  document.getElementById('m-note-title').textContent = 'Edit Note';
  document.getElementById('n-title').value = n.title; document.getElementById('n-body').value = n.body;
  document.querySelectorAll('.cp-dot').forEach(d => d.classList.toggle('sel', d.dataset.c === n.color));
  openM('m-note');
}
function delNote(id) { D.notes = D.notes.filter(x => x.id !== id); renderNotes(); save(); toast('Note deleted.', 'info'); }

// ===== PERSONALIZE =====
function applyTheme(t, card, silent=false) {
  D.theme = t; document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('on')); if (card) card.classList.add('on');
  
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = t === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
  
  const tgl = document.getElementById('t-dark');
  if (tgl) tgl.classList.toggle('on', t === 'dark');
  
  save(); 
  if(!silent) toast(`Theme: ${t}`, 'success');
}
function saveProfile() {
  const name = document.getElementById('p-name').value.trim(); const status = document.getElementById('p-status').value.trim();
  D.profile = D.profile || {};
  if (name) { document.getElementById('u-name').textContent = name; D.profile.name = name; }
  if (status) { document.getElementById('u-status').textContent = status; D.profile.status = status; }
  updateGreeting(); save(); toast('Profile saved!', 'success');
}
function saveGoals() {
  const fields = [['g-study', 'study'], ['g-cal', 'cal'], ['g-prot', 'prot'], ['g-carb', 'carb'], ['g-water', 'water']];
  fields.forEach(([id, key]) => { const v = parseInt(document.getElementById(id).value); if (!isNaN(v) && v > 0) D.goals[key] = v; });
  updateMacros(); updateWaterUI(); updateRings(); save(); toast('Goals updated!', 'success');
}
const QUOTES_ = [
  { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
  { q: "Small daily improvements are the key to staggering long-term results.", a: "Unknown" },
  { q: "Discipline is the bridge between goals and accomplishment.", a: "Jim Rohn" },
  { q: "You don't have to be great to start, but you have to start to be great.", a: "Zig Ziglar" },
  { q: "The body achieves what the mind believes.", a: "Napoleon Hill" },
  { q: "Focus on being productive instead of busy.", a: "Tim Ferriss" },
  { q: "Success is the sum of small efforts repeated day in and day out.", a: "Robert Collier" },
  { q: "An investment in knowledge pays the best interest.", a: "Benjamin Franklin" },
];
function newQuote() { const q = QUOTES_[Math.floor(Math.random() * QUOTES_.length)]; const qt = document.getElementById('quote-text'); const qa = document.getElementById('quote-auth'); if (qt) qt.textContent = `"${q.q}"`; if (qa) qa.textContent = `— ${q.a}`; }

// ===== SETTINGS =====
function toggleS(el, key) { el.classList.toggle('on'); D.settings[key] = el.classList.contains('on'); save(); if (key === 'anim') { const bw = document.querySelector('.bg-wrap'); if (bw) bw.style.animation = D.settings.anim ? '' : 'none'; document.querySelectorAll('.blob').forEach(b => b.style.animation = D.settings.anim ? '' : 'none'); } toast(`${key} ${D.settings[key] ? 'enabled' : 'disabled'}`); }
function toggleTheme() {
  const newTheme = D.theme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme, document.querySelector(`.theme-card[data-t="${newTheme}"]`));
}
let fontSize = 16;
function changeFontSize(d) { fontSize = Math.min(22, Math.max(12, fontSize + d)); document.documentElement.style.fontSize = fontSize + 'px'; const l = document.getElementById('fs-label'); if (l) l.textContent = fontSize + 'px'; D.settings.fontSize = fontSize; save(); }
function applyFontSize() { fontSize = D.settings.fontSize || 16; document.documentElement.style.fontSize = fontSize + 'px'; const l = document.getElementById('fs-label'); if (l) l.textContent = fontSize + 'px'; }

// ===== NOTIF =====
function toggleNotif() {
  const p = document.getElementById('notif-panel'); p.classList.toggle('show');
  const dot = document.getElementById('notif-dot'); if (dot && p.classList.contains('show')) dot.style.display = 'none';
}
function closePop(id) { const el = document.getElementById(id); if (el && el.classList) { el.classList.remove('show'); } }

// ===== SEARCH =====
function setupSearch() {
  const inp = document.getElementById('global-search'), drop = document.getElementById('search-drop'); if (!inp || !drop) return;
  
  // global shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      inp.focus();
    }
  });

  let selectedIndex = -1;

  inp.addEventListener('input', () => {
    selectedIndex = -1;
    const q = inp.value.trim().toLowerCase(); 
    
    // Toggle clear button
    const clearBtn = document.getElementById('search-clear');
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
    
    if (!q) { drop.classList.remove('show'); return; } 
    drop.classList.add('show');
    const res = [];
    D.tasks.forEach(t => { if (t.name.toLowerCase().includes(q)) res.push({ ico: 'ri-list-check', label: t.name, sub: 'Task · ' + t.cat, page: 'todo' }); });
    D.notes.forEach(n => { if ((n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q)) res.push({ ico: 'ri-sticky-note-line', label: n.title || 'Untitled', sub: 'Note', page: 'notes' }); });
    D.habits.forEach(h => { if (h.name.toLowerCase().includes(q)) res.push({ ico: 'ri-seedling-line', label: h.name, sub: 'Habit', page: 'habits' }); });
    if(D.meals) D.meals.forEach(m => { if (m.name.toLowerCase().includes(q)) res.push({ ico: 'ri-restaurant-line', label: m.name, sub: 'Meal', page: 'diet' }); });
    Object.entries(PAGES).forEach(([k, v]) => { if (v.toLowerCase().includes(q)) res.push({ ico: 'ri-dashboard-line', label: v, sub: 'Page', page: k }); });
    
    if (!res.length) { drop.innerHTML = '<div class="sr-empty"><i class="ri-search-line"></i> No results</div>'; }
    else { 
      drop.innerHTML = res.slice(0, 8).map((r, i) => `<div class="sr-item" id="sr-item-${i}" onclick="goTo('${r.page}');document.getElementById('global-search').value='';closePop('search-drop')"><i class="${r.ico}"></i><div><div>${r.label}</div><div class="muted">${r.sub}</div></div></div>`).join(''); 
    }
  });

  inp.addEventListener('keydown', e => { 
    const items = drop.querySelectorAll('.sr-item');
    if (e.key === 'Escape') { drop.classList.remove('show'); inp.value = ''; inp.blur(); } 
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if(items.length > 0) {
        selectedIndex = (selectedIndex + 1) % items.length;
        items.forEach(el => el.classList.remove('active'));
        items[selectedIndex].classList.add('active');
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if(items.length > 0) {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        items.forEach(el => el.classList.remove('active'));
        items[selectedIndex].classList.add('active');
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if(selectedIndex >= 0 && items[selectedIndex]) {
        items[selectedIndex].click();
      } else if(items.length > 0) {
        items[0].click();
      }
    }
  });
}


// ===== LIGHTWEIGHT AUDIO STUBS =====
window.playClick = function() {};
window.playSuccess = function() {};

// ===== THEME ON LOAD =====
(() => { try { const s = localStorage.getItem('elevate2'); if (s) { const d = JSON.parse(s); if (d.theme) { document.documentElement.setAttribute('data-theme', d.theme); } } } catch (e) { } })();