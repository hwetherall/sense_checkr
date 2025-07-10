export interface Claim {
  id: string;
  text: string;
  status: 'unverified' | 'true' | 'false' | 'assumption';
  category: 'financial' | 'market' | 'operational' | 'other';
  confidence: number; // 1-10
  range: [number, number]; // Character positions
}

export interface AppState {
  currentStep: 'input' | 'verify';
  memoText: string;
  claims: Claim[];
  isLoading: boolean;
  error: string | null;
  processingTime: number | null;
}

export type AppAction =
  | { type: 'SET_STEP'; payload: 'input' | 'verify' }
  | { type: 'SET_MEMO_TEXT'; payload: string }
  | { type: 'SET_CLAIMS'; payload: Claim[] }
  | { type: 'UPDATE_CLAIM_STATUS'; payload: { id: string; status: Claim['status'] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROCESSING_TIME'; payload: number }
  | { type: 'RESET' };

export interface ClaimExtractionResponse {
  claims: Claim[];
  processingTime: number;
  memoLength: number;
  claimCount: number;
}

export interface SampleMemoResponse {
  sampleMemo: string;
  description: string;
} 