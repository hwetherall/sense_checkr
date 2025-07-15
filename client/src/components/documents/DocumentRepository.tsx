import React, { useEffect, useState } from 'react';
import { FileText, X, ChevronDown, ChevronUp, File } from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import { useDocumentManagement } from '../../hooks/useDocumentManagement';
import { Document } from '../../types';

export function DocumentRepository() {
  const { documents, fetchDocuments, deleteDocument } = useDocumentManagement();
  const [isExpanded, setIsExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch documents on mount
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    await deleteDocument(documentId);
    setDeletingId(null);
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
    <div className="document-repository">
      <div className="repository-header">
        <div className="header-content">
          <h3>Document Repository</h3>
          <span className="document-count">{documents.length} / 50 documents</span>
        </div>
        <button
          className="btn btn-sm btn-ghost toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
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
  );
} 