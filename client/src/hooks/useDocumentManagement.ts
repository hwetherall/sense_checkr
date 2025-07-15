import { useCallback, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Document } from '../types';
import { apiUrl } from '../config/api';

export function useDocumentManagement() {
  const { state, dispatch } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadDocuments = useCallback(async (files: File[]) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('documents', file);
      });

      const response = await fetch(apiUrl('/api/documents/upload'), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (data.documents && data.documents.length > 0) {
        // Add new documents to state
        data.documents.forEach((doc: Document) => {
          dispatch({ type: 'ADD_DOCUMENT', payload: doc });
        });
      }

      if (data.errors && data.errors.length > 0) {
        const errorMessage = data.errors.map((e: any) => `${e.fileName}: ${e.error}`).join('\n');
        setUploadError(errorMessage);
      }

      return {
        success: true,
        documents: data.documents,
        errors: data.errors,
      };
    } catch (error) {
      console.error('Document upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload documents';
      setUploadError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsUploading(false);
    }
  }, [dispatch]);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/api/documents'));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      dispatch({ type: 'SET_DOCUMENTS', payload: data.documents });
      return data.documents;
    } catch (error) {
      console.error('Error fetching documents:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load documents' });
      return [];
    }
  }, [dispatch]);

  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/documents/${documentId}`), {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete document');
      }

      dispatch({ type: 'REMOVE_DOCUMENT', payload: documentId });
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete document';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return false;
    }
  }, [dispatch]);

  const validateFiles = useCallback((files: File[]): { valid: boolean; error?: string } => {
    // Check file count
    const currentCount = state.documents.length;
    if (currentCount + files.length > 50) {
      return {
        valid: false,
        error: `Maximum 50 documents allowed. You can upload ${50 - currentCount} more document(s).`,
      };
    }

    // Check file types
    const allowedExtensions = ['.xlsx', '.xls', '.pdf'];
    for (const file of files) {
      const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
      if (!extension || !allowedExtensions.includes(extension)) {
        return {
          valid: false,
          error: `Invalid file type: ${file.name}. Only Excel (.xlsx, .xls) and PDF files are allowed.`,
        };
      }
    }

    // Check file sizes (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    for (const file of files) {
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File too large: ${file.name}. Maximum file size is 10MB.`,
        };
      }
    }

    return { valid: true };
  }, [state.documents.length]);

  return {
    documents: state.documents,
    isUploading,
    uploadError,
    uploadDocuments,
    fetchDocuments,
    deleteDocument,
    validateFiles,
  };
} 