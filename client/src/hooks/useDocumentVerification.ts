import { useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { DocumentVerificationResult } from '../types';
import { apiUrl } from '../config/api';

export function useDocumentVerification() {
  const { state, dispatch } = useApp();

  const verifyClaimWithDocuments = useCallback(
    async (claimId: string) => {
      console.log('Starting document verification for claim:', claimId);
      
      const claim = state.claims.find(c => c.id === claimId);
      if (!claim) {
        console.error('Claim not found:', claimId);
        return;
      }

      // Check if documents are available
      if (state.documents.length === 0) {
        dispatch({
          type: 'SET_ERROR',
          payload: 'No documents available for verification. Please upload documents first.',
        });
        return;
      }

      // Set verifying state
      dispatch({ 
        type: 'SET_CLAIM_VERIFYING', 
        payload: { claimId, isVerifying: true, verificationType: 'document' } 
      });

      try {
        const response = await fetch(apiUrl('/api/documents/verify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claimText: claim.text,
            claimId: claim.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Document verification failed');
        }

        const data = await response.json();
        console.log('Document verification response:', data);
        
        // Update claim with verification result
        dispatch({
          type: 'SET_CLAIM_DOCUMENT_VERIFIED',
          payload: {
            claimId,
            result: data.verificationResult,
          },
        });

      } catch (error) {
        console.error('Document verification error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Document verification failed';
        dispatch({
          type: 'SET_CLAIM_VERIFICATION_ERROR',
          payload: {
            claimId,
            error: errorMessage,
          },
        });
      } finally {
        // Clear verifying state
        dispatch({ 
          type: 'SET_CLAIM_VERIFYING', 
          payload: { claimId, isVerifying: false, verificationType: 'document' } 
        });
      }
    },
    [state.claims, state.documents, dispatch]
  );

  const getDocumentVerificationResult = useCallback(
    (claimId: string): DocumentVerificationResult | undefined => {
      return state.documentVerificationResults[claimId];
    },
    [state.documentVerificationResults]
  );

  const isVerifyingClaimWithDocuments = useCallback(
    (claimId: string): boolean => {
      const claim = state.claims.find(c => c.id === claimId);
      return claim?.verificationState === 'verifying-document' || false;
    },
    [state.claims]
  );

  const hasDocumentVerificationResult = useCallback(
    (claimId: string): boolean => {
      const claim = state.claims.find(c => c.id === claimId);
      return claim?.verificationState === 'verified-document' && !!state.documentVerificationResults[claimId];
    },
    [state.claims, state.documentVerificationResults]
  );

  return {
    verifyClaimWithDocuments,
    getDocumentVerificationResult,
    isVerifyingClaimWithDocuments,
    hasDocumentVerificationResult,
    hasDocuments: state.documents.length > 0,
  };
} 