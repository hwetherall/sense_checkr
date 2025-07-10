import React, { useState, useCallback, ChangeEvent } from 'react';
import { FileText, Send, Building2, Briefcase } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useClaimExtraction } from '../../hooks/useClaimExtraction';

export function MemoInput() {
  const { state, dispatch } = useApp();
  const { memoText, error, companyType } = state;
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

  const handleCompanyTypeChange = useCallback(
    (type: 'external' | 'internal') => {
      dispatch({ type: 'SET_COMPANY_TYPE', payload: type });
    },
    [dispatch]
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
  const isValid = characterCount >= 50 && characterCount <= 20000;

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
          <label className="form-label">Company Type</label>
          <div className="company-type-toggle">
            <label className={`radio-option ${companyType === 'external' ? 'active' : ''}`}>
              <input
                type="radio"
                name="companyType"
                value="external"
                checked={companyType === 'external'}
                onChange={() => handleCompanyTypeChange('external')}
                disabled={isExtracting}
              />
              <Building2 size={20} />
              <div>
                <span className="radio-label">External Company</span>
                <span className="radio-help">Real companies that exist publicly</span>
              </div>
            </label>
            <label className={`radio-option ${companyType === 'internal' ? 'active' : ''}`}>
              <input
                type="radio"
                name="companyType"
                value="internal"
                checked={companyType === 'internal'}
                onChange={() => handleCompanyTypeChange('internal')}
                disabled={isExtracting}
              />
              <Briefcase size={20} />
              <div>
                <span className="radio-label">Internal Venture</span>
                <span className="radio-help">Internal corporate projects</span>
              </div>
            </label>
          </div>
        </div>

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
              {characterCount} / 20,000 characters
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