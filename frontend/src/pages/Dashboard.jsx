import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ProjectList from "../components/ProjectList.jsx";
import MapView from "../components/MapView.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [sites, setSites] = useState([]);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const loadProjects = useCallback(async () => {
    const res = await api.get("/projects/");
    setProjects(res.data);
    if (res.data.length && !selectedProjectId) {
      setSelectedProjectId(res.data[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSites = useCallback(async () => {
    const res = await api.get("/sites/");
    setSites(res.data);
  }, []);

  useEffect(() => {
    loadProjects();
    loadSites();
  }, [loadProjects, loadSites]);

  const handleCreateProject = async (payload) => {
    const res = await api.post("/projects/", payload);
    setProjects((prev) => [...prev, res.data]);
    setSelectedProjectId(res.data.id);
  };

  const handlePolygonDrawn = async (geometry) => {
    if (!selectedProjectId) {
      alert("Select or create a project first.");
      return;
    }
    const name = window.prompt("Name this site:", "New Site");
    if (!name) return;
    const res = await api.post("/sites/", {
      project_id: selectedProjectId,
      name,
      geometry,
    });
    setSites((prev) => [...prev, res.data]);
  };

  const handleSiteClick = (site) => {
    navigate(`/sites/${site.id}`);
  };

  const visibleSites = selectedProjectId
    ? sites.filter((s) => s.project_id === selectedProjectId)
    : sites;

  return (
    <div className="dashboard">
      <header className="topbar">
        <h1>🌱 Darukaa.Earth</h1>
        <button className="logout-btn" onClick={logout}>
          Log out
        </button>
      </header>
      <div className="dashboard-body">
        <ProjectList
          projects={projects}
          selectedId={selectedProjectId}
          onSelect={setSelectedProjectId}
          onCreate={handleCreateProject}
        />
        <MapView
          sites={visibleSites}
          onPolygonDrawn={handlePolygonDrawn}
          onSiteClick={handleSiteClick}
        />
      </div>
    </div>
  );
}
