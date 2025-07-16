import React, { useState } from 'react';
import { X, Download, Loader } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (projectName: string, chapterName: string) => Promise<void>;
  isExporting: boolean;
}

export function ExportModal({ isOpen, onClose, onExport, isExporting }: ExportModalProps) {
  const [projectName, setProjectName] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [errors, setErrors] = useState<{ projectName?: string; chapterName?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const newErrors: { projectName?: string; chapterName?: string } = {};
    
    if (!projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }
    
    if (!chapterName.trim()) {
      newErrors.chapterName = 'Chapter name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    await onExport(projectName.trim(), chapterName.trim());
    
    // Reset form after successful export
    setProjectName('');
    setChapterName('');
    onClose();
  };

  const handleClose = () => {
    if (!isExporting) {
      setProjectName('');
      setChapterName('');
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Export to PDF</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={isExporting}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Please provide a project name and chapter name for your verification report. 
            These will appear as the main heading and subheading in the exported PDF.
          </p>

          <form onSubmit={handleSubmit} className="export-form">
            <div className="form-group">
              <label htmlFor="project-name" className="form-label">
                Project Name <span className="required">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className={`form-input ${errors.projectName ? 'error' : ''}`}
                placeholder="e.g., TechFlow Investment Analysis"
                disabled={isExporting}
                maxLength={100}
              />
              {errors.projectName && (
                <span className="form-error">{errors.projectName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="chapter-name" className="form-label">
                Chapter Name <span className="required">*</span>
              </label>
              <input
                id="chapter-name"
                type="text"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                className={`form-input ${errors.chapterName ? 'error' : ''}`}
                placeholder="e.g., Fact Verification Report"
                disabled={isExporting}
                maxLength={100}
              />
              {errors.chapterName && (
                <span className="form-error">{errors.chapterName}</span>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-secondary"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-primary btn-icon ${isExporting ? 'btn-loading' : ''}`}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader className="spinner" size={16} />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export PDF
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 