# Pitch Visualizer

Interactive dashboard for analyzing pitcher arsenals from **Trackman** or **Baseball Savant** CSV exports.

## Quick start

```bash
npm install
npm run dev
```

Opens at **http://localhost:5173** automatically.

## Data input

Drop a CSV onto the upload screen — the format is detected automatically:

| Source | Key columns |
|---|---|
| **Trackman** | `TaggedPitchType`, `RelSpeed`, `SpinRate`, `HorzBreak`, `InducedVertBreak`, `PlateLocHeight/Side`, `RelHeight/Side`, `Extension`, `VertApprAngle`, `Pitcher` |
| **Baseball Savant** | `pitch_name`/`pitch_type`, `release_speed`, `release_spin_rate`, `pfx_x`, `pfx_z`, `plate_x/z`, `release_pos_x/z`, `release_extension`, `player_name` |

> Baseball Savant `pfx_x` / `pfx_z` (feet) are automatically converted to inches.

A **Load Sample Data** button is available for testing without a real file.

## Features

### Charts (tabbed)
| Tab | Content |
|---|---|
| **Location** | Strike zone scatter (catcher's view) · Pitch usage pie |
| **Movement** | Horizontal vs. induced vertical break scatter · Vertical approach angle |
| **Velocity & Spin** | Avg velocity · Avg spin rate · Velocity vs. spin scatter |
| **Release Point** | Release point scatter · Extension by pitch type |
| **Elevation** | Project break changes across altitudes using ISA atmosphere model |

### Elevation tab
Set a reference elevation (where data was collected) and a target elevation to see how air density affects induced break and horizontal break. Includes:
- Dual sliders (0–10,000 ft) with 10 MLB venue quick-select presets
- Movement overlay chart with per-pitch-type centroid arrows and Δ iVB / Δ HB callout badges
- Break change table and visual bar comparison per pitch type

### Filters
- **Pitcher dropdown** — isolate one pitcher's data
- **Pitch-type toggle buttons** — show/hide individual pitch types across all charts simultaneously

## Build for production

```bash
npm run build
npm run preview
```

## FCA Sports Way Coach Guide

`public/coach-guide/index.html` is a standalone, mobile-friendly tool for FCA Sports Idaho Clubs coaches, built from the *FCA Sports Way — FCA Coach Guide* PDF. It's a single HTML file with no build step, and deploys alongside the visualizer at `/coach-guide/`.

- **Practice** – the guide's 1 / 1.5 / 2 / 2.5 hour templates as a clock-time timeline; add drills to each block, copy or print the plan
- **Drills** – searchable library of every drill, routine and teaching point in the guide (with guide page numbers)
- **Game Day** – game plan with pregame routine timed back from first pitch, lineup card generator (batting order + positions by inning with bench rotation), organization-wide signs, live QAB / freebie war / BASES2 / pitch-count tracker
- **Devos** – blank team devotional template (hook, scripture, big idea, talk points, questions, live it out, prayer)
- **Resources** – mission, team goals and Coach's Mandate; Get 'em Ready checklist; practice philosophy; game strategy (hitting/pitching approach, pitch calling, QAB, quality inning, lineup card terms); bunt defense with field diagrams per play; base running; signs; teaching points

Practice plans (with optional drill sheets) and lineup cards export as FCA-branded, printable PDFs. They're generated in the browser with jsPDF 2.5.2 + jspdf-autotable 3.8.4, bundled in `public/coach-guide/vendor/` (MIT licenses alongside). The badge is `fca-sports-idaho-clubs.png`, taken from the guide's cover.

Plans, lineups and devos are saved in each coach's own browser (localStorage).

On a phone, coaches can use Share → **Add to Home Screen** (iPhone) or the browser menu → **Install app / Add to Home screen** (Android) to open it full-screen like an app.
