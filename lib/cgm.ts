export type GlucoseRisk = "urgent_low" | "low" | "in_range" | "high" | "urgent_high";
export type GlucoseTrend = "rapid_falling" | "falling" | "flat" | "rising" | "rapid_rising";

export type CgmReading = {
  id: string;
  timestamp: string;
  valueMgDl: number;
  valueMmolL: number;
  deltaMgDl: number;
  trend: GlucoseTrend;
  trendArrow: string;
  risk: GlucoseRisk;
  source: "mock" | "device" | "manual";
};

export type PredictionPoint = {
  minutesAhead: number;
  timestamp: string;
  valueMgDl: number;
  valueMmolL: number;
  risk: GlucoseRisk;
  confidence: number;
};

export type CgmPrediction = {
  engine: "mock" | "openai-ready" | "openai";
  generatedAt: string;
  current: CgmReading;
  timeInRangePercentage: number;
  riskLevel: GlucoseRisk;
  summary: string;
  suggestedActions: string[];
  points: PredictionPoint[];
  aiReady: boolean;
};

const MINUTES = 60 * 1000;
const TARGET_LOW = 70;
const TARGET_HIGH = 180;

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function mgDlToMmol(valueMgDl: number) {
  return round(valueMgDl / 18.0182, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gaussian(x: number, center: number, width: number, amplitude: number) {
  return amplitude * Math.exp(-0.5 * ((x - center) / width) ** 2);
}

function rawGlucoseValue(date: Date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  const base = 106;
  const circadian = 9 * Math.sin((hour / 24) * Math.PI * 2 - 0.7);
  const breakfast = gaussian(hour, 8.4, 1.05, 48);
  const lunch = gaussian(hour, 13.8, 1.25, 38);
  const dinner = gaussian(hour, 19.4, 1.45, 55);
  const overnightDip = gaussian(hour, 3.2, 1.1, -18);
  const dawn = gaussian(hour, 5.9, 0.9, 18);
  const deterministicNoise = 5 * Math.sin(date.getTime() / (17 * MINUTES)) + 3 * Math.cos(date.getTime() / (43 * MINUTES));
  return clamp(base + circadian + breakfast + lunch + dinner + overnightDip + dawn + deterministicNoise, 54, 262);
}

function riskFor(valueMgDl: number): GlucoseRisk {
  if (valueMgDl < 54) return "urgent_low";
  if (valueMgDl < TARGET_LOW) return "low";
  if (valueMgDl > 250) return "urgent_high";
  if (valueMgDl > TARGET_HIGH) return "high";
  return "in_range";
}

function trendFor(deltaMgDl: number): { trend: GlucoseTrend; arrow: string } {
  if (deltaMgDl <= -18) return { trend: "rapid_falling", arrow: "↓" };
  if (deltaMgDl <= -5) return { trend: "falling", arrow: "↘" };
  if (deltaMgDl >= 18) return { trend: "rapid_rising", arrow: "↑" };
  if (deltaMgDl >= 5) return { trend: "rising", arrow: "↗" };
  return { trend: "flat", arrow: "→" };
}

export function createMockReading(timestamp = new Date(), source: CgmReading["source"] = "mock"): CgmReading {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const value = Math.round(rawGlucoseValue(date));
  const previousValue = Math.round(rawGlucoseValue(new Date(date.getTime() - 5 * MINUTES)));
  const delta = value - previousValue;
  const { trend, arrow } = trendFor(delta);

  return {
    id: `${source}-${date.getTime()}`,
    timestamp: date.toISOString(),
    valueMgDl: value,
    valueMmolL: mgDlToMmol(value),
    deltaMgDl: delta,
    trend,
    trendArrow: arrow,
    risk: riskFor(value),
    source
  };
}

export function buildMockTimeline(minutes = 180, stepMinutes = 5, now = new Date()) {
  const points: CgmReading[] = [];
  for (let offset = minutes; offset >= 0; offset -= stepMinutes) {
    points.push(createMockReading(new Date(now.getTime() - offset * MINUTES)));
  }
  return points;
}

function confidenceFor(minutesAhead: number) {
  return round(clamp(0.92 - minutesAhead / 220, 0.42, 0.92), 2);
}

function timeInRange(readings: CgmReading[]) {
  if (!readings.length) return 0;
  const inRange = readings.filter((reading) => reading.valueMgDl >= TARGET_LOW && reading.valueMgDl <= TARGET_HIGH).length;
  return Math.round((inRange / readings.length) * 100);
}

function summarizeRisk(risk: GlucoseRisk, value: number) {
  if (risk === "urgent_low") return `Severe low risk: ${value} mg/dL. Treat as urgent if this is a real reading.`;
  if (risk === "low") return `Low glucose risk: ${value} mg/dL. Verify symptoms and follow your hypo plan.`;
  if (risk === "urgent_high") return `Very high glucose risk: ${value} mg/dL. Check ketones if relevant and follow your clinician plan.`;
  if (risk === "high") return `High glucose trend: ${value} mg/dL. Watch the next 30-60 minutes.`;
  return `Glucose is currently in range: ${value} mg/dL.`;
}

export function predictGlucose(
  inputReadings: CgmReading[] = buildMockTimeline(),
  options: { mealCarbsGrams?: number; activeInsulinUnits?: number; engine?: CgmPrediction["engine"] } = {}
): CgmPrediction {
  const readings = inputReadings.length ? inputReadings : buildMockTimeline();
  const last = readings[readings.length - 1];
  const previous = readings[Math.max(0, readings.length - 4)] || last;
  const elapsedMinutes = Math.max(5, (new Date(last.timestamp).getTime() - new Date(previous.timestamp).getTime()) / MINUTES);
  const slopePerMinute = (last.valueMgDl - previous.valueMgDl) / elapsedMinutes;
  const carbs = clamp(options.mealCarbsGrams || 0, 0, 180);
  const insulin = clamp(options.activeInsulinUnits || 0, 0, 20);

  const points = [30, 60, 120].map((minutesAhead) => {
    const trendCarry = slopePerMinute * minutesAhead * Math.exp(-minutesAhead / 95);
    const carbEffect = carbs ? gaussian(minutesAhead, 55, 32, carbs * 0.78) : 0;
    const insulinEffect = insulin ? gaussian(minutesAhead, 75, 48, insulin * -17) : 0;
    const baselinePull = (112 - last.valueMgDl) * (1 - Math.exp(-minutesAhead / 210));
    const value = Math.round(clamp(last.valueMgDl + trendCarry + carbEffect + insulinEffect + baselinePull, 45, 310));

    return {
      minutesAhead,
      timestamp: new Date(new Date(last.timestamp).getTime() + minutesAhead * MINUTES).toISOString(),
      valueMgDl: value,
      valueMmolL: mgDlToMmol(value),
      risk: riskFor(value),
      confidence: confidenceFor(minutesAhead)
    } satisfies PredictionPoint;
  });

  const worstRisk = points.some((point) => point.risk === "urgent_low")
    ? "urgent_low"
    : points.some((point) => point.risk === "urgent_high")
      ? "urgent_high"
      : points.some((point) => point.risk === "low")
        ? "low"
        : points.some((point) => point.risk === "high")
          ? "high"
          : last.risk;

  const suggestedActions = [
    "Compare with symptoms and recent meals before acting.",
    "Keep CGM calibration and sensor placement quality in mind.",
    "Use your personal clinician-approved hypo/hyper plan for real readings."
  ];

  if (worstRisk === "low" || worstRisk === "urgent_low") {
    suggestedActions.unshift("If this is a real low, follow your fast-carb hypo protocol and recheck.");
  }

  if (worstRisk === "high" || worstRisk === "urgent_high") {
    suggestedActions.unshift("If this is a real high, consider ketone rules and correction guidance from your clinician.");
  }

  return {
    engine: options.engine || "mock",
    generatedAt: new Date().toISOString(),
    current: last,
    timeInRangePercentage: timeInRange(readings.slice(-48)),
    riskLevel: worstRisk,
    summary: summarizeRisk(worstRisk, last.valueMgDl),
    suggestedActions,
    points,
    aiReady: true
  };
}
