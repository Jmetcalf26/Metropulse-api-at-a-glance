// =============================================================================
// MetroPulse At-a-Glance
// WMATA (DC Metro) rail & bus arrivals — a Scriptable home/lock-screen widget.
//
// Setup:
//   1. Install Scriptable (free): https://scriptable.app
//   2. Create a new script, paste this file in, name it "MetroPulse".
//   3. Fill in CONFIG below (API key + your station codes / bus stop IDs).
//      Run "find-codes.js" once to discover the codes near you.
//   4. Add a Scriptable widget to your home/lock screen, long-press it,
//      "Edit Widget", choose this script.
//
// Tip: you can override the stations/stops per-widget without touching the
//      code by setting the widget "Parameter" field. Format:
//          rail=A01,C01;bus=1001195,1001196
// =============================================================================

// ============================== CONFIG =======================================
const CONFIG = {
  // Your WMATA Developer API key — https://developer.wmata.com
  apiKey: "PASTE_YOUR_WMATA_API_KEY_HERE",

  rail: {
    // Station codes, e.g. ["A01"] (Metro Center = "A01"/"C01").
    // Run find-codes.js to look these up.
    stations: ["A01"],
    // Optional: only show these line colors. Empty = all.
    // Valid: RD, BL, OR, SV, GR, YL
    lines: [],
  },

  bus: {
    // Bus stop IDs (7-digit), e.g. ["1001195"]. Run find-codes.js to look up.
    stops: [],
    // Optional: only show these route IDs, e.g. ["70", "D6"]. Empty = all.
    routes: [],
  },

  // How many arrival rows to show per widget size.
  rows: { small: 3, medium: 4, large: 8 },

  // Refresh hint (minutes). iOS decides the real cadence, but this nudges it.
  refreshMinutes: 1,

  // Set true to test in the app without an API key (uses WMATA demo key &
  // sample stations). Demo key is rate-limited — replace with your own.
  demo: false,
};
// =============================================================================

// WMATA demo/sample defaults used when CONFIG.demo === true.
const DEMO_KEY = "e13626d03d8e4c03ac07f95541b88fdd"; // WMATA public demo key
const DEMO_RAIL = ["A01", "C01"]; // Metro Center
const DEMO_BUS = ["1001195"];

// Official Metro line colors.
const LINE_COLORS = {
  RD: "#E51937", BL: "#0077C0", OR: "#F7941E",
  SV: "#A1A3A1", GR: "#00B140", YL: "#FFD200",
};
const BUS_COLOR = "#1B1B1B";

// ----------------------------------------------------------------------------
// Resolve config, applying any per-widget Parameter override.
// ----------------------------------------------------------------------------
function resolveConfig() {
  const c = {
    apiKey: CONFIG.demo ? DEMO_KEY : CONFIG.apiKey,
    rail: CONFIG.demo ? DEMO_RAIL.slice() : CONFIG.rail.stations.slice(),
    railLines: CONFIG.rail.lines.map((l) => l.toUpperCase()),
    bus: CONFIG.demo ? DEMO_BUS.slice() : CONFIG.bus.stops.slice(),
    busRoutes: CONFIG.bus.routes.map((r) => r.toUpperCase()),
  };

  const param = (args.widgetParameter || "").trim();
  if (param) {
    for (const part of param.split(";")) {
      const [key, val] = part.split("=").map((s) => (s || "").trim());
      if (!val) continue;
      const list = val.split(",").map((s) => s.trim()).filter(Boolean);
      if (key === "rail") c.rail = list;
      else if (key === "bus") c.bus = list;
    }
  }
  return c;
}

// ----------------------------------------------------------------------------
// WMATA API calls. The key is sent as a header so it stays out of URLs/logs.
// ----------------------------------------------------------------------------
async function wmata(url, apiKey) {
  const req = new Request(url);
  req.headers = { api_key: apiKey };
  req.timeoutInterval = 12;
  return await req.loadJSON();
}

async function fetchRail(stations, apiKey, lineFilter) {
  if (!stations.length) return [];
  const url =
    "https://api.wmata.com/StationPrediction.svc/json/GetPrediction/" +
    encodeURIComponent(stations.join(","));
  const data = await wmata(url, apiKey);
  let trains = data.Trains || [];
  if (lineFilter.length) trains = trains.filter((t) => lineFilter.includes(t.Line));
  // Drop "No Passenger"/blank entries and anything without a destination.
  trains = trains.filter((t) => t.Line && t.Line !== "No" && t.DestinationName);
  return trains.map((t) => ({
    kind: "rail",
    color: LINE_COLORS[t.Line] || "#888888",
    badge: t.Line,
    dest: t.DestinationName,
    min: normalizeMin(t.Min),
    sort: minSort(t.Min),
  }));
}

async function fetchBus(stops, apiKey, routeFilter) {
  const out = [];
  for (const stop of stops) {
    const url =
      "https://api.wmata.com/NextBusService.svc/json/JPredictions?StopID=" +
      encodeURIComponent(stop);
    try {
      const data = await wmata(url, apiKey);
      let preds = data.Predictions || [];
      if (routeFilter.length)
        preds = preds.filter((p) => routeFilter.includes((p.RouteID || "").toUpperCase()));
      for (const p of preds) {
        out.push({
          kind: "bus",
          color: BUS_COLOR,
          badge: p.RouteID,
          dest: p.DirectionText || data.StopName || "Bus",
          min: normalizeMin(String(p.Minutes)),
          sort: minSort(String(p.Minutes)),
        });
      }
    } catch (e) {
      // Skip a failing stop rather than break the whole widget.
    }
  }
  return out;
}

// Rail "Min" is "BRD"/"ARR"/"1".."20"/"---"; bus is an integer of minutes.
function normalizeMin(min) {
  if (min == null) return "--";
  const m = String(min).trim().toUpperCase();
  if (m === "BRD") return "BRD";
  if (m === "ARR" || m === "0") return "ARR";
  if (m === "" || m === "---") return "--";
  return m;
}
function minSort(min) {
  const m = String(min).trim().toUpperCase();
  if (m === "BRD" || m === "ARR" || m === "0") return 0;
  const n = parseInt(m, 10);
  return isNaN(n) ? 999 : n;
}

// ----------------------------------------------------------------------------
// Widget rendering
// ----------------------------------------------------------------------------
function buildWidget(arrivals, size, updated, errorMsg) {
  const w = new ListWidget();
  w.backgroundColor = Color.dynamic(new Color("#FFFFFF"), new Color("#101012"));
  w.setPadding(12, 14, 12, 14);
  if (CONFIG.refreshMinutes > 0) {
    w.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60 * 1000);
  }

  // Header
  const header = w.addStack();
  header.centerAlignContent();
  const title = header.addText("MetroPulse");
  title.font = Font.boldSystemFont(13);
  title.textColor = new Color("#E51937");
  header.addSpacer();
  const time = header.addText(updated);
  time.font = Font.systemFont(10);
  time.textColor = Color.gray();
  w.addSpacer(6);

  if (errorMsg) {
    w.addSpacer();
    const e = w.addText(errorMsg);
    e.font = Font.systemFont(12);
    e.textColor = Color.gray();
    e.centerAlignText();
    w.addSpacer();
    return w;
  }

  if (!arrivals.length) {
    w.addSpacer();
    const e = w.addText("No upcoming arrivals.");
    e.font = Font.systemFont(12);
    e.textColor = Color.gray();
    e.centerAlignText();
    w.addSpacer();
    return w;
  }

  const max = CONFIG.rows[size] || 4;
  for (const a of arrivals.slice(0, max)) {
    addRow(w, a, size);
  }
  w.addSpacer();
  return w;
}

function addRow(w, a, size) {
  const row = w.addStack();
  row.centerAlignContent();
  row.spacing = 6;

  // Colored line/route badge.
  const badge = row.addStack();
  badge.backgroundColor = new Color(a.color);
  badge.cornerRadius = 4;
  badge.setPadding(2, 5, 2, 5);
  const b = badge.addText(a.badge);
  b.font = Font.boldSystemFont(11);
  b.textColor = new Color(textOn(a.color));

  row.addSpacer(6);

  // Destination / direction.
  const dest = row.addText(a.dest);
  dest.font = Font.systemFont(13);
  dest.textColor = Color.dynamic(new Color("#101012"), new Color("#FFFFFF"));
  dest.lineLimit = 1;
  dest.minimumScaleFactor = 0.7;

  row.addSpacer();

  // Minutes.
  const mins = a.min === "BRD" || a.min === "ARR" ? a.min : a.min + (a.min === "--" ? "" : " min");
  const t = row.addText(mins);
  t.font = a.min === "BRD" || a.min === "ARR" ? Font.boldSystemFont(13) : Font.semiboldSystemFont(13);
  t.textColor = a.min === "BRD" || a.min === "ARR"
    ? new Color("#00B140")
    : Color.dynamic(new Color("#101012"), new Color("#FFFFFF"));

  w.addSpacer(size === "small" ? 5 : 7);
}

// Pick black/white text for a given badge background.
function textOn(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#000000" : "#FFFFFF";
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
async function main() {
  const cfg = resolveConfig();
  const size = config.widgetFamily || "medium";
  const updated = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  let widget;
  if (!cfg.apiKey || cfg.apiKey === "PASTE_YOUR_WMATA_API_KEY_HERE") {
    widget = buildWidget([], size, updated, "Add your WMATA API key in CONFIG.");
  } else if (!cfg.rail.length && !cfg.bus.length) {
    widget = buildWidget([], size, updated, "Add a station or bus stop in CONFIG.");
  } else {
    try {
      const [rail, bus] = await Promise.all([
        fetchRail(cfg.rail, cfg.apiKey, cfg.railLines),
        fetchBus(cfg.bus, cfg.apiKey, cfg.busRoutes),
      ]);
      const arrivals = [...rail, ...bus].sort((a, b) => a.sort - b.sort);
      widget = buildWidget(arrivals, size, updated, null);
    } catch (e) {
      widget = buildWidget([], size, updated, "Couldn't reach WMATA. Check key/network.");
    }
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    // Preview when run inside the Scriptable app.
    if (size === "large") await widget.presentLarge();
    else if (size === "small") await widget.presentSmall();
    else await widget.presentMedium();
  }
  Script.complete();
}

await main();
