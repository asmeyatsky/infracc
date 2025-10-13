import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { autoSave } from '../utils/storage';

// Initial state
const initialState = {
  projectName: 'My Cloud Migration Project',
  activeTab: 'tco',
  discoveredWorkloads: [],
  landingZoneConfig: null,
  onPremise: {
    hardware: 0,
    software: 0,
    maintenance: 0,
    labor: 0,
    power: 0,
    cooling: 0,
    datacenter: 0,
  },
  aws: { ec2: 0, s3: 0, rds: 0, vpc: 0, cloudwatch: 0 },
  azure: { virtualMachines: 0, blobStorage: 0, sqlDatabase: 0, networking: 0, monitoring: 0 },
  gcp: { compute: 0, storage: 0, networking: 0, database: 0, monitoring: 0 },
  migration: { assessment: 0, tools: 0, training: 0, consulting: 0 },
  timeframe: 36,
  tco: {
    onPremise: 0,
    aws: 0,
    azure: 0,
    gcp: 0,
    migrationCost: 0,
    totalAws: 0,
    totalAzure: 0,
    totalGcp: 0,
  },
  roi: { aws: 0, azure: 0, gcp: 0 },
};

// Action types
export const ACTIONS = {
  SET_PROJECT_NAME: 'SET_PROJECT_NAME',
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  SET_WORKLOADS: 'SET_WORKLOADS',
  SET_LANDING_ZONE: 'SET_LANDING_ZONE',
  UPDATE_ON_PREMISE: 'UPDATE_ON_PREMISE',
  UPDATE_AWS: 'UPDATE_AWS',
  UPDATE_AZURE: 'UPDATE_AZURE',
  UPDATE_GCP: 'UPDATE_GCP',
  UPDATE_MIGRATION: 'UPDATE_MIGRATION',
  SET_TIMEFRAME: 'SET_TIMEFRAME',
  SET_TCO: 'SET_TCO',
  SET_ROI: 'SET_ROI',
  LOAD_PROJECT: 'LOAD_PROJECT',
  RESET_PROJECT: 'RESET_PROJECT',
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_PROJECT_NAME:
      return { ...state, projectName: action.payload };

    case ACTIONS.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload };

    case ACTIONS.SET_WORKLOADS:
      return { ...state, discoveredWorkloads: action.payload };

    case ACTIONS.SET_LANDING_ZONE:
      return { ...state, landingZoneConfig: action.payload };

    case ACTIONS.UPDATE_ON_PREMISE:
      return {
        ...state,
        onPremise: { ...state.onPremise, ...action.payload }
      };

    case ACTIONS.UPDATE_AWS:
      return {
        ...state,
        aws: { ...state.aws, ...action.payload }
      };

    case ACTIONS.UPDATE_AZURE:
      return {
        ...state,
        azure: { ...state.azure, ...action.payload }
      };

    case ACTIONS.UPDATE_GCP:
      return {
        ...state,
        gcp: { ...state.gcp, ...action.payload }
      };

    case ACTIONS.UPDATE_MIGRATION:
      return {
        ...state,
        migration: { ...state.migration, ...action.payload }
      };

    case ACTIONS.SET_TIMEFRAME:
      return { ...state, timeframe: action.payload };

    case ACTIONS.SET_TCO:
      return { ...state, tco: action.payload };

    case ACTIONS.SET_ROI:
      return { ...state, roi: action.payload };

    case ACTIONS.LOAD_PROJECT:
      return { ...state, ...action.payload };

    case ACTIONS.RESET_PROJECT:
      return { ...initialState, activeTab: 'discovery' };

    default:
      return state;
  }
};

// Context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Auto-save effect
  React.useEffect(() => {
    const projectData = {
      name: state.projectName,
      workloads: state.discoveredWorkloads,
      landingZoneConfig: state.landingZoneConfig,
      onPremise: state.onPremise,
      aws: state.aws,
      azure: state.azure,
      gcp: state.gcp,
      migration: state.migration,
      timeframe: state.timeframe,
    };
    autoSave(projectData);
  }, [
    state.projectName,
    state.discoveredWorkloads,
    state.landingZoneConfig,
    state.onPremise,
    state.aws,
    state.azure,
    state.gcp,
    state.migration,
    state.timeframe,
  ]);

  // Action creators (memoized to prevent unnecessary re-renders)
  const actions = {
    setProjectName: useCallback((name) => {
      dispatch({ type: ACTIONS.SET_PROJECT_NAME, payload: name });
    }, []),

    setActiveTab: useCallback((tab) => {
      dispatch({ type: ACTIONS.SET_ACTIVE_TAB, payload: tab });
    }, []),

    setWorkloads: useCallback((workloads) => {
      dispatch({ type: ACTIONS.SET_WORKLOADS, payload: workloads });
    }, []),

    setLandingZone: useCallback((config) => {
      dispatch({ type: ACTIONS.SET_LANDING_ZONE, payload: config });
    }, []),

    updateOnPremise: useCallback((updates) => {
      dispatch({ type: ACTIONS.UPDATE_ON_PREMISE, payload: updates });
    }, []),

    updateAws: useCallback((updates) => {
      dispatch({ type: ACTIONS.UPDATE_AWS, payload: updates });
    }, []),

    updateAzure: useCallback((updates) => {
      dispatch({ type: ACTIONS.UPDATE_AZURE, payload: updates });
    }, []),

    updateGcp: useCallback((updates) => {
      dispatch({ type: ACTIONS.UPDATE_GCP, payload: updates });
    }, []),

    updateMigration: useCallback((updates) => {
      dispatch({ type: ACTIONS.UPDATE_MIGRATION, payload: updates });
    }, []),

    setTimeframe: useCallback((timeframe) => {
      dispatch({ type: ACTIONS.SET_TIMEFRAME, payload: timeframe });
    }, []),

    setTco: useCallback((tco) => {
      dispatch({ type: ACTIONS.SET_TCO, payload: tco });
    }, []),

    setRoi: useCallback((roi) => {
      dispatch({ type: ACTIONS.SET_ROI, payload: roi });
    }, []),

    loadProject: useCallback((projectData) => {
      dispatch({ type: ACTIONS.LOAD_PROJECT, payload: projectData });
    }, []),

    resetProject: useCallback(() => {
      if (window.confirm('Clear all data and start a new project?')) {
        dispatch({ type: ACTIONS.RESET_PROJECT });
      }
    }, []),
  };

  const value = { state, actions };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook for using the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
