import React, { useState } from 'react';
import { Check, X, AlertCircle, HelpCircle, Globe, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Claim } from '../../types';
import { usePDFExport } from '../../hooks/usePDFExport';
import { ExportModal } from '../common/ExportModal';

interface ProgressIndicatorProps {
  claims: Claim[];
  processingTime: number | null;
  isTextCollapsed?: boolean;
  onToggleTextCollapse?: () => void;
}

export function ProgressIndicator({ claims, processingTime, isTextCollapsed, onToggleTextCollapse }: ProgressIndicatorProps) {
  const { generatePDF } = usePDFExport();
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Count claims by status and by verification type
  const statusCounts = claims.reduce(
    (acc, claim) => {
      acc[claim.status]++;
      acc.total++;
      if (claim.verificationState === 'verified-perplexity') {
        acc.aiVerified++;
      }
      if (claim.verificationState === 'verified-document') {
        acc.docVerified++;
      }
      return acc;
    },
    { unverified: 0, true: 0, false: 0, assumption: 0, aiVerified: 0, docVerified: 0, total: 0 }
  );

  // A claim is "verified" if it is true/false/assumption OR AI-verified OR doc-verified
  const verifiedCount = statusCounts.true + statusCounts.false + statusCounts.assumption + statusCounts.aiVerified + statusCounts.docVerified;
  const progressPercentage = claims.length > 0 ? (verifiedCount / claims.length) * 100 : 0;

  const handleExport = async (projectName: string, chapterName: string) => {
    try {
      setIsExporting(true);
      await generatePDF({ projectName, chapterName });
    } catch (error) {
      console.error('Export failed:', error);
      // Could add error toast notification here
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="progress-indicator">
        <div className="progress-header">
          <div className="progress-title-section">
            <div className="title-with-toggle">
              {onToggleTextCollapse && (
                <button
                  onClick={onToggleTextCollapse}
                  className="progress-collapse-btn"
                  aria-label={isTextCollapsed ? 'Expand memo' : 'Collapse memo'}
                  title={isTextCollapsed ? 'Expand memo' : 'Collapse memo'}
                >
                  {isTextCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
              )}
              <h3 className="headline-3">Verification Progress</h3>
            </div>
            {processingTime && (
              <p className="processing-time">
                Extracted in {(processingTime / 1000).toFixed(1)}s
              </p>
            )}
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            className="btn btn-secondary btn-sm btn-icon export-btn"
            title="Export verification report to PDF"
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="progress-text">
            {verifiedCount} of {claims.length} claims verified ({Math.round(progressPercentage)}%)
          </p>
        </div>

        <div className="status-summary">
          <div className="status-item">
            <div className="status-icon true">
              <Check size={16} />
            </div>
            <span className="status-label">True</span>
            <span className="status-count">{statusCounts.true}</span>
          </div>
          <div className="status-item">
            <div className="status-icon false">
              <X size={16} />
            </div>
            <span className="status-label">False</span>
            <span className="status-count">{statusCounts.false}</span>
          </div>
          <div className="status-item">
            <div className="status-icon assumption">
              <AlertCircle size={16} />
            </div>
            <span className="status-label">Assumptions</span>
            <span className="status-count">{statusCounts.assumption}</span>
          </div>
          <div className="status-item">
            <div className="status-icon unverified">
              <HelpCircle size={16} />
            </div>
            <span className="status-label">Unverified</span>
            <span className="status-count">{statusCounts.unverified}</span>
          </div>
          {statusCounts.aiVerified > 0 && (
            <div className="status-item">
              <div className="status-icon ai-verified">
                <Globe size={16} />
              </div>
              <span className="status-label">AI Verified</span>
              <span className="status-count">{statusCounts.aiVerified}</span>
            </div>
          )}
          {statusCounts.docVerified > 0 && (
            <div className="status-item">
              <div className="status-icon doc-verified">
                <FileText size={16} />
              </div>
              <span className="status-label">Doc Verified</span>
              <span className="status-count">{statusCounts.docVerified}</span>
            </div>
          )}
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </>
  );
} 