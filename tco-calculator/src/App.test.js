import { render, screen } from '@testing-library/react';
import App from './App';

test('renders application title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Google Cloud Infrastructure Modernization Accelerator/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders navigation tabs', () => {
  render(<App />);
  expect(screen.getByText(/Discovery/i)).toBeInTheDocument();
  expect(screen.getByText(/Strategy/i)).toBeInTheDocument();
  expect(screen.getByText(/Landing Zone/i)).toBeInTheDocument();
  expect(screen.getByText(/Terraform/i)).toBeInTheDocument();
  expect(screen.getByText(/FinOps/i)).toBeInTheDocument();
  expect(screen.getByText(/TCO Calculator/i)).toBeInTheDocument();
});

test('renders theme toggle button', () => {
  render(<App />);
  const themeButtons = screen.getAllByRole('button');
  const themeToggle = themeButtons.find(btn => btn.textContent.includes('Light') || btn.textContent.includes('Dark'));
  expect(themeToggle).toBeTruthy();
});

test('renders start tour button', () => {
  render(<App />);
  const tourButton = screen.getByText(/Start Tour/i);
  expect(tourButton).toBeInTheDocument();
});
