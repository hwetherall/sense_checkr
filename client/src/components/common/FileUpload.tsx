import React, { useState, useRef, useCallback, DragEvent } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: string;
  title: string;
  subtitle: string;
  fileTypes: string;
  className?: string;
  disabled?: boolean;
  error?: string | null;
}

export function FileUpload({
  onFileUpload,
  accept,
  multiple = false,
  maxFiles = 1,
  maxFileSize = "10MB",
  title,
  subtitle,
  fileTypes,
  className = "",
  disabled = false,
  error
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [disabled]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      onFileUpload(files);
    }
  }, [onFileUpload, disabled]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      onFileUpload(files);
    }
    // Clear the input so the same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onFileUpload]);

  const onButtonClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const uploadAreaClasses = [
    'upload-area',
    dragActive ? 'drag-active' : '',
    disabled ? 'uploading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={uploadAreaClasses}>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      
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
          {disabled ? 'Uploading...' : title}
        </p>
        <p className="upload-hint">
          {subtitle} • Max {multiple ? maxFiles : 1} file{multiple && maxFiles > 1 ? 's' : ''} • {maxFileSize} per file
        </p>
      </div>

      {error && (
        <div className="upload-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
} 