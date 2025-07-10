import { useState, useCallback } from 'react';
import axios from 'axios';
import { Claim, ClaimExtractionResponse, SampleMemoResponse } from '../types';
import { useApp } from '../contexts/AppContext';
import { apiUrl } from '../config/api';

export function useClaimExtraction() {
  const { dispatch } = useApp();
  const [isExtracting, setIsExtracting] = useState(false);

  const extractClaims = useCallback(async (memoText: string) => {
    setIsExtracting(true);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await axios.post<ClaimExtractionResponse>(
        apiUrl('/api/claims/extract'),
        { memoText },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { claims, processingTime } = response.data;

      dispatch({ type: 'SET_CLAIMS', payload: claims });
      dispatch({ type: 'SET_PROCESSING_TIME', payload: processingTime });
      dispatch({ type: 'SET_STEP', payload: 'verify' });

      return claims;
    } catch (error) {
      let errorMessage = 'Failed to extract claims. Please try again.';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
      }

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      setIsExtracting(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const fetchSampleMemo = useCallback(async () => {
    try {
      const response = await axios.get<SampleMemoResponse>(
        apiUrl('/api/claims/sample')
      );
      return response.data.sampleMemo;
    } catch (error) {
      console.error('Failed to fetch sample memo:', error);
      throw error;
    }
  }, []);

  const updateClaimStatus = useCallback(
    (claimId: string, status: Claim['status']) => {
      dispatch({
        type: 'UPDATE_CLAIM_STATUS',
        payload: { id: claimId, status },
      });
    },
    [dispatch]
  );

  return {
    extractClaims,
    fetchSampleMemo,
    updateClaimStatus,
    isExtracting,
  };
} 