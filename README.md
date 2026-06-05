# MetroPulse At-a-Glance 🚇🚌

See **WMATA (DC Metro) bus and train arrival times at a glance** on your iPhone's
home screen and lock screen — powered by the same real-time
[WMATA Developer API](https://developer.wmata.com) behind Metro's
[MetroPulse](https://wmata.com/initiatives/metropulse/) app.

It's a [Scriptable](https://scriptable.app) widget — a single JavaScript file,
no Xcode and no Apple Developer account required.

![Medium widget: line/route badges, destinations, and minutes to arrival](#)

## What you get

- A native iOS widget (small / medium / large) showing the next rail and bus
  arrivals for the stations and stops you care about.
- Official Metro **line colors** (RD/BL/OR/SV/GR/YL) and route badges.
- Live minutes, with **BRD** (boarding) and **ARR** (arriving) highlighted.
- Rail and bus arrivals merged and sorted by soonest.
- Per-widget overrides so one script can power several widgets for different
  stations — no code editing needed.

## Setup

### 1. Get the Scriptable app
Install [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) (free)
from the App Store.

### 2. Add the scripts
In Scriptable, tap **+** to create a new script and paste in the contents of:
- [`metropulse-widget.js`](./metropulse-widget.js) → name it **MetroPulse**
- [`find-codes.js`](./find-codes.js) → name it **MetroPulse Find Codes** (optional helper)
- [`route-stops.js`](./route-stops.js) → name it **MetroPulse Route Stops** (optional helper: lists every StopID along a bus route, e.g. D30)

The easiest way to get the files onto your phone: save this repo to iCloud
Drive's *Scriptable* folder, or open the raw files on your phone and copy/paste.

### 3. Add your API key
Get a free key at [developer.wmata.com](https://developer.wmata.com) (sign up →
**Products** → subscribe to the default tier → copy your **Primary key**).

Paste it into the `apiKey` field in `metropulse-widget.js` (and at the top of
`find-codes.js` if you use the helper).

### 4. Find your station codes & bus stop IDs
Run **MetroPulse Find Codes** once *inside the app*. It uses your location to
print the nearest rail station codes (e.g. `A01`) and bus stop IDs (e.g.
`1001195`), ready to paste.

> No helper? Rail station codes are listed at
> [api.wmata.com/Rail.svc/json/jStations](https://developer.wmata.com/docs/services/5476364f031f590f38092507/operations/5476364f031f5909e4fe330c).

### 5. Configure the widget
Edit the `CONFIG` block at the top of `metropulse-widget.js`:

```js
const CONFIG = {
  apiKey: "your-key-here",
  rail: { stations: ["A01", "C01"], lines: [] },  // lines: [] = all
  bus:  { stops: ["1001195"],       routes: [] },  // routes: [] = all
  ...
};
```

- `lines` filter (optional): e.g. `["RD"]` for Red Line only.
- `routes` filter (optional): e.g. `["70", "D6"]` for specific bus routes.

### 6. Add the widget
Long-press your home screen → **+** → **Scriptable** → pick a size → place it →
long-press the new widget → **Edit Widget** → **Script: MetroPulse**.

Add it to your **lock screen** the same way for true at-a-glance access.

## Per-widget overrides (optional)

Want multiple widgets for different stations from one script? When editing a
widget, set the **Parameter** field:

```
rail=A01,C01;bus=1001195,1001196
```

This overrides the stations/stops in `CONFIG` for just that widget.

## How it works

| Data | Endpoint |
|------|----------|
| Rail predictions | `StationPrediction.svc/json/GetPrediction/{codes}` |
| Bus predictions  | `NextBusService.svc/json/JPredictions?StopID={id}` |
| Station lookup   | `Rail.svc/json/jStations` |
| Bus stop lookup  | `Bus.svc/json/jStops?Lat&Lon&Radius` |
| Route stop list  | `Bus.svc/json/jRouteDetails?RouteID={route}` |

The API key is sent as an `api_key` request header (kept out of URLs/logs).
iOS refreshes widgets on its own schedule; `refreshMinutes` nudges the timeline.

## Troubleshooting

- **"Add your WMATA API key"** — paste your key into `CONFIG.apiKey`.
- **"Couldn't reach WMATA"** — check the key is active and you have signal; the
  free tier allows ~10 requests/sec, 50k/day.
- **No arrivals** — late night / no service, or your filters exclude everything.
- **Wrong station** — re-run `find-codes.js`; large stations have two codes
  (e.g. Metro Center is `A01` *and* `C01`), include both.

## Notes

Data © [WMATA](https://developer.wmata.com). This project is an independent
widget and is not affiliated with or endorsed by WMATA.
