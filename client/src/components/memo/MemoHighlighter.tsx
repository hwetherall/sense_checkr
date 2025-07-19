import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { ClaimsList } from './claims/ClaimsList';
import { ProgressIndicator } from './claims/ProgressIndicator';

export function MemoHighlighter() {
  const { state, dispatch } = useApp();
  const { memoText, claims, processingTime } = state;
  const [hoveredClaimId, setHoveredClaimId] = useState<string | null>(null);
  const [isMemoCollapsed, setIsMemoCollapsed] = useState(true);
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

  const toggleMemoCollapse = () => {
    setIsMemoCollapsed(!isMemoCollapsed);
  };

  return (
    <div className="memo-highlighter">
      <div className="highlighter-header">
        <button onClick={handleBackToInput} className="btn btn-ghost btn-icon">
          <ArrowLeft size={20} />
          Back to Input
        </button>
        <h2 className="headline-2">Verify Investment Memo Claims</h2>
        <p className="body-medium" style={{ color: 'var(--color-gray-600)', marginTop: '8px' }}>
          Showing the {claims.length} most critical "make or break" claims that could impact the investment decision
        </p>
      </div>

      <div className={`highlighter-content ${isMemoCollapsed ? 'text-collapsed' : ''}`}>
        <div className={`text-panel ${isMemoCollapsed ? 'collapsed' : ''}`}>
          {!isMemoCollapsed && (
            <div className="panel-header">
              <div className="panel-header-content">
                <h3 className="headline-3">Original Memo</h3>
                <p className="body-small">Hover over claims to highlight them in the text</p>
              </div>
            </div>
          )}
          {!isMemoCollapsed && (
            <div ref={memoRef} className="memo-text-container">
              <p className="memo-text">{highlightedMemo}</p>
            </div>
          )}
        </div>

        <div className="claims-panel">
          <div className="progress-wrapper">
            <ProgressIndicator 
              claims={claims} 
              processingTime={processingTime} 
              isTextCollapsed={isMemoCollapsed}
              onToggleTextCollapse={toggleMemoCollapse}
            />
          </div>
          <div className="claims-list-wrapper">
            <ClaimsList claims={claims} onClaimHover={setHoveredClaimId} />
          </div>
        </div>
      </div>
    </div>
  );
} 