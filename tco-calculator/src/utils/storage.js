// Local Storage Management Utilities

const STORAGE_KEY = 'gcp-modernization-accelerator';
const PROJECTS_KEY = 'gcp-ma-projects';

// Save current state to localStorage
export const saveProject = (projectData) => {
  try {
    const projects = loadProjects();
    const projectId = projectData.id || Date.now().toString();
    const timestamp = new Date().toISOString();

    const project = {
      id: projectId,
      name: projectData.name || `Project ${projectId}`,
      lastModified: timestamp,
      created: projectData.created || timestamp,
      data: projectData,
    };

    projects[projectId] = project;
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

    return projectId;
  } catch (error) {
    console.error('Error saving project:', error);
    return null;
  }
};

// Load all projects
export const loadProjects = () => {
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading projects:', error);
    return {};
  }
};

// Load specific project
export const loadProject = (projectId) => {
  try {
    const projects = loadProjects();
    return projects[projectId] || null;
  } catch (error) {
    console.error('Error loading project:', error);
    return null;
  }
};

// Delete project
export const deleteProject = (projectId) => {
  try {
    const projects = loadProjects();
    delete projects[projectId];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
};

// Auto-save current state (debounced)
let autoSaveTimeout;
export const autoSave = (projectData) => {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    const autoSaveId = 'autosave';
    saveProject({ ...projectData, id: autoSaveId, name: 'Auto-saved Project' });
  }, 2000); // Save after 2 seconds of inactivity
};

// Export project as JSON
export const exportProjectJSON = (projectData) => {
  const dataStr = JSON.stringify(projectData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gcp-project-${projectData.name || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Import project from JSON file
export const importProjectJSON = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target.result);
        resolve(projectData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Clear all data
export const clearAllData = () => {
  try {
    localStorage.removeItem(PROJECTS_KEY);
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};
