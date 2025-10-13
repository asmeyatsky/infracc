/**
 * TCO Analysis Context
 * Centralized state management for the TCO calculator and analytics
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  // Input data
  onPremise: {
    hardware: 0,
    software: 0,
    maintenance: 0,
    labor: 0,
    power: 0,
    cooling: 0,
    datacenter: 0,
  },
  cloudSelection: {
    aws: {
      ec2Instances: 0,
      s3: 0,
      rds: 0,
      vpc: 0,
      cloudwatch: 0,
      dataTransferGB: 0
    },
    azure: {
      virtualMachines: 0,
      blobStorage: 0,
      sqlDatabase: 0,
      networking: 0,
      monitoring: 0,
      dataTransferGB: 0
    },
    gcp: {
      compute: 0,
      storage: 0,
      networking: 0,
      database: 0,
      monitoring: 0,
      dataTransferGB: 0
    }
  },
  migration: {
    assessment: 0,
    tools: 0,
    training: 0,
    consulting: 0
  },
  // Options
  timeframe: 36,
  reservedInstanceTerm: 'none',
  savingsPlanTerm: 'none',
  region: 'us-east-1',
  includeDataTransfer: true,
  hybridConnectivity: false,
  complianceFactor: 1.0,
  performanceMultiplier: 1.0,
  workloadCharacteristics: {
    cpuIntensive: false,
    memoryIntensive: false,
    storageIntensive: false,
    longTerm: false,
    size: 'medium'
  },
  riskFactors: {
    downtimeRisk: 0,
    dataLossRisk: 0,
    securityRisk: 0,
    complianceRisk: 0,
    lockInRisk: 0
  },
  // Results
  results: null,
  analytics: null,
  // UI State
  loading: false,
  activeTab: 'calculator',
  // Project state
  projectName: 'My Cloud Migration Project',
  discoveredWorkloads: [],
  landingZoneConfig: null,
  // Report data
  reportData: null
};

// Action types
const ActionTypes = {
  SET_ON_PREMISE: 'SET_ON_PREMISE',
  SET_CLOUD_SELECTION: 'SET_CLOUD_SELECTION',
  SET_MIGRATION: 'SET_MIGRATION',
  SET_OPTIONS: 'SET_OPTIONS',
  SET_WORKLOAD_CHARACTERISTICS: 'SET_WORKLOAD_CHARACTERISTICS',
  SET_RISK_FACTORS: 'SET_RISK_FACTORS',
  SET_RESULTS: 'SET_RESULTS',
  SET_ANALYTICS: 'SET_ANALYTICS',
  SET_LOADING: 'SET_LOADING',
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  SET_PROJECT_NAME: 'SET_PROJECT_NAME',
  SET_DISCOVERED_WORKLOADS: 'SET_DISCOVERED_WORKLOADS',
  SET_LANDING_ZONE_CONFIG: 'SET_LANDING_ZONE_CONFIG',
  SET_REPORT_DATA: 'SET_REPORT_DATA',
  UPDATE_INPUT: 'UPDATE_INPUT',
  RESET_STATE: 'RESET_STATE',
  SET_ENTIRE_STATE: 'SET_ENTIRE_STATE'
};

// Reducer
function tcoReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_ON_PREMISE:
      return {
        ...state,
        onPremise: { ...state.onPremise, ...action.payload }
      };

    case ActionTypes.SET_CLOUD_SELECTION:
      return {
        ...state,
        cloudSelection: {
          ...state.cloudSelection,
          [action.provider]: {
            ...state.cloudSelection[action.provider],
            ...action.payload
          }
        }
      };

    case ActionTypes.SET_MIGRATION:
      return {
        ...state,
        migration: { ...state.migration, ...action.payload }
      };

    case ActionTypes.SET_OPTIONS:
      return {
        ...state,
        ...action.payload
      };

    case ActionTypes.SET_WORKLOAD_CHARACTERISTICS:
      return {
        ...state,
        workloadCharacteristics: { ...state.workloadCharacteristics, ...action.payload }
      };

    case ActionTypes.SET_RISK_FACTORS:
      return {
        ...state,
        riskFactors: { ...state.riskFactors, ...action.payload }
      };

    case ActionTypes.SET_RESULTS:
      return {
        ...state,
        results: action.payload
      };

    case ActionTypes.SET_ANALYTICS:
      return {
        ...state,
        analytics: action.payload
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case ActionTypes.SET_ACTIVE_TAB:
      return {
        ...state,
        activeTab: action.payload
      };

    case ActionTypes.SET_PROJECT_NAME:
      return {
        ...state,
        projectName: action.payload
      };

    case ActionTypes.SET_DISCOVERED_WORKLOADS:
      return {
        ...state,
        discoveredWorkloads: action.payload
      };

    case ActionTypes.SET_LANDING_ZONE_CONFIG:
      return {
        ...state,
        landingZoneConfig: action.payload
      };

    case ActionTypes.SET_REPORT_DATA:
      return {
        ...state,
        reportData: action.payload
      };

    case ActionTypes.UPDATE_INPUT:
      const { category, field, value } = action.payload;
      if (category === 'onPremise') {
        return {
          ...state,
          onPremise: { ...state.onPremise, [field]: parseFloat(value) || 0 }
        };
      } else if (category === 'cloudSelection') {
        const [provider, service] = field.split('.');
        return {
          ...state,
          cloudSelection: {
            ...state.cloudSelection,
            [provider]: {
              ...state.cloudSelection[provider],
              [service]: parseFloat(value) || 0
            }
          }
        };
      } else if (category === 'migration') {
        return {
          ...state,
          migration: { ...state.migration, [field]: parseFloat(value) || 0 }
        };
      } else {
        return {
          ...state,
          [category]: { ...state[category], [field]: value }
        };
      }

    case ActionTypes.RESET_STATE:
      return initialState;

    case ActionTypes.SET_ENTIRE_STATE:
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// Context
const TCOContext = createContext();

// Provider component
export const TCOProvider = ({ children }) => {
  const [state, dispatch] = useReducer(tcoReducer, initialState);

  // Auto-save functionality
  useEffect(() => {
    const saveState = {
      projectName: state.projectName,
      discoveredWorkloads: state.discoveredWorkloads,
      landingZoneConfig: state.landingZoneConfig,
      onPremise: state.onPremise,
      cloudSelection: state.cloudSelection,
      migration: state.migration,
      timeframe: state.timeframe,
    };
    
    localStorage.setItem('tcoCalculatorState', JSON.stringify(saveState));
  }, [
    state.projectName, 
    state.discoveredWorkloads, 
    state.landingZoneConfig,
    state.onPremise,
    state.cloudSelection,
    state.migration,
    state.timeframe
  ]);

  // Load saved state on initialization
  useEffect(() => {
    const savedState = localStorage.getItem('tcoCalculatorState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        dispatch({ 
          type: ActionTypes.SET_ENTIRE_STATE, 
          payload: parsedState 
        });
      } catch (e) {
        console.error('Error loading saved state:', e);
      }
    }
  }, []);

  // Actions
  const actions = {
    setOnPremise: (data) => dispatch({ type: ActionTypes.SET_ON_PREMISE, payload: data }),
    setCloudSelection: (provider, data) => dispatch({ type: ActionTypes.SET_CLOUD_SELECTION, provider, payload: data }),
    setMigration: (data) => dispatch({ type: ActionTypes.SET_MIGRATION, payload: data }),
    setOptions: (data) => dispatch({ type: ActionTypes.SET_OPTIONS, payload: data }),
    setWorkloadCharacteristics: (data) => dispatch({ type: ActionTypes.SET_WORKLOAD_CHARACTERISTICS, payload: data }),
    setRiskFactors: (data) => dispatch({ type: ActionTypes.SET_RISK_FACTORS, payload: data }),
    setResults: (data) => dispatch({ type: ActionTypes.SET_RESULTS, payload: data }),
    setAnalytics: (data) => dispatch({ type: ActionTypes.SET_ANALYTICS, payload: data }),
    setLoading: (isLoading) => dispatch({ type: ActionTypes.SET_LOADING, payload: isLoading }),
    setActiveTab: (tab) => dispatch({ type: ActionTypes.SET_ACTIVE_TAB, payload: tab }),
    setProjectName: (name) => dispatch({ type: ActionTypes.SET_PROJECT_NAME, payload: name }),
    setDiscoveredWorkloads: (workloads) => dispatch({ type: ActionTypes.SET_DISCOVERED_WORKLOADS, payload: workloads }),
    setLandingZoneConfig: (config) => dispatch({ type: ActionTypes.SET_LANDING_ZONE_CONFIG, payload: config }),
    setReportData: (data) => dispatch({ type: ActionTypes.SET_REPORT_DATA, payload: data }),
    updateInput: (category, field, value) => dispatch({ 
      type: ActionTypes.UPDATE_INPUT, 
      payload: { category, field, value } 
    }),
    resetState: () => dispatch({ type: ActionTypes.RESET_STATE }),
    setEntireState: (data) => dispatch({ type: ActionTypes.SET_ENTIRE_STATE, payload: data })
  };

  return (
    <TCOContext.Provider value={{ state, actions }}>
      {children}
    </TCOContext.Provider>
  );
};

// Custom hook
export const useTCO = () => {
  const context = useContext(TCOContext);
  if (!context) {
    throw new Error('useTCO must be used within a TCOProvider');
  }
  return context;
};