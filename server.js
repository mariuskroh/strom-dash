'use strict';

// Strom-Dashboard: local server for index.html plus a tiny JSON API.
// Built-in modules only. Data lives in ./data as plain JSON files.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4321;
const HOST = '127.0.0.1';
const DATA_DIR = path.join(__dirname, 'data');
const READINGS_FILE = path.join(DATA_DIR, 'readings.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const INDEX_FILE = path.join(__dirname, 'index.html');

const SEED_READINGS = [
  { date: '2026-05-30', kwh: 2153 },
  { date: '2026-07-02', kwh: 2297 },
  { date: '2026-08-18', kwh: 2449 },
];
const DEFAULT_SETTINGS = { pricePerKwh: 0.35, baseFeePerMonth: 12 };

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// ---------- storage ----------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Write to a temp file, flush it to disk, then rename over the target.
// A crash mid-write leaves the previous file intact.
function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, JSON.stringify(data, null, 2) + '\n');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(READINGS_FILE)) writeJsonAtomic(READINGS_FILE, SEED_READINGS);
  if (!fs.existsSync(SETTINGS_FILE)) writeJsonAtomic(SETTINGS_FILE, DEFAULT_SETTINGS);
}

const byDate = (a, b) => a.date.localeCompare(b.date);
const loadReadings = () => readJson(READINGS_FILE).sort(byDate);

// ---------- validation ----------

function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const isAmount = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const fmtKwh = (n) => `${n.toLocaleString('de-DE')} kWh`;
const fmtDate = (iso) => iso.split('-').reverse().join('.');

// ---------- handlers ----------

function addReading({ date, kwh, replace }) {
  if (!isIsoDate(date)) throw new HttpError(400, 'Ungültiges Datum (erwartet JJJJ-MM-TT).');
  if (!isAmount(kwh)) throw new HttpError(400, 'Ungültiger Zählerstand.');

  const readings = loadReadings();
  const existing = readings.find((r) => r.date === date);
  if (existing && replace !== true) {
    throw new HttpError(409, `Für den ${fmtDate(date)} gibt es schon einen Eintrag (${fmtKwh(existing.kwh)}).`, { existing });
  }

  const prev = readings.filter((r) => r.date < date).at(-1);
  const next = readings.find((r) => r.date > date);
  if (prev && kwh <= prev.kwh) {
    throw new HttpError(422, `Der Zählerstand muss höher sein als der vorherige (${fmtKwh(prev.kwh)} am ${fmtDate(prev.date)}).`);
  }
  if (next && kwh >= next.kwh) {
    throw new HttpError(422, `Der Zählerstand muss niedriger sein als der folgende (${fmtKwh(next.kwh)} am ${fmtDate(next.date)}).`);
  }

  const updated = readings.filter((r) => r.date !== date).concat({ date, kwh }).sort(byDate);
  writeJsonAtomic(READINGS_FILE, updated);
  return updated;
}

function deleteReading(date) {
  const readings = loadReadings();
  const updated = readings.filter((r) => r.date !== date);
  if (updated.length === readings.length) throw new HttpError(404, `Keine Ablesung am ${fmtDate(date)} gefunden.`);
  writeJsonAtomic(READINGS_FILE, updated);
  return updated;
}

function saveSettings({ pricePerKwh, baseFeePerMonth }) {
  if (!isAmount(pricePerKwh) || !isAmount(baseFeePerMonth)) {
    throw new HttpError(400, 'Preis und Grundgebühr müssen Zahlen ≥ 0 sein.');
  }
  const settings = { pricePerKwh, baseFeePerMonth };
  writeJsonAtomic(SETTINGS_FILE, settings);
  return settings;
}

// ---------- http ----------

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

// Requiring application/json means a foreign website cannot post here
// without a CORS preflight, which this server never approves.
function readJsonBody(req) {
  if (!String(req.headers['content-type']).includes('application/json')) {
    return Promise.reject(new HttpError(415, 'Erwarte JSON.'));
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= 10_000) chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > 10_000) return reject(new HttpError(413, 'Anfrage zu groß.'));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new HttpError(400, 'Ungültiges JSON.'));
      }
    });
    req.on('error', reject);
  });
}

async function handle(req, res) {
  // Only answer requests addressed to this machine (blocks DNS rebinding).
  const host = String(req.headers.host).replace(/:\d+$/, '');
  if (host !== 'localhost' && host !== '127.0.0.1') throw new HttpError(403, 'Forbidden');

  const { pathname } = new URL(req.url, 'http://localhost');
  const { method } = req;

  if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(INDEX_FILE));
  }

  if (pathname === '/api/readings') {
    if (method === 'GET') return send(res, 200, loadReadings());
    if (method === 'POST') return send(res, 201, addReading(await readJsonBody(req)));
  }

  const match = pathname.match(/^\/api\/readings\/([^/]+)$/);
  if (match && method === 'DELETE') return send(res, 200, deleteReading(decodeURIComponent(match[1])));

  if (pathname === '/api/settings') {
    if (method === 'GET') return send(res, 200, readJson(SETTINGS_FILE));
    if (method === 'PUT') return send(res, 200, saveSettings(await readJsonBody(req)));
  }

  throw new HttpError(404, 'Nicht gefunden.');
}

ensureDataFiles();

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    const message = status === 500 ? 'Serverfehler – Details im Terminal.' : err.message;
    send(res, status, { error: message, ...err.extra });
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} ist belegt – läuft das Dashboard schon? http://localhost:${PORT}`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log(`Strom-Dashboard läuft: http://localhost:${PORT}`);
  console.log(`Daten: ${DATA_DIR}`);
  console.log('Beenden mit Ctrl+C');
});
