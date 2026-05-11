"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { CgmPrediction, CgmReading, GlucoseRisk } from "@/lib/cgm";

function riskLabel(locale: Locale, risk: GlucoseRisk) {
  const dict = getDictionary(locale);
  if (risk === "urgent_low" || risk === "low") return dict.dashboard.riskLow;
  if (risk === "urgent_high" || risk === "high") return dict.dashboard.riskHigh;
  return dict.dashboard.riskInRange;
}

function buildPolyline(readings: CgmReading[]) {
  const width = 520;
  const height = 180;
  const min = 45;
  const max = 260;
  const recent = readings.slice(-64);
  if (recent.length < 2) return "";

  return recent
    .map((reading, index) => {
      const x = (index / (recent.length - 1)) * width;
      const y = height - ((reading.valueMgDl - min) / (max - min)) * height;
      return `${Math.round(x)},${Math.round(Math.max(0, Math.min(height, y)))}`;
    })
    .join(" ");
}

function formatTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

export function CgmRealtime({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [readings, setReadings] = useState<CgmReading[]>([]);
  const [prediction, setPrediction] = useState<CgmPrediction | null>(null);
  const [streaming, setStreaming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventCountRef = useRef(0);

  const current = readings[readings.length - 1];
  const polyline = useMemo(() => buildPolyline(readings), [readings]);

  async function refreshPrediction(nextReadings = readings) {
    try {
      const response = await fetch("/api/cgm/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readings: nextReadings.slice(-48), locale })
      });
      const data = await response.json();
      if (response.ok) setPrediction(data.prediction);
    } catch {
      // The realtime card keeps working even if prediction temporarily fails.
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cgm/latest?minutes=180")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.readings)) {
          setReadings(data.readings);
          refreshPrediction(data.readings);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "CGM latest failed"));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!streaming) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    const source = new EventSource("/api/cgm/stream?patientId=demo");
    eventSourceRef.current = source;

    source.addEventListener("glucose", (event) => {
      const reading = JSON.parse((event as MessageEvent).data) as CgmReading;
      setReadings((previous) => {
        const next = [...previous, reading].slice(-96);
        eventCountRef.current += 1;
        if (eventCountRef.current % 3 === 0) refreshPrediction(next);
        return next;
      });
      setError(null);
    });

    source.onerror = () => {
      setError("CGM stream reconnecting...");
    };

    return () => {
      source.close();
      eventSourceRef.current = null;
    };
  }, [streaming]);

  return (
    <section className="dashboard-card cgm-card">
      <div className="card-heading-row">
        <div>
          <span className="kicker">{dict.dashboard.mockBadge}</span>
          <h2>{dict.dashboard.stream}</h2>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => setStreaming((value) => !value)}>
          {streaming ? dict.dashboard.stopStream : dict.dashboard.startStream}
        </button>
      </div>

      <div className="glucose-hero-row">
        <div className={`glucose-now risk-${current?.risk || "in_range"}`}>
          <span>{dict.dashboard.glucoseNow}</span>
          <strong>{current ? current.valueMgDl : "—"}</strong>
          <small>mg/dL · {current ? current.valueMmolL.toFixed(1) : "—"} mmol/L {current?.trendArrow}</small>
        </div>
        <div className="mini-stat">
          <span>{dict.dashboard.timeInRange}</span>
          <strong>{prediction ? `${prediction.timeInRangePercentage}%` : "—"}</strong>
          <small>{current ? riskLabel(locale, current.risk) : "—"}</small>
        </div>
        <div className="mini-stat">
          <span>{dict.dashboard.updated}</span>
          <strong>{formatTime(current?.timestamp)}</strong>
          <small>{current ? `${current.deltaMgDl > 0 ? "+" : ""}${current.deltaMgDl} mg/dL` : "—"}</small>
        </div>
      </div>

      <div className="cgm-chart" aria-label="CGM chart">
        <svg viewBox="0 0 520 180" role="img">
          <line x1="0" x2="520" y1="150" y2="150" />
          <line x1="0" x2="520" y1="65" y2="65" />
          {polyline ? <polyline points={polyline} /> : null}
        </svg>
      </div>

      <div className="prediction-grid">
        <div>
          <h3>{dict.dashboard.prediction}</h3>
          <p className="muted">{prediction?.summary || "—"}</p>
        </div>
        {(prediction?.points || []).map((point) => (
          <div className="prediction-pill" key={point.minutesAhead}>
            <span>+{point.minutesAhead} min</span>
            <strong>{point.valueMgDl} mg/dL</strong>
            <small>{Math.round(point.confidence * 100)}% · {riskLabel(locale, point.risk)}</small>
          </div>
        ))}
      </div>

      {error ? <div className="alert info">{error}</div> : null}
    </section>
  );
}
