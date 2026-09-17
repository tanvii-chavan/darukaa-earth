import React, { useState } from "react";

export default function ProjectList({ projects, selectedId, onSelect, onCreate }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate({ name, description, project_type: "mixed" });
    setName("");
    setDescription("");
    setShowForm(false);
  };

  return (
    <div className="project-list">
      <div className="project-list-header">
        <h2>Projects</h2>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {showForm && (
        <form className="new-project-form" onSubmit={handleCreate}>
          <input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="submit">Create</button>
        </form>
      )}

      <ul>
        {projects.map((p) => (
          <li
            key={p.id}
            className={p.id === selectedId ? "active" : ""}
            onClick={() => onSelect(p.id)}
          >
            <strong>{p.name}</strong>
            <span className="project-type">{p.project_type}</span>
          </li>
        ))}
        {projects.length === 0 && <li className="empty">No projects yet</li>}
      </ul>
    </div>
  );
}
