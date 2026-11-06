# Strom-Dashboard

A local dashboard for electricity meter readings. It runs on your Mac with plain Node.js: no install step, no dependencies, no internet needed.

## Start

Double-click `start.command`. A Terminal window opens, the server starts, and the dashboard opens at <http://localhost:4321>.

To stop it, close the Terminal window or press `Ctrl+C`.

From a terminal instead:

```sh
node server.js
```

Requires Node.js 18 or newer (`brew install node` or <https://nodejs.org>).

If macOS refuses to run `start.command`, make it executable once: `chmod +x start.command`.

## Where the data lives

Everything is stored as plain JSON in the `data/` folder next to `server.js`:

| File | Content |
|---|---|
| `data/readings.json` | Meter readings: `[{ "date": "2026-08-18", "kwh": 2449 }, …]` |
| `data/settings.json` | `{ "pricePerKwh": 0.35, "baseFeePerMonth": 12 }` |

On first start, `readings.json` is created with three example readings. Delete them in the dashboard if you don't need them.

Clearing your browser data doesn't touch these files. Writes are atomic (temp file, then rename), so a crash can't leave a half-written file.

## Backup

Copy the `data/` folder somewhere safe, for example:

```sh
cp -R data ~/Documents/strom-backup-$(date +%F)
```

To restore, stop the server, put the files back into `data/`, and start it again. The files are readable JSON, so you can also edit them by hand while the server is stopped.

`data/` is listed in `.gitignore`, so your readings are not committed to git.

## API

| Method | Path | Body / response |
|---|---|---|
| `GET` | `/api/readings` | list of readings, sorted by date |
| `POST` | `/api/readings` | `{ "date": "YYYY-MM-DD", "kwh": 2512 }` (add `"replace": true` to overwrite an existing date) |
| `DELETE` | `/api/readings/:date` | removes the reading for that date |
| `GET` / `PUT` | `/api/settings` | `{ "pricePerKwh": 0.35, "baseFeePerMonth": 12 }` |

The server only listens on `127.0.0.1` and accepts requests addressed to `localhost`.
