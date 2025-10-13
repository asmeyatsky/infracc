import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useAppContext, ACTIONS } from './AppContext';

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

describe('AppContext', () => {
  test('should provide initial state', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    expect(result.current.state.projectName).toBe('My Cloud Migration Project');
    expect(result.current.state.activeTab).toBe('tco');
    expect(result.current.state.discoveredWorkloads).toEqual([]);
    expect(result.current.state.timeframe).toBe(36);
  });

  test('should update project name', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.actions.setProjectName('New Project');
    });

    expect(result.current.state.projectName).toBe('New Project');
  });

  test('should update active tab', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.actions.setActiveTab('discovery');
    });

    expect(result.current.state.activeTab).toBe('discovery');
  });

  test('should update workloads', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const testWorkloads = [
      { id: 1, name: 'test-vm', type: 'vm', cpu: 4, memory: 16 }
    ];

    act(() => {
      result.current.actions.setWorkloads(testWorkloads);
    });

    expect(result.current.state.discoveredWorkloads).toEqual(testWorkloads);
    expect(result.current.state.discoveredWorkloads).toHaveLength(1);
  });

  test('should update on-premise costs', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.actions.updateOnPremise({ hardware: 1000, software: 500 });
    });

    expect(result.current.state.onPremise.hardware).toBe(1000);
    expect(result.current.state.onPremise.software).toBe(500);
    expect(result.current.state.onPremise.maintenance).toBe(0);
  });

  test('should update cloud provider costs', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.actions.updateAws({ ec2: 200, s3: 50 });
      result.current.actions.updateAzure({ virtualMachines: 180 });
      result.current.actions.updateGcp({ compute: 150 });
    });

    expect(result.current.state.aws.ec2).toBe(200);
    expect(result.current.state.azure.virtualMachines).toBe(180);
    expect(result.current.state.gcp.compute).toBe(150);
  });

  test('should set TCO and ROI', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const testTco = {
      onPremise: 100000,
      totalGcp: 75000,
      totalAws: 80000,
      totalAzure: 78000,
    };
    const testRoi = { gcp: 33.3, aws: 25, azure: 28 };

    act(() => {
      result.current.actions.setTco(testTco);
      result.current.actions.setRoi(testRoi);
    });

    expect(result.current.state.tco.onPremise).toBe(100000);
    expect(result.current.state.roi.gcp).toBe(33.3);
  });

  test('should load project data', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const projectData = {
      projectName: 'Loaded Project',
      timeframe: 24,
      discoveredWorkloads: [{ id: 1, name: 'loaded-vm' }],
    };

    act(() => {
      result.current.actions.loadProject(projectData);
    });

    expect(result.current.state.projectName).toBe('Loaded Project');
    expect(result.current.state.timeframe).toBe(24);
    expect(result.current.state.discoveredWorkloads).toHaveLength(1);
  });

  test('should throw error when useAppContext used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useAppContext());
    }).toThrow('useAppContext must be used within an AppProvider');

    console.error = originalError;
  });
});
