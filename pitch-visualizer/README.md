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
