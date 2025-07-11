import React, { useState, useRef, useEffect } from 'react';
import { Check, X, AlertCircle, HelpCircle, Globe, FileText, User, Loader, Info } from 'lucide-react';
import { Claim } from '../../types';
import { useClaimExtraction } from '../../hooks/useClaimExtraction';
import { usePerplexityVerification } from '../../hooks/usePerplexityVerification';
import { useDocumentVerification } from '../../hooks/useDocumentVerification';

interface ClaimCardProps {
  claim: Claim;
  onHover?: (claimId: string | null) => void;
}

export function ClaimCard({ claim, onHover }: ClaimCardProps) {
  const { updateClaimStatus } = useClaimExtraction();
  const { verifyClaimWithPerplexity, getPerplexityResult, isVerifyingClaim } = usePerplexityVerification();
  const { 
    verifyClaimWithDocuments, 
    getDocumentVerificationResult, 
    isVerifyingClaimWithDocuments,
    hasDocumentVerificationResult,
    hasDocuments 
  } = useDocumentVerification();
  const [showManualVerify, setShowManualVerify] = useState(false);
  const [showPromptTooltip, setShowPromptTooltip] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowPromptTooltip(false);
      }
    }

    if (showPromptTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPromptTooltip]);

  const perplexityResult = getPerplexityResult(claim.id);
  const documentResult = getDocumentVerificationResult(claim.id);
  const isVerifying = isVerifyingClaim(claim.id);
  const isVerifyingDocs = isVerifyingClaimWithDocuments(claim.id);
  const hasPerplexityResult = !!(perplexityResult && claim.verificationState === 'verified-perplexity');
  const hasDocResult = hasDocumentVerificationResult(claim.id);

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

  const handleDocumentVerify = () => {
    console.log('Verify with Documents clicked for claim:', claim.id);
    verifyClaimWithDocuments(claim.id);
  };

  const getStatusIcon = () => {
    // If we have document results, show appropriate icon
    if (hasDocResult && documentResult) {
      switch (documentResult.status) {
        case 'found':
          return <Check size={16} />;
        case 'contradicted':
          return <X size={16} />;
        case 'not_found':
          return <HelpCircle size={16} />;
        default:
          return <FileText size={16} />;
      }
    }
    
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
    // Prioritize document status if available
    if (hasDocResult && documentResult) {
      return getDocumentStatusText(documentResult.status);
    }
    
    // Otherwise use Perplexity status if available
    if (hasPerplexityResult) {
      return getPerplexityStatusText(perplexityResult.status);
    }
    
    // Otherwise show manual status
    return claim.status === 'unverified' ? 'Unverified' : claim.status;
  };

  const getStatusClass = () => {
    // Use document status class if available
    if (hasDocResult && documentResult) {
      return `status-${getDocumentStatusClass(documentResult.status)}`;
    }
    
    // Use Perplexity status class if available
    if (hasPerplexityResult) {
      return `status-${getPerplexityStatusClass(perplexityResult.status)}`;
    }
    
    // Otherwise use manual status class
    return `status-${claim.status}`;
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

  const getDocumentStatusText = (status: string) => {
    switch (status) {
      case 'found':
        return 'Found in Docs';
      case 'contradicted':
        return 'Contradicted';
      case 'not_found':
        return 'Not Found';
      default:
        return status;
    }
  };

  const getDocumentStatusClass = (status: string) => {
    switch (status) {
      case 'found':
        return 'document-found';
      case 'contradicted':
        return 'document-contradicted';
      case 'not_found':
        return 'document-not-found';
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
          {hasDocResult && (
            <span className="verification-type-badge">
              <FileText size={12} />
              Doc Verified
            </span>
          )}
        </div>
      </div>

      <div className="claim-content">
        <p className="claim-text">{claim.text}</p>
      </div>

      {hasDocResult && documentResult && (
        <div className={`document-note ${getDocumentStatusClass(documentResult.status)}`}>
          <p className="document-reasoning">{documentResult.reasoning}</p>
          {documentResult.citations.length > 0 && (
            <div className="document-citations">
              <span className="citations-label">Found in:</span>
              {documentResult.citations.map((citation, index) => (
                <div key={index} className="citation-item">
                  <span className="citation-file">{citation.fileName}</span>
                  <span className="citation-location">{citation.location}</span>
                  {citation.content && (
                    <p className="citation-content">"{citation.content}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasPerplexityResult && (
        <div className={`perplexity-note ${getPerplexityStatusClass(perplexityResult.status)}`}>
          <div className="perplexity-header">
            <p className="perplexity-reasoning">{perplexityResult.reasoning}</p>
            {perplexityResult.searchPrompt && (
              <div className="prompt-info-container" ref={tooltipRef}>
                <button
                  className="btn-prompt-info"
                  onMouseEnter={() => setShowPromptTooltip(true)}
                  onMouseLeave={() => setShowPromptTooltip(false)}
                  onClick={() => setShowPromptTooltip(!showPromptTooltip)}
                  aria-label="Show prompt sent to Perplexity"
                >
                  <Info size={14} />
                </button>
                {showPromptTooltip && (
                  <div className="prompt-tooltip">
                    <div className="prompt-tooltip-header">
                      <strong>Prompt sent to Perplexity:</strong>
                    </div>
                    <div className="prompt-tooltip-content">
                      {perplexityResult.searchPrompt}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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
                <button 
                  className="more-sources" 
                  onClick={() => setShowAllSources(!showAllSources)}
                >
                  {showAllSources ? 'Hide' : `+${perplexityResult.sources.length - 2} more`}
                </button>
              )}
            </div>
          )}
          {showAllSources && (
            <div className="all-sources-list">
              <ul>
                {perplexityResult.sources.map((source, index) => (
                  <li key={index}>
                    <a 
                      href={source} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      {source}
                    </a>
                  </li>
                ))}
              </ul>
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
            onClick={handleDocumentVerify}
            className={`btn btn-sm btn-icon ${isVerifyingDocs ? 'btn-loading' : ''} ${!hasDocuments ? 'btn-disabled' : ''}`}
            disabled={isVerifyingDocs || claim.verificationState === 'verified-document' || !hasDocuments}
            aria-label={hasDocuments ? "Verify with Docs" : "Verify with Docs (Upload documents first)"}
            title={!hasDocuments ? "Upload documents first" : undefined}
          >
            {isVerifyingDocs ? <Loader className="spinner" size={16} /> : <FileText size={16} />}
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