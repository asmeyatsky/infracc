/**
 * Pipeline Integration Tests
 * 
 * Tests the full pipeline flow end-to-end
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import MigrationPipeline from '../MigrationPipeline.js';

// Mock all dependencies
jest.mock('../../CurUploadButton.js', () => {
  const React = require('react');
  return function MockCurUploadButton({ onUploadComplete }) {
    React.useEffect(() => {
      // Auto-trigger upload completion for testing
      setTimeout(() => {
        onUploadComplete?.({
          summary: {
            uniqueWorkloads: 100,
            totalRawCost: 10000
          },
          files: [
            new File(['test'], 'test.csv', { type: 'text/csv' })
          ]
        });
      }, 100);
    }, [onUploadComplete]);
    
    return React.createElement('div', { 'data-testid': 'cur-upload-button' }, 'Upload Button');
  };
});

jest.mock('../PipelineOrchestrator.js', () => {
  const React = require('react');
  return function MockPipelineOrchestrator({ fileUUID, onComplete, onError }) {
    React.useEffect(() => {
      // Auto-complete pipeline for testing
      if (fileUUID) {
        setTimeout(() => {
          onComplete?.({
            discovery: {
              workloads: [
                { id: 'w1', name: 'Workload 1', service: 'EC2' }
              ],
              workloadIds: ['w1'],
              workloadCount: 1,
              summary: { uniqueWorkloads: 1 }
            },
            assessment: {
              results: [
                { workloadId: 'w1', complexityScore: 5, readinessScore: 75 }
              ],
              successfulCount: 1
            },
            strategy: {
              wavePlan: {
                wave1: ['w1'],
                wave2: [],
                wave3: []
              }
            },
            cost: {
              costEstimates: []
            }
          });
        }, 200);
      }
    }, [fileUUID, onComplete]);
    
    return React.createElement('div', { 'data-testid': 'pipeline-orchestrator' },
      React.createElement('div', null, 'Pipeline Running...')
    );
  };
});

jest.mock('../../../utils/uuidGenerator.js', () => ({
  generateFileUUID: jest.fn(() => Promise.resolve('test-uuid-integration')),
  generateFilesUUID: jest.fn(() => Promise.resolve('test-uuid-integration'))
}));

jest.mock('../../../utils/agentCacheService.js', () => ({
  getAgentOutput: jest.fn(() => Promise.resolve(null)),
  saveAgentOutput: jest.fn(() => Promise.resolve(true)),
  getPipelineState: jest.fn(() => Promise.resolve(null)),
  savePipelineState: jest.fn(() => Promise.resolve(true))
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../report/ReportSummaryView.js', () => {
  return function MockReportSummaryView({ workloads, assessmentResults }) {
    return (
      <div data-testid="report-summary">
        <h2>Migration Assessment Results</h2>
        <p>Workloads: {workloads?.length || 0}</p>
        <p>Assessments: {assessmentResults?.results?.length || 0}</p>
      </div>
    );
  };
});

describe('Pipeline Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full pipeline flow: upload -> format -> pipeline -> results', async () => {
    render(<MigrationPipeline />);
    
    // Step 1: File upload
    await waitFor(() => {
      expect(screen.getByTestId('cur-upload-button')).toBeInTheDocument();
    });
    
    // Step 2: Format selection (auto-triggered by mock)
    await waitFor(() => {
      expect(screen.getByText(/Step 2: Select Output Format/i)).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Select screen format
    const screenButton = screen.getByText(/Screen/i).closest('button');
    act(() => {
      screenButton.click();
    });
    
    // Step 3: Pipeline execution
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-orchestrator')).toBeInTheDocument();
    });
    
    // Step 4: Results display
    await waitFor(() => {
      expect(screen.getByTestId('report-summary')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getByText(/Migration Assessment Results/i)).toBeInTheDocument();
  });

  it('should handle PDF format selection', async () => {
    render(<MigrationPipeline />);
    
    // Wait for format selection
    await waitFor(() => {
      expect(screen.getByText(/Step 2: Select Output Format/i)).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Select PDF format - use getAllByText since PDF might appear multiple times
    const pdfButtons = screen.getAllByText(/PDF/i);
    const pdfButton = pdfButtons.find(btn => btn.closest('button')) || pdfButtons[0].closest('button');
    act(() => {
      pdfButton.click();
    });
    
    // Should start pipeline
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-orchestrator')).toBeInTheDocument();
    });
  });

  it('should preserve file UUID across pipeline steps', async () => {
    const { generateFileUUID } = require('../../../utils/uuidGenerator.js');
    
    render(<MigrationPipeline />);
    
    // Wait for upload to complete
    await waitFor(() => {
      expect(generateFileUUID).toHaveBeenCalled();
    }, { timeout: 2000 });
    
    // UUID should be generated once and reused
    expect(generateFileUUID).toHaveBeenCalledTimes(1);
  });
});
