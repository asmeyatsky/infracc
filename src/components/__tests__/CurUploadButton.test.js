/**
 * CUR Upload Button Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'react-toastify';
import CurUploadButton, { FileUploadManager } from '../CurUploadButton';

// Mock dependencies
jest.mock('../CurUploadButton', () => {
    const original = jest.requireActual('../CurUploadButton');
    return {
        ...original,
        FileUploadManager: jest.fn()
    }
});


const mockWorkloadRepository = {
  save: jest.fn().mockResolvedValue({}),
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
};

jest.mock('../../infrastructure/dependency_injection/Container.js', () => ({
  getContainer: () => ({
    workloadRepository: mockWorkloadRepository,
  }),
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
  const mockProcessFiles = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    FileUploadManager.mockImplementation(() => {
        return {
          processFiles: mockProcessFiles,
        };
      });
  });

  test('renders upload button', () => {
    render(<CurUploadButton onUploadComplete={mockOnUploadComplete} />);
    expect(screen.getByText(/Upload CUR/i)).toBeInTheDocument();
  });

  test('clicking the button triggers file input', () => {
    const { container } = render(<CurUploadButton onUploadComplete={mockOnUploadComplete} />);
    const button = screen.getByText(/Upload CUR/i);
    const input = container.querySelector('input[type="file"]');
    const inputClickSpy = jest.spyOn(input, 'click');
    userEvent.click(button);
    expect(inputClickSpy).toHaveBeenCalled();
  });

  test('calls FileUploadManager on file upload', async () => {
    mockProcessFiles.mockResolvedValue({ totalWorkloadsSaved: 1, uniqueWorkloads: 1 });
    const { container } = render(<CurUploadButton onUploadComplete={mockOnUploadComplete} />);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['a,b,c'], 'test.csv', { type: 'text/csv' });

    await waitFor(() => {
        fireEvent.change(input, { target: { files: [file] } });
    });

    expect(mockProcessFiles).toHaveBeenCalled();
    expect(mockOnUploadComplete).toHaveBeenCalledWith({
        count: 1,
        summary: {
            uniqueWorkloads: 1,
            workloadsSaved: 1,
        },
        files: [file]
    });
  });
});
