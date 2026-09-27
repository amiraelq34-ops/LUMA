# LUMA — Wellness in rhythm

A calm daily check-in for women. Plain HTML, CSS and JavaScript.

## Files
- `index.html`: landing page
- `app.html` + `app.js`: the Today screen (light that changes through the day, mood check-in, "add more" sheet, moon count, this moon's days and notes)
- `luma.css`: brand colours, fonts and buttons shared by every page
- `assets/`: logo images
- `DECISIONS.md`: product decisions we've made

## Preview on your computer
In the Claude app, ask Claude to "run LUMA". It starts a small local server at http://localhost:5173.

## Test different times of day
Add `?time=` to the address: `app.html?time=morning`, `day`, `evening` or `night`.
Pretend it's another date: `app.html?date=2026-10-12`.

## Where data lives (for now)
Check-ins are saved only in the browser you use. Clearing site data erases them.
Accounts and cloud saving come next, with Supabase (plan step 4).
