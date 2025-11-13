/**
 * Migration Pipeline Component
 * 
 * Unified migration flow with:
 * - File upload
 * - Output format selection (Screen/PDF)
 * - Sequential agent pipeline with progress bars
 * - Cached agent outputs
 * - Results display
 */

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import CurUploadButton from '../CurUploadButton.js';
import PipelineOrchestrator from './PipelineOrchestrator.js';
import ReportSummaryView from '../report/ReportSummaryView.js';
import { generateComprehensiveReportPDF } from '../../utils/reportPdfGenerator.js';
import { getAgentOutput } from '../../utils/agentCacheService.js';
import './MigrationPipeline.css';

export default function MigrationPipeline() {
  const [files, setFiles] = useState(null);
  const [outputFormat, setOutputFormat] = useState(null); // 'screen' | 'pdf' | null
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [pipelineOutputs, setPipelineOutputs] = useState(null);
  const [fileUUID, setFileUUID] = useState(null);
  const [error, setError] = useState(null);

  // Generate UUID when files are set
  useEffect(() => {
    if (!files || files.length === 0) {
      setFileUUID(null);
      return;
    }

    const generateUUID = async () => {
      try {
        const { generateFileUUID, generateFilesUUID } = await import('../../utils/uuidGenerator.js');
        const uuid = files.length === 1 
          ? await generateFileUUID(files[0])
          : await generateFilesUUID(files);
        setFileUUID(uuid);
      } catch (err) {
        console.error('Error generating UUID:', err);
        setError(err);
      }
    };

    generateUUID();
  }, [files]);

  const handleFileUpload = async (uploadResult) => {
    // CurUploadButton processes files and saves to repository
    if (uploadResult?.summary && uploadResult?.files) {
      try {
        // Generate UUID from actual files for cache consistency
        const { generateFileUUID, generateFilesUUID } = await import('../../utils/uuidGenerator.js');
        const uuid = uploadResult.files.length === 1 
          ? await generateFileUUID(uploadResult.files[0])
          : await generateFilesUUID(uploadResult.files);
        
        setFileUUID(uuid);
        setFiles(uploadResult.files);
        toast.success('Files processed successfully. Select output format to continue.');
      } catch (err) {
        console.error('Error generating UUID from files:', err);
        // Fallback: use summary-based UUID
        try {
          const summaryKey = `${uploadResult.summary.uniqueWorkloads}_${uploadResult.summary.totalRawCost}`;
          const encoder = new TextEncoder();
          const data = encoder.encode(summaryKey);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          const uuid = `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-${hashHex.substring(12, 16)}-${hashHex.substring(16, 20)}-${hashHex.substring(20, 32)}`;
          setFileUUID(uuid);
          setFiles([{ name: 'processed' }]);
          toast.success('Files processed successfully. Select output format to continue.');
        } catch (fallbackErr) {
          console.error('Error in fallback UUID generation:', fallbackErr);
          setError(fallbackErr);
        }
      }
    }
  };

  const handleOutputFormatSelect = (format) => {
    setOutputFormat(format);
    toast.info(`Output format set to: ${format === 'screen' ? 'Screen' : 'PDF'}`);
  };

  const handlePipelineComplete = async (outputs) => {
    setPipelineComplete(true);
    setPipelineOutputs(outputs);

    // If PDF format was selected, generate PDF immediately
    if (outputFormat === 'pdf') {
      try {
        await generatePDFReport(outputs);
      } catch (err) {
        console.error('Error generating PDF:', err);
        toast.error('Failed to generate PDF report');
      }
    }
  };

  const handlePipelineError = (err, agentId) => {
    console.error(`Pipeline error in ${agentId}:`, err);
    setError(err);
    toast.error(`${agentId} failed: ${err.message}`);
  };

  const generatePDFReport = async (outputs) => {
    if (!outputs || !fileUUID) {
      throw new Error('Missing outputs or file UUID for PDF generation');
    }

    toast.info('Generating PDF report...');

    try {
      // Get all cached outputs
      const discoveryOutput = outputs.discovery || await getAgentOutput(fileUUID, 'discovery');
      const assessmentOutput = outputs.assessment || await getAgentOutput(fileUUID, 'assessment');
      const strategyOutput = outputs.strategy || await getAgentOutput(fileUUID, 'strategy');
      const costOutput = outputs.cost || await getAgentOutput(fileUUID, 'cost');

      // Prepare report data
      const workloads = discoveryOutput?.workloads || [];
      const reportData = await import('../../domain/services/ReportDataAggregator.js').then(m => 
        m.ReportDataAggregator.generateReportSummary(workloads)
      );

      // Generate PDF
      await generateComprehensiveReportPDF(
        reportData,
        costOutput?.costEstimates || null,
        strategyOutput || null,
        assessmentOutput || null,
        {
          projectName: 'AWS to GCP Migration Assessment',
          targetRegion: 'us-central1'
        }
      );

      toast.success('PDF report generated successfully!');
    } catch (err) {
      console.error('PDF generation error:', err);
      throw err;
    }
  };

  // Step 1: File Upload
  if (!files || files.length === 0) {
    return (
      <div className="migration-pipeline">
        <div className="pipeline-step-container">
          <h2>Step 1: Upload CUR Files</h2>
          <p className="step-description">
            Upload your AWS Cost and Usage Report (CUR) files to begin the migration assessment.
          </p>
          <div className="file-upload-section">
            <CurUploadButton onUploadComplete={handleFileUpload} />
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Output Format Selection
  if (!outputFormat) {
    return (
      <div className="migration-pipeline">
        <div className="pipeline-step-container">
          <h2>Step 2: Select Output Format</h2>
          <p className="step-description">
            Choose how you want to view the migration assessment results.
          </p>
          <div className="output-format-selection">
            <button
              className={`format-button ${outputFormat === 'screen' ? 'selected' : ''}`}
              onClick={() => handleOutputFormatSelect('screen')}
            >
              <div className="format-icon">🖥️</div>
              <div className="format-label">Screen</div>
              <div className="format-description">View results in browser</div>
            </button>
            <button
              className={`format-button ${outputFormat === 'pdf' ? 'selected' : ''}`}
              onClick={() => handleOutputFormatSelect('pdf')}
            >
              <div className="format-icon">📄</div>
              <div className="format-label">PDF</div>
              <div className="format-description">Download PDF report</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Pipeline Execution
  if (!pipelineComplete) {
    return (
      <div className="migration-pipeline">
        <PipelineOrchestrator
          files={files}
          fileUUID={fileUUID}
          onComplete={handlePipelineComplete}
          onError={handlePipelineError}
        />
        {error && (
          <div className="alert alert-danger mt-3">
            <strong>Error:</strong> {error.message}
          </div>
        )}
      </div>
    );
  }

  // Step 4: Results Display
  if (outputFormat === 'screen' && pipelineOutputs) {
    const discoveryOutput = pipelineOutputs.discovery;
    const assessmentOutput = pipelineOutputs.assessment;
    const strategyOutput = pipelineOutputs.strategy;

    return (
      <div className="migration-pipeline">
        <div className="pipeline-results">
          <div className="results-header">
            <h2>Migration Assessment Results</h2>
            <button
              className="btn btn-primary"
              onClick={() => generatePDFReport(pipelineOutputs)}
            >
              📄 Generate PDF Report
            </button>
          </div>
          <ReportSummaryView
            workloads={discoveryOutput?.workloads || []}
            assessmentResults={assessmentOutput || null}
            strategyResults={strategyOutput || null}
            uploadSummary={discoveryOutput?.summary || null}
          />
        </div>
      </div>
    );
  }

  // PDF format - show completion message
  return (
    <div className="migration-pipeline">
      <div className="pipeline-step-container">
        <div className="alert alert-success">
          <h3>✅ Pipeline Complete!</h3>
          <p>PDF report has been generated and downloaded.</p>
          <button
            className="btn btn-primary mt-3"
            onClick={() => {
              setPipelineComplete(false);
              setOutputFormat(null);
              setFiles(null);
              setPipelineOutputs(null);
            }}
          >
            Start New Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
