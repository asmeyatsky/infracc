/**
 * Advanced Project Management & Collaboration
 * Enables team collaboration and project tracking
 */

import React, { useState, useEffect } from 'react';
import { useTCO } from '../context/TCOContext';
import { toast } from 'react-toastify';
import { Modal, Button } from 'react-bootstrap';

const AdvancedProjectManager = () => {
  const { state, actions } = useTCO();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    owner: 'Current User',
    teamMembers: [],
    deadline: '',
    status: 'active'
  });

  // Load projects from localStorage
  useEffect(() => {
    const savedProjects = localStorage.getItem('tcoProjects');
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);
        if (parsedProjects.length > 0) {
          setActiveProject(parsedProjects[0]);
        }
      } catch (e) {
        console.error('Error loading projects:', e);
      }
    }
  }, []);

  // Save projects to localStorage
  useEffect(() => {
    localStorage.setItem('tcoProjects', JSON.stringify(projects));
  }, [projects]);

  const createProject = () => {
    const newProject = {
      id: Date.now().toString(),
      ...projectForm,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tcoData: { ...state },
      progress: 0,
      milestones: [
        { id: 1, name: 'Discovery', completed: false, date: null },
        { id: 2, name: 'Assessment', completed: false, date: null },
        { id: 3, name: 'Planning', completed: false, date: null },
        { id: 4, name: 'Execution', completed: false, date: null },
        { id: 5, name: 'Optimization', completed: false, date: null }
      ]
    };
    
    setProjects([...projects, newProject]);
    setActiveProject(newProject);
    setShowProjectModal(false);
    setProjectForm({
      name: '',
      description: '',
      owner: 'Current User',
      teamMembers: [],
      deadline: '',
      status: 'active'
    });
    toast.success('Project created successfully!');
  };

  const deleteProject = (projectId) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    if (activeProject?.id === projectId) {
      setActiveProject(updatedProjects[0] || null);
    }
  };

  const shareProject = (projectId) => {
    // In a real app, this would generate a shareable link or invite team members
    toast.info(`Project sharing functionality would be implemented here. Project ID: ${projectId}`);
    setShowShareModal(false);
  };

  const exportProject = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const dataStr = JSON.stringify(project, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `tco-project-${project.name}-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  const importProject = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedProject = JSON.parse(e.target.result);
          setProjects([...projects, { ...importedProject, id: Date.now().toString() }]);
          toast.success('Project imported successfully!');
        } catch (error) {
          toast.error('Error importing project: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const updateProjectProgress = (projectId, milestoneId) => {
    setProjects(projects.map(project => {
      if (project.id === projectId) {
        const updatedMilestones = project.milestones.map(milestone => 
          milestone.id === milestoneId 
            ? { ...milestone, completed: !milestone.completed, date: milestone.completed ? null : new Date().toISOString() }
            : milestone
        );
        
        const completedCount = updatedMilestones.filter(m => m.completed).length;
        const progress = (completedCount / updatedMilestones.length) * 100;
        
        return { ...project, milestones: updatedMilestones, progress };
      }
      return project;
    }));
  };

  return (
    <div className="advanced-project-manager">
      <div className="project-header">
        <h3>Project Management & Collaboration</h3>
        <div className="project-actions">
          <Button 
            variant="primary" 
            size="sm" 
            className="me-2"
            onClick={() => setShowProjectModal(true)}
          >
            🆕 New Project
          </Button>
          <Button 
            variant="outline-primary" 
            size="sm" 
            className="me-2"
            onClick={() => document.getElementById('import-file').click()}
          >
            📁 Import
          </Button>
          <input 
            id="import-file"
            type="file" 
            accept=".json" 
            onChange={importProject}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="projects-list">
        {projects.length === 0 ? (
          <div className="no-projects">
            <p>No projects available. Create your first project to get started.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <div key={project.id} className={`project-card ${activeProject?.id === project.id ? 'active' : ''}`}>
                <div className="project-info">
                  <h4>{project.name}</h4>
                  <p className="project-description">{project.description}</p>
                  <div className="project-meta">
                    <span className="project-owner">Owner: {project.owner}</span>
                    <span className="project-date">{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="project-progress">
                    <div className="progress">
                      <div 
                        className="progress-bar" 
                        role="progressbar" 
                        style={{ width: `${project.progress}%` }}
                        aria-valuenow={project.progress}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        {Math.round(project.progress)}%
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="project-actions">
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="me-1"
                    onClick={() => setActiveProject(project)}
                  >
                    View
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    className="me-1"
                    onClick={() => setShowShareModal(project.id)}
                  >
                    Share
                  </Button>
                  <Button 
                    variant="outline-success" 
                    size="sm" 
                    className="me-1"
                    onClick={() => exportProject(project.id)}
                  >
                    Export
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => deleteProject(project.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestones for Active Project */}
      {activeProject && (
        <div className="active-project-details">
          <h4>{activeProject.name} - Milestones</h4>
          <div className="milestones-list">
            {activeProject.milestones.map(milestone => (
              <div key={milestone.id} className="milestone-item">
                <input
                  type="checkbox"
                  className="milestone-checkbox"
                  checked={milestone.completed}
                  onChange={() => updateProjectProgress(activeProject.id, milestone.id)}
                />
                <div className="milestone-info">
                  <h5>{milestone.name}</h5>
                  {milestone.date && (
                    <p className="milestone-date">Completed: {new Date(milestone.date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Creation Modal */}
      <Modal show={showProjectModal} onHide={() => setShowProjectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create New Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Project Name</label>
            <input
              type="text"
              className="form-control"
              value={projectForm.name}
              onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
              placeholder="Enter project name"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows="3"
              value={projectForm.description}
              onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
              placeholder="Enter project description"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Deadline</label>
            <input
              type="date"
              className="form-control"
              value={projectForm.deadline}
              onChange={(e) => setProjectForm({...projectForm, deadline: e.target.value})}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Team Members</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter team members (comma separated)"
              onChange={(e) => setProjectForm({...projectForm, teamMembers: e.target.value.split(',').map(m => m.trim())})}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProjectModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={createProject}>
            Create Project
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Share Modal */}
      <Modal show={showShareModal} onHide={() => setShowShareModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Share Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Share this project with team members:</p>
          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control"
              value={`https://tcocalculator.com/projects/${showShareModal}`}
              readOnly
            />
            <Button variant="outline-secondary">
              Copy Link
            </Button>
          </div>
          <div className="mb-3">
            <label className="form-label">Or invite by email:</label>
            <input
              type="email"
              className="form-control"
              placeholder="Enter email addresses (comma separated)"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowShareModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => shareProject(showShareModal)}>
            Share Project
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdvancedProjectManager;