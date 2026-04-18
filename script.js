const STORAGE_KEY = "hackerHabitTrackerDataV1";
const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const habitForm = document.getElementById("habitForm");
const habitList = document.getElementById("habitList");
const template = document.getElementById("habitTemplate");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const sortSelect = document.getElementById("sortSelect");
const clearAllBtn = document.getElementById("clearAllBtn");
const themeToggle = document.getElementById("themeToggle");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");

const totalHabitsEl = document.getElementById("totalHabits");
const doneTodayEl = document.getElementById("doneToday");
const bestStreakEl = document.getElementById("bestStreak");
const completionRateEl = document.getElementById("completionRate");

let state = {
  theme: "dark",
  habits: [],
  ui: {
    search: "",
    filter: "all",
    sort: "createdAt"
  }
};

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `habit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDayDifference(a, b) {
  const one = dateFromKey(a);
  const two = dateFromKey(b);
  const ms = 1000 * 60 * 60 * 24;
  return Math.round((two - one) / ms);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state = {
      ...state,
      ...parsed,
      ui: {
        ...state.ui,
        ...(parsed.ui || {})
      },
      habits: Array.isArray(parsed.habits) ? parsed.habits : []
    };
  } catch (error) {
    console.error("Failed to parse saved data:", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyTheme() {
  document.body.classList.toggle("light", state.theme === "light");
}

function normalizeHabit(habit) {
  return {
    ...habit,
    completions: Array.isArray(habit.completions) ? habit.completions : [],
    createdAt: habit.createdAt || Date.now(),
    frequency: Math.max(1, Math.min(7, Number(habit.frequency) || 7))
  };
}

function getCurrentStreak(habit) {
  const doneSet = new Set(habit.completions);
  let streak = 0;
  let cursor = todayKey();

  while (doneSet.has(cursor)) {
    streak += 1;
    const dt = dateFromKey(cursor);
    dt.setDate(dt.getDate() - 1);
    cursor = todayKey(dt);
  }
  return streak;
}

function getLongestStreak(habit) {
  if (!habit.completions.length) return 0;
  const sorted = [...habit.completions].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const diff = getDayDifference(sorted[i - 1], sorted[i]);
    if (diff === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (diff > 1) {
      current = 1;
    }
  }
  return longest;
}

function getWeeklyDoneCount(habit, date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const doneSet = new Set(habit.completions);

  let count = 0;
  for (let i = 0; i < 7; i += 1) {
    const curr = new Date(start);
    curr.setDate(start.getDate() + i);
    if (doneSet.has(todayKey(curr))) count += 1;
  }
  return count;
}

function getCompletionPercent(habit) {
  const created = new Date(habit.createdAt);
  created.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const totalDays = Math.max(1, Math.floor((now - created) / (1000 * 60 * 60 * 24)) + 1);
  return Math.round((habit.completions.length / totalDays) * 100);
}

function updateStats() {
  const habits = state.habits.map(normalizeHabit);
  const today = todayKey();
  const total = habits.length;
  const done = habits.filter((h) => h.completions.includes(today)).length;
  const best = habits.reduce((max, h) => Math.max(max, getLongestStreak(h)), 0);
  const overall = total
    ? Math.round(
      habits.reduce((sum, h) => sum + getCompletionPercent(h), 0) / total
    )
    : 0;

  totalHabitsEl.textContent = String(total);
  doneTodayEl.textContent = String(done);
  bestStreakEl.textContent = String(best);
  completionRateEl.textContent = `${overall}%`;
}

function matchesFilter(habit) {
  const today = todayKey();
  if (state.ui.filter === "completed") return habit.completions.includes(today);
  if (state.ui.filter === "pending") return !habit.completions.includes(today);
  return true;
}

function matchesSearch(habit) {
  const q = state.ui.search.trim().toLowerCase();
  if (!q) return true;
  return (
    habit.name.toLowerCase().includes(q) ||
    habit.category.toLowerCase().includes(q)
  );
}

function sortedHabits(habits) {
  const list = [...habits];
  if (state.ui.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  if (state.ui.sort === "streak") {
    list.sort((a, b) => getCurrentStreak(b) - getCurrentStreak(a));
  }
  if (state.ui.sort === "completion") {
    list.sort((a, b) => getCompletionPercent(b) - getCompletionPercent(a));
  }
  if (state.ui.sort === "createdAt") list.sort((a, b) => b.createdAt - a.createdAt);
  return list;
}

function renderWeek(habit, container) {
  container.innerHTML = "";
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const doneSet = new Set(habit.completions);
  const todayStr = todayKey(today);

  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = todayKey(day);
    const pill = document.createElement("div");
    pill.className = "day-pill";
    if (doneSet.has(key)) pill.classList.add("done");
    if (key === todayStr) pill.classList.add("today");
    pill.textContent = `${WEEK_LABELS[day.getDay()]} ${day.getDate()}`;
    container.appendChild(pill);
  }
}

function renderEmptyState() {
  habitList.innerHTML = `
    <article class="card empty-state">
      <h3>No habits found</h3>
      <p>Add your first habit above and start your streak today.</p>
    </article>
  `;
}

function renderHabits() {
  const normalized = state.habits.map(normalizeHabit);
  const filtered = sortedHabits(normalized).filter(
    (habit) => matchesSearch(habit) && matchesFilter(habit)
  );

  if (!filtered.length) {
    renderEmptyState();
    updateStats();
    return;
  }

  habitList.innerHTML = "";
  filtered.forEach((habit) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".habit-title");
    const cat = node.querySelector(".habit-category");
    const dot = node.querySelector(".habit-dot");
    const streak = node.querySelector(".habit-streak");
    const longest = node.querySelector(".habit-longest");
    const frequency = node.querySelector(".habit-frequency");
    const weekly = node.querySelector(".habit-weekly-progress");
    const completion = node.querySelector(".habit-completion");
    const weekWrap = node.querySelector(".habit-week");
    const checkBtn = node.querySelector(".habit-check");
    const editBtn = node.querySelector(".habit-edit");
    const deleteBtn = node.querySelector(".habit-delete");

    const today = todayKey();
    const doneToday = habit.completions.includes(today);

    title.textContent = habit.name;
    cat.textContent = habit.category;
    dot.style.background = habit.color;
    streak.textContent = String(getCurrentStreak(habit));
    longest.textContent = String(getLongestStreak(habit));
    frequency.textContent = String(habit.frequency);
    weekly.textContent = `${getWeeklyDoneCount(habit)}/${habit.frequency}`;
    completion.textContent = `${getCompletionPercent(habit)}%`;
    checkBtn.textContent = doneToday ? "Completed Today" : "Mark Done Today";
    checkBtn.disabled = doneToday;
    checkBtn.style.opacity = doneToday ? "0.7" : "1";

    renderWeek(habit, weekWrap);

    checkBtn.addEventListener("click", () => {
      completeHabitToday(habit.id);
    });
    editBtn.addEventListener("click", () => openEdit(habit));
    deleteBtn.addEventListener("click", () => deleteHabit(habit.id));

    habitList.appendChild(node);
  });

  updateStats();
}

function addHabit(event) {
  event.preventDefault();
  const form = new FormData(habitForm);
  const name = String(form.get("habitName") || "").trim();
  const frequency = Number(form.get("habitFrequency") || 7);
  const categoryRaw = String(form.get("habitCategory") || "Custom");
  const customCategory = String(form.get("customCategory") || "").trim();
  const category = categoryRaw === "Custom" ? customCategory || "Custom" : categoryRaw;
  const color = String(form.get("habitColor") || "#7c5cff");

  if (!name) return;

  state.habits.push({
    id: createId(),
    name,
    frequency: Math.max(1, Math.min(7, frequency)),
    category,
    color,
    createdAt: Date.now(),
    completions: []
  });

  habitForm.reset();
  document.getElementById("habitFrequency").value = "7";
  document.getElementById("habitColor").value = "#7c5cff";
  saveState();
  renderHabits();
}

function completeHabitToday(id) {
  const today = todayKey();
  state.habits = state.habits.map((habit) => {
    if (habit.id !== id) return habit;
    if (habit.completions.includes(today)) return habit;
    return {
      ...habit,
      completions: [...habit.completions, today].sort()
    };
  });
  saveState();
  renderHabits();
}

function deleteHabit(id) {
  const ok = confirm("Delete this habit?");
  if (!ok) return;
  state.habits = state.habits.filter((h) => h.id !== id);
  saveState();
  renderHabits();
}

function openEdit(habit) {
  document.getElementById("editId").value = habit.id;
  document.getElementById("editName").value = habit.name;
  document.getElementById("editFrequency").value = String(habit.frequency);
  document.getElementById("editCategory").value = habit.category;
  document.getElementById("editColor").value = habit.color;
  editDialog.showModal();
}

function updateHabitFromEdit(event) {
  event.preventDefault();
  const id = document.getElementById("editId").value;
  const name = document.getElementById("editName").value.trim();
  const frequency = Number(document.getElementById("editFrequency").value);
  const category = document.getElementById("editCategory").value.trim();
  const color = document.getElementById("editColor").value;

  if (!id || !name || !category) return;

  state.habits = state.habits.map((habit) => {
    if (habit.id !== id) return habit;
    return {
      ...habit,
      name,
      frequency: Math.max(1, Math.min(7, frequency)),
      category,
      color
    };
  });

  editDialog.close();
  saveState();
  renderHabits();
}

function exportData() {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `habit-tracker-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!Array.isArray(data.habits)) throw new Error("Invalid file");
      state = {
        theme: data.theme === "light" ? "light" : "dark",
        habits: data.habits.map(normalizeHabit),
        ui: {
          ...state.ui,
          ...(data.ui || {})
        }
      };
      saveState();
      applyTheme();
      bindControlsFromState();
      renderHabits();
      alert("Import successful.");
    } catch (error) {
      alert("Import failed. Please select a valid backup file.");
    } finally {
      importInput.value = "";
    }
  };
  reader.readAsText(file);
}

function clearAll() {
  const ok = confirm("This will remove all habits and history. Continue?");
  if (!ok) return;
  state.habits = [];
  saveState();
  renderHabits();
}

function bindControlsFromState() {
  searchInput.value = state.ui.search;
  filterSelect.value = state.ui.filter;
  sortSelect.value = state.ui.sort;
}

function initEventListeners() {
  habitForm.addEventListener("submit", addHabit);
  searchInput.addEventListener("input", (event) => {
    state.ui.search = event.target.value;
    saveState();
    renderHabits();
  });
  filterSelect.addEventListener("change", (event) => {
    state.ui.filter = event.target.value;
    saveState();
    renderHabits();
  });
  sortSelect.addEventListener("change", (event) => {
    state.ui.sort = event.target.value;
    saveState();
    renderHabits();
  });
  clearAllBtn.addEventListener("click", clearAll);
  themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveState();
  });
  exportBtn.addEventListener("click", exportData);
  importInput.addEventListener("change", importData);
  editForm.addEventListener("submit", updateHabitFromEdit);
}

function init() {
  loadState();
  state.habits = state.habits.map(normalizeHabit);
  applyTheme();
  bindControlsFromState();
  initEventListeners();
  renderHabits();
}

init();
