import React, { useState, useCallback, ChangeEvent } from 'react';
import { FileText, Upload, Link } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useLinkExtraction } from '../../hooks/useLinkExtraction';

export function LinkInput() {
  const { state, dispatch } = useApp();
  const { linkText, error } = state;
  const { extractLinks } = useLinkExtraction();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      dispatch({ type: 'SET_LINK_TEXT', payload: e.target.value });
      if (error) {
        dispatch({ type: 'SET_ERROR', payload: null });
      }
    },
    [dispatch, error]
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      // Accept both .txt and .json files
      if (file.type !== 'text/plain' && file.type !== 'application/json') {
        dispatch({ type: 'SET_ERROR', payload: 'Please upload a .txt or .json file' });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // Handle JSON files by parsing and extracting text content
        if (file.type === 'application/json') {
          try {
            const jsonData = JSON.parse(content);
            // Convert JSON to formatted text for link extraction
            const jsonText = JSON.stringify(jsonData, null, 2);
            dispatch({ type: 'SET_LINK_TEXT', payload: jsonText });
          } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Invalid JSON file format' });
            return;
          }
        } else {
          // Handle .txt files as before
          dispatch({ type: 'SET_LINK_TEXT', payload: content });
        }
        
        if (error) {
          dispatch({ type: 'SET_ERROR', payload: null });
        }
      };
      reader.readAsText(file);
    },
    [dispatch, error]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (linkText.trim().length < 10) {
        dispatch({ type: 'SET_ERROR', payload: 'Please enter at least 10 characters' });
        return;
      }
      await extractLinks(linkText);
    },
    [linkText, extractLinks, dispatch]
  );

  const handleUseSample = useCallback(() => {
    const sampleText = `Here are some example links to test the verification system:

1. Official company website: [Apple Inc.](https://www.apple.com)
2. Financial reports: [Apple Q4 2023 Earnings](https://investor.apple.com/investor-relations/default.aspx)
3. News article: [Apple's Latest Innovation](https://www.techcrunch.com/apple-innovation-2024)
4. Research paper: [Mobile Technology Trends](https://arxiv.org/abs/2024.12345)
5. Potentially suspicious link: [Apple Exclusive Deal](https://definitely-not-apple.com/secret-deals)

Please verify each link to check for any potential hallucinations or invalid references.`;
    
    dispatch({ type: 'SET_LINK_TEXT', payload: sampleText });
  }, [dispatch]);

  const characterCount = linkText.length;
  const isValid = characterCount >= 10 && characterCount <= 50000;

  return (
    <div className="memo-input-container">
      <div className="memo-input-header">
        <h2 className="headline-2">Link Verification Input</h2>
        <p className="subtitle">
          Paste text containing markdown links or plain URLs, or upload a .txt or .json file to verify all links for potential hallucinations
        </p>
      </div>

      <form onSubmit={handleSubmit} className="memo-form">
        <div className="form-group">
          <label htmlFor="link-text" className="form-label">
            Text with Links
          </label>
          <div
            className={`file-drop-zone ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="drop-zone-content">
              <Upload size={24} />
              <p className="body-medium">
                Drop files here or{' '}
                <label htmlFor="file-upload" className="file-upload-trigger">
                  click to upload
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.json"
                    onChange={handleFileInputChange}
                    className="hidden-file-input"
                  />
                </label>
              </p>
              <p className="body-small" style={{ color: 'var(--color-gray-600)' }}>
                Text (.txt) and JSON (.json) files only • Max 1 file • 5MB limit
              </p>
            </div>
          </div>
          <div className="form-divider">
            <span className="divider-text">or paste text directly</span>
          </div>
          <textarea
            id="link-text"
            value={linkText}
            onChange={handleTextChange}
            className="form-textarea memo-textarea"
            placeholder="Paste your text with markdown links or plain URLs here..."
            aria-describedby="character-count"
          />
          <div className="form-footer">
            <button
              type="button"
              onClick={handleUseSample}
              className="btn btn-secondary btn-sm btn-icon"
            >
              <FileText size={16} />
              Use Sample Text
            </button>
            <div id="character-count" className="character-count">
              {characterCount} / 50,000 characters
              {characterCount < 10 && characterCount > 0 && (
                <span className="text-error"> (minimum 10)</span>
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
            disabled={!isValid}
          >
            <Link size={20} />
            Extract & Verify Links
          </button>
        </div>
      </form>
    </div>
  );
}

 