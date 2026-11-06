# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Local electricity meter dashboard ("Strom-Dashboard"). The original brief is in `PROMPT.md`. Constraints from it: no build step, no frameworks, no npm dependencies, Node built-in modules only. UI labels are German; code, file names and commit messages are English.

## Commands

- Run: `node server.js` (serves http://localhost:4321, `PORT=4399 node server.js` for another port)
- Run for the user: double-click `start.command` (starts the server, opens the browser, reuses a running instance)
- There is no build, lint or test tooling. Syntax check: `node --check server.js`, `bash -n start.command`
- To test without touching real data, copy `server.js` and `index.html` to a temp folder and run it there on another port: `data/` is created next to `server.js`.

## Architecture

- `server.js`: `http` server bound to 127.0.0.1. Serves `index.html` and a JSON API (`/api/readings`, `/api/readings/:date`, `/api/settings`). It validates every write (ISO date, readings must rise with the date, duplicates return 409 unless `replace: true`) and writes `data/*.json` atomically (temp file + fsync + rename). Seeds `data/readings.json` and `data/settings.json` on first start. Rejects non-JSON bodies and foreign `Host` headers (CSRF / DNS-rebinding guard).
- `index.html`: the whole frontend, inline CSS and vanilla JS. Flow: fetch readings + settings, then `analyze()` derives periods (consecutive reading pairs: days, kWh, kWh/day, kWh/30 days, trend % vs previous period) and overall averages and costs, then `render()` redraws everything from `state`. Every mutation re-renders from the list the server returns.
- The client repeats the server's validation so it can show friendly messages and the duplicate warning before posting. The server remains the authority.
- Trend logic is inverted vs. crypto: less consumption = green ▼, more = red ▲, |change| < 0.5 % = grey ≈.
- Chart: inline SVG, re-rendered on resize. Bar width = period length in days, height = kWh/day, so bar area = kWh used.
- Cost: annual = projected kWh × price + 12 × base fee; monthly = annual / 12.
- `data/` is gitignored (personal data); see README for backup.
