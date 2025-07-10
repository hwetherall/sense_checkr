import React from 'react';
import { Check, X, AlertCircle, HelpCircle } from 'lucide-react';
import { Claim } from '../../types';
import { useClaimExtraction } from '../../hooks/useClaimExtraction';

interface ClaimCardProps {
  claim: Claim;
  onHover?: (claimId: string | null) => void;
}

export function ClaimCard({ claim, onHover }: ClaimCardProps) {
  const { updateClaimStatus } = useClaimExtraction();

  const handleStatusChange = (status: Claim['status']) => {
    updateClaimStatus(claim.id, status);
  };

  const getStatusIcon = () => {
    switch (claim.status) {
      case 'true':
        return <Check size={16} />;
      case 'false':
        return <X size={16} />;
      case 'assumption':
        return <AlertCircle size={16} />;
      default:
        return <HelpCircle size={16} />;
    }
  };

  const getConfidencePercentage = () => {
    return (claim.confidence / 10) * 100;
  };

  return (
    <div
      className={`claim-card status-${claim.status} fade-in`}
      onMouseEnter={() => onHover?.(claim.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="claim-header">
        <div className="claim-badges">
          <span className={`category-badge ${claim.category}`}>
            {claim.category}
          </span>
          <span className={`status-badge status-${claim.status}`}>
            {getStatusIcon()}
            {claim.status === 'unverified' ? 'Unverified' : claim.status}
          </span>
        </div>
        <div className="claim-confidence">
          <span className="label">Confidence</span>
          <div className="confidence-bar">
            <div
              className="confidence-fill"
              style={{ width: `${getConfidencePercentage()}%` }}
            />
          </div>
          <span className="confidence-value">{claim.confidence}/10</span>
        </div>
      </div>

      <div className="claim-content">
        <p className="claim-text">{claim.text}</p>
      </div>

      <div className="claim-actions">
        <p className="label">Verify this claim:</p>
        <div className="status-buttons">
          <button
            onClick={() => handleStatusChange('true')}
            className={`btn btn-sm ${claim.status === 'true' ? 'btn-primary' : 'btn-ghost'}`}
            aria-label="Mark as true"
          >
            <Check size={16} />
            True
          </button>
          <button
            onClick={() => handleStatusChange('false')}
            className={`btn btn-sm ${claim.status === 'false' ? 'btn-primary' : 'btn-ghost'}`}
            aria-label="Mark as false"
          >
            <X size={16} />
            False
          </button>
          <button
            onClick={() => handleStatusChange('assumption')}
            className={`btn btn-sm ${claim.status === 'assumption' ? 'btn-primary' : 'btn-ghost'}`}
            aria-label="Mark as assumption"
          >
            <AlertCircle size={16} />
            Assumption
          </button>
        </div>
      </div>
    </div>
  );
}

// Add component-specific styles
const styles = `
.claim-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
  gap: var(--spacing-md);
}

.claim-badges {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.claim-confidence {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 150px;
}

.confidence-bar {
  flex: 1;
  height: 6px;
  background-color: var(--color-gray-200);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background-color: var(--color-accent);
  transition: width var(--transition-medium);
}

.confidence-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-gray-600);
  min-width: 35px;
  text-align: right;
}

.claim-content {
  margin-bottom: var(--spacing-lg);
}

.claim-text {
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-secondary);
  margin: 0;
}

.claim-actions {
  border-top: 1px solid var(--color-gray-200);
  padding-top: var(--spacing-md);
}

.claim-actions .label {
  margin-bottom: var(--spacing-sm);
}

.status-buttons {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.status-buttons .btn {
  flex: 1;
  min-width: 100px;
}

@media (max-width: 768px) {
  .claim-header {
    flex-direction: column;
  }
  
  .claim-confidence {
    width: 100%;
  }
  
  .status-buttons {
    flex-direction: column;
  }
  
  .status-buttons .btn {
    width: 100%;
  }
}
`;

export const claimCardStyles = styles; 