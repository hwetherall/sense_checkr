export interface Claim {
  id: string;
  text: string;
  status: 'unverified' | 'true' | 'false' | 'assumption';
  category: 'financial' | 'market' | 'operational' | 'other';
  confidence: number; // 1-10
  range: [number, number]; // Character positions
  verificationState?: 'idle' | 'verifying-perplexity' | 'verified-perplexity' | 'verification-error';
}

export interface PerplexityResult {
  status: 'verified_true' | 'verified_false' | 'partially_true' | 'needs_context' | 'cannot_find_answer';
  reasoning: string;
  sources: string[];
  confidence?: number;
  searchQuery: string;
  timestamp: string;
}

export interface AppState {
  currentStep: 'input' | 'verify';
  memoText: string;
  claims: Claim[];
  isLoading: boolean;
  error: string | null;
  processingTime: number | null;
  companyType: 'external' | 'internal';
  perplexityResults: Record<string, PerplexityResult>;
}

export type AppAction =
  | { type: 'SET_STEP'; payload: 'input' | 'verify' }
  | { type: 'SET_MEMO_TEXT'; payload: string }
  | { type: 'SET_CLAIMS'; payload: Claim[] }
  | { type: 'UPDATE_CLAIM_STATUS'; payload: { id: string; status: Claim['status'] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROCESSING_TIME'; payload: number }
  | { type: 'SET_COMPANY_TYPE'; payload: 'external' | 'internal' }
  | { type: 'SET_PERPLEXITY_RESULT'; payload: { claimId: string; result: PerplexityResult } }
  | { type: 'SET_CLAIM_VERIFYING'; payload: { claimId: string; isVerifying: boolean } }
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