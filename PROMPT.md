# Prompt for Claude Code: Local Electricity Meter Dashboard

Copy everything below the line into Claude Code, run it inside an empty folder (e.g. `~/strom-dashboard`).

---

Build a small local standalone web app: an electricity meter dashboard. Keep it simple — minimal code, no build step, no frameworks, no npm dependencies.

## Tech
- Node.js using only built-in modules (`http`, `fs`, `path`). One file `server.js` serves the app on `http://localhost:4321` and provides a tiny JSON API.
- Frontend: a single `index.html` with inline CSS and vanilla JS.
- Data is stored in `data/readings.json` in the project folder (NOT in browser localStorage), so it survives browser resets and is easy to back up.
- Add a `start.command` file (macOS, executable) that starts the server and opens the browser, so I can launch it with a double-click.
- Write a short `README.md` (how to start, where data lives, how to back it up).

## API
- `GET /api/readings` → list of readings
- `POST /api/readings` → add `{ date: "YYYY-MM-DD", kwh: number }`
- `DELETE /api/readings/:date` → remove a reading
- `GET/PUT /api/settings` → `{ pricePerKwh: number, baseFeePerMonth: number }` (stored in `data/settings.json`)
- Write files atomically (write temp file, then rename).

## Seed data (prefill `data/readings.json` on first start if it doesn't exist)
- 2026-05-30: 2153 kWh
- 2026-07-02: 2297 kWh
- 2026-08-18: 2449 kWh

## Calculations
For each pair of consecutive readings (a "period"): days, kWh used, average kWh/day, average kWh per 30 days, and a trend vs. the previous period in % (based on kWh/day).
Overall: average kWh/day and per 30 days across all readings, projected annual consumption (avg/day × 365), estimated monthly and annual cost from the settings.

## UI (German labels)
- Design reference: CoinStats crypto table but in an artful typographic way: light background, suisse type, whitespace but clarity and easy to read information
- Indicator logic is inverted compared to crypto: consumption DOWN = green pill ▼, consumption UP = red pill ▲, |change| < 0.5% = grey neutral pill.
- Top: 4 stat tiles — Ø pro Tag, Ø pro Monat (30 Tage), Hochrechnung Jahr (kWh), geschätzte Kosten/Monat.
- Simple inline SVG bar chart of kWh/day per period (no chart library).
- Table: Zeitraum, Tage, Verbrauch, Ø/Tag, Ø/Monat, Trend.
- Entry form: date picker (defaults to today) + meter reading in kWh + button "Eintragen". Validate: reading must be higher than the previous one; warn on duplicates.
- List of raw readings with a delete button (confirm before deleting).
- Small settings section for price per kWh and monthly base fee.
- Display dates as DD.MM.YYYY and numbers in German format (1.234,5).
- Responsive, works on a narrow window too.
