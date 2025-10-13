import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// User roles
export const ROLES = {
  EXECUTIVE: 'executive',
  IT_MANAGER: 'it_manager',
  TECHNICAL_ARCHITECT: 'technical_architect',
};

// Role permissions
export const PERMISSIONS = {
  [ROLES.EXECUTIVE]: {
    viewDashboard: true,
    viewFinancials: true,
    approveMigrationPlan: true,
    viewDetailedTech: false,
    editConfiguration: false,
    viewROI: true,
    viewHighLevelMetrics: true,
  },
  [ROLES.IT_MANAGER]: {
    viewDashboard: true,
    viewFinancials: true,
    approveMigrationPlan: true,
    viewDetailedTech: true,
    editConfiguration: false,
    approveTasks: true,
    viewProjectTimeline: true,
    manageResources: true,
  },
  [ROLES.TECHNICAL_ARCHITECT]: {
    viewDashboard: true,
    viewFinancials: false,
    approveMigrationPlan: false,
    viewDetailedTech: true,
    editConfiguration: true,
    runDiscovery: true,
    modifyCode: true,
    viewTechnicalDetails: true,
    interactWithAgents: true,
  },
};

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  role: null,
  permissions: {},
};

// Context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    // Check localStorage for persisted auth
    const stored = localStorage.getItem('authState');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return initialState;
      }
    }
    return initialState;
  });

  // Persist auth state
  useEffect(() => {
    if (authState.isAuthenticated) {
      localStorage.setItem('authState', JSON.stringify(authState));
    } else {
      localStorage.removeItem('authState');
    }
  }, [authState]);

  // Login function
  const login = useCallback((email, password, role) => {
    // In production, this would call an API
    // For PoC, we'll simulate authentication

    const mockUsers = {
      'ceo@company.com': { name: 'Sarah Johnson', role: ROLES.EXECUTIVE, title: 'Chief Executive Officer' },
      'itmanager@company.com': { name: 'Michael Chen', role: ROLES.IT_MANAGER, title: 'IT Manager' },
      'architect@company.com': { name: 'David Rodriguez', role: ROLES.TECHNICAL_ARCHITECT, title: 'Lead Cloud Architect' },
    };

    const user = mockUsers[email];

    if (user) {
      setAuthState({
        user: {
          email,
          name: user.name,
          title: user.title,
        },
        isAuthenticated: true,
        role: user.role,
        permissions: PERMISSIONS[user.role],
      });
      return { success: true };
    }

    return { success: false, error: 'Invalid credentials' };
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setAuthState(initialState);
    localStorage.removeItem('authState');
  }, []);

  // Check permission
  const hasPermission = useCallback((permission) => {
    return authState.permissions[permission] === true;
  }, [authState.permissions]);

  // Get role display name
  const getRoleDisplayName = useCallback((role) => {
    const roleNames = {
      [ROLES.EXECUTIVE]: 'Executive',
      [ROLES.IT_MANAGER]: 'IT Manager',
      [ROLES.TECHNICAL_ARCHITECT]: 'Technical Architect',
    };
    return roleNames[role] || 'User';
  }, []);

  const value = {
    ...authState,
    login,
    logout,
    hasPermission,
    getRoleDisplayName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
