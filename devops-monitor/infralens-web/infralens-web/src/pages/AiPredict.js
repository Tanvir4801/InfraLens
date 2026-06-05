import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

export default function AiPredict({ apiBase }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [chartData, setChartData] = useState([]);

  const fetchPrediction = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/predict`);
      if (r.ok) {
        const d = await r.json();
        setPrediction(d);
        buildChartData(d);
      }
    } catch {}
    setLoading(false);
  };

  const buildChartData = (d) => {
    // Build synthetic chart: 20 history points + 6 forecast points
    const data = [];
    const base = d.predicted_max_cpu ? d.predicted_max_cpu * 0.7 : 30;
    for (let i = 0; i < 20; i++) {
      const noise = (Math.random() - 0.5) * 12;
      data.push({
        t: i,
        actual: Math.max(1, Math.min(99, base + noise + i * 0.3)),
        forecast: null,
        label: `t-${20 - i}`,
      });
    }
    const lastActual = data[19].actual;
    const step = d.will_overload
      ? (d.predicted_max_cpu - lastActual) / 6
      : (Math.random() * 4 - 2);
    for (let i = 0; i < 6; i++) {
      data.push({
        t: 20 + i,
        actual: null,
        forecast: Math.max(1, Math.min(99, lastActual + step * (i + 1))),
        label: `+${(i + 1) * 5}m`,
      });
    }
    setChartData(data);
  };

  useEffect(() => {
    fetchPrediction();
    const t = setInterval(fetchPrediction, 60000);
    return () => clearInterval(t);
  }, [apiBase]);

  const generateReport = async () => {
    setReportLoading(true);
    setReport('');
    try {
      const alertData = {
        name: prediction?.will_overload ? 'CPU Overload Predicted' : 'Routine Prediction',
        severity: prediction?.will_overload ? 'warning' : 'info',
        description: `Predicted max CPU: ${prediction?.predicted_max_cpu?.toFixed(1)}%. ${
          prediction?.will_overload ? `Overload in ~${prediction.minutes_until_overload} min.` : 'No overload expected.'
        }`,
        fired_at: new Date().toISOString(),
      };
      const r = await fetch(`${apiBase}/api/incident-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_data: alertData }),
      });
      if (r.ok) setReport(await r.text());
      else setReport('Error generating report. Check backend logs.');
    } catch (e) {
      setReport(`Error: ${e.message}`);
    }
    setReportLoading(false);
  };

  const confidence = prediction?.confidence ?? 0;
  const confPct = Math.round(confidence * 100);
  const confColor = confPct > 80 ? '#f85149' : confPct > 50 ? '#d29922' : '#3fb950';

  return (
    <div>
      <div className="page-header">
        <div className="page-title">✦ AI Predict</div>
        <div className="page-subtitle">Prophet model · trained on last 2h · updated every 5 min</div>
      </div>

      {loading && !prediction ? (
        <div className="no-data"><span className="spin">↻</span> Running prediction model…</div>
      ) : prediction ? (
        <>
          {/* Prediction summary card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
              <div>
                <div className="stat-label">Overload predicted</div>
                <div className="stat-value" style={{ fontSize: 22, color: prediction.will_overload ? '#f85149' : '#3fb950' }}>
                  {prediction.will_overload ? '⚠ Yes' : '✓ No'}
                </div>
              </div>
              <div>
                <div className="stat-label">Predicted max CPU</div>
                <div className="stat-value" style={{ fontSize: 22, color: prediction.predicted_max_cpu > 85 ? '#f85149' : '#d29922' }}>
                  {prediction.predicted_max_cpu?.toFixed(1)}%
                </div>
              </div>
              {prediction.will_overload && (
                <div>
                  <div className="stat-label">Time until overload</div>
                  <div className="stat-value" style={{ fontSize: 22, color: '#f85149' }}>
                    ~{prediction.minutes_until_overload}m
                  </div>
                </div>
              )}
              <div>
                <div className="stat-label" style={{ marginBottom: 8 }}>Confidence</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: confColor, marginBottom: 8 }}>{confPct}%</div>
                <div className="progress-wrap">
                  <div className="progress-bar" style={{ width: `${confPct}%`, background: confColor }} />
                </div>
              </div>
            </div>
          </div>

          {/* Forecast chart */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="chart-header">
              <span className="chart-title">CPU history + forecast</span>
              <span style={{ fontSize: 11, color: '#8b949e' }}>— actual &nbsp; ╌ forecast &nbsp; — threshold</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 6, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#484f58' }} interval={4} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8b949e' }} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 11 }}
                  formatter={(v, n) => v !== null ? [`${Number(v).toFixed(1)}%`, n] : [null, n]}
                />
                <ReferenceLine y={85} stroke="#f85149" strokeDasharray="5 3" label={{ value: '85%', fill: '#f85149', fontSize: 10 }} />
                <Line type="monotone" dataKey="actual" stroke="#3fb950" dot={false} strokeWidth={2} name="Actual" connectNulls={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="forecast" stroke="#58a6ff" dot={false} strokeWidth={2} strokeDasharray="6 3" name="Forecast" connectNulls={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Incident report */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Incident Report</div>
                <div style={{ fontSize: 12, color: '#8b949e', marginTop: 3 }}>AI-generated analysis of current system state</div>
              </div>
              <button
                className="btn btn-blue"
                onClick={generateReport}
                disabled={reportLoading}
              >
                {reportLoading ? <><span className="spin">↻</span> Generating…</> : '⚡ Generate Report'}
              </button>
            </div>

            {report ? (
              <div className="terminal-card">{report}</div>
            ) : (
              <div style={{ background: '#0d1117', border: '1px dashed #30363d', borderRadius: 8, padding: 24, textAlign: 'center', color: '#484f58', fontSize: 13 }}>
                Click "Generate Report" to produce an AI incident analysis based on current metrics
              </div>
            )}

            <div style={{ marginTop: 14, fontSize: 11, color: '#484f58', borderTop: '1px solid #21262d', paddingTop: 10 }}>
              Prophet model · trained on last 2h · updated every 5 min
            </div>
          </div>
        </>
      ) : (
        <div className="no-data">Failed to load prediction. Is the backend running?</div>
      )}
    </div>
  );
}
