import React, { Suspense } from 'react';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingFallback from './components/LoadingFallback';
import AppContent from './components/AppContent';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  ArcElement,
  RadialLinearScale,
  LineElement,
} from 'chart.js';

// Register Chart.js components globally
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  ArcElement,
  RadialLinearScale,
  LineElement
);

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Suspense fallback={<LoadingFallback message="Loading application..." />}>
          <AppContent />
        </Suspense>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
