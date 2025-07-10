import React, { useState } from 'react';
import { Check, X, AlertCircle, HelpCircle, Globe, FileText, User, Loader, ExternalLink } from 'lucide-react';
import { Claim } from '../../types';
import { useClaimExtraction } from '../../hooks/useClaimExtraction';
import { usePerplexityVerification } from '../../hooks/usePerplexityVerification';

interface ClaimCardProps {
  claim: Claim;
  onHover?: (claimId: string | null) => void;
}

export function ClaimCard({ claim, onHover }: ClaimCardProps) {
  const { updateClaimStatus } = useClaimExtraction();
  const { verifyClaimWithPerplexity, getPerplexityResult, isVerifyingClaim } = usePerplexityVerification();
  const [showManualVerify, setShowManualVerify] = useState(false);

  const perplexityResult = getPerplexityResult(claim.id);
  const isVerifying = isVerifyingClaim(claim.id);
  const hasPerplexityResult = !!(perplexityResult && claim.verificationState === 'verified-perplexity');

  // Debug logging
  console.log('ClaimCard Debug:', {
    claimId: claim.id,
    verificationState: claim.verificationState,
    perplexityResult: perplexityResult,
    hasPerplexityResult: hasPerplexityResult,
    isVerifying: isVerifying
  });

  const handleStatusChange = (status: Claim['status']) => {
    updateClaimStatus(claim.id, status);
  };

  const handlePerplexityVerify = () => {
    console.log('Verify with Perplexity clicked for claim:', claim.id);
    verifyClaimWithPerplexity(claim.id);
  };

  const getStatusIcon = () => {
    // If we have Perplexity results, show appropriate icon
    if (hasPerplexityResult) {
      switch (perplexityResult.status) {
        case 'verified_true':
          return <Check size={16} />;
        case 'verified_false':
          return <X size={16} />;
        case 'partially_true':
        case 'needs_context':
          return <AlertCircle size={16} />;
        case 'cannot_find_answer':
          return <HelpCircle size={16} />;
        default:
          return <Globe size={16} />;
      }
    }

    // Otherwise show manual verification status
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

  const getDisplayStatus = () => {
    // Prioritize Perplexity status if available
    if (hasPerplexityResult) {
      return getPerplexityStatusText(perplexityResult.status);
    }
    
    // Otherwise show manual status
    return claim.status === 'unverified' ? 'Unverified' : claim.status;
  };

  const getStatusClass = () => {
    // Use Perplexity status class if available
    if (hasPerplexityResult) {
      return `status-${getPerplexityStatusClass(perplexityResult.status)}`;
    }
    
    // Otherwise use manual status class
    return `status-${claim.status}`;
  };

  const getConfidencePercentage = () => {
    // Use Perplexity confidence if available
    if (hasPerplexityResult && perplexityResult.confidence) {
      return (perplexityResult.confidence / 10) * 100;
    }
    return (claim.confidence / 10) * 100;
  };

  const getConfidenceValue = () => {
    if (hasPerplexityResult && perplexityResult.confidence) {
      return perplexityResult.confidence;
    }
    return claim.confidence;
  };

  const getPerplexityStatusText = (status: string) => {
    switch (status) {
      case 'verified_true':
        return 'Verified True';
      case 'verified_false':
        return 'Verified False';
      case 'partially_true':
        return 'Partially True';
      case 'needs_context':
        return 'Needs Context';
      case 'cannot_find_answer':
        return 'Cannot Find Answer';
      default:
        return status;
    }
  };

  const getPerplexityStatusClass = (status: string) => {
    switch (status) {
      case 'verified_true':
        return 'perplexity-true';
      case 'verified_false':
        return 'perplexity-false';
      case 'partially_true':
        return 'perplexity-partial';
      case 'needs_context':
        return 'perplexity-context';
      case 'cannot_find_answer':
        return 'perplexity-unknown';
      default:
        return '';
    }
  };

  return (
    <div
      className={`claim-card ${getStatusClass()} fade-in`}
      onMouseEnter={() => onHover?.(claim.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="claim-header">
        <div className="claim-badges">
          <span className={`category-badge ${claim.category}`}>
            {claim.category}
          </span>
          <span className={`status-badge ${getStatusClass()}`}>
            {getStatusIcon()}
            {getDisplayStatus()}
          </span>
          {hasPerplexityResult && (
            <span className="verification-type-badge">
              <Globe size={12} />
              AI Verified
            </span>
          )}
        </div>
        <div className="claim-confidence">
          <span className="label">Confidence</span>
          <div className="confidence-bar">
            <div
              className="confidence-fill"
              style={{ width: `${getConfidencePercentage()}%` }}
            />
          </div>
          <span className="confidence-value">{getConfidenceValue()}/10</span>
        </div>
      </div>

      <div className="claim-content">
        <p className="claim-text">{claim.text}</p>
      </div>

      {hasPerplexityResult && (
        <div className={`perplexity-note ${getPerplexityStatusClass(perplexityResult.status)}`}>
          <p className="perplexity-reasoning">{perplexityResult.reasoning}</p>
          {perplexityResult.sources.length > 0 && (
            <div className="perplexity-sources-compact">
              <span className="sources-label">Sources:</span>
              {perplexityResult.sources.slice(0, 2).map((source, index) => {
                try {
                  const hostname = new URL(source).hostname.replace('www.', '');
                  return (
                    <a
                      key={index}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link-compact"
                      title={source}
                    >
                      {hostname}
                    </a>
                  );
                } catch {
                  return null;
                }
              })}
              {perplexityResult.sources.length > 2 && (
                <span className="more-sources">+{perplexityResult.sources.length - 2} more</span>
              )}
            </div>
          )}
        </div>
      )}

      {claim.verificationState === 'verification-error' && (
        <div className="verification-error-message">
          <AlertCircle size={16} />
          <span>Verification failed. Please try again.</span>
        </div>
      )}

      <div className="claim-actions">
        <p className="label">Verify this claim:</p>
        <div className="verification-options">
          <button
            onClick={handlePerplexityVerify}
            className={`btn btn-sm btn-icon ${isVerifying ? 'btn-loading' : ''}`}
            disabled={isVerifying || claim.verificationState === 'verified-perplexity'}
            aria-label="Verify with Perplexity"
          >
            {isVerifying ? <Loader className="spinner" size={16} /> : <Globe size={16} />}
            Verify with Perplexity
          </button>
          <button
            className="btn btn-sm btn-icon btn-disabled"
            disabled={true}
            aria-label="Verify with Docs (Coming Soon)"
          >
            <FileText size={16} />
            Verify with Docs
          </button>
          <button
            onClick={() => setShowManualVerify(!showManualVerify)}
            className={`btn btn-sm btn-icon ${showManualVerify ? 'btn-active' : ''}`}
            aria-label="Verify by Human"
          >
            <User size={16} />
            Verify by Human
          </button>
        </div>
        
        {showManualVerify && (
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
        )}
      </div>
    </div>
  );
} 