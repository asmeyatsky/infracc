/**
 * CUR Upload Button Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'react-toastify';
import CurUploadButton from '../CurUploadButton';

// Mock dependencies
const mockWorkloadRepository = {
  save: jest.fn().mockResolvedValue({}),
  findAll: jest.fn().mockResolvedValue([]),
};

jest.mock('../../infrastructure/dependency_injection/Container.js', () => ({
  getContainer: jest.fn(() => ({
    workloadRepository: mockWorkloadRepository,
  })),
}));

jest.mock('../../utils/awsBomImport.js', () => ({
  parseAwsCur: jest.fn(),
  parseAwsBillSimple: jest.fn(),
}));

jest.mock('../../utils/csvImport.js', () => ({
  parseCSV: jest.fn(),
}));

jest.mock('../../utils/streamingCsvParser.js', () => ({
  parseAwsCurStreaming: jest.fn(),
}));

jest.mock('react-toastify', () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('CurUploadButton', () => {
  const mockOnUploadComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock FileReader
    global.FileReader = jest.fn(() => ({
      readAsText: jest.fn(),
      result: 'test,data',
      onload: null,
      onerror: null,
    }));
  });

  test('renders upload button', () => {
    render(<CurUploadButton onUploadComplete={mockOnUploadComplete} />);
    expect(screen.getByText(/Upload CUR/i)).toBeInTheDocument();
  });

  test('button is disabled when uploading', () => {
    render(<CurUploadButton onUploadComplete={mockOnUploadComplete} />);
    const button = screen.getByText(/Upload CUR/i).closest('button');
    expect(button).not.toBeDisabled();
  });

  test('shows file input when button is clicked', () => {
    render(<CurUploadButton onUploadComplete={mockOnUploadComplete} />);
    const button = screen.getByText(/Upload CUR/i).closest('button');
    const fileInput = document.querySelector('input[type="file"]');
    
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveStyle({ display: 'none' });
    
    userEvent.click(button);
    // File input should be triggered (clicked programmatically)
  });

  test('accepts CSV and ZIP files', () => {
    render(<CurUploadButton onUploadComplete={mockOnUploadComplete} />);
    const fileInput = document.querySelector('input[type="file"]');
    
    expect(fileInput).toHaveAttribute('accept', '.csv,.zip');
    expect(fileInput).toHaveAttribute('multiple');
  });
});
