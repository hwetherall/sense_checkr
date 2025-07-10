import React from 'react';
import { Check, X, AlertCircle, HelpCircle } from 'lucide-react';
import { Claim } from '../../types';

interface ProgressIndicatorProps {
  claims: Claim[];
  processingTime?: number | null;
}

export function ProgressIndicator({ claims, processingTime }: ProgressIndicatorProps) {
  const statusCounts = claims.reduce(
    (acc, claim) => {
      acc[claim.status]++;
      acc.total++;
      return acc;
    },
    { unverified: 0, true: 0, false: 0, assumption: 0, total: 0 }
  );

  const verifiedCount = statusCounts.true + statusCounts.false + statusCounts.assumption;
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
      </div>
    </div>
  );
}

// Add component-specific styles
const styles = `
.progress-indicator {
  background-color: white;
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-xl);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--spacing-lg);
}

.processing-time {
  font-size: 14px;
  color: var(--color-gray-600);
  margin: 0;
}

.progress-bar-container {
  margin-bottom: var(--spacing-lg);
}

.progress-text {
  margin-top: var(--spacing-sm);
  font-size: 14px;
  color: var(--color-gray-600);
  text-align: center;
}

.status-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-md);
}

.status-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: var(--color-gray-100);
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: white;
}

.status-icon.true {
  background-color: var(--color-success);
}

.status-icon.false {
  background-color: var(--color-error);
}

.status-icon.assumption {
  background-color: var(--color-warning);
}

.status-icon.unverified {
  background-color: var(--color-gray-400);
}

.status-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-secondary);
}

.status-count {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-secondary);
}

@media (max-width: 768px) {
  .progress-header {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .status-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}
`;

export const progressIndicatorStyles = styles; 