// LUMA — Today screen.
// For now check-ins are saved in this browser (localStorage).
// When accounts arrive (Supabase), only the load/save functions change.

const MOODS = [
  { id: "bright", label: "Bright", color: "var(--mood-bright)" },
  { id: "steady", label: "Steady", color: "var(--mood-steady)" },
  { id: "tender", label: "Tender", color: "var(--mood-tender)" },
  { id: "heavy",  label: "Heavy",  color: "var(--mood-heavy)" },
  { id: "foggy",  label: "Foggy",  color: "var(--mood-foggy)" },
];

const SELF_CARE = ["Moved my body", "Skincare", "Time outside", "Rested", "Ate well", "Saw friends", "Read", "Prayer or quiet"];

const TIMES = {
  morning: { greeting: "Good morning", sub: "Choose one thing that matters today." },
  day:     { greeting: "How is your day?", sub: "Take five seconds to notice how you feel." },
  evening: { greeting: "Time to slow down", sub: "Let the day settle. How did it feel?" },
  night:   { greeting: "Goodnight", sub: "Rest well. The moon keeps count for you." },
};

const STORAGE_KEY = "luma.checkins";
const DAY_MS = 86400000;
const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // reference new moon

// ---------- Storage ----------
function loadCheckins() {
  let all = {};
  try {
    all = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    // Bring over check-ins from the old checkin.html page (same format, older key)
    const old = JSON.parse(localStorage.getItem("luma-checkins")) || {};
    let copied = false;
    for (const [day, entry] of Object.entries(old)) {
      if (!all[day] && entry && entry.mood) { all[day] = entry; copied = true; }
    }
    if (copied) saveCheckins(all);
  } catch {
    // Unreadable data: start fresh rather than break the page
  }
  return all;
}

function saveCheckins(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

// ---------- Dates ----------
// "Now" can be faked for testing: app.html?time=night or ?date=2026-10-12
const params = new URLSearchParams(location.search);
const now = params.get("date") ? new Date(params.get("date") + "T12:00") : new Date();

function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function timeOfDay(d) {
  const forced = params.get("time");
  if (TIMES[forced]) return forced;
  const h = d.getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "day";
  if (h >= 17 && h < 20) return "evening";
  return "night";
}

// ---------- Moon ----------
// Phase: 0 = new moon, 0.5 = full moon, back to 1.
function moonPhase(d) {
  const days = (d.getTime() - KNOWN_NEW_MOON) / DAY_MS;
  return ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS / SYNODIC_DAYS;
}

function lastNewMoon(d) {
  const ageMs = moonPhase(d) * SYNODIC_DAYS * DAY_MS;
  return startOfDay(new Date(d.getTime() - ageMs));
}

function drawMoon(svg, phase) {
  const r = 50, cx = 60, cy = 60;
  const waxing = phase < 0.5;
  const rx = Math.abs(Math.cos(phase * 2 * Math.PI)) * r;
  const outer = waxing ? 1 : 0;
  const inner = waxing ? (phase < 0.25 ? 0 : 1) : (phase > 0.75 ? 1 : 0);
  const lit = `M${cx} ${cy - r} A${r} ${r} 0 0 ${outer} ${cx} ${cy + r} A${rx} ${r} 0 0 ${inner} ${cx} ${cy - r}Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#F8E2D1"/>
        <stop offset=".5" stop-color="#F5DCE2"/>
        <stop offset="1" stop-color="#E9E1F1"/>
      </linearGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" opacity=".1"/>
    <path d="${lit}" fill="url(#glow)"/>`;
  svg.style.color = "var(--heading)";
}

// ---------- Rendering ----------
const els = {
  date: document.getElementById("date"),
  greeting: document.getElementById("greeting"),
  greetingSub: document.getElementById("greeting-sub"),
  moon: document.getElementById("moon"),
  count: document.getElementById("count"),
  countLabel: document.getElementById("count-label"),
  lastMoon: document.getElementById("last-moon"),
  moods: document.getElementById("moods"),
  saved: document.getElementById("saved"),
  addMore: document.getElementById("add-more"),
  checkinSub: document.getElementById("checkin-sub"),
  days: document.getElementById("days"),
  cycleSub: document.getElementById("cycle-sub"),
  notes: document.getElementById("notes"),
  sheet: document.getElementById("sheet"),
  form: document.getElementById("more-form"),
  tags: document.getElementById("tags"),
};

const todayKey = dateKey(now);
let checkins = loadCheckins();

function moodById(id) {
  return MOODS.find((m) => m.id === id);
}

function renderHeader() {
  const t = timeOfDay(now);
  document.body.dataset.time = t;
  document.querySelector('meta[name="theme-color"]').content = t === "night" ? "#272333" : "#FBF8F3";
  els.greeting.textContent = TIMES[t].greeting;
  els.greetingSub.textContent = TIMES[t].sub;
  els.date.textContent = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  drawMoon(els.moon, moonPhase(now));
}

function renderMoods() {
  const today = checkins[todayKey];
  els.moods.innerHTML = "";
  for (const m of MOODS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mood";
    b.style.setProperty("--c", m.color);
    b.setAttribute("aria-pressed", String(today?.mood === m.id));
    b.innerHTML = `<span class="dot" aria-hidden="true"></span>${m.label}`;
    b.addEventListener("click", () => chooseMood(m.id));
    els.moods.appendChild(b);
  }
  els.addMore.hidden = !today;
  els.checkinSub.textContent = today ? "Tap another mood to change it." : "One tap is enough.";
  if (!today) els.saved.textContent = "";
}

function chooseMood(id) {
  const existing = checkins[todayKey] || {};
  checkins[todayKey] = { ...existing, mood: id, at: new Date().toISOString() };
  const ok = saveCheckins(checkins);
  renderAll();
  els.saved.textContent = ok ? `Saved · ${moodById(id).label}` : "Couldn't save in this browser.";
}

function renderMoonCount() {
  const start = lastNewMoon(now);
  const prevStart = lastNewMoon(new Date(start.getTime() - DAY_MS));
  const keys = Object.keys(checkins);
  const inRange = (k, from, to) => {
    const d = new Date(k + "T12:00");
    return d >= from && d < to;
  };
  const tomorrow = new Date(startOfDay(now).getTime() + DAY_MS);
  const thisMoon = keys.filter((k) => inRange(k, start, tomorrow)).length;
  const lastMoon = keys.filter((k) => inRange(k, prevStart, start)).length;

  els.count.textContent = thisMoon;
  els.countLabel.textContent = thisMoon === 1 ? "day you showed up this moon" : "days you showed up this moon";
  els.lastMoon.textContent = lastMoon ? `Last moon: ${lastMoon} ${lastMoon === 1 ? "day" : "days"}` : "";
  return start;
}

function renderCycle(start) {
  els.days.innerHTML = "";
  const todayStart = startOfDay(now).getTime();
  const next = new Date(start.getTime() + Math.round(SYNODIC_DAYS) * DAY_MS);
  els.cycleSub.textContent = `New moon ${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · next around ${next.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

  for (let i = 0; i < 30; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = dateKey(d);
    const entry = checkins[key];
    const dot = document.createElement(entry ? "button" : "span");
    dot.className = "day-dot";
    const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    if (entry) {
      dot.type = "button";
      dot.classList.add("filled");
      dot.style.setProperty("--c", moodById(entry.mood)?.color || "var(--blush)");
      dot.setAttribute("aria-label", `${label}: ${moodById(entry.mood)?.label || "checked in"}`);
      dot.addEventListener("click", () => {
        els.saved.textContent = "";
        showNotes(key);
      });
    } else {
      dot.setAttribute("aria-hidden", "true");
    }
    if (d.getTime() === todayStart) dot.classList.add("today");
    if (d.getTime() > todayStart) dot.classList.add("future");
    els.days.appendChild(dot);
  }
  showNotes();
}

// Shows notes from this moon (or a single day when a dot is tapped).
function showNotes(onlyKey) {
  els.notes.innerHTML = "";
  const keys = Object.keys(checkins)
    .filter((k) => checkins[k].note && (!onlyKey || k === onlyKey))
    .sort()
    .reverse()
    .slice(0, onlyKey ? 1 : 3);
  for (const k of keys) {
    const c = checkins[k];
    const a = document.createElement("article");
    a.className = "card";
    const t = document.createElement("time");
    t.dateTime = k;
    t.textContent = `${new Date(k + "T12:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${moodById(c.mood)?.label || ""}`;
    const p = document.createElement("p");
    p.textContent = c.note; // textContent keeps her words as plain text
    a.append(t, p);
    els.notes.appendChild(a);
  }
}

// ---------- "Add more" sheet ----------
function buildTags() {
  els.tags.innerHTML = SELF_CARE.map(
    (t) => `<label class="chip"><input type="checkbox" name="tags" value="${t}"><span>${t}</span></label>`
  ).join("");
}

function openSheet() {
  const c = checkins[todayKey] || {};
  const f = els.form;
  f.reset();
  if (c.energy) f.querySelector(`[name="energy"][value="${c.energy}"]`).checked = true;
  if (c.sleepHours != null) f.sleepHours.value = c.sleepHours;
  if (c.sleepQuality) f.querySelector(`[name="sleepQuality"][value="${c.sleepQuality}"]`).checked = true;
  for (const box of f.querySelectorAll('[name="tags"]')) box.checked = (c.tags || []).includes(box.value);
  f.note.value = c.note || "";
  els.sheet.showModal();
}

els.form.addEventListener("submit", () => {
  const f = els.form;
  const data = new FormData(f);
  const hours = parseFloat(data.get("sleepHours"));
  checkins[todayKey] = {
    ...checkins[todayKey],
    energy: data.get("energy") ? Number(data.get("energy")) : null,
    sleepHours: Number.isFinite(hours) ? hours : null,
    sleepQuality: data.get("sleepQuality") || null,
    tags: data.getAll("tags"),
    note: data.get("note").trim(),
  };
  const ok = saveCheckins(checkins);
  renderAll();
  els.saved.textContent = ok ? "Saved" : "Couldn't save in this browser.";
});

document.getElementById("sheet-cancel").addEventListener("click", () => els.sheet.close());
els.addMore.addEventListener("click", openSheet);
// Tap outside the sheet to close it
els.sheet.addEventListener("click", (e) => { if (e.target === els.sheet) els.sheet.close(); });

function renderAll() {
  renderMoods();
  const start = renderMoonCount();
  renderCycle(start);
}

buildTags();
renderHeader();
renderAll();
