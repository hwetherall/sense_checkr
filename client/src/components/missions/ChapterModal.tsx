import React, { useState, useCallback, ChangeEvent } from 'react';
import { X, Upload, FileJson } from 'lucide-react';

interface ChapterModalProps {
  onClose: () => void;
  onSubmit: (name: string, jsonContent: string) => void;
  chapterNumber: number;
}

export function ChapterModal({ onClose, onSubmit, chapterNumber }: ChapterModalProps) {
  const [name, setName] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateJSON = (content: string): boolean => {
    try {
      JSON.parse(content);
      setError(null);
      return true;
    } catch (e) {
      setError('Invalid JSON format. Please check your syntax.');
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && jsonContent.trim() && validateJSON(jsonContent)) {
      onSubmit(name.trim(), jsonContent.trim());
    }
  };

  const handleFileUpload = useCallback((file: File) => {
    if (file.type !== 'application/json') {
      setError('Please upload a .json file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonContent(content);
      validateJSON(content);
      
      // Auto-fill name from filename if empty
      if (!name) {
        const fileName = file.name.replace('.json', '');
        setName(fileName);
      }
    };
    reader.readAsText(file);
  }, [name]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleJsonChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setJsonContent(content);
    if (content.trim()) {
      validateJSON(content);
    } else {
      setError(null);
    }
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonContent(formatted);
      setError(null);
    } catch (e) {
      setError('Cannot format - invalid JSON');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Chapter {chapterNumber}</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="chapter-name">Chapter Name*</label>
            <input
              id="chapter-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Financial Overview Q4"
              className="form-input"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>JSON Content*</label>
            
            <div 
              className={`file-drop-zone ${isDragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <FileJson size={32} />
              <p>Drag and drop a JSON file here, or</p>
              <label className="file-upload-label">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileInputChange}
                  className="file-input-hidden"
                />
                <span className="btn btn-secondary btn-sm">
                  <Upload size={16} />
                  Choose File
                </span>
              </label>
            </div>

            <div className="textarea-header">
              <span>Or paste JSON directly:</span>
              {jsonContent && (
                <button 
                  type="button" 
                  className="btn btn-text btn-sm"
                  onClick={formatJSON}
                >
                  Format JSON
                </button>
              )}
            </div>
            
            <textarea
              value={jsonContent}
              onChange={handleJsonChange}
              placeholder='{"key": "value", ...}'
              className={`form-textarea code-editor ${error ? 'error' : ''}`}
              rows={12}
              required
            />
            
            {error && (
              <div className="field-error">{error}</div>
            )}
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!name.trim() || !jsonContent.trim() || !!error}
            >
              Add Chapter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 