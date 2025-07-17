import React, { useState } from 'react';
import { Check, X, AlertTriangle, HelpCircle } from 'lucide-react';
import { Link } from '../../types';
import { useLinkExtraction } from '../../hooks/useLinkExtraction';

interface LinkCardProps {
  link: Link;
  onHover?: (linkId: string | null) => void;
}

export function LinkCard({ link, onHover }: LinkCardProps) {
  const { updateLinkStatus } = useLinkExtraction();
  const [showVerificationButtons, setShowVerificationButtons] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState<'valid' | 'invalid' | 'suspicious' | null>(null);

  const handleStatusChange = (status: Link['status']) => {
    if (isAnimating) return; // Prevent multiple clicks during animation

    // Only animate for verification actions (not unverified)
    if (status !== 'unverified') {
      // Set animation type and start animation
      setAnimationType(status);
      setIsAnimating(true);

      // Wait for animation to complete before updating status
      setTimeout(() => {
        updateLinkStatus(link.id, status);
        setShowVerificationButtons(false);
        setIsAnimating(false);
        setAnimationType(null);
      }, 1000); // 1 second animation duration
    } else {
      // Handle unverified immediately without animation
      updateLinkStatus(link.id, status);
      setShowVerificationButtons(false);
    }
  };

  const getStatusIcon = () => {
    switch (link.status) {
      case 'valid':
        return <Check size={16} />;
      case 'invalid':
        return <X size={16} />;
      case 'suspicious':
        return <AlertTriangle size={16} />;
      default:
        return <HelpCircle size={16} />;
    }
  };

  const getStatusClass = () => {
    return `status-${link.status}`;
  };

  const getStatusText = () => {
    switch (link.status) {
      case 'valid':
        return 'Valid';
      case 'invalid':
        return 'Invalid';
      case 'suspicious':
        return 'Suspicious';
      default:
        return 'Unverified';
    }
  };

  const getAnimationClass = () => {
    if (!isAnimating || !animationType) return '';
    return `animating animating-${animationType}`;
  };

  return (
    <div 
      className={`claim-card link-card ${getStatusClass()} ${getAnimationClass()}`}
      onMouseEnter={() => onHover?.(link.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="claim-header">
        <div className="claim-badges">
          <span className={`status-badge ${getStatusClass()}`}>
            {getStatusIcon()}
            {getStatusText()}
          </span>
        </div>
      </div>

      <div className="claim-content">
        <div className="claim-text-container">
          <h4 className="claim-title">{link.text}</h4>
        </div>
        
        {/* Display the supported claim if available */}
        {link.supportedClaim && (
          <div className="supported-claim-container">
            <div className="supported-claim">
              <span className="claim-label">Claim:</span>
              <span className="claim-text">{link.supportedClaim}</span>
            </div>
            <div className="source-info">
              <span className="source-label">Source:</span>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-url clickable"
                title="Click to open source in new tab"
              >
                {link.url}
              </a>
            </div>
            {link.claimConfidence && (
              <div className="confidence-info">
                <span className="confidence-label">Match Confidence:</span>
                <span className={`confidence-score ${link.claimConfidence >= 7 ? 'high' : link.claimConfidence >= 4 ? 'medium' : 'low'}`}>
                  {link.claimConfidence}/10
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Fallback to original URL display if no supported claim */}
        {!link.supportedClaim && (
          <div className="link-url-container">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-url clickable"
              title="Click to open link in new tab"
            >
              {link.url}
            </a>
          </div>
        )}
      </div>

      <div className="claim-actions">
        <div className="action-label">
          <span className="label-text">Human Verification:</span>
        </div>
        
        <div className="verification-buttons">
          <button
            onClick={() => handleStatusChange('valid')}
            className={`btn btn-sm ${link.status === 'valid' ? 'btn-primary' : 'btn-ghost'} ${isAnimating && animationType === 'valid' ? 'btn-animating btn-success-glow' : ''}`}
            disabled={link.status === 'valid' || isAnimating}
          >
            <Check size={16} />
            Valid
          </button>
          <button
            onClick={() => handleStatusChange('invalid')}
            className={`btn btn-sm ${link.status === 'invalid' ? 'btn-primary' : 'btn-ghost'} ${isAnimating && animationType === 'invalid' ? 'btn-animating btn-error-glow' : ''}`}
            disabled={link.status === 'invalid' || isAnimating}
          >
            <X size={16} />
            Invalid
          </button>
          <button
            onClick={() => handleStatusChange('suspicious')}
            className={`btn btn-sm ${link.status === 'suspicious' ? 'btn-primary' : 'btn-ghost'} ${isAnimating && animationType === 'suspicious' ? 'btn-animating btn-warning-glow' : ''}`}
            disabled={link.status === 'suspicious' || isAnimating}
          >
            <AlertTriangle size={16} />
            Suspicious
          </button>
        </div>
      </div>
    </div>
  );
}

 