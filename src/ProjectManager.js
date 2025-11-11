import React, { useState } from 'react';
import {
  saveProject,
  loadProjects,
  loadProject,
  deleteProject,
  exportProjectJSON,
  importProjectJSON,
} from './utils/storage';
import { loadDemoData } from './utils/demoData';

function ProjectManager({ onLoadProject, onNewProject, currentProjectName, onProjectNameChange }) {
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState(loadProjects());
  const [projectName, setProjectName] = useState('');

  const refreshProjects = () => {
    setProjects(loadProjects());
  };

  const handleSave = () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    const projectData = {
      name: projectName,
      // This will be populated by App.js with actual state
    };

    const savedId = saveProject(projectData);
    if (savedId) {
      alert('Project saved successfully!');
      onProjectNameChange(projectName);
      refreshProjects();
      setShowModal(false);
    }
  };

  const handleLoad = (projectId) => {
    const project = loadProject(projectId);
    if (project && onLoadProject) {
      onLoadProject(project.data);
      onProjectNameChange(project.name);
      setShowModal(false);
    }
  };

  const handleDelete = (projectId, projectName) => {
    if (window.confirm(`Are you sure you want to delete "${projectName}"?`)) {
      deleteProject(projectId);
      refreshProjects();
    }
  };

  const handleLoadDemo = () => {
    const demoData = loadDemoData();
    if (onLoadProject) {
      onLoadProject(demoData);
      onProjectNameChange('Demo E-Commerce Platform');
      setShowModal(false);
    }
  };

  const handleExport = (projectId) => {
    const project = loadProject(projectId);
    if (project) {
      exportProjectJSON(project.data);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const projectData = await importProjectJSON(file);
        if (onLoadProject) {
          onLoadProject(projectData);
          onProjectNameChange(projectData.name || 'Imported Project');
          setShowModal(false);
        }
      } catch (error) {
        alert('Error importing project: ' + error.message);
      }
    }
  };

  return (
    <>
      {/* Project Manager Button */}
      <div className="btn-group" role="group">
        <button
          className="btn btn-outline-primary"
          onClick={() => {
            setShowModal(true);
            setProjectName(currentProjectName || '');
            refreshProjects();
          }}
        >
          💾 Projects
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={handleLoadDemo}
          title="Load demo data"
        >
          🎮 Demo
        </button>
        <button
          className="btn btn-outline-success"
          onClick={onNewProject}
          title="Clear all and start new"
        >
          ➕ New
        </button>
      </div>

      {/* Project Manager Modal */}
      {showModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">💾 Project Manager</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Save Current Project */}
                <div className="card mb-4">
                  <div className="card-header bg-primary text-white">
                    <strong>Save Current Project</strong>
                  </div>
                  <div className="card-body">
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter project name"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                      />
                      <button className="btn btn-primary" onClick={handleSave}>
                        💾 Save
                      </button>
                    </div>
                    <p className="text-muted small mb-0">
                      Current project: <strong>{currentProjectName || 'Unsaved Project'}</strong>
                    </p>
                  </div>
                </div>

                {/* Load Demo Data */}
                <div className="card mb-4">
                  <div className="card-header bg-success text-white">
                    <strong>🎮 Demo Mode</strong>
                  </div>
                  <div className="card-body">
                    <p className="mb-2">Load a pre-configured e-commerce platform demo with:</p>
                    <ul className="small">
                      <li>16 diverse workloads (VMs, containers, databases, storage)</li>
                      <li>Complex dependency relationships</li>
                      <li>Complete landing zone configuration</li>
                      <li>Multi-cloud cost data</li>
                    </ul>
                    <button className="btn btn-success" onClick={handleLoadDemo}>
                      🎮 Load Demo Data
                    </button>
                  </div>
                </div>

                {/* Import/Export */}
                <div className="card mb-4">
                  <div className="card-header bg-info text-white">
                    <strong>Import / Export</strong>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <label className="btn btn-info w-100 mb-0">
                          📁 Import from File
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      <div className="col-md-6 mb-2">
                        <button
                          className="btn btn-outline-info w-100"
                          onClick={() => {
                            const data = {
                              name: currentProjectName,
                              // Would include actual current state from App
                            };
                            exportProjectJSON(data);
                          }}
                        >
                          📤 Export Current
                        </button>
                      </div>
                    </div>
                    <p className="text-muted small mb-0 mt-2">
                      Import/Export projects as JSON files for backup or sharing
                    </p>
                  </div>
                </div>

                {/* Saved Projects */}
                <div className="card">
                  <div className="card-header bg-dark text-white">
                    <strong>Saved Projects ({Object.keys(projects).length})</strong>
                  </div>
                  <div className="card-body">
                    {Object.keys(projects).length === 0 ? (
                      <p className="text-muted text-center mb-0">No saved projects yet</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Last Modified</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(projects)
                              .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
                              .map((project) => (
                                <tr key={project.id}>
                                  <td>
                                    <strong>{project.name}</strong>
                                    {project.id === 'autosave' && (
                                      <span className="badge bg-warning ms-2">Auto-saved</span>
                                    )}
                                  </td>
                                  <td>
                                    {new Date(project.lastModified).toLocaleString()}
                                  </td>
                                  <td>
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        className="btn btn-outline-primary"
                                        onClick={() => handleLoad(project.id)}
                                        title="Load project"
                                      >
                                        📂 Load
                                      </button>
                                      <button
                                        className="btn btn-outline-info"
                                        onClick={() => handleExport(project.id)}
                                        title="Export project"
                                      >
                                        📤
                                      </button>
                                      <button
                                        className="btn btn-outline-danger"
                                        onClick={() => handleDelete(project.id, project.name)}
                                        title="Delete project"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectManager;
