/**
 * Pipeline End-to-End Integration Test
 * 
 * Tests the complete pipeline flow from file upload to results
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import MigrationPipeline from '../MigrationPipeline.js';

// Mock all external dependencies
jest.mock('../../CurUploadButton.js', () => {
  const React = require('react');
  return function MockCurUploadButton({ onUploadComplete }) {
    return React.createElement('div', { 'data-testid': 'cur-upload-button' },
      React.createElement('button', {
        onClick: () => {
          onUploadComplete?.({
            summary: {
              uniqueWorkloads: 1000,
              totalRawCost: 50000
            },
            files: [
              new File(['test'], 'test.csv', { type: 'text/csv', lastModified: 1234567890 })
            ]
          });
        }
      }, 'Upload Files')
    );
  };
});

jest.mock('../PipelineOrchestrator.js', () => {
  const React = require('react');
  return function MockPipelineOrchestrator({ fileUUID, onComplete, onError }) {
    React.useEffect(() => {
      if (fileUUID) {
        // Simulate pipeline execution
        const timer = setTimeout(() => {
          onComplete?.({
            discovery: {
              workloads: [
                { id: 'w1', name: 'Workload 1', service: 'EC2', region: 'us-east-1' },
                { id: 'w2', name: 'Workload 2', service: 'S3', region: 'us-west-2' }
              ],
              workloadIds: ['w1', 'w2'],
              workloadCount: 2,
              summary: { uniqueWorkloads: 2, totalRegions: 2 }
            },
            assessment: {
              results: [
                { workloadId: 'w1', complexityScore: 5, readinessScore: 75 },
                { workloadId: 'w2', complexityScore: 3, readinessScore: 90 }
              ],
              successfulCount: 2,
              failedCount: 0
            },
            strategy: {
              wavePlan: {
                wave1: ['w2'],
                wave2: ['w1'],
                wave3: []
              }
            },
            cost: {
              costEstimates: [
                { service: 'EC2', awsCost: 1000, gcpCost: 900 }
              ]
            }
          });
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }, [fileUUID, onComplete]);
    
    return React.createElement('div', { 'data-testid': 'pipeline-orchestrator' },
      React.createElement('div', null, `Pipeline Running for ${fileUUID || 'no UUID'}...`)
    );
  };
});

jest.mock('../../../utils/uuidGenerator.js', () => ({
  generateFileUUID: jest.fn(() => Promise.resolve('test-e2e-uuid')),
  generateFilesUUID: jest.fn(() => Promise.resolve('test-e2e-uuid'))
}));

jest.mock('../../../utils/agentCacheService.js', () => ({
  getAgentOutput: jest.fn(() => Promise.resolve(null)),
  saveAgentOutput: jest.fn(() => Promise.resolve(true)),
  getPipelineState: jest.fn(() => Promise.resolve(null)),
  savePipelineState: jest.fn(() => Promise.resolve(true))
}));

jest.mock('../../report/ReportSummaryView.js', () => {
  const React = require('react');
  return function MockReportSummaryView({ workloads, assessmentResults }) {
    return React.createElement('div', { 'data-testid': 'report-summary' },
      React.createElement('h2', null, 'Migration Assessment Results'),
      React.createElement('p', null, `Workloads: ${workloads?.length || 0}`),
      React.createElement('p', null, `Assessments: ${assessmentResults?.results?.length || 0}`)
    );
  };
});

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('Pipeline End-to-End', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full pipeline: upload -> format -> execute -> results', async () => {
    render(<MigrationPipeline />);
    
    // Step 1: File upload
    expect(screen.getByTestId('cur-upload-button')).toBeInTheDocument();
    
    const uploadButton = screen.getByText('Upload Files');
    act(() => {
      uploadButton.click();
    });
    
    // Step 2: Format selection
    await waitFor(() => {
      expect(screen.getByText(/Step 2: Select Output Format/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Find format button by role and text
    const formatButtons = screen.getAllByRole('button');
    const screenButton = formatButtons.find(btn => btn.textContent.includes('Screen'));
    expect(screenButton).toBeDefined();
    act(() => {
      screenButton.click();
    });
    
    // Step 3: Pipeline execution
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-orchestrator')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Step 4: Results display
    await waitFor(() => {
      expect(screen.getByTestId('report-summary')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const resultsHeaders = screen.getAllByText(/Migration Assessment Results/i);
    expect(resultsHeaders.length).toBeGreaterThan(0);
  });

  it('should handle PDF format selection', async () => {
    render(<MigrationPipeline />);
    
    const uploadButton = screen.getByText('Upload Files');
    act(() => {
      uploadButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Step 2: Select Output Format/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Find format button by role and text
    const formatButtons = screen.getAllByRole('button');
    const pdfButton = formatButtons.find(btn => btn.textContent.includes('PDF'));
    expect(pdfButton).toBeDefined();
    act(() => {
      pdfButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-orchestrator')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should generate UUID from uploaded files', async () => {
    const { generateFileUUID } = require('../../../utils/uuidGenerator.js');
    
    render(<MigrationPipeline />);
    
    const uploadButton = screen.getByText('Upload Files');
    act(() => {
      uploadButton.click();
    });
    
    await waitFor(() => {
      expect(generateFileUUID).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
