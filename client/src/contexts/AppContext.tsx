import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction } from '../types';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const initialState: AppState = {
  currentStep: 'input',
  memoText: '',
  claims: [],
  isLoading: false,
  error: null,
  processingTime: null,
  companyType: 'external',
  perplexityResults: {},
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SET_MEMO_TEXT':
      return { ...state, memoText: action.payload };
    
    case 'SET_CLAIMS':
      return { 
        ...state, 
        claims: action.payload.map(claim => ({
          ...claim,
          verificationState: claim.verificationState || 'idle'
        }))
      };
    
    case 'UPDATE_CLAIM_STATUS':
      return {
        ...state,
        claims: state.claims.map(claim =>
          claim.id === action.payload.id
            ? { ...claim, status: action.payload.status }
            : claim
        ),
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_PROCESSING_TIME':
      return { ...state, processingTime: action.payload };
    
    case 'SET_COMPANY_TYPE':
      return { ...state, companyType: action.payload };
    
    case 'SET_PERPLEXITY_RESULT':
      return {
        ...state,
        perplexityResults: {
          ...state.perplexityResults,
          [action.payload.claimId]: action.payload.result,
        },
      };
    
    case 'SET_CLAIM_VERIFYING':
      console.log('SET_CLAIM_VERIFYING action:', action.payload);
      const verifyingState = {
        ...state,
        claims: state.claims.map(claim =>
          claim.id === action.payload.claimId
            ? {
                ...claim,
                verificationState: action.payload.isVerifying
                  ? ('verifying-perplexity' as const)
                  : (claim.verificationState === 'verifying-perplexity' ? ('idle' as const) : claim.verificationState),
              }
            : claim
        ),
      };
      console.log('After SET_CLAIM_VERIFYING, claim state:', verifyingState.claims.find(c => c.id === action.payload.claimId));
      return verifyingState;
    
    case 'SET_CLAIM_VERIFIED':
      console.log('SET_CLAIM_VERIFIED action:', action.payload);
      console.log('Current claims before update:', state.claims);
      const updatedState = {
        ...state,
        claims: state.claims.map(claim => {
          if (claim.id === action.payload.claimId) {
            const updatedClaim = { ...claim, verificationState: 'verified-perplexity' as const };
            console.log('Updating claim from:', claim);
            console.log('Updating claim to:', updatedClaim);
            return updatedClaim;
          }
          return claim;
        }),
        perplexityResults: {
          ...state.perplexityResults,
          [action.payload.claimId]: action.payload.result,
        },
      };
      console.log('Updated state claims:', updatedState.claims);
      console.log('Updated claim:', updatedState.claims.find(c => c.id === action.payload.claimId));
      return updatedState;
    
    case 'SET_CLAIM_VERIFICATION_ERROR':
      return {
        ...state,
        claims: state.claims.map(claim =>
          claim.id === action.payload.claimId
            ? { ...claim, verificationState: 'verification-error' }
            : claim
        ),
        error: action.payload.error,
      };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
} 