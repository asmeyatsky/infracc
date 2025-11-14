import { render, screen } from '@testing-library/react';
import App from './App';

test('renders application title', () => {
  render(<App />);
  const titleElement = screen.getByText(/AWS to GCP Migration Tool/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders navigation tabs', () => {
  render(<App />);
  // Use getAllByText for text that appears multiple times
  expect(screen.getAllByText(/Discovery/i)[0]).toBeInTheDocument();
  expect(screen.getAllByText(/Strategy/i)[0]).toBeInTheDocument();
  expect(screen.getByText(/Landing Zone/i)).toBeInTheDocument();
  expect(screen.getByText(/Terraform/i)).toBeInTheDocument();
  expect(screen.getByText(/FinOps/i)).toBeInTheDocument();
  expect(screen.getAllByText(/TCO Calculator/i)[0]).toBeInTheDocument();
});

test('renders theme toggle button', () => {
  render(<App />);
  const themeButtons = screen.getAllByRole('button');
  const themeToggle = themeButtons.find(btn => btn.textContent.includes('Light') || btn.textContent.includes('Dark'));
  expect(themeToggle).toBeTruthy();
});

test('renders start tour button', () => {
  render(<App />);
  const tourButton = screen.getByText(/Tour/i);
  expect(tourButton).toBeInTheDocument();
});
