// =============================================================================
// MetroPulse — Route Stops
// List every bus stop (and its StopID) along a WMATA route, in order, for both
// directions. Defaults to route D30.
//
// Usage:
//   1. Paste your API key below.
//   2. Set ROUTE_ID if you want something other than D30.
//   3. Run it inside the Scriptable app (not as a widget) and read the console.
//
// Drop any StopID you like into CONFIG.bus.stops in metropulse-widget.js.
// =============================================================================

const API_KEY = "PASTE_YOUR_WMATA_API_KEY_HERE";
const ROUTE_ID = "D30"; // e.g. "D30", "70", "A12"

async function wmata(url) {
  const req = new Request(url);
  req.headers = { api_key: API_KEY };
  req.timeoutInterval = 15;
  return await req.loadJSON();
}

function printDirection(dir) {
  if (!dir || !dir.Stops || !dir.Stops.length) return [];
  console.log(`\n=== Direction ${dir.DirectionNum}: ${dir.DirectionText} ===`);
  console.log(`(${dir.Stops.length} stops)\n`);
  dir.Stops.forEach((s, i) => {
    console.log(`${String(i + 1).padStart(2, " ")}. ${s.StopID}  ${s.Name}`);
  });
  return dir.Stops.map((s) => s.StopID);
}

async function main() {
  if (API_KEY === "PASTE_YOUR_WMATA_API_KEY_HERE") {
    console.log("⚠️  Add your WMATA API key at the top of this script first.");
    return;
  }

  let data;
  try {
    data = await wmata(
      "https://api.wmata.com/Bus.svc/json/jRouteDetails?RouteID=" +
        encodeURIComponent(ROUTE_ID)
    );
  } catch (e) {
    console.log(`Couldn't load route ${ROUTE_ID}. Check the API key / route ID.`);
    return;
  }

  if (!data || !data.RouteID) {
    console.log(`No details found for route "${ROUTE_ID}".`);
    console.log("Tip: list valid routes via Bus.svc/json/jRoutes.");
    return;
  }

  console.log(`🚌 Route ${data.RouteID}: ${data.Name}`);

  const ids0 = printDirection(data.Direction0);
  const ids1 = printDirection(data.Direction1);

  // De-duplicate StopIDs across both directions for easy copy/paste.
  const allIds = [...new Set([...ids0, ...ids1])];
  console.log(`\n===== ALL STOP IDs (${allIds.length}) =====`);
  console.log(`["${allIds.join('", "')}"]`);
}

await main();
Script.complete();
