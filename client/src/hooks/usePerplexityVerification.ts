import { useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { PerplexityResult } from '../types';
import { apiUrl } from '../config/api';

export function usePerplexityVerification() {
  const { state, dispatch } = useApp();

  const verifyClaimWithPerplexity = useCallback(
    async (claimId: string) => {
      
      const claim = state.claims.find(c => c.id === claimId);
      if (!claim) {
        console.error('Claim not found:', claimId);
        return;
      }

      // Set verifying state
      dispatch({ type: 'SET_CLAIM_VERIFYING', payload: { claimId, isVerifying: true } });

      try {
        
        const response = await fetch(apiUrl('/api/claims/verify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claimText: claim.text,
            memoText: state.memoText,
            companyType: state.companyType,
            claimId: claim.id,
          }),
        });
        
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API error response:', errorData);
          throw new Error(errorData.error?.message || 'Verification failed');
        }

        const data = await response.json();
        
        // Update claim with verification result and mark as verified
        dispatch({
          type: 'SET_CLAIM_VERIFIED',
          payload: {
            claimId,
            result: data.verificationResult,
          },
        });
        

      } catch (error) {
        console.error('Perplexity verification error:', error);
        
        // Update claim state to show error and set error message
        const errorMessage = error instanceof Error ? error.message : 'Verification failed';
        dispatch({
          type: 'SET_CLAIM_VERIFICATION_ERROR',
          payload: {
            claimId,
            error: errorMessage,
          },
        });
      } finally {
        // Clear verifying state
        dispatch({ type: 'SET_CLAIM_VERIFYING', payload: { claimId, isVerifying: false } });
      }
    },
    [state.claims, state.memoText, state.companyType, dispatch]
  );

  const getPerplexityResult = useCallback(
    (claimId: string): PerplexityResult | undefined => {
      return state.perplexityResults[claimId];
    },
    [state.perplexityResults]
  );

  const isVerifyingClaim = useCallback(
    (claimId: string): boolean => {
      const claim = state.claims.find(c => c.id === claimId);
      return claim?.verificationState === 'verifying-perplexity' || false;
    },
    [state.claims]
  );

  return {
    verifyClaimWithPerplexity,
    getPerplexityResult,
    isVerifyingClaim,
  };
} 