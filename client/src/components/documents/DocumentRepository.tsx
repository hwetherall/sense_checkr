import React, { useEffect, useState } from 'react';
import { FileText, X, ChevronDown, ChevronUp, File, RotateCcw, AlertTriangle } from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import { useDocumentManagement } from '../../hooks/useDocumentManagement';
import { Document } from '../../types';

export function DocumentRepository() {
  const { documents, fetchDocuments, deleteDocument, clearAllDocuments } = useDocumentManagement();
  const [isExpanded, setIsExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Fetch documents on mount
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    await deleteDocument(documentId);
    setDeletingId(null);
  };

  const handleReset = async () => {
    setIsResetting(true);
    const success = await clearAllDocuments();
    if (success) {
      setShowResetConfirm(false);
    }
    setIsResetting(false);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'pdf') {
      return <FileText size={16} className="file-icon pdf" />;
    }
    return <File size={16} className="file-icon excel" />;
  };

  const formatUploadTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="document-repository">
        <div className="repository-header">
          <div className="header-content">
            <h3>Document Repository</h3>
            <span className="document-count">{documents.length} / 50 documents</span>
          </div>
          <div className="header-actions">
            {documents.length > 0 && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="btn btn-sm btn-ghost reset-btn"
                title="Clear all documents"
                disabled={isResetting}
              >
                <RotateCcw size={16} />
                Reset
              </button>
            )}
            <button
              className="btn btn-sm btn-ghost toggle-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="repository-content">
            <DocumentUpload />

            {documents.length > 0 && (
              <div className="document-list">
                <h4>Uploaded Documents</h4>
                {documents.map((doc: Document) => (
                  <div key={doc.id} className="document-item">
                    <div className="document-info">
                      {getFileIcon(doc.fileType)}
                      <div className="document-details">
                        <span className="document-name">{doc.fileName}</span>
                        <span className="document-meta">
                          {doc.chunkCount} chunks • {formatUploadTime(doc.uploadTime)}
                        </span>
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm btn-ghost delete-btn ${deletingId === doc.id ? 'deleting' : ''}`}
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      aria-label="Delete document"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {documents.length === 0 && (
              <div className="empty-state">
                <p>No documents uploaded yet</p>
                <p className="empty-hint">Upload Excel or PDF files to verify claims against them</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => !isResetting && setShowResetConfirm(false)}>
          <div className="modal-content reset-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <AlertTriangle size={20} />
                Clear All Documents
              </h2>
              <button
                className="modal-close"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Are you sure you want to clear all {documents.length} documents from the repository? 
                This action cannot be undone and will permanently delete all uploaded files.
              </p>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="btn btn-secondary"
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className={`btn btn-error btn-icon ${isResetting ? 'btn-loading' : ''}`}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <RotateCcw className="spinner" size={16} />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      Clear All Documents
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 