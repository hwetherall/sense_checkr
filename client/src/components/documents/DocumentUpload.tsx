import React, { useState, useRef, DragEvent } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { useDocumentManagement } from '../../hooks/useDocumentManagement';

export function DocumentUpload() {
  const { uploadDocuments, validateFiles, isUploading, uploadError } = useDocumentManagement();
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    setValidationError(null);
    
    // Validate files
    const validation = validateFiles(files);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid files');
      return;
    }

    // Upload files
    await uploadDocuments(files);
    
    // Clear the input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const displayError = validationError || uploadError;

  return (
    <div className="document-upload">
      <form onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()}>
        <input
          ref={inputRef}
          type="file"
          id="file-input"
          multiple
          accept=".xlsx,.xls,.pdf"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        
        <label
          htmlFor="file-input"
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
        >
          <div
            className="upload-content"
            onClick={onButtonClick}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload size={24} />
            <p className="upload-text">
              {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
            </p>
            <p className="upload-hint">
              Excel (.xlsx, .xls) and PDF files only • Max 5 files • 10MB per file
            </p>
          </div>
        </label>
      </form>

      {displayError && (
        <div className="upload-error">
          <AlertCircle size={16} />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
} 