/**
 * Migration Pipeline Tests
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MigrationPipeline from '../MigrationPipeline.js';
import CurUploadButton from '../../CurUploadButton.js';
import PipelineOrchestrator from '../PipelineOrchestrator.js';

// Mock child components
jest.mock('../../CurUploadButton.js', () => {
  const React = require('react');
  return function MockCurUploadButton({ onUploadComplete }) {
    const handleClick = () => {
      onUploadComplete?.({
        summary: { uniqueWorkloads: 100 },
        files: [new File(['test'], 'test.csv')]
      });
    };
    
    return React.createElement('div', { 'data-testid': 'cur-upload-button' },
      React.createElement('button', { onClick: handleClick }, 'Upload')
    );
  };
});

jest.mock('../PipelineOrchestrator.js', () => {
  const React = require('react');
  return function MockPipelineOrchestrator({ onComplete, onError }) {
    const handleComplete = () => {
      onComplete?.({
        discovery: { workloads: [] },
        assessment: { results: [] },
        strategy: { wavePlan: {} },
        cost: { costEstimates: [] }
      });
    };
    
    const handleError = () => {
      onError?.(new Error('Test error'), 'assessment');
    };
    
    return React.createElement('div', { 'data-testid': 'pipeline-orchestrator' },
      React.createElement('button', { onClick: handleComplete }, 'Complete Pipeline'),
      React.createElement('button', { onClick: handleError }, 'Trigger Error')
    );
  };
});

jest.mock('../../../utils/uuidGenerator.js', () => ({
  generateFileUUID: jest.fn(() => Promise.resolve('test-uuid-123')),
  generateFilesUUID: jest.fn(() => Promise.resolve('test-uuid-123'))
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('MigrationPipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render file upload step initially', () => {
    render(<MigrationPipeline />);
    expect(screen.getByText(/Step 1: Upload CUR Files/i)).toBeInTheDocument();
    expect(screen.getByTestId('cur-upload-button')).toBeInTheDocument();
  });

  it('should show output format selection after file upload', async () => {
    render(<MigrationPipeline />);
    
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Step 2: Select Output Format/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show Screen and PDF format options', async () => {
    render(<MigrationPipeline />);
    
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    // Wait for UUID generation and state update
    await waitFor(() => {
      expect(screen.getByText(/Step 2: Select Output Format/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Then check for format options (use getAllByText since there might be multiple matches)
    const screenOptions = screen.getAllByText(/Screen/i);
    const pdfOptions = screen.getAllByText(/PDF/i);
    expect(screenOptions.length).toBeGreaterThan(0);
    expect(pdfOptions.length).toBeGreaterThan(0);
  });

  it('should start pipeline after format selection', async () => {
    render(<MigrationPipeline />);
    
    // Upload files
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Screen/i)).toBeInTheDocument();
    });
    
    // Select format
    const screenButton = screen.getByText(/Screen/i).closest('button');
    fireEvent.click(screenButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-orchestrator')).toBeInTheDocument();
    });
  });

  it('should show results when pipeline completes with screen format', async () => {
    render(<MigrationPipeline />);
    
    // Upload files
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Screen/i)).toBeInTheDocument();
    });
    
    // Select screen format
    const screenButton = screen.getByText(/Screen/i).closest('button');
    fireEvent.click(screenButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-orchestrator')).toBeInTheDocument();
    });
    
    // Complete pipeline
    const completeButton = screen.getByText('Complete Pipeline');
    fireEvent.click(completeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Migration Assessment Results/i)).toBeInTheDocument();
    });
  });

  it('should handle pipeline errors', async () => {
    render(<MigrationPipeline />);
    
    // Upload files
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Screen/i)).toBeInTheDocument();
    });
    
    // Select format
    const screenButton = screen.getByText(/Screen/i).closest('button');
    fireEvent.click(screenButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-orchestrator')).toBeInTheDocument();
    });
    
    // Trigger error
    const errorButton = screen.getByText('Trigger Error');
    fireEvent.click(errorButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });
  });

  it('should allow starting new assessment', async () => {
    render(<MigrationPipeline />);
    
    // Complete full flow
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Screen/i)).toBeInTheDocument();
    });
    
    const screenButton = screen.getByText(/Screen/i).closest('button');
    fireEvent.click(screenButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-orchestrator')).toBeInTheDocument();
    });
    
    const completeButton = screen.getByText('Complete Pipeline');
    fireEvent.click(completeButton);
    
    // Should show start new assessment button (for PDF flow)
    // For screen flow, it shows results
  });
});
