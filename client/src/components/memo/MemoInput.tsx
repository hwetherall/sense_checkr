import React, { useState, useCallback, ChangeEvent } from 'react';
import { FileText, Send } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useClaimExtraction } from '../../hooks/useClaimExtraction';

export function MemoInput() {
  const { state, dispatch } = useApp();
  const { memoText, error } = state;
  const { extractClaims, fetchSampleMemo, isExtracting } = useClaimExtraction();
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      dispatch({ type: 'SET_MEMO_TEXT', payload: e.target.value });
      if (error) {
        dispatch({ type: 'SET_ERROR', payload: null });
      }
    },
    [dispatch, error]
  );

  const handleUseSample = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      const sampleMemo = await fetchSampleMemo();
      dispatch({ type: 'SET_MEMO_TEXT', payload: sampleMemo });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load sample memo' });
    } finally {
      setIsLoadingSample(false);
    }
  }, [fetchSampleMemo, dispatch]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (memoText.trim().length < 50) {
        dispatch({ type: 'SET_ERROR', payload: 'Please enter at least 50 characters' });
        return;
      }
      await extractClaims(memoText);
    },
    [memoText, extractClaims, dispatch]
  );

  const characterCount = memoText.length;
  const isValid = characterCount >= 50 && characterCount <= 10000;

  return (
    <div className="memo-input-container">
      <div className="memo-input-header">
        <h2 className="headline-2">Investment Memo Input</h2>
        <p className="subtitle">
          Paste your investment memo below and we'll extract all factual claims for verification
        </p>
      </div>

      <form onSubmit={handleSubmit} className="memo-form">
        <div className="form-group">
          <label htmlFor="memo-text" className="form-label">
            Memo Text
          </label>
          <textarea
            id="memo-text"
            value={memoText}
            onChange={handleTextChange}
            className="form-textarea memo-textarea"
            placeholder="Paste your investment memo here..."
            disabled={isExtracting}
            aria-describedby="character-count"
          />
          <div className="form-footer">
            <button
              type="button"
              onClick={handleUseSample}
              className="btn btn-secondary btn-sm"
              disabled={isExtracting || isLoadingSample}
            >
              <FileText size={16} />
              Use Sample Memo
            </button>
            <div id="character-count" className="character-count">
              {characterCount} / 10,000 characters
              {characterCount < 50 && characterCount > 0 && (
                <span className="text-error"> (minimum 50)</span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary btn-lg btn-icon"
            disabled={!isValid || isExtracting}
          >
            <Send size={20} />
            {isExtracting ? 'Extracting Claims...' : 'Extract Claims'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Add component-specific styles
const styles = `
.memo-input-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-xl) 0;
  animation: fadeIn var(--transition-medium) ease-out;
}

.memo-input-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.memo-form {
  background-color: white;
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
}

.memo-textarea {
  min-height: 400px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 16px;
  line-height: 1.8;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-sm);
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-xl);
}

@media (max-width: 768px) {
  .memo-input-container {
    padding: var(--spacing-lg) var(--spacing-md);
  }
  
  .memo-form {
    padding: var(--spacing-lg);
  }
  
  .memo-textarea {
    min-height: 300px;
  }
  
  .form-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
}
`;

export const memoInputStyles = styles; 