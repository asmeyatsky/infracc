import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useTcoCalculation } from '../hooks/useTcoCalculation';
import { useExport } from '../hooks/useExport';
import TcoInputSection from './TcoInputSection';
import TcoResults from './TcoResults';

const TcoCalculatorContent = () => {
  const { state } = useAppContext();
  const { calculateTco } = useTcoCalculation();
  const { exportToJSON, exportToPDF } = useExport();

  const hasResults = state.tco.onPremise > 0 || state.tco.totalGcp > 0 || state.tco.totalAws > 0 || state.tco.totalAzure > 0;

  return (
    <>
      <TcoInputSection />

      {/* Calculate Button */}
      <div className="row mb-4">
        <div className="col-12 text-center">
          <button className="btn btn-success btn-lg px-5" onClick={calculateTco}>
            Calculate TCO & ROI
          </button>
        </div>
      </div>

      {/* Results Section */}
      {hasResults && (
        <TcoResults
          tco={state.tco}
          roi={state.roi}
          timeframe={state.timeframe}
          onExportJSON={exportToJSON}
          onExportPDF={exportToPDF}
        />
      )}
    </>
  );
};

export default TcoCalculatorContent;
