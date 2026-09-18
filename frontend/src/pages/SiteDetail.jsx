import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";
import AnalyticsChart from "../components/AnalyticsChart.jsx";

export default function SiteDetail() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [site, setSite] = useState(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get(`/analytics/sites/${siteId}`)
      .then((res) => setAnalytics(res.data))
      .catch(() => setError("Could not load analytics for this site."));

    api
      .get(`/sites/${siteId}`)
      .then((res) => setSite(res.data))
      .catch(() => {
        /* non-fatal — area just won't show */
      });
  }, [siteId]);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${analytics?.site_name || "this site"}"? This also removes its recorded metrics and can't be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete(`/sites/${siteId}`);
      navigate("/");
    } catch (err) {
      setError("Could not delete this site. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="site-detail">
      <div className="site-detail-header">
        <Link to="/" className="back-link">
          ← Back to map
        </Link>
        <button className="delete-btn" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "🗑️ Delete site"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {analytics && (
        <>
          <h1>{analytics.site_name}</h1>
          <p className="subtitle">
            {analytics.metrics.length} months of recorded performance
            {site?.area_hectares != null && (
              <> · {site.area_hectares.toLocaleString()} hectares</>
            )}
          </p>
          {analytics.metrics.length > 0 ? (
            <AnalyticsChart metrics={analytics.metrics} />
          ) : (
            <div className="empty-state">
              <p>📊 No metrics recorded yet for this site.</p>
              <p className="hint">
                New sites created through the map now get mock performance data
                automatically — if this one predates that, re-create it to see a chart.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
