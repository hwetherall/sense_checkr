import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { ClaimsList } from '../claims/ClaimsList';
import { ProgressIndicator } from '../claims/ProgressIndicator';
import { Claim } from '../../types';

export function MemoHighlighter() {
  const { state, dispatch } = useApp();
  const { memoText, claims, processingTime } = state;
  const [hoveredClaimId, setHoveredClaimId] = useState<string | null>(null);
  const memoRef = useRef<HTMLDivElement>(null);

  const highlightedMemo = useMemo(() => {
    if (!memoText || claims.length === 0) return memoText;

    const sortedClaims = [...claims].sort((a, b) => a.range[0] - b.range[0]);
    let result = [];
    let lastIndex = 0;

    sortedClaims.forEach((claim) => {
      const [start, end] = claim.range;
      
      // Add text before the claim
      if (start > lastIndex) {
        result.push(
          <span key={`text-${lastIndex}`}>
            {memoText.slice(lastIndex, start)}
          </span>
        );
      }

      // Add the highlighted claim
      const isHovered = hoveredClaimId === claim.id;
      result.push(
        <span
          key={`claim-${claim.id}`}
          className={`highlighted-claim status-${claim.status} ${isHovered ? 'hovered' : ''}`}
          data-claim-id={claim.id}
          onMouseEnter={() => setHoveredClaimId(claim.id)}
          onMouseLeave={() => setHoveredClaimId(null)}
        >
          {memoText.slice(start, end)}
        </span>
      );

      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < memoText.length) {
      result.push(
        <span key={`text-${lastIndex}`}>
          {memoText.slice(lastIndex)}
        </span>
      );
    }

    return result;
  }, [memoText, claims, hoveredClaimId]);

  // Scroll to highlighted claim when hovering
  useEffect(() => {
    if (hoveredClaimId && memoRef.current) {
      const element = memoRef.current.querySelector(`[data-claim-id="${hoveredClaimId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [hoveredClaimId]);

  const handleBackToInput = () => {
    dispatch({ type: 'RESET' });
  };

  return (
    <div className="memo-highlighter">
      <div className="highlighter-header">
        <button onClick={handleBackToInput} className="btn btn-ghost btn-icon">
          <ArrowLeft size={20} />
          Back to Input
        </button>
        <h2 className="headline-2">Verify Investment Memo Claims</h2>
      </div>

      <div className="highlighter-content">
        <div className="memo-panel">
          <div className="panel-header">
            <h3 className="headline-3">Original Memo</h3>
            <p className="body-small">Hover over claims to highlight them in the text</p>
          </div>
          <div ref={memoRef} className="memo-text-container">
            <p className="memo-text">{highlightedMemo}</p>
          </div>
        </div>

        <div className="claims-panel">
          <ProgressIndicator claims={claims} processingTime={processingTime} />
          <ClaimsList claims={claims} onClaimHover={setHoveredClaimId} />
        </div>
      </div>
    </div>
  );
}

// Add component-specific styles
const styles = `
.memo-highlighter {
  padding: var(--spacing-xl) 0;
  animation: fadeIn var(--transition-medium) ease-out;
}

.highlighter-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.highlighter-content {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: var(--spacing-xl);
  align-items: start;
}

.memo-panel,
.claims-panel {
  height: 80vh;
  overflow-y: auto;
  padding: var(--spacing-lg);
  background-color: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.panel-header {
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-gray-200);
}

.memo-text-container {
  padding-right: var(--spacing-md);
}

.memo-text {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 16px;
  line-height: 1.8;
  color: var(--color-secondary);
  white-space: pre-wrap;
}

.highlighted-claim {
  padding: 2px 4px;
  border-radius: 4px;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.highlighted-claim.status-unverified {
  background-color: rgba(128, 128, 128, 0.1);
  border-bottom: 2px solid var(--color-gray-400);
}

.highlighted-claim.status-true {
  background-color: rgba(34, 139, 34, 0.1);
  border-bottom: 2px solid var(--color-success);
}

.highlighted-claim.status-false {
  background-color: rgba(220, 20, 60, 0.1);
  border-bottom: 2px solid var(--color-error);
}

.highlighted-claim.status-assumption {
  background-color: rgba(255, 176, 0, 0.1);
  border-bottom: 2px solid var(--color-warning);
}

.highlighted-claim.hovered {
  background-color: rgba(227, 18, 11, 0.2);
  border-color: var(--color-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media (max-width: 1200px) {
  .highlighter-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
  
  .memo-panel,
  .claims-panel {
    height: auto;
    max-height: 600px;
  }
}

@media (max-width: 768px) {
  .highlighter-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .memo-panel,
  .claims-panel {
    padding: var(--spacing-md);
  }
}
`;

export const memoHighlighterStyles = styles; 