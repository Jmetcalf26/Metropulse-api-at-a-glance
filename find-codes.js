// =============================================================================
// MetroPulse — Find Codes
// A one-off Scriptable helper to look up the WMATA rail station codes and bus
// stop IDs you need for metropulse-widget.js.
//
// Usage:
//   1. Paste your API key below.
//   2. Run it inside the Scriptable app (not as a widget).
//   3. It uses your current location to list nearby rail stations and bus
//      stops with their codes/IDs. Copy the ones you want into the widget.
// =============================================================================

const API_KEY = "PASTE_YOUR_WMATA_API_KEY_HERE";
const SEARCH_RADIUS_METERS = 1200; // how far to look for bus stops

async function wmata(url) {
  const req = new Request(url);
  req.headers = { api_key: API_KEY };
  req.timeoutInterval = 15;
  return await req.loadJSON();
}

function distMeters(a, b, c, d) {
  const R = 6371000, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(c - a), dLon = toRad(d - b);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

async function main() {
  if (API_KEY === "PASTE_YOUR_WMATA_API_KEY_HERE") {
    console.log("⚠️  Add your WMATA API key at the top of this script first.");
    return;
  }

  Location.setAccuracyToHundredMeters();
  let here;
  try {
    here = await Location.current();
  } catch (e) {
    console.log("Couldn't get location. Enable location access for Scriptable.");
    return;
  }
  const { latitude: lat, longitude: lon } = here;
  console.log(`📍 You: ${lat.toFixed(4)}, ${lon.toFixed(4)}\n`);

  // ----- Nearby rail stations -----
  const rail = await wmata("https://api.wmata.com/Rail.svc/json/jStations");
  const stations = (rail.Stations || [])
    .map((s) => ({
      name: s.Name,
      code: s.Code,
      lines: [s.LineCode1, s.LineCode2, s.LineCode3, s.LineCode4].filter(Boolean).join("/"),
      d: distMeters(lat, lon, s.Lat, s.Lon),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);

  console.log("===== NEAREST RAIL STATIONS =====");
  for (const s of stations) {
    console.log(`${s.code}  ${s.name} [${s.lines}]  (${s.d} m)`);
  }
  console.log(`\nrail: ["${stations.slice(0, 2).map((s) => s.code).join('", "')}"]\n`);

  // ----- Nearby bus stops -----
  const bus = await wmata(
    `https://api.wmata.com/Bus.svc/json/jStops?Lat=${lat}&Lon=${lon}&Radius=${SEARCH_RADIUS_METERS}`
  );
  const stops = (bus.Stops || [])
    .map((s) => ({
      name: s.Name,
      id: s.StopID,
      routes: (s.Routes || []).join(", "),
      d: distMeters(lat, lon, s.Lat, s.Lon),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 8);

  console.log("===== NEAREST BUS STOPS =====");
  for (const s of stops) {
    console.log(`${s.id}  ${s.name}  (${s.d} m)\n   routes: ${s.routes}`);
  }
  console.log(`\nbus: ["${stops.slice(0, 1).map((s) => s.id).join('", "')}"]`);
}

await main();
Script.complete();
