import React from 'react';
import { Check, X, AlertTriangle, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '../../types';

interface LinkProgressIndicatorProps {
  links: Link[];
  isTextCollapsed?: boolean;
  onToggleTextCollapse?: () => void;
}

export function LinkProgressIndicator({ links, isTextCollapsed, onToggleTextCollapse }: LinkProgressIndicatorProps) {
  const stats = links.reduce(
    (acc, link) => {
      acc.total++;
      acc[link.status]++;
      return acc;
    },
    {
      total: 0,
      unverified: 0,
      valid: 0,
      invalid: 0,
      suspicious: 0,
    }
  );

  const verifiedCount = stats.valid + stats.invalid + stats.suspicious;
  const progressPercentage = stats.total > 0 ? Math.round((verifiedCount / stats.total) * 100) : 0;

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <div className="progress-title-section">
          <div className="title-with-toggle">
            {onToggleTextCollapse && (
              <button
                onClick={onToggleTextCollapse}
                className="progress-collapse-btn"
                aria-label={isTextCollapsed ? 'Expand text' : 'Collapse text'}
                title={isTextCollapsed ? 'Expand text' : 'Collapse text'}
              >
                {isTextCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            )}
            <h3 className="headline-3">Link Verification Progress</h3>
          </div>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="progress-text">
          {verifiedCount} of {stats.total} links verified ({progressPercentage}%)
        </p>
      </div>

      <div className="status-summary">
        <div className="status-item">
          <div className="status-icon valid">
            <Check size={16} />
          </div>
          <span className="status-label">Valid</span>
          <span className="status-count">{stats.valid}</span>
        </div>

        <div className="status-item">
          <div className="status-icon invalid">
            <X size={16} />
          </div>
          <span className="status-label">Invalid</span>
          <span className="status-count">{stats.invalid}</span>
        </div>

        <div className="status-item">
          <div className="status-icon suspicious">
            <AlertTriangle size={16} />
          </div>
          <span className="status-label">Suspicious</span>
          <span className="status-count">{stats.suspicious}</span>
        </div>

        <div className="status-item">
          <div className="status-icon unverified">
            <HelpCircle size={16} />
          </div>
          <span className="status-label">Unverified</span>
          <span className="status-count">{stats.unverified}</span>
        </div>
      </div>

      {stats.total > 0 && (
        <div className="progress-summary">
          <p className="summary-text">
            {verifiedCount === stats.total ? (
              <span className="text-success">All links verified!</span>
            ) : (
              <>
                <span className="text-primary">{stats.unverified} links</span> remaining to verify
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

 