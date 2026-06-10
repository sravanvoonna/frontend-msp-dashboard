import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

const API_BASE_URL = "https://backend-msp-dashboard.onrender.com";

// Inline SVG Icons for premium look
const SproutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 10 3 3 3-3-3-3z"/><path d="M12 22V10"/><path d="M12 8a3 3 0 0 0-3-3H4v3a3 3 0 0 0 3 3h5"/><path d="M12 14a3 3 0 0 1 3-3h5v3a3 3 0 0 1-3 3h-5"/></svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
);

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"/></svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

const ShieldCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
);

function App() {
  const [crops, setCrops] = useState([]);
  const [filteredCrops, setFilteredCrops] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [crop, setCrop] = useState("");
  const [year, setYear] = useState("2025");
  const [prediction, setPrediction] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [bestCropYear, setBestCropYear] = useState("2025");
  const [bestCrop, setBestCrop] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState("Connecting to server...");

  // Load basic details on mount
  useEffect(() => {
    initializeData();
  }, []);

  // Update best crop when year changes
  useEffect(() => {
    if (!initialLoading && crops.length > 0) {
      loadBestCrop(bestCropYear);
    }
  }, [bestCropYear, initialLoading]);

  // Filter crops list when selectedCategory changes
  useEffect(() => {
    if (crops.length === 0) return;
    
    let filtered = crops;
    if (selectedCategory !== "All") {
      filtered = crops.filter(c => c.category === selectedCategory);
    }
    setFilteredCrops(filtered);

    // If current selected crop is not in the filtered category, reset it
    const cropInFiltered = filtered.some(c => c.displayName === crop);
    if (!cropInFiltered && filtered.length > 0) {
      setCrop(filtered[0].displayName);
    }
  }, [selectedCategory, crops]);

  // Automatically fetch forecast data when crop changes
  useEffect(() => {
    if (crop) {
      loadForecast(crop);
    }
  }, [crop]);

  const loadCropsWithRetry = async (retries = 5, delay = 6000) => {
    for (let i = 0; i < retries; i++) {
      try {
        setError("");
        const res = await axios.get(`${API_BASE_URL}/crops`);
        if (res.data && res.data.length > 0) {
          setCrops(res.data);
          setFilteredCrops(res.data);
          setCrop(res.data[0].displayName);
          return res.data;
        }
        throw new Error("No crop data returned");
      } catch (err) {
        console.warn(`Attempt ${i + 1} to load crops failed. Retrying...`);
        if (i === retries - 1) {
          throw err;
        }
        setLoadingStep(`Waking up the prediction engine... (Attempt ${i + 2}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const initializeData = async () => {
    setInitialLoading(true);
    setError("");
    try {
      setLoadingStep("Waking up the prediction engine (this can take up to 60 seconds)...");
      await loadCropsWithRetry(5, 6000);
      
      setLoadingStep("Loading recommendations...");
      await loadBestCrop(bestCropYear);
      
      setInitialLoading(false);
    } catch (err) {
      console.error("Initialization failed:", err);
      setError("Could not connect to the API server. The server might be sleeping or offline.");
      setInitialLoading(false);
    }
  };

  const loadBestCrop = async (targetYear) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/bestcrop?year=${targetYear}`);
      setBestCrop(res.data);
    } catch (err) {
      setError("Unable to load best crop recommendation.");
    }
  };

  const predictMSP = async () => {
    if (!crop) {
      setError("Please select a crop first.");
      return;
    }

    setError("");
    setPrediction(null);
    setLoading(true);

    try {
      const res = await axios.get(
        `${API_BASE_URL}/predict?crop=${encodeURIComponent(crop)}&year=${year}`
      );
      setPrediction(res.data);
    } catch (err) {
      setError("Single prediction request failed. Please check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  const loadForecast = async (cropDisplayName) => {
    if (!cropDisplayName) return;

    setError("");
    setLoading(true);

    try {
      const res = await axios.get(
        `${API_BASE_URL}/forecast?crop=${encodeURIComponent(cropDisplayName)}`
      );
      setForecast(res.data);
    } catch (err) {
      setError(`Unable to load forecast for ${cropDisplayName}.`);
    } finally {
      setLoading(false);
    }
  };

  // Prepare combined data for Recharts chart
  const getChartData = () => {
    if (!forecast) return [];
    
    const chartData = [];
    
    // Add historical values
    Object.entries(forecast.historical).forEach(([yearKey, val]) => {
      chartData.push({
        year: yearKey,
        historicalMSP: val,
        predictedMSP: null
      });
    });

    // Grab the last historical year to connect the predicted line seamlessly
    const historicalKeys = Object.keys(forecast.historical);
    const lastHistYear = historicalKeys[historicalKeys.length - 1];
    const lastHistValue = forecast.historical[lastHistYear];

    // Add forecast values
    Object.entries(forecast.forecast).forEach(([yearKey, val], idx) => {
      if (idx === 0 && lastHistValue !== undefined) {
        // Overlay a mock predicted value at the last historical point
        chartData.push({
          year: lastHistYear,
          historicalMSP: null,
          predictedMSP: lastHistValue
        });
      }
      chartData.push({
        year: yearKey,
        historicalMSP: null,
        predictedMSP: val
      });
    });

    return chartData;
  };

  // Custom tooltips inside the chart
  const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isForecast = data.historicalMSP === null;
      const val = isForecast ? data.predictedMSP : data.historicalMSP;
      return (
        <div className="custom-chart-tooltip">
          <p className="tooltip-year">{label}</p>
          <p className={`tooltip-value ${isForecast ? 'text-green' : 'text-blue'}`}>
            ₹{val ? val.toLocaleString("en-IN") : "N/A"}
          </p>
          <p className={`tooltip-type ${isForecast ? 'text-green' : 'text-blue'}`}>
            {isForecast ? 'ML Forecast' : 'Historical Actual'}
          </p>
        </div>
      );
    }
    return null;
  };

  // CSV Exporter
  const downloadCSV = () => {
    if (!forecast) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Year,Type,MSP Value (INR)\n";

    Object.entries(forecast.historical).forEach(([yearKey, val]) => {
      csvContent += `${yearKey},Historical,${val || ""}\n`;
    });

    Object.entries(forecast.forecast).forEach(([yearKey, val]) => {
      csvContent += `${yearKey},Forecasted,${val || ""}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${forecast.displayName.replace(/[^a-zA-Z0-9]/g, "_")}_MSP_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categories = ["All", "Kharif Crops", "Rabi Crops", "Other Crops"];

  if (initialLoading) {
    return (
      <div className="loading-screen">
        <div className="glass-card loading-card">
          <div className="loading-logo">🌾</div>
          <h2 style={{ color: "#fff", fontWeight: 700, margin: "10px 0" }}>MSP Analytics Dashboard</h2>
          <div className="loading-progress-bar">
            <div className="loading-progress-fill"></div>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6" }}>
            {loadingStep}
          </p>
        </div>
      </div>
    );
  }

  if (crops.length === 0) {
    return (
      <div className="loading-screen">
        <div className="glass-card loading-card" style={{ borderLeft: "4px solid var(--accent-red)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "10px" }}>⚠️</div>
          <h2 style={{ color: "#fff", fontWeight: 700, margin: "10px 0" }}>Connection Failed</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6" }}>
            Unable to connect to the backend prediction service. The server might be booting up or temporarily offline.
          </p>
          {error && (
            <div style={{ 
              background: "rgba(239, 68, 68, 0.1)", 
              border: "1px solid rgba(239, 68, 68, 0.2)", 
              color: "#fca5a5", 
              padding: "12px", 
              borderRadius: "var(--border-radius-sm)", 
              fontSize: "0.85rem",
              width: "100%",
              wordBreak: "break-word",
              marginTop: "10px"
            }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary" onClick={initializeData} style={{ marginTop: "20px", width: "auto", padding: "12px 30px" }}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Title Header */}
      <header className="dashboard-header">
        <div className="logo-section">
          <div className="logo-badge">🌾</div>
          <div>
            <h1 className="logo-title">MSP Prediction & Analytics</h1>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Machine Learning Linear Regression Forecasting Demo
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "var(--primary-accent)",
            boxShadow: "0 0 8px var(--primary-accent)"
          }}></span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            API Connected
          </span>
          <button className="btn btn-outline" style={{ padding: "6px 10px", marginLeft: "10px" }} onClick={initializeData} title="Refresh Crop Data">
            <RefreshIcon />
          </button>
        </div>
      </header>

      {/* Global Error Banner */}
      {error && (
        <div className="toast">
          <span className="toast-icon">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Main Dashboard Layout Grid */}
      <div className="dashboard-grid">
        
        {/* Left Column: controls and recommendations */}
        <aside className="left-panel">
          
          {/* Controls Card */}
          <section className="glass-card">
            <h2 className="card-title">
              <SproutIcon /> Crop Analysis Setup
            </h2>
            
            {/* Category tabs */}
            <div className="form-group">
              <label className="form-label">Crop Category</label>
              <div className="category-tabs">
                {categories.map((cat, idx) => (
                  <button
                    key={idx}
                    className={`category-tab ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat.replace(" Crops", "")}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Crop */}
            <div className="form-group">
              <label className="form-label" htmlFor="crop-select">Select Crop Variety</label>
              <select
                id="crop-select"
                className="custom-select"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
              >
                {filteredCrops.length === 0 ? (
                  <option value="">No crops in this category</option>
                ) : (
                  filteredCrops.map((item, index) => (
                    <option key={index} value={item.displayName}>
                      {item.displayName}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Select Target Year */}
            <div className="form-group">
              <label className="form-label" htmlFor="year-select">Prediction Target Year</label>
              <select
                id="year-select"
                className="custom-select"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
                <option value="2029">2029</option>
              </select>
            </div>

            {/* Buttons */}
            <button className="btn btn-primary" onClick={predictMSP} disabled={loading || !crop}>
              {loading ? "Calculating..." : "Predict Single Year MSP"}
            </button>
          </section>

          {/* Quick prediction results */}
          {prediction && (
            <section className="glass-card" style={{ borderLeft: "4px solid var(--secondary-accent)", animation: "fadeIn 0.5s ease-out" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", background: "rgba(59, 130, 246, 0.15)", color: "var(--secondary-accent)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                    Single Prediction
                  </span>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "8px", color: "#fff" }}>
                    {prediction.displayName}
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Predicted MSP for target year {prediction.year_display}
                  </p>
                </div>
              </div>
              <div className="value-display emerald">
                <span className="value-currency">₹</span>
                {prediction.predicted_msp.toLocaleString("en-IN")}
              </div>
            </section>
          )}

          {/* Recommendations Card */}
          {bestCrop && (
            <section className="glass-card recommend-card">
              <div className="recommend-header">
                <h2 className="card-title" style={{ marginBottom: 0 }}>
                  <TrophyIcon /> Recommendation
                </h2>
                <div className="recommend-badge">Top Performer</div>
              </div>
              
              <div className="form-group" style={{ margin: "12px 0" }}>
                <label className="form-label" htmlFor="bestcrop-year-select" style={{ fontSize: "0.7rem" }}>Target Year Selection</label>
                <select
                  id="bestcrop-year-select"
                  className="custom-select"
                  style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                  value={bestCropYear}
                  onChange={(e) => setBestCropYear(e.target.value)}
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                </select>
              </div>

              <div style={{ marginTop: "12px" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  The crop variety predicted to yield the highest MSP for <strong>{bestCropYear}-{String((parseInt(bestCropYear) + 1) % 100).padStart(2, '0')}</strong>:
                </p>
                <h3 style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 700, margin: "10px 0 2px 0" }}>
                  {bestCrop.best_crop}
                </h3>
                {bestCrop.variety && (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                    Variety: {bestCrop.variety}
                  </p>
                )}
                <div className="value-display gold" style={{ marginTop: "8px" }}>
                  <span className="value-currency">₹</span>
                  {bestCrop.predicted_msp.toLocaleString("en-IN")}
                </div>
              </div>
            </section>
          )}

        </aside>

        {/* Right Column: charts and grids */}
        <main className="right-panel">
          
          {/* Main Forecast Chart */}
          <section className="glass-card">
            {loading && !forecast ? (
              <div className="loading-overlay">
                <div className="spinner"></div>
              </div>
            ) : forecast ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>
                      {forecast.displayName}
                    </h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Category: <strong style={{ color: "var(--primary-accent)" }}>{forecast.category}</strong> 
                      {forecast.variety && ` | Variety: ${forecast.variety}`}
                    </p>
                  </div>
                  <button className="btn btn-outline" style={{ width: "auto", padding: "8px 14px", fontSize: "0.85rem" }} onClick={downloadCSV}>
                    <DownloadIcon /> Export CSV
                  </button>
                </div>

                {/* Line Chart */}
                <div style={{ width: "100%", height: 350, marginTop: "10px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={getChartData()}
                      margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="year"
                        stroke="var(--text-secondary)"
                        style={{ fontSize: "0.75rem", fontFamily: "var(--font-family)" }}
                      />
                      <YAxis
                        stroke="var(--text-secondary)"
                        style={{ fontSize: "0.75rem", fontFamily: "var(--font-family)" }}
                        tickFormatter={(v) => `₹${v}`}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        wrapperStyle={{ fontSize: "0.85rem", fontFamily: "var(--font-family)", color: "var(--text-secondary)" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="historicalMSP"
                        stroke="var(--secondary-accent)"
                        strokeWidth={3}
                        dot={{ r: 4, stroke: "var(--secondary-accent)", strokeWidth: 2, fill: "#080b11" }}
                        activeDot={{ r: 6 }}
                        name="Historical Actual MSP"
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="predictedMSP"
                        stroke="var(--primary-accent)"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ r: 4, stroke: "var(--primary-accent)", strokeWidth: 2, fill: "#080b11" }}
                        activeDot={{ r: 6 }}
                        name="Predicted Forecast MSP"
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Performance metrics & insights section */}
                <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                    <ShieldCheckIcon /> Model Fit & Insights
                  </h3>
                  
                  <div className="metrics-grid">
                    <div className="metric-item">
                      <div className="metric-label">Model Accuracy R²</div>
                      <div className="metric-value highlight">{(forecast.metrics.r2_score * 100).toFixed(2)}%</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-label">Annual Price Slope</div>
                      <div className="metric-value">₹{forecast.metrics.slope.toLocaleString("en-IN")}/yr</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-label">Avg growth rate</div>
                      <div className="metric-value highlight">{forecast.metrics.growth_rate_pct > 0 ? "+" : ""}{forecast.metrics.growth_rate_pct}%/yr</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-label">Historical Average</div>
                      <div className="metric-value">₹{forecast.metrics.historical_avg.toLocaleString("en-IN")}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "20px" }}>
                    <div>
                      <div className="info-row">
                        <span className="info-label">Historical Min</span>
                        <span className="info-value">₹{forecast.metrics.historical_min.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Historical Max</span>
                        <span className="info-value">₹{forecast.metrics.historical_max.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    <div>
                      <div className="info-row">
                        <span className="info-label">Predicted Min (25-29)</span>
                        <span className="info-value">₹{forecast.metrics.predicted_min.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Predicted Max (25-29)</span>
                        <span className="info-value">₹{forecast.metrics.predicted_max.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table details */}
                <div style={{ marginTop: "24px" }}>
                  <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                    <ChartIcon /> Timeline Data Details
                  </h3>
                  
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Type</th>
                          <th>MSP Value (INR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Render historical actuals */}
                        {Object.entries(forecast.historical).map(([yearKey, val]) => (
                          <tr key={`hist-${yearKey}`}>
                            <td>{yearKey}</td>
                            <td><span className="badge-historical">Actual</span></td>
                            <td style={{ fontWeight: 600 }}>₹{val ? val.toLocaleString("en-IN") : "N/A"}</td>
                          </tr>
                        ))}
                        {/* Render forecasted predictions */}
                        {Object.entries(forecast.forecast).map(([yearKey, val]) => (
                          <tr key={`pred-${yearKey}`}>
                            <td>{yearKey}</td>
                            <td><span className="badge-forecast">ML Predicted</span></td>
                            <td style={{ fontWeight: 600, color: "var(--primary-accent)" }}>₹{val.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                Select a crop variety on the left panel to load analytics.
              </div>
            )}
          </section>
          
        </main>
      </div>
    </div>
  );
}

export default App;
