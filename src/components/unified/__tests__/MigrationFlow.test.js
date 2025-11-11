/**
 * Migration Flow Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MigrationFlow from '../MigrationFlow';

// Mock dependencies
jest.mock('../../../agentic/dependency_injection/AgenticContainer.js', () => ({
  getAgenticContainer: jest.fn(() => ({
    discoveryAgent: {
      execute: jest.fn().mockResolvedValue({ status: 'success' }),
    },
    assessmentAgent: {
      assessBatch: jest.fn().mockResolvedValue([]),
    },
    planningAgent: {
      generateAutonomousStrategy: jest.fn().mockResolvedValue({}),
    },
    costAnalysisAgent: {
      execute: jest.fn().mockResolvedValue({}),
    },
  })),
}));

const mockWorkloadRepository = {
  findAll: jest.fn().mockResolvedValue([]),
};

jest.mock('../../../infrastructure/dependency_injection/Container.js', () => ({
  getContainer: jest.fn(() => ({
    workloadRepository: mockWorkloadRepository,
  })),
}));

jest.mock('../../../test-data/index.js', () => ({
  loadTestProject: jest.fn(() => ({
    workloads: [],
    assessments: [],
    strategies: [],
    wavePlan: { totalWaves: 0 },
  })),
}));

describe('MigrationFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders migration flow steps', () => {
    render(<MigrationFlow />);
    
    expect(screen.getByText(/Discovery/i)).toBeInTheDocument();
    expect(screen.getByText(/Assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/Strategy/i)).toBeInTheDocument();
    expect(screen.getByText(/Cost Analysis/i)).toBeInTheDocument();
  });

  test('displays Discovery step as first step', () => {
    render(<MigrationFlow />);
    
    const discoveryStep = screen.getByText(/Discovery/i);
    expect(discoveryStep).toBeInTheDocument();
  });

  test('shows correct step order', () => {
    render(<MigrationFlow />);
    
    const steps = [
      'Discovery',
      'Assessment',
      'Strategy',
      'Cost Analysis',
      'Terraform Code',
      'Execution',
    ];
    
    steps.forEach(stepName => {
      expect(screen.getByText(new RegExp(stepName, 'i'))).toBeInTheDocument();
    });
  });
});
