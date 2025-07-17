export interface Claim {
  id: string;
  text: string;
  status: 'unverified' | 'true' | 'false' | 'assumption';
  category: 'financial' | 'market' | 'operational' | 'other';
  confidence: number; // 1-10
  range: [number, number]; // Character positions
  verificationState?: 'idle' | 'verifying-perplexity' | 'verified-perplexity' | 'verifying-document' | 'verified-document' | 'verification-error';
}

export interface Link {
  id: string;
  url: string;
  text: string; // Link text/description
  status: 'unverified' | 'valid' | 'invalid' | 'suspicious';
  // Claim-source matching fields
  supportedClaim?: string;
  contextSnippet?: string;
  claimConfidence?: number;
}

export interface PerplexityResult {
  status: 'verified_true' | 'verified_false' | 'partially_true' | 'needs_context' | 'cannot_find_answer';
  reasoning: string;
  sources: string[];
  confidence?: number;
  searchQuery: string;
  searchPrompt?: string; // The actual prompt sent to Perplexity
  timestamp: string;
}

export interface Document {
  id: string;
  fileName: string;
  fileType: 'excel' | 'pdf';
  uploadTime: string;
  processed: boolean;
  chunkCount?: number;
}

export interface DocumentVerificationResult {
  status: 'found' | 'not_found' | 'contradicted';
  reasoning: string;
  citations: Array<{
    fileName: string;
    location: string; // "Sheet: Revenue, Cell: B15" or "Page: 23"
    content: string; // actual content found
  }>;
  confidence: number;
  timestamp: string;
}

export interface AppState {
  appMode: 'memo' | 'links'; // New tab mode
  currentStep: 'input' | 'verify';
  memoText: string;
  claims: Claim[];
  isLoading: boolean;
  error: string | null;
  processingTime: number | null;
  companyType: 'external' | 'internal';
  perplexityResults: Record<string, PerplexityResult>;
  documents: Document[];
  documentVerificationResults: Record<string, DocumentVerificationResult>;
  // Link verification state
  linkText: string;
  links: Link[];
}

export type AppAction =
  | { type: 'SET_APP_MODE'; payload: 'memo' | 'links' }
  | { type: 'SET_STEP'; payload: 'input' | 'verify' }
  | { type: 'SET_MEMO_TEXT'; payload: string }
  | { type: 'SET_CLAIMS'; payload: Claim[] }
  | { type: 'UPDATE_CLAIM_STATUS'; payload: { id: string; status: Claim['status'] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROCESSING_TIME'; payload: number }
  | { type: 'SET_COMPANY_TYPE'; payload: 'external' | 'internal' }
  | { type: 'SET_PERPLEXITY_RESULT'; payload: { claimId: string; result: PerplexityResult } }
  | { type: 'SET_CLAIM_VERIFYING'; payload: { claimId: string; isVerifying: boolean; verificationType?: 'perplexity' | 'document' } }
  | { type: 'SET_CLAIM_VERIFIED'; payload: { claimId: string; result: PerplexityResult } }
  | { type: 'SET_CLAIM_VERIFICATION_ERROR'; payload: { claimId: string; error: string } }
  | { type: 'SET_DOCUMENTS'; payload: Document[] }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'REMOVE_DOCUMENT'; payload: string }
  | { type: 'SET_DOCUMENT_VERIFICATION_RESULT'; payload: { claimId: string; result: DocumentVerificationResult } }
  | { type: 'SET_CLAIM_DOCUMENT_VERIFIED'; payload: { claimId: string; result: DocumentVerificationResult } }
  // Link verification actions (simplified for human-only verification)
  | { type: 'SET_LINK_TEXT'; payload: string }
  | { type: 'SET_LINKS'; payload: Link[] }
  | { type: 'UPDATE_LINK_STATUS'; payload: { id: string; status: Link['status'] } }
  | { type: 'RESET' };

export interface ClaimExtractionResponse {
  claims: Claim[];
  processingTime: number;
  memoLength: number;
  claimCount: number;
}

export interface LinkExtractionResponse {
  links: Link[];
  textLength: number;
  linkCount: number;
}

export interface SampleMemoResponse {
  sampleMemo: string;
  description: string;
} 