/**
 * Full atmospheric model for baseball flight conditions.
 *
 * Break (iVB, HorzBreak) ∝ ρ^BREAK_EXPONENT, not strictly linear with density.
 * As density decreases, drag also decreases, keeping the ball faster longer,
 * which partially offsets the Magnus force reduction.
 * Empirical calibration: Coors Field (82% density) shows ~10% less break
 * in Statcast data, implying ρ^0.55 (Nathan 2008, Kagan 2014).
 *
 * ρ depends on: altitude (via ISA pressure), temperature, barometric pressure,
 * and relative humidity (moist air is less dense than dry air).
 *
 * ISA troposphere references:
 *   T(h) = 288.15 − 0.0065·h_m  (K)
 *   P(h) = 101325·(1 − 2.2558e-5·h_m)^5.2559  (Pa)
 *
 * Moist-air density (Dalton's law):
 *   ρ = Pd/(Rd·T) + Pv/(Rv·T)
 *   where Pd = P − Pv  (partial pressure of dry air)
 *         Pv = RH · Psat(T)  (partial pressure of water vapour)
 *         Psat via Tetens: 611.2·exp(17.67·Tc/(Tc+243.5))  Pa
 *         Rd = 287.058  J/(kg·K)
 *         Rv = 461.495  J/(kg·K)
 *
 * Wind effects (additive, not multiplicative):
 *   Crosswind → adds directly to HorzBreak (± 0.2 in/mph)
 *   Headwind  → increases effective air speed → slightly more break (~0.2%/mph)
 */

// Empirical exponent: break ∝ ρ^BREAK_EXPONENT
// Derived from Coors data: (0.823)^α = 0.90 → α ≈ 0.54
const BREAK_EXPONENT = 0.55;

// ── ISA helpers ───────────────────────────────────────────────────────────────

/** ISA pressure at altitude in Pascals. */
export function isaPressurePa(altFt) {
  const h = Math.max(0, altFt) * 0.3048; // ft → m
  return 101325 * Math.pow(1 - 2.2558e-5 * h, 5.2559);
}

/** ISA pressure at altitude in inHg. */
export function isaPressureInHg(altFt) {
  return isaPressurePa(altFt) / 3386.389;
}

/** ISA temperature at altitude in °F. */
export function isaTemperatureF(altFt) {
  const h = Math.max(0, altFt) * 0.3048;
  const T_K = 288.15 - 0.0065 * h;
  return (T_K - 273.15) * 9 / 5 + 32;
}

// ── Density model ─────────────────────────────────────────────────────────────

/** Saturation vapour pressure (Tetens formula) in Pa given temperature in °F. */
function satVapourPressure(tempF) {
  const Tc = (tempF - 32) * 5 / 9;
  return 611.2 * Math.exp(17.67 * Tc / (Tc + 243.5));
}

/**
 * Moist air density in kg/m³.
 * @param {number} altFt        – altitude (ft), sets ISA base pressure when pressureInHg not supplied
 * @param {number} tempF        – dry-bulb temperature (°F)
 * @param {number} pressureInHg – station barometric pressure (inHg)
 * @param {number} humidity     – relative humidity (0–100 %)
 */
export function airDensityFull(altFt, tempF, pressureInHg, humidity) {
  const T  = (tempF - 32) * 5 / 9 + 273.15;          // K
  const P  = pressureInHg * 3386.389;                  // Pa
  const Pv = (humidity / 100) * satVapourPressure(tempF); // Pa
  const Pd = P - Pv;                                   // Pa dry air
  return Pd / (287.058 * T) + Pv / (461.495 * T);     // kg/m³
}

/**
 * Raw air density ratio (target / ref). Useful for display.
 */
export function densityRatioFull(ref, target) {
  const refRho = airDensityFull(ref.altFt, ref.tempF, ref.pressureInHg, ref.humidity);
  if (refRho === 0) return 1;
  return airDensityFull(target.altFt, target.tempF, target.pressureInHg, target.humidity) / refRho;
}

/**
 * Break scale factor: how much iVB and HorzBreak change from ref → target.
 * Uses calibrated exponent (0.55) derived from Coors Field Statcast data.
 * Break ∝ ρ^0.55, not linearly — drag also decreases with density,
 * partially offsetting the Magnus force reduction.
 */
export function movementScaleFactorFull(ref, target) {
  return Math.pow(densityRatioFull(ref, target), BREAK_EXPONENT);
}

/**
 * % change in density for each environmental factor in isolation,
 * holding the other three variables fixed at the reference values.
 * NOTE: altitude factor correctly uses ISA pressure at target altitude,
 * since air density cannot change with altitude without a pressure change.
 */
export function factorBreakdown(ref, target) {
  const base = airDensityFull(ref.altFt, ref.tempF, ref.pressureInHg, ref.humidity);
  const pct  = (rho) => (rho / base - 1) * 100;
  // Altitude: apply ISA pressure at target altitude (altFt itself is unused in airDensityFull)
  const isaPressAtTargetAlt = isaPressurePa(target.altFt) / 3386.389;
  return {
    altitude:    pct(airDensityFull(target.altFt,  ref.tempF,    isaPressAtTargetAlt,  ref.humidity)),
    temperature: pct(airDensityFull(ref.altFt,     target.tempF, ref.pressureInHg,     ref.humidity)),
    pressure:    pct(airDensityFull(ref.altFt,     ref.tempF,    target.pressureInHg,  ref.humidity)),
    humidity:    pct(airDensityFull(ref.altFt,     ref.tempF,    ref.pressureInHg,     target.humidity)),
  };
}

/** % total density change from ref → target. */
export function totalDensityChangePct(ref, target) {
  return (densityRatioFull(ref, target) - 1) * 100;
}

/** % break change from ref → target (using calibrated exponent). */
export function totalBreakChangePct(ref, target) {
  return (movementScaleFactorFull(ref, target) - 1) * 100;
}

// ── Wind effects ──────────────────────────────────────────────────────────────

/**
 * Horizontal break added by crosswind (inches).
 * windDir: 0 = in from CF (headwind), 90 = toward 1B, 180 = out to CF, 270 = toward 3B.
 * Positive = toward 1B.
 * ~0.2 in/mph of crosswind — Nathan (2012) pitching wind analysis.
 */
export function windHorzEffect(windSpeedMph, windDirDeg) {
  const crosswind = windSpeedMph * Math.sin(windDirDeg * Math.PI / 180);
  return crosswind * 0.2;
}

/**
 * Additive break scale delta from headwind/tailwind.
 * Headwind increases effective air speed → more Magnus force → more break.
 * ~0.2% break change per 1 mph headwind.
 * Usage: adjIVB = origIVB * (movementScaleFactorFull(ref, target) + windVertScaleDelta(target) - windVertScaleDelta(ref))
 */
export function windVertScaleDelta(windSpeedMph, windDirDeg) {
  const headwind = windSpeedMph * Math.cos(windDirDeg * Math.PI / 180);
  return headwind * 0.002;
}

// ── Legacy single-variable exports (backward compat) ─────────────────────────

export function airDensityRatio(altitudeFt) {
  const clamped = Math.max(0, Math.min(altitudeFt, 36000));
  return Math.pow(1 - 6.87559e-6 * clamped, 5.2559);
}

export function movementScaleFactor(refAltFt, targetAltFt) {
  const ref = airDensityRatio(refAltFt);
  return ref === 0 ? 1 : airDensityRatio(targetAltFt) / ref;
}

export function densityChangePct(refAltFt, targetAltFt) {
  return (airDensityRatio(targetAltFt) / airDensityRatio(refAltFt) - 1) * 100;
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const VENUE_PRESETS = [
  { name: 'Sea Level',        alt: 0 },
  { name: 'Boston (Fenway)',  alt: 20 },
  { name: 'New York',         alt: 55 },
  { name: 'Dallas',           alt: 430 },
  { name: 'Chicago',          alt: 595 },
  { name: 'Atlanta',          alt: 1050 },
  { name: 'Phoenix',          alt: 1082 },
  { name: 'Salt Lake City',   alt: 4226 },
  { name: 'Denver (Coors)',   alt: 5280 },
  { name: 'Colorado Springs', alt: 6035 },
];

/** Time-of-day presets adjust temperature and typical relative humidity. */
export const TIME_OF_DAY_PRESETS = [
  { label: 'Dawn',      icon: '🌅', tempF: 58,  humidity: 78 },
  { label: 'Morning',   icon: '☀️',  tempF: 68,  humidity: 65 },
  { label: 'Afternoon', icon: '🌞', tempF: 85,  humidity: 48 },
  { label: 'Evening',   icon: '🌇', tempF: 74,  humidity: 56 },
  { label: 'Night',     icon: '🌙', tempF: 63,  humidity: 68 },
];
