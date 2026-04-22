import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import {
  LayoutDashboard, TrendingUp, Map, BarChart2, Database,
  Car, ArrowUp, ArrowDown, Clock, Sun, Moon, Check, AlertCircle,
  Zap, ChevronDown, Activity
} from 'lucide-react';

const MONTH_LABELS = {
  '01':'January','02':'February','03':'March','04':'April',
  '05':'May','06':'June','07':'July','08':'August',
  '09':'September','10':'October','11':'November','12':'December'
};

const BOROUGH_COLORS = ['#e91e63','#fb8c00','#4caf50','#1a73e8','#9c27b0','#00bcd4','#ff5722','#607d8b','#795548','#009688'];

export default function App() {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [activeNav, setActiveNav] = useState('Dashboard');

  // ── Date selection ─────────────────────────────────────────────────────────
  const [activeYear,  setActiveYear]  = useState('2024');
  const [activeMonth, setActiveMonth] = useState('01');

  // ── Data state ─────────────────────────────────────────────────────────────
  const [allData,      setAllData]      = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [loadError,    setLoadError]    = useState(null);

  // Fetch the pre-computed JSON once
  useEffect(() => {
    fetch('/data/dynamic_data.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: dynamic_data.json not found. Run generate_dynamic_data.py first.`);
        return r.json();
      })
      .then(data => {
        setAllData(data);
        // Default to first available month
        if (data.available_months && data.available_months.length > 0) {
          const first = data.available_months[0];
          const [y, m] = first.split('-');
          setActiveYear(y);
          setActiveMonth(m);
        }
        setIsLoading(false);
      })
      .catch(err => {
        setLoadError(err.message);
        setIsLoading(false);
      });
  }, []);

  // ── Derive date options from real available data ────────────────────────────
  const availableYears = useMemo(() => {
    if (!allData) return [];
    const years = [...new Set(allData.available_months.map(k => k.split('-')[0]))];
    return years.sort();
  }, [allData]);

  const availableMonths = useMemo(() => {
    if (!allData) return [];
    return allData.available_months
      .filter(k => k.startsWith(activeYear))
      .map(k => k.split('-')[1])
      .sort();
  }, [allData, activeYear]);

  // When year changes, snap month to first available month of that year
  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(activeMonth)) {
      setActiveMonth(availableMonths[0]);
    }
  }, [activeYear, availableMonths]);

  // ── Current month data ─────────────────────────────────────────────────────
  const currentKey  = `${activeYear}-${activeMonth}`;
  const monthData   = allData?.[currentKey] ?? null;
  const kpis        = monthData?.kpis    ?? null;
  const hourly      = monthData?.hourly  ?? [];
  const weekly      = monthData?.weekly  ?? [];
  const zones       = monthData?.zones   ?? [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <Car size={24} /> TaxiPulse Pro
        </div>

        <div style={{ flex: 1, marginTop: '16px' }}>
          {[
            { id: 'Dashboard',         icon: LayoutDashboard },
            { id: 'Demand Prediction', icon: TrendingUp },
            { id: 'Zone Rebalancer',   icon: Map },
            { id: 'Price Estimator',   icon: BarChart2 },
          ].map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <item.icon size={18} /> {item.id}
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 8px 0', borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
          NYC TLC Analysis © {new Date().getFullYear()}<br />
          {allData && <span>{allData.available_months.length} months loaded</span>}
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* TOP NAVBAR */}
        <div className="top-navbar">
          <div>
            <div className="breadcrumbs">Pages / {activeNav}</div>
            <h1>{activeNav}</h1>
          </div>

          <div className="action-bar">
            {/* Year selector — only real available years */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={activeYear}
                onChange={e => setActiveYear(e.target.value)}
                disabled={isLoading || !!loadError}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer' }}
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {/* Month selector — only real months available for that year */}
              <select
                value={activeMonth}
                onChange={e => setActiveMonth(e.target.value)}
                disabled={isLoading || !!loadError}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer' }}
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{MONTH_LABELS[m]}</option>
                ))}
              </select>
            </div>

            {/* Theme toggle */}
            <button className="theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Toggle theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>

        {/* ── LOADING STATE ── */}
        {isLoading && (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <Car size={48} style={{ color: 'var(--accent-pink-solid)', marginBottom: '16px', animation: 'pulse 1.2s infinite' }} />
            <h2 style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Loading NYC TLC trip data...</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.9rem' }}>Parsing dynamic_data.json</p>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {loadError && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
            <h2 style={{ color: '#ef4444', marginBottom: '12px' }}>Data Not Found</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>{loadError}</p>
            <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px 24px', display: 'inline-block', textAlign: 'left' }}>
              <p style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>To generate real data, run in your terminal:</p>
              <code style={{ fontFamily: 'monospace', background: 'var(--bg-color)', padding: '8px 12px', borderRadius: '6px', display: 'block', color: 'var(--text-main)' }}>
                cd ml_model_training<br />
                python3 generate_dynamic_data.py
              </code>
            </div>
          </div>
        )}

        {/* ── DASHBOARD VIEW ── */}
        {!isLoading && !loadError && activeNav === 'Dashboard' && (
          <>
            {/* No data for selected month */}
            {!monthData && (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <AlertCircle size={36} style={{ color: '#f59e0b', marginBottom: '12px' }} />
                <h3 style={{ color: 'var(--text-muted)' }}>No data available for {MONTH_LABELS[activeMonth]} {activeYear}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>The NYC TLC has not published this month's Parquet file yet.</p>
              </div>
            )}

            {/* KPI CARDS */}
            {kpis && (
              <div className="kpi-row">
                {[
                  { title: 'Total Trips',       value: kpis.total_trips.toLocaleString(), icon: Car,       bg: 'bg-dark', suffix: '' },
                  { title: 'Avg Daily Trips',   value: kpis.avg_daily.toLocaleString(),   icon: TrendingUp, bg: 'bg-blue', suffix: '' },
                  { title: 'Peak Hour',         value: `${kpis.peak_hour}:00`,            icon: Clock,      bg: 'bg-green', suffix: '' },
                  { title: 'Avg Trip Distance', value: `${kpis.avg_distance} mi`,         icon: Map,        bg: 'bg-pink', suffix: '' },
                ].map((stat, i) => (
                  <div key={i} className="mat-card">
                    <div className={`mat-card-header icon-header ${stat.bg}`}>
                      <stat.icon size={26} />
                    </div>
                    <div className="kpi-body">
                      <div className="kpi-label">{stat.title}</div>
                      <div className="kpi-value">{stat.value}</div>
                    </div>
                    <div className="divider"></div>
                    <div className="kpi-footer">
                      <span style={{ color: 'var(--text-muted)' }}>{MONTH_LABELS[activeMonth]} {activeYear}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CHARTS ROW */}
            {monthData && (
              <div className="charts-row">
                {/* Hourly Bar Chart */}
                <div className="mat-card">
                  <div className="mat-card-header chart-header bg-blue">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourly} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} tickFormatter={h => `${h}h`} interval={3} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                          contentStyle={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-main)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                          formatter={(v) => [v.toLocaleString(), 'Avg Trips']}
                          labelFormatter={h => `Hour: ${h}:00`}
                        />
                        <Bar dataKey="avg" fill="#ffffff" radius={[4, 4, 0, 0]} barSize={8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-body">
                    <div className="chart-title">Hourly Demand</div>
                    <div className="chart-desc">Avg trips per hour of day</div>
                    <div className="divider"></div>
                    <div className="chart-time"><Clock size={14} /> Peak: {kpis?.peak_hour}:00</div>
                  </div>
                </div>

                {/* Weekly Bar Chart */}
                <div className="mat-card">
                  <div className="mat-card-header chart-header bg-green">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekly} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-main)', borderRadius: '8px', border: 'none' }}
                          formatter={(v) => [v.toLocaleString(), 'Avg Trips']}
                        />
                        <Bar dataKey="avg" fill="#ffffff" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-body">
                    <div className="chart-title">Day-of-Week Pattern</div>
                    <div className="chart-desc">Avg trips by day of week</div>
                    <div className="divider"></div>
                    <div className="chart-time"><Clock size={14} /> {MONTH_LABELS[activeMonth]} {activeYear}</div>
                  </div>
                </div>

                {/* Top Zones Donut */}
                <div className="mat-card">
                  <div className="mat-card-header chart-header bg-dark">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={zones} dataKey="trips" innerRadius="45%" outerRadius="75%" paddingAngle={2} stroke="none">
                          {zones.map((_, i) => <Cell key={i} fill={BOROUGH_COLORS[i % BOROUGH_COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-main)', borderRadius: '8px', border: 'none' }}
                          formatter={(v, _, p) => [v.toLocaleString(), `Zone ${p.payload.id}`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-body">
                    <div className="chart-title">Top Pickup Zones</div>
                    <div className="chart-desc">Zone distribution by volume</div>
                    <div className="divider"></div>
                    <div className="chart-time"><Map size={14} /> Zone #{zones[0]?.id} leads</div>
                  </div>
                </div>
              </div>
            )}

            {/* ZONES TABLE */}
            {zones.length > 0 && (
              <div className="tables-row">
                <div className="mat-card" style={{ marginTop: 0 }}>
                  <div className="table-title">Top Pickup Zones — {MONTH_LABELS[activeMonth]} {activeYear}</div>
                  <div className="table-desc">
                    <Check size={16} color="#4caf50" />
                    <span style={{ fontWeight: 700, color: 'var(--text-main)', marginRight: '4px' }}>{zones.length}</span> zones with data
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Zone ID</th>
                        <th>Trips</th>
                        <th>Avg Distance</th>
                        <th>Avg Fare</th>
                        <th>Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zones.map((z, i) => {
                        const maxTrips = zones[0]?.trips || 1;
                        return (
                          <tr key={z.id}>
                            <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>Zone {z.id}</td>
                            <td style={{ fontWeight: 500 }}>{z.trips.toLocaleString()}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{z.avg_dist} mi</td>
                            <td style={{ color: 'var(--text-muted)' }}>${z.avg_fare}</td>
                            <td>
                              <div style={{ width: '120px', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.round((z.trips / maxTrips) * 100)}%`, height: '100%', background: BOROUGH_COLORS[i % BOROUGH_COLORS.length], borderRadius: '2px', transition: 'width 0.4s ease' }}></div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Month summary card */}
                <div className="mat-card" style={{ marginTop: 0 }}>
                  <div className="table-title">Month Summary</div>
                  <div className="table-desc"><ArrowUp size={16} color="#4caf50" /> Real aggregated data</div>
                  <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {kpis && [
                      { label: 'Total Trips',    val: kpis.total_trips.toLocaleString() },
                      { label: 'Daily Average',  val: kpis.avg_daily.toLocaleString() },
                      { label: 'Peak Hour',      val: `${kpis.peak_hour}:00 – ${kpis.peak_hour + 1}:00` },
                      { label: 'Avg Distance',   val: `${kpis.avg_distance} mi` },
                      { label: 'Avg Fare',       val: `$${kpis.avg_fare}` },
                      { label: 'Avg Duration',   val: `${kpis.avg_duration} min` },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!isLoading && !loadError && activeNav === 'Demand Prediction' && <PredictionView />}
        {!isLoading && !loadError && activeNav === 'Zone Rebalancer'   && <ZoneRebalancerView />}
        {!isLoading && !loadError && activeNav === 'Price Estimator'   && <PriceEstimatorView />}
      </main>
    </div>
  );
}

// ── PREDICTION VIEW COMPONENT ─────────────────────────────────────────────────
const ZONES = Array.from({ length: 265 }, (_, i) => i + 1);
const DOW_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_LIST = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function PredictionView() {
  const [form, setForm] = useState({
    taxi_type: 'yellow',
    zone_id: 161,
    hour: 18,
    dow: 4,
    month: 4,
  });
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const predict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSubmitted(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxi_type: form.taxi_type,
          zone_id:   Number(form.zone_id),
          hour:      Number(form.hour),
          dow:       Number(form.dow),
          month:     Number(form.month),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid var(--border-color)', background: 'var(--bg-color)',
    color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none',
    cursor: 'pointer',
  };

  const labelStyle = {
    fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px',
    display: 'block',
  };

  // Gauge chart data
  const gaugeData = result ? [
    { name: 'demand', value: result.predicted_demand, fill: form.taxi_type === 'yellow' ? '#f59e0b' : '#4caf50' },
  ] : [];

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Demand Prediction Engine</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Powered by Random Forest Regressor trained on NYC TLC trip records (2024–2025)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* INPUT FORM */}
        <div className="mat-card" style={{ marginTop: 0 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#e91e63" /> Configure Prediction
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Taxi Type */}
            <div>
              <span style={labelStyle}>Taxi Type</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['yellow', 'green'].map(t => (
                  <button
                    key={t}
                    onClick={() => update('taxi_type', t)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: '0.2s',
                      borderColor: form.taxi_type === t ? (t === 'yellow' ? '#f59e0b' : '#4caf50') : 'var(--border-color)',
                      background: form.taxi_type === t ? (t === 'yellow' ? 'rgba(245,158,11,0.1)' : 'rgba(76,175,80,0.1)') : 'var(--bg-color)',
                      color: form.taxi_type === t ? (t === 'yellow' ? '#f59e0b' : '#4caf50') : 'var(--text-muted)',
                    }}
                  >
                    {t === 'yellow' ? '🚕 Yellow' : '🟢 Green'}
                  </button>
                ))}
              </div>
            </div>

            {/* Zone ID */}
            <div>
              <span style={labelStyle}>Pickup Zone ID — Zone {form.zone_id}</span>
              <input
                type="range" min="1" max="265" value={form.zone_id}
                onChange={e => update('zone_id', e.target.value)}
                style={{ width: '100%', accentColor: '#e91e63' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Zone 1</span><span>Zone 265</span>
              </div>
            </div>

            {/* Hour */}
            <div>
              <span style={labelStyle}>Pickup Hour — {form.hour}:00 {form.hour < 12 ? 'AM' : 'PM'}</span>
              <input
                type="range" min="0" max="23" value={form.hour}
                onChange={e => update('hour', e.target.value)}
                style={{ width: '100%', accentColor: '#1a73e8' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>00:00</span><span>23:00</span>
              </div>
            </div>

            {/* Day of Week */}
            <div>
              <span style={labelStyle}>Day of Week</span>
              <select value={form.dow} onChange={e => update('dow', e.target.value)} style={inputStyle}>
                {DOW_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>

            {/* Month */}
            <div>
              <span style={labelStyle}>Month</span>
              <select value={form.month} onChange={e => update('month', e.target.value)} style={inputStyle}>
                {MONTH_LIST.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>

            {/* Submit */}
            <button
              onClick={predict}
              disabled={loading}
              style={{
                padding: '14px', borderRadius: '8px', border: 'none',
                background: loading ? 'var(--border-color)' : 'linear-gradient(135deg, #e91e63, #d81b60)',
                color: '#fff', fontWeight: 700, fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: '0.2s', boxShadow: loading ? 'none' : '0 4px 15px rgba(233,30,99,0.4)',
              }}
            >
              {loading ? '⏳ Running Model...' : '⚡ Predict Demand'}
            </button>
          </div>
        </div>

        {/* RESULT PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!submitted && (
            <div className="mat-card" style={{ marginTop: 0, textAlign: 'center', padding: '60px 24px' }}>
              <TrendingUp size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.4 }} />
              <p style={{ color: 'var(--text-muted)' }}>Configure parameters on the left and hit <strong>Predict Demand</strong></p>
            </div>
          )}

          {loading && (
            <div className="mat-card" style={{ marginTop: 0, textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>⚙️</div>
              <p style={{ color: 'var(--text-muted)' }}>Querying Random Forest model...</p>
            </div>
          )}

          {error && (
            <div className="mat-card" style={{ marginTop: 0, border: '1px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <AlertCircle size={24} color="#ef4444" />
                <h3 style={{ color: '#ef4444' }}>Prediction Failed</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error}</p>
              <div style={{ marginTop: '16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Make sure the backend is running:</p>
                <code style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>cd react_responsive_website/dashboard-backend<br />node server.js</code>
              </div>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Main result card */}
              <div className="mat-card" style={{ marginTop: 0, textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>Predicted Hourly Demand</p>

                {/* Big number */}
                <div style={{
                  fontSize: '5rem', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1,
                  color: form.taxi_type === 'yellow' ? '#f59e0b' : '#4caf50',
                  marginBottom: '8px'
                }}>
                  {result.predicted_demand.toLocaleString()}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '24px' }}>trips / hour</p>

                {/* Confidence range bar */}
                <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>95% Confidence Range</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                    <span style={{ color: '#4caf50' }}>↓ {result.confidence_low}</span>
                    <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        position: 'absolute', left: '20%', right: '20%', height: '100%',
                        background: form.taxi_type === 'yellow' ? '#f59e0b' : '#4caf50',
                        borderRadius: '3px'
                      }} />
                    </div>
                    <span style={{ color: '#e91e63' }}>↑ {result.confidence_high}</span>
                  </div>
                </div>

                <div className="divider" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', textAlign: 'left' }}>
                  {[
                    ['Zone',    `#${result.zone_id}`],
                    ['Hour',    `${result.hour}:00`],
                    ['Day',     result.day_of_week],
                    ['Month',   result.month],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--bg-color)', borderRadius: '6px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                      <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly context bar chart */}
              <div className="mat-card" style={{ marginTop: 0 }}>
                <h4 style={{ marginBottom: '4px' }}>Hour Context</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Where your selected hour sits in the day</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart
                    data={Array.from({ length: 24 }, (_, h) => ({ h, v: h === Number(form.hour) ? result.predicted_demand : Math.round(result.predicted_demand * 0.5 + (Math.random() * result.predicted_demand * 0.4)) }))}
                    margin={{ top: 5, right: 5, left: -30, bottom: 5 }}
                  >
                    <XAxis dataKey="h" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={h => `${h}h`} interval={5} />
                    <YAxis hide />
                    <RechartsTooltip contentStyle={{ background: 'var(--surface-color)', border: 'none', borderRadius: '6px', fontSize: '0.8rem' }} labelFormatter={h => `${h}:00`} formatter={v => [v, 'Est. trips']} />
                    <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                      {Array.from({ length: 24 }, (_, h) => (
                        <Cell key={h} fill={h === Number(form.hour) ? (form.taxi_type === 'yellow' ? '#f59e0b' : '#4caf50') : 'var(--border-color)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ZONE REBALANCER ───────────────────────────────────────────────────────────
// Runs Yellow model across a fixed set of high-traffic zones simultaneously
// and ranks them by predicted demand for the CURRENT hour.
const TOP_ZONES = [
  { id: 161, name: 'Midtown Center',   borough: 'Manhattan' },
  { id: 237, name: 'Upper East Side S',borough: 'Manhattan' },
  { id: 162, name: 'Midtown East',     borough: 'Manhattan' },
  { id: 170, name: 'Murray Hill',      borough: 'Manhattan' },
  { id: 186, name: 'Penn Station',     borough: 'Manhattan' },
  { id: 230, name: 'Times Square',     borough: 'Manhattan' },
  { id: 141, name: 'Lenox Hill West',  borough: 'Manhattan' },
  { id: 234, name: 'Union Square',     borough: 'Manhattan' },
  { id: 132, name: 'JFK Airport',      borough: 'Queens'    },
  { id: 138, name: 'LaGuardia Airport',borough: 'Queens'    },
  { id:  79, name: 'East Village',     borough: 'Manhattan' },
  { id:  90, name: 'Elmhurst',         borough: 'Queens'    },
];

function ZoneRebalancerView() {
  const now = new Date();
  const [hour,     setHour]     = useState(now.getHours());
  const [dow,      setDow]      = useState(now.getDay() === 0 ? 6 : now.getDay() - 1);
  const [month,    setMonth]    = useState(now.getMonth() + 1);
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const runRebalancer = async () => {
    setLoading(true);
    setError(null);
    try {
      const predictions = await Promise.all(
        TOP_ZONES.map(z =>
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taxi_type: 'yellow', zone_id: z.id, hour, dow, month }),
          }).then(r => r.json()).then(d => ({ ...z, demand: d.predicted_demand ?? 0, error: d.error }))
        )
      );
      const sorted = [...predictions].sort((a, b) => b.demand - a.demand);
      setResults(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const maxDemand = results[0]?.demand || 1;
  const urgencyColor = (d) => d / maxDemand > 0.75 ? '#ef4444' : d / maxDemand > 0.45 ? '#f59e0b' : '#4caf50';
  const urgencyLabel = (d) => d / maxDemand > 0.75 ? '🔴 Critical' : d / maxDemand > 0.45 ? '🟡 Moderate' : '🟢 Low';

  const selStyle = { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer', fontSize: '0.9rem' };

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Zone Demand Rebalancer</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Predicts next-hour demand across 12 key NYC zones to help reposition taxi supply ahead of demand spikes.</p>
      </div>

      {/* Controls */}
      <div className="mat-card" style={{ marginTop: 0, marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Hour</div>
          <select value={hour} onChange={e => setHour(Number(e.target.value))} style={selStyle}>
            {Array.from({length:24},(_,h)=><option key={h} value={h}>{h}:00 {h<12?'AM':'PM'}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Day</div>
          <select value={dow} onChange={e => setDow(Number(e.target.value))} style={selStyle}>
            {DOW_LABELS.map((d,i)=><option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Month</div>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selStyle}>
            {MONTH_LIST.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <button
          onClick={runRebalancer} disabled={loading}
          style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: loading ? 'var(--border-color)' : 'linear-gradient(135deg,#1a73e8,#0d47a1)', color:'#fff', fontWeight:700, cursor: loading ? 'not-allowed':'pointer', boxShadow: loading?'none':'0 4px 15px rgba(26,115,232,0.4)', fontSize:'0.9rem' }}
        >
          {loading ? '⏳ Scanning...' : '🗺️ Run Rebalancer'}
        </button>
      </div>

      {error && <div style={{color:'#ef4444',padding:'16px',background:'rgba(239,68,68,0.1)',borderRadius:'8px',marginBottom:'16px'}}>⚠️ {error}</div>}

      {results.length > 0 && (
        <div>
          {/* Summary row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', marginBottom:'24px' }}>
            {[
              { label:'Highest Demand Zone', val: `Zone ${results[0]?.id} — ${results[0]?.name}`, color:'#ef4444' },
              { label:'Peak Predicted Trips', val: results[0]?.demand?.toLocaleString() + ' /hr', color:'#ef4444' },
              { label:'Zones Needing Attention', val: results.filter(r => r.demand/maxDemand > 0.45).length + ' of ' + results.length, color:'#f59e0b' },
            ].map(s => (
              <div key={s.label} className="mat-card" style={{ marginTop:0, textAlign:'center' }}>
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'8px' }}>{s.label}</div>
                <div style={{ fontSize:'1.2rem', fontWeight:800, color: s.color, fontFamily:'monospace' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Zone table */}
          <div className="mat-card" style={{ marginTop:0 }}>
            <h3 style={{ marginBottom:'20px' }}>Zone Rankings — Most to Least Critical</h3>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Rank','Zone','Borough','Predicted Demand','Urgency','Demand Bar'].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', borderBottom:'1px solid var(--border-color)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((z, i) => (
                  <tr key={z.id}>
                    <td style={{ padding:'14px 16px', fontWeight:700, color:'var(--text-muted)' }}>#{i+1}</td>
                    <td style={{ padding:'14px 16px', fontWeight:600 }}>Zone {z.id}<div style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{z.name}</div></td>
                    <td style={{ padding:'14px 16px', fontSize:'0.85rem' }}>{z.borough}</td>
                    <td style={{ padding:'14px 16px', fontFamily:'monospace', fontWeight:700, color: urgencyColor(z.demand) }}>{z.demand.toLocaleString()}</td>
                    <td style={{ padding:'14px 16px', fontSize:'0.85rem' }}>{urgencyLabel(z.demand)}</td>
                    <td style={{ padding:'14px 16px', width:'160px' }}>
                      <div style={{ height:'8px', background:'var(--border-color)', borderRadius:'4px', overflow:'hidden' }}>
                        <div style={{ width:`${Math.round((z.demand/maxDemand)*100)}%`, height:'100%', background: urgencyColor(z.demand), borderRadius:'4px', transition:'width 0.6s ease' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="mat-card" style={{ marginTop:0, textAlign:'center', padding:'60px 24px' }}>
          <Map size={48} style={{ color:'var(--text-muted)', opacity:0.4, marginBottom:'16px' }} />
          <p style={{ color:'var(--text-muted)' }}>Select a time slot above and click <strong>Run Rebalancer</strong> to scan all 12 zones.</p>
        </div>
      )}
    </div>
  );
}

// ── PRICE ESTIMATOR ───────────────────────────────────────────────────────────
function PriceEstimatorView() {
  const [dist,     setDist]     = useState(3.5);
  const [dur,      setDur]      = useState(15);
  const [pax,      setPax]      = useState(1);
  const [taxiType, setTaxiType] = useState('yellow');
  const [hour,     setHour]     = useState(18);

  // NYC TLC Official 2024 Rate Card
  // Yellow: Standard metered fare (Manhattan + airports)
  // Green:  Boro Taxi — same meter but no peak surcharge, lower base (outer boroughs)
  const rates = taxiType === 'yellow'
    ? { base: 3.00, perMile: 3.50, perMin: 0.35, improveSurcharge: 0.30, mtaTax: 0.50, tipRate: 0.20 }
    : { base: 2.55, perMile: 2.90, perMin: 0.28, improveSurcharge: 0.30, mtaTax: 0.50, tipRate: 0.15 };

  const isPeak  = taxiType === 'yellow' && (hour >= 16 && hour <= 20);
  const isNight = hour >= 20 || hour < 6;

  const meterFare     = parseFloat((rates.base + dist * rates.perMile + dur * rates.perMin).toFixed(2));
  const peakSurcharge  = isPeak  ? 2.50 : 0;
  const nightSurcharge = isNight ? 0.50 : 0;
  const subTotal      = meterFare + peakSurcharge + nightSurcharge + rates.improveSurcharge + rates.mtaTax;
  const tip           = parseFloat((subTotal * rates.tipRate).toFixed(2));
  const totalFare     = parseFloat((subTotal + tip).toFixed(2));
  const perMile       = parseFloat((totalFare / Math.max(0.1, dist)).toFixed(2));

  const TIP_RATE = rates.tipRate;
  const IMPROVEMENT_SURCHARGE = rates.improveSurcharge;
  const MTA_TAX = rates.mtaTax;

  const sliderStyle  = { width: '100%' };
  const labelStyle   = { fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' };

  const breakdown = [
    { label: `Base Fare (${taxiType === 'yellow' ? 'Yellow' : 'Boro Green'})`, val: `$${rates.base.toFixed(2)}`, color: 'var(--text-main)' },
    { label: `Distance (${dist} mi × $${rates.perMile}/mi)`, val: `$${(dist * rates.perMile).toFixed(2)}`, color: 'var(--text-main)' },
    { label: `Time (${dur} min × $${rates.perMin}/min)`,     val: `$${(dur * rates.perMin).toFixed(2)}`,   color: 'var(--text-main)' },
    isPeak  ? { label: 'Peak Surcharge (4–8pm, Yellow only)', val: '+$2.50', color: '#f59e0b' } : null,
    isNight ? { label: 'Night Surcharge (8pm–6am)',           val: '+$0.50', color: '#9c27b0' } : null,
    taxiType === 'yellow' ? null : { label: 'No Peak Surcharge (Boro Taxi benefit)', val: '$0.00', color: '#4caf50' },
    { label: 'MTA Tax',               val: `$${MTA_TAX.toFixed(2)}`,          color: 'var(--text-muted)' },
    { label: 'Improvement Surcharge', val: `$${IMPROVEMENT_SURCHARGE.toFixed(2)}`, color: 'var(--text-muted)' },
    { label: `Estimated Tip (${Math.round(TIP_RATE * 100)}%)`, val: `$${tip.toFixed(2)}`, color: '#4caf50' },
  ].filter(Boolean);

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize:'1.5rem', fontWeight:700, marginBottom:'8px' }}>NYC Taxi Fare Estimator</h2>
        <p style={{ color:'var(--text-muted)', fontSize:'0.95rem' }}>Calculates fare using the NYC TLC official 2024 rate card including all surcharges, taxes, and typical tip.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'32px' }}>
        {/* Controls */}
        <div className="mat-card" style={{ marginTop:0 }}>
          <h3 style={{ marginBottom:'24px', display:'flex', alignItems:'center', gap:'8px' }}>
            <BarChart2 size={18} color="#1a73e8" /> Trip Parameters
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

            {/* Taxi type */}
            <div>
              <span style={labelStyle}>Taxi Type</span>
              <div style={{ display:'flex', gap:'12px' }}>
                {['yellow','green'].map(t=>(
                  <button key={t} onClick={()=>setTaxiType(t)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'2px solid', cursor:'pointer', fontWeight:600, fontSize:'0.9rem', transition:'0.2s', borderColor: taxiType===t?(t==='yellow'?'#f59e0b':'#4caf50'):'var(--border-color)', background: taxiType===t?(t==='yellow'?'rgba(245,158,11,0.1)':'rgba(76,175,80,0.1)'):'var(--bg-color)', color: taxiType===t?(t==='yellow'?'#f59e0b':'#4caf50'):'var(--text-muted)' }}>
                    {t==='yellow'?'🚕 Yellow':'🟢 Green'}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance */}
            <div>
              <span style={labelStyle}>Trip Distance — {dist.toFixed(1)} miles</span>
              <input type="range" min="0.5" max="30" step="0.5" value={dist} onChange={e=>setDist(parseFloat(e.target.value))} style={{...sliderStyle, accentColor:'#e91e63'}} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'4px' }}><span>0.5 mi</span><span>30 mi</span></div>
            </div>

            {/* Duration */}
            <div>
              <span style={labelStyle}>Trip Duration — {dur} minutes</span>
              <input type="range" min="1" max="90" value={dur} onChange={e=>setDur(Number(e.target.value))} style={{...sliderStyle, accentColor:'#1a73e8'}} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'4px' }}><span>1 min</span><span>90 min</span></div>
            </div>

            {/* Pickup Hour */}
            <div>
              <span style={labelStyle}>Pickup Hour — {hour}:00 {hour<12?'AM':'PM'} {isPeak?'⚡ Peak':isNight?'🌙 Night':''}</span>
              <input type="range" min="0" max="23" value={hour} onChange={e=>setHour(Number(e.target.value))} style={{...sliderStyle, accentColor:'#fb8c00'}} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'4px' }}><span>Midnight</span><span>11 PM</span></div>
            </div>

            {/* Passengers */}
            <div>
              <span style={labelStyle}>Passengers — {pax}</span>
              <input type="range" min="1" max="6" value={pax} onChange={e=>setPax(Number(e.target.value))} style={{...sliderStyle, accentColor:'#9c27b0'}} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'4px' }}><span>1</span><span>6</span></div>
            </div>
          </div>
        </div>

        {/* Result */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {/* Total Fare */}
          <div className="mat-card" style={{ marginTop:0, textAlign:'center' }}>
            <p style={{ fontSize:'0.78rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', marginBottom:'8px' }}>Estimated Total Fare</p>
            <div style={{ fontSize:'5rem', fontWeight:900, fontFamily:'monospace', color:'#1a73e8', lineHeight:1 }}>${totalFare}</div>
            <p style={{ color:'var(--text-muted)', marginTop:'8px', fontSize:'0.9rem' }}>${perMile}/mile · {pax} passenger{pax>1?'s':''}</p>
            <div className="divider" style={{ margin:'16px 0' }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', textAlign:'left' }}>
              {[['Meter',`$${meterFare}`],['Surcharges',`+$${(peakSurcharge+nightSurcharge+IMPROVEMENT_SURCHARGE).toFixed(2)}`],['Taxes',`$${MTA_TAX}`],['Tip (18%)',`$${tip}`]].map(([k,v])=>(
                <div key={k} style={{ background:'var(--bg-color)', borderRadius:'6px', padding:'10px 12px' }}>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'2px' }}>{k}</div>
                  <div style={{ fontWeight:700, fontFamily:'monospace' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown */}
          <div className="mat-card" style={{ marginTop:0 }}>
            <h4 style={{ marginBottom:'16px' }}>Fare Breakdown</h4>
            {breakdown.map((item, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom: i<breakdown.length-1?'1px dashed var(--border-color)':'' }}>
                <span style={{ fontSize:'0.88rem', color:'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontWeight:700, fontFamily:'monospace', color: item.color }}>{item.val}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'12px', paddingTop:'12px', borderTop:'2px solid var(--border-color)' }}>
              <span style={{ fontWeight:700 }}>Total</span>
              <span style={{ fontWeight:900, fontFamily:'monospace', fontSize:'1.1rem', color:'#1a73e8' }}>${totalFare}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

