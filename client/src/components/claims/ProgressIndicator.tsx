import React from 'react';
import { Check, X, AlertCircle, HelpCircle, Globe, FileText } from 'lucide-react';
import { Claim } from '../../types';

interface ProgressIndicatorProps {
  claims: Claim[];
  processingTime?: number | null;
}

export function ProgressIndicator({ claims, processingTime }: ProgressIndicatorProps) {
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

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h3 className="headline-3">Verification Progress</h3>
        {processingTime && (
          <p className="processing-time">
            Extracted in {(processingTime / 1000).toFixed(1)}s
          </p>
        )}
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
        <div className="status-item">
          <div className="status-icon ai-verified">
            <Globe size={16} />
          </div>
          <span className="status-label">AI Verified</span>
          <span className="status-count">{statusCounts.aiVerified}</span>
        </div>
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
  );
} 