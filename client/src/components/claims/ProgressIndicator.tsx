import React, { useState } from 'react';
import { Check, X, AlertCircle, HelpCircle, FileText, Download } from 'lucide-react';
import { Claim } from '../../types';
import { usePDFExport } from '../../hooks/usePDFExport';
import { ExportModal } from '../common/ExportModal';
import { useApp } from '../../contexts/AppContext';

interface ProgressIndicatorProps {
  claims: Claim[];
  processingTime: number | null;
}

export function ProgressIndicator({ claims, processingTime }: ProgressIndicatorProps) {
  const { generatePDF } = usePDFExport();
  const { state } = useApp();
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Count claims by actual verification outcomes
  const verificationCounts = claims.reduce(
    (acc, claim) => {
      acc.total++;
      
      // Check for document verification results first (takes precedence)
      const documentResult = state.documentVerificationResults[claim.id];
      if (documentResult) {
        switch (documentResult.status) {
          case 'found':
            acc.verifiedTrue++;
            break;
          case 'contradicted':
            acc.verifiedFalse++;
            break;
          case 'not_found':
            acc.notFound++;
            break;
        }
        return acc;
      }
      
      // Check for Perplexity verification results
      const perplexityResult = state.perplexityResults[claim.id];
      if (perplexityResult) {
        switch (perplexityResult.status) {
          case 'verified_true':
            acc.verifiedTrue++;
            break;
          case 'verified_false':
            acc.verifiedFalse++;
            break;
          case 'partially_true':
            acc.partiallyTrue++;
            break;
          case 'needs_context':
            acc.needsContext++;
            break;
          case 'cannot_find_answer':
            acc.notFound++;
            break;
        }
        return acc;
      }
      
      // Check manual verification status
      switch (claim.status) {
        case 'true':
          acc.verifiedTrue++;
          break;
        case 'false':
          acc.verifiedFalse++;
          break;
        case 'assumption':
          acc.assumptions++;
          break;
        case 'unverified':
        default:
          acc.unverified++;
          break;
      }
      
      return acc;
    },
    { 
      verifiedTrue: 0, 
      verifiedFalse: 0, 
      partiallyTrue: 0, 
      needsContext: 0, 
      notFound: 0, 
      assumptions: 0, 
      unverified: 0, 
      total: 0 
    }
  );

  // A claim is "verified" if it has any verification result
  const verifiedCount = verificationCounts.verifiedTrue + verificationCounts.verifiedFalse + 
                       verificationCounts.partiallyTrue + verificationCounts.needsContext + 
                       verificationCounts.notFound + verificationCounts.assumptions;
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
            <h3 className="headline-3">Verification Progress</h3>
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
            <div className="status-icon verified-true">
              <Check size={16} />
            </div>
            <span className="status-label">Verified True</span>
            <span className="status-count">{verificationCounts.verifiedTrue}</span>
          </div>
          <div className="status-item">
            <div className="status-icon verified-false">
              <X size={16} />
            </div>
            <span className="status-label">Verified False</span>
            <span className="status-count">{verificationCounts.verifiedFalse}</span>
          </div>
          {verificationCounts.partiallyTrue > 0 && (
            <div className="status-item">
              <div className="status-icon partially-true">
                <AlertCircle size={16} />
              </div>
              <span className="status-label">Partially True</span>
              <span className="status-count">{verificationCounts.partiallyTrue}</span>
            </div>
          )}
          {verificationCounts.needsContext > 0 && (
            <div className="status-item">
              <div className="status-icon needs-context">
                <HelpCircle size={16} />
              </div>
              <span className="status-label">Needs Context</span>
              <span className="status-count">{verificationCounts.needsContext}</span>
            </div>
          )}
          {verificationCounts.notFound > 0 && (
            <div className="status-item">
              <div className="status-icon not-found">
                <FileText size={16} />
              </div>
              <span className="status-label">Not Found</span>
              <span className="status-count">{verificationCounts.notFound}</span>
            </div>
          )}
          {verificationCounts.assumptions > 0 && (
            <div className="status-item">
              <div className="status-icon assumptions">
                <AlertCircle size={16} />
              </div>
              <span className="status-label">Assumptions</span>
              <span className="status-count">{verificationCounts.assumptions}</span>
            </div>
          )}
          {verificationCounts.unverified > 0 && (
            <div className="status-item">
              <div className="status-icon unverified">
                <HelpCircle size={16} />
              </div>
              <span className="status-label">Unverified</span>
              <span className="status-count">{verificationCounts.unverified}</span>
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