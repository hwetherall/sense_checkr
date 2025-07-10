import { useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { PerplexityResult } from '../types';

export function usePerplexityVerification() {
  const { state, dispatch } = useApp();

  const verifyClaimWithPerplexity = useCallback(
    async (claimId: string) => {
      console.log('Starting verification for claim:', claimId);
      
      const claim = state.claims.find(c => c.id === claimId);
      if (!claim) {
        console.error('Claim not found:', claimId);
        return;
      }
      console.log('Found claim:', claim);

      // Set verifying state
      console.log('Dispatching SET_CLAIM_VERIFYING...');
      dispatch({ type: 'SET_CLAIM_VERIFYING', payload: { claimId, isVerifying: true } });

      try {
        console.log('Making API request with data:', {
          claimText: claim.text,
          memoText: state.memoText.substring(0, 100) + '...',
          companyType: state.companyType,
          claimId: claim.id,
        });
        
        const response = await fetch('/api/claims/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claimText: claim.text,
            memoText: state.memoText,
            companyType: state.companyType,
            claimId: claim.id,
          }),
        });
        
        console.log('API response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('API error response:', errorData);
          throw new Error(errorData.error?.message || 'Verification failed');
        }

        const data = await response.json();
        console.log('Verification API response:', data);
        
        // Update claim with verification result and mark as verified
        dispatch({
          type: 'SET_CLAIM_VERIFIED',
          payload: {
            claimId,
            result: data.verificationResult,
          },
        });
        console.log('Dispatched SET_CLAIM_VERIFIED for claim:', claimId);

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
        console.log('Clearing verifying state...');
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