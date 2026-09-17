import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import AnalyticsChart from "../components/AnalyticsChart.jsx";

export default function SiteDetail() {
  const { siteId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/analytics/sites/${siteId}`)
      .then((res) => setAnalytics(res.data))
      .catch(() => setError("Could not load analytics for this site."));
  }, [siteId]);

  return (
    <div className="site-detail">
      <Link to="/" className="back-link">
        ← Back to map
      </Link>
      {error && <div className="error">{error}</div>}
      {analytics && (
        <>
          <h1>{analytics.site_name}</h1>
          <p className="subtitle">
            {analytics.metrics.length} months of recorded performance
          </p>
          {analytics.metrics.length > 0 ? (
            <AnalyticsChart metrics={analytics.metrics} />
          ) : (
            <p>No metrics recorded yet for this site.</p>
          )}
        </>
      )}
    </div>
  );
}
