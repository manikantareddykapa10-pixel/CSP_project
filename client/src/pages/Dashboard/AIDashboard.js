import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Layout from "../../components/shared/Layout/Layout";
import API from "../../services/API";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const AIDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [predictions, setPredictions] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [matchResults, setMatchResults] = useState(null);
  const [selectedBloodType, setSelectedBloodType] = useState("O+");
  const [matchBloodType, setMatchBloodType] = useState("O+");
  const [forecastDays, setForecastDays] = useState(7);
  const [loading, setLoading] = useState({});
  const [liveStats, setLiveStats] = useState(null);

  const bloodGroups = ["O+", "O-", "AB+", "AB-", "A+", "A-", "B+", "B-"];

  // Fetch demand prediction
  const fetchPrediction = async () => {
    setPredictions(null);
    setLoading((p) => ({ ...p, predict: true }));
    try {
      const { data } = await API.get('/ai/predict-demand', {
        params: { bloodType: selectedBloodType, days: forecastDays }
      });
      if (data?.success) setPredictions(data);
      else toast.error(data?.message || "Could not generate a demand prediction.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not generate a demand prediction.");
    } finally {
      setLoading((p) => ({ ...p, predict: false }));
    }
  };

  // Fetch inventory optimization
  const fetchOptimization = async () => {
    setLoading((p) => ({ ...p, optimize: true }));
    try {
      const { data } = await API.get("/ai/optimize-inventory");
      if (data?.success) setOptimization(data);
      else toast.error(data?.message || "Could not load inventory recommendations.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load inventory recommendations.");
    } finally {
      setLoading((p) => ({ ...p, optimize: false }));
    }
  };

  // Smart donor matching
  const findDonors = async () => {
    setLoading((p) => ({ ...p, match: true }));
    try {
      let location = user?.location;
      if (!location && navigator.geolocation) {
        location = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
            () => reject(new Error("Location access was denied. Allow location or add it to your profile.")),
            { timeout: 10000 }
          );
        });
      }
      if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
        throw new Error("Set your location before searching for nearby donors.");
      }
      const { data } = await API.post("/ai/match-donors", {
        bloodType: matchBloodType,
        location: { lat: Number(location.lat), lng: Number(location.lng) },
        urgency: "high",
        maxDistance: 50,
        limit: 10,
      });
      if (data?.success) setMatchResults(data);
      else toast.error(data?.message || "Could not find matching donors.");
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Could not find matching donors.");
      setMatchResults(null);
    }
    setLoading((p) => ({ ...p, match: false }));
  };

  const fetchLiveStats = async () => {
    try {
      const { data } = await API.get('/analytics/stats');
      if (data?.success) setLiveStats(data.stats);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load dashboard statistics.");
    }
  };

  useEffect(() => {
    fetchOptimization();
    fetchLiveStats();
    // eslint-disable-next-line
  }, []);

  const alertColor = (level) => {
    if (level === "critical") return "#dc3545";
    if (level === "high") return "#fd7e14";
    if (level === "low") return "#28a745";
    return "#6c757d";
  };

  const alertBg = (level) => {
    if (level === "critical") return "#fff5f5";
    if (level === "high") return "#fff8f0";
    if (level === "low") return "#f0fff4";
    return "#f8f9fa";
  };

  return (
    <Layout>
      <div className="container-fluid mt-3 px-4">
        {/* Title */}
        <div className="d-flex align-items-center mb-3">
          <h2 className="mb-0">
            <i className="fa-solid fa-chart-line" style={{ color: "#764ba2", marginRight: "10px" }}></i>
            Statistical Analytics Dashboard
          </h2>
          <span className="badge ms-3" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", fontSize: "12px", padding: "6px 12px" }}>
            Statistical Analysis
          </span>
        </div>

        {/* Live DB Stats Row */}
        {liveStats && (
          <div className="row g-2 mb-4">
            {[
              { label: 'Donors', value: liveStats.totalDonors, icon: 'fa-user-plus', color: '#1a73e8', bg: '#e3f2fd' },
              { label: 'Hospitals', value: liveStats.totalHospitals, icon: 'fa-hospital', color: '#388e3c', bg: '#e8f5e9' },
              { label: 'Organisations', value: liveStats.totalOrgs, icon: 'fa-building-ngo', color: '#f57c00', bg: '#fff3e0' },
              { label: 'Blood Available', value: `${liveStats.availableBlood} ml`, icon: 'fa-droplet', color: '#d32f2f', bg: '#ffebee' },
              { label: 'Pending Requests', value: liveStats.pendingRequests, icon: 'fa-clock', color: '#7b1fa2', bg: '#f3e5f5' },
              { label: 'Completed', value: liveStats.completedRequests, icon: 'fa-circle-check', color: '#00796b', bg: '#e0f2f1' },
            ].map(s => (
              <div key={s.label} className="col-6 col-md-2">
                <div className="p-2 rounded text-center h-100" style={{ background: s.bg }}>
                  <i className={`fa-solid ${s.icon} mb-1`} style={{ color: s.color, fontSize: 18 }}></i>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div className="d-flex gap-2 mb-4">
          <Link to="/blood-map" className="btn btn-sm btn-outline-primary">
            <i className="fa-solid fa-map-location-dot me-1"></i>Live Blood Map
          </Link>
          <Link to="/request-blood" className="btn btn-sm btn-outline-danger">
            <i className="fa-solid fa-droplet-slash me-1"></i>Request Blood
          </Link>
          <Link to="/analytics" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-chart-bar me-1"></i>Inventory Analytics
          </Link>
        </div>

        {/* ========== DEMAND PREDICTION ========== */}
        <div
          className="card mb-4"
          style={{
            border: "none",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            borderRadius: "12px",
          }}
        >
          <div
            className="card-header d-flex justify-content-between align-items-center"
            style={{
              background:
                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              borderRadius: "12px 12px 0 0",
              padding: "16px 20px",
            }}
          >
            <h5 className="mb-0">
              <i className="fa-solid fa-chart-line me-2"></i>
              Blood Demand Prediction
            </h5>
            <div className="d-flex gap-2 align-items-center">
              <select
                className="form-select form-select-sm"
                style={{ width: "100px" }}
                value={selectedBloodType}
                onChange={(e) => setSelectedBloodType(e.target.value)}
              >
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
              <select
                className="form-select form-select-sm"
                style={{ width: "100px" }}
                value={forecastDays}
                onChange={(e) => setForecastDays(e.target.value)}
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
              <button
                className="btn btn-light btn-sm"
                onClick={fetchPrediction}
                disabled={loading.predict}
              >
                {loading.predict ? "..." : "Predict"}
              </button>
            </div>
          </div>
          <div className="card-body">
            {predictions?.prediction ? (
              <div className="row">
                {/* Main prediction card */}
                <div className="col-md-4 mb-3">
                  <div
                    className="p-3 rounded-3 text-center"
                    style={{
                      background: alertBg(predictions.prediction.alertLevel),
                      border: `2px solid ${alertColor(predictions.prediction.alertLevel)}`,
                    }}
                  >
                    <h3
                      style={{
                        color: alertColor(predictions.prediction.alertLevel),
                        fontWeight: 700,
                      }}
                    >
                      {predictions.prediction.status}
                    </h3>
                    <div
                      className="mt-2"
                      style={{ fontSize: "40px", fontWeight: 800 }}
                    >
                      {predictions.prediction.bloodType}
                    </div>
                    <div className="text-muted mt-1">
                      Next {predictions.prediction.forecastPeriod}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="col-md-4 mb-3">
                  <div className="p-3 rounded-3 bg-light h-100">
                    <h6 className="text-muted mb-3">Forecast Details</h6>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Predicted Demand</span>
                      <strong className="text-danger">
                        {predictions.prediction.predictedDemand} units
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Predicted Supply</span>
                      <strong className="text-success">
                        {predictions.prediction.predictedSupply} units
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Expected Balance</span>
                      <strong
                        style={{
                          color:
                            predictions.prediction.expectedBalance >= 0
                              ? "#28a745"
                              : "#dc3545",
                        }}
                      >
                        {predictions.prediction.expectedBalance > 0 ? "+" : ""}
                        {predictions.prediction.expectedBalance} units
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Daily Average</span>
                      <strong>{predictions.prediction.dailyAverage} u/day</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Confidence</span>
                      <span
                        className="badge"
                        style={{
                          background:
                            predictions.prediction.confidence === "High"
                              ? "#28a745"
                              : predictions.prediction.confidence === "Medium"
                              ? "#fd7e14"
                              : "#dc3545",
                        }}
                      >
                        {predictions.prediction.confidence}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="col-md-4 mb-3">
                  <div className="p-3 rounded-3 bg-light h-100">
                    <h6 className="text-muted mb-3">
                      <i className="fa-solid fa-lightbulb me-1 text-warning"></i>
                      Statistical Recommendation
                    </h6>
                    <p style={{ fontSize: "14px", lineHeight: 1.6 }}>
                      {predictions.prediction.recommendation}
                    </p>
                    {predictions.aiInsights?.length > 0 && (
                      <div className="mt-3">
                        <strong>Insights:</strong>
                        {predictions.aiInsights.map((insight, i) => (
                          <div key={i} className="mt-1" style={{ fontSize: "13px" }}>
                            {insight}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-5">
                {loading.predict ? (
                  <>
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <p className="text-muted">Analyzing 90 days of historical data...</p>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-chart-line mb-3" style={{ fontSize: "48px", color: "#667eea" }}></i>
                    <h5 className="text-muted">Select blood type and forecast period</h5>
                    <p className="text-muted">Click <strong>Predict</strong> to generate statistical forecast</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="row">
          {/* ========== DONOR MATCHING ========== */}
          <div className="col-md-6 mb-4">
            <div
              className="card h-100"
              style={{
                border: "none",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                borderRadius: "12px",
              }}
            >
              <div
                className="card-header"
                style={{
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  color: "white",
                  borderRadius: "12px 12px 0 0",
                  padding: "16px 20px",
                }}
              >
                <h5 className="mb-0">
                  <i className="fa-solid fa-users-rays me-2"></i>
                  Smart Donor Matching
                </h5>
              </div>
              <div className="card-body">
                <div className="d-flex gap-2 mb-3">
                  <select
                    className="form-select"
                    value={matchBloodType}
                    onChange={(e) => setMatchBloodType(e.target.value)}
                  >
                    {bloodGroups.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-danger px-4"
                    onClick={findDonors}
                    disabled={loading.match}
                  >
                    {loading.match ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      "Find Donors"
                    )}
                  </button>
                </div>

                {matchResults?.data ? (
                  <>
                    <div
                      className="alert alert-info py-2"
                      style={{ fontSize: "13px" }}
                    >
                      <strong>{matchResults.data.totalMatches}</strong> compatible
                      donors found for{" "}
                      <strong>{matchResults.data.requestedBloodType}</strong>
                      {matchResults.aiInsights && (
                        <div className="mt-1">
                          <i className="fa-solid fa-clock me-1"></i>
                          Est. response: {matchResults.aiInsights.estimatedResponseTime}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      {matchResults.data.donors.map((donor, i) => (
                        <div
                          key={i}
                          className="d-flex align-items-center p-2 mb-2 rounded-3"
                          style={{
                            background: i === 0 ? "#fff8f0" : "#f8f9fa",
                            border: i === 0 ? "1px solid #fd7e14" : "1px solid #e9ecef",
                          }}
                        >
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center me-3"
                            style={{
                              width: "40px",
                              height: "40px",
                              background:
                                i === 0
                                  ? "#fd7e14"
                                  : i < 3
                                  ? "#667eea"
                                  : "#6c757d",
                              color: "white",
                              fontWeight: 700,
                              fontSize: "14px",
                              flexShrink: 0,
                            }}
                          >
                            #{i + 1}
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between">
                              <strong style={{ fontSize: "14px" }}>
                                {donor.name}
                              </strong>
                              <span
                                className="badge"
                                style={{
                                  background:
                                    donor.score >= 60 ? "#28a745" : "#fd7e14",
                                }}
                              >
                                Score: {donor.score}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6c757d",
                              }}
                            >
                              {donor.bloodGroup} &bull; {donor.phone} &bull;{" "}
                              {donor.matchReason}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {matchResults.aiInsights?.recommendation && (
                      <div
                        className="mt-3 p-2 rounded"
                        style={{
                          background: "#f0f0ff",
                          fontSize: "13px",
                        }}
                      >
                        <i className="fa-solid fa-robot me-1 text-primary"></i>
                        <strong>Insight:</strong>{" "}
                        {matchResults.aiInsights.recommendation}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i
                      className="fa-solid fa-droplet mb-3"
                      style={{ fontSize: "40px", color: "#f5576c" }}
                    ></i>
                    <p>Select blood type and find matching donors</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========== INVENTORY OPTIMIZATION ========== */}
          <div className="col-md-6 mb-4">
            <div
              className="card h-100"
              style={{
                border: "none",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                borderRadius: "12px",
              }}
            >
              <div
                className="card-header d-flex justify-content-between align-items-center"
                style={{
                  background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  color: "white",
                  borderRadius: "12px 12px 0 0",
                  padding: "16px 20px",
                }}
              >
                <h5 className="mb-0">
                  <i className="fa-solid fa-wand-magic-sparkles me-2"></i>
                  Inventory Optimization
                </h5>
                <button
                  className="btn btn-light btn-sm"
                  onClick={fetchOptimization}
                  disabled={loading.optimize}
                >
                  {loading.optimize ? "..." : "Refresh"}
                </button>
              </div>
              <div className="card-body">
                {optimization?.data ? (
                  <>
                    {/* Summary */}
                    <div className="row mb-3">
                      <div className="col-4">
                        <div className="text-center p-2 rounded bg-light">
                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: 700,
                              color: "#667eea",
                            }}
                          >
                            {optimization.data.totalRecommendations}
                          </div>
                          <small className="text-muted">Actions</small>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="text-center p-2 rounded bg-light">
                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: 700,
                              color: "#fd7e14",
                            }}
                          >
                            {optimization.data.expiryWarnings}
                          </div>
                          <small className="text-muted">Expiry Alerts</small>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="text-center p-2 rounded bg-light">
                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: 700,
                              color: "#28a745",
                            }}
                          >
                            {optimization.aiInsights?.criticalActions || 0}
                          </div>
                          <small className="text-muted">Critical</small>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <h6 className="text-muted mb-2">
                      <i className="fa-solid fa-list-check me-1"></i>
                      Recommendations
                    </h6>
                    <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                      {optimization.data.recommendations.length > 0 ? (
                        optimization.data.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="p-2 mb-2 rounded"
                            style={{
                              background:
                                rec.priority === "high" ? "#fff5f5" : "#f8f9fa",
                              border: `1px solid ${
                                rec.priority === "high" ? "#dc3545" : "#e9ecef"
                              }`,
                              fontSize: "13px",
                            }}
                          >
                            <div className="d-flex justify-content-between">
                              <strong>
                                {rec.bloodGroup} - {rec.organisation}
                              </strong>
                              <span
                                className="badge"
                                style={{
                                  background:
                                    rec.priority === "high"
                                      ? "#dc3545"
                                      : "#fd7e14",
                                }}
                              >
                                {rec.priority}
                              </span>
                            </div>
                            <div className="text-muted mt-1">
                              {rec.recommendation}
                            </div>
                            <small>
                              Current stock: {rec.currentStock} units
                            </small>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-3 text-success">
                          <i className="fa-solid fa-circle-check me-1"></i>
                          All inventory levels are optimal!
                        </div>
                      )}

                      {/* Expiry Alerts */}
                      {optimization.data.expiryAlerts?.length > 0 && (
                        <>
                          <h6 className="text-muted mt-3 mb-2">
                            <i className="fa-solid fa-triangle-exclamation me-1 text-warning"></i>
                            Expiry Alerts
                          </h6>
                          {optimization.data.expiryAlerts.map((alert, i) => (
                            <div
                              key={i}
                              className="p-2 mb-2 rounded"
                              style={{
                                background: "#fffbe6",
                                border: "1px solid #ffc107",
                                fontSize: "13px",
                              }}
                            >
                              <strong>{alert.bloodGroup}</strong> - {alert.quantity}{" "}
                              units at {alert.organisation} expire in{" "}
                              <strong>{alert.daysUntilExpiry} days</strong>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    {/* AI Summary */}
                    {optimization.aiInsights && (
                      <div
                        className="mt-3 p-2 rounded"
                        style={{ background: "#f0f8ff", fontSize: "13px" }}
                      >
                        <i className="fa-solid fa-robot me-1 text-primary"></i>
                        <strong>AI:</strong> {optimization.aiInsights.summary}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-5 text-muted">
                    {loading.optimize ? (
                      <div className="spinner-border text-primary"></div>
                    ) : (
                      <>
                        <i
                          className="fa-solid fa-warehouse mb-3"
                          style={{ fontSize: "40px", color: "#4facfe" }}
                        ></i>
                        <p>Loading optimization data...</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Info Footer */}
        <div
          className="text-center py-3 mb-4 rounded-3"
          style={{
            background: "linear-gradient(135deg, #667eea22 0%, #764ba222 100%)",
            fontSize: "13px",
            color: "#6c757d",
          }}
        >
          <i className="fa-solid fa-shield-halved me-1"></i>
          Predictions use <strong>Moving Average &amp; Trend Analysis</strong> on real DB data. Donor matching uses a <strong>multi-factor scoring algorithm</strong> (proximity · blood compatibility · availability · history). All stats reflect live database values.
          Use the <strong>chat button</strong> (bottom-right) for the Blood Donation Assistant.
        </div>
      </div>
    </Layout>
  );
};

export default AIDashboard;
