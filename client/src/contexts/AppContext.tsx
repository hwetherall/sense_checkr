import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction } from '../types';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const initialState: AppState = {
  appMode: 'memo',
  currentStep: 'input',
  memoText: '',
  claims: [],
  isLoading: false,
  error: null,
  processingTime: null,
  companyType: 'external',
  perplexityResults: {},
  documents: [],
  documentVerificationResults: {},
  // Link verification state
  linkText: '',
  links: [],
  // Mission state
  missions: [],
  currentMission: undefined,
  currentChapter: undefined,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_APP_MODE':
      return { 
        ...state, 
        appMode: action.payload,
        currentStep: action.payload === 'missions' ? 'dashboard' : 'input', // Go to dashboard for missions
        error: null // Clear any errors
      };
    
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
      const verificationType = action.payload.verificationType || 'perplexity';
      const verifyingState = {
        ...state,
        claims: state.claims.map(claim =>
          claim.id === action.payload.claimId
            ? {
                ...claim,
                verificationState: action.payload.isVerifying
                  ? (`verifying-${verificationType}` as const)
                  : (claim.verificationState === `verifying-${verificationType}` ? ('idle' as const) : claim.verificationState),
              }
            : claim
        ),
      };
      console.log('After SET_CLAIM_VERIFYING, claim state:', verifyingState.claims.find(c => c.id === action.payload.claimId));
      return verifyingState;
    
    case 'SET_CLAIM_VERIFIED':
      console.log('SET_CLAIM_VERIFIED action:', action.payload);
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
    
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload };
    
    case 'ADD_DOCUMENT':
      return { ...state, documents: [...state.documents, action.payload] };
    
    case 'REMOVE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter(doc => doc.id !== action.payload),
      };
    
    case 'SET_DOCUMENT_VERIFICATION_RESULT':
      return {
        ...state,
        documentVerificationResults: {
          ...state.documentVerificationResults,
          [action.payload.claimId]: action.payload.result,
        },
      };
    
    case 'SET_CLAIM_DOCUMENT_VERIFIED':
      console.log('SET_CLAIM_DOCUMENT_VERIFIED action:', action.payload);
      return {
        ...state,
        claims: state.claims.map(claim =>
          claim.id === action.payload.claimId
            ? { ...claim, verificationState: 'verified-document' as const }
            : claim
        ),
        documentVerificationResults: {
          ...state.documentVerificationResults,
          [action.payload.claimId]: action.payload.result,
        },
      };
    
    // Link verification actions
    case 'SET_LINK_TEXT':
      return { ...state, linkText: action.payload };
    
    case 'SET_LINKS':
      return { 
        ...state, 
        links: action.payload.map(link => ({
          ...link
        }))
      };
    
    case 'UPDATE_LINK_STATUS':
      return {
        ...state,
        links: state.links.map(link =>
          link.id === action.payload.id
            ? { ...link, status: action.payload.status }
            : link
        ),
      };
    
    // Mission actions
    case 'SET_MISSIONS':
      return { ...state, missions: action.payload };
    
    case 'ADD_MISSION':
      return { ...state, missions: [...state.missions, action.payload] };
    
    case 'UPDATE_MISSION':
      return {
        ...state,
        missions: state.missions.map(mission =>
          mission.id === action.payload.id ? action.payload : mission
        ),
        currentMission: state.currentMission?.id === action.payload.id 
          ? action.payload 
          : state.currentMission,
      };
    
    case 'SET_CURRENT_MISSION':
      return { ...state, currentMission: action.payload };
    
    case 'SET_CURRENT_CHAPTER':
      return { ...state, currentChapter: action.payload };
    
    case 'UPDATE_CHAPTER':
      return {
        ...state,
        missions: state.missions.map(mission =>
          mission.id === action.payload.missionId
            ? {
                ...mission,
                chapters: mission.chapters.map(chapter =>
                  chapter.id === action.payload.chapter.id ? action.payload.chapter : chapter
                ),
              }
            : mission
        ),
        currentMission: state.currentMission?.id === action.payload.missionId
          ? {
              ...state.currentMission,
              chapters: state.currentMission.chapters.map(chapter =>
                chapter.id === action.payload.chapter.id ? action.payload.chapter : chapter
              ),
            }
          : state.currentMission,
        currentChapter: state.currentChapter?.id === action.payload.chapter.id
          ? action.payload.chapter
          : state.currentChapter,
      };
    
    case 'UPDATE_CHAPTER_LINKS':
      return {
        ...state,
        missions: state.missions.map(mission => ({
          ...mission,
          chapters: mission.chapters.map(chapter =>
            chapter.id === action.payload.chapterId
              ? { ...chapter, links: action.payload.links }
              : chapter
          ),
        })),
        currentMission: state.currentMission
          ? {
              ...state.currentMission,
              chapters: state.currentMission.chapters.map(chapter =>
                chapter.id === action.payload.chapterId
                  ? { ...chapter, links: action.payload.links }
                  : chapter
              ),
            }
          : undefined,
        currentChapter: state.currentChapter?.id === action.payload.chapterId
          ? { ...state.currentChapter, links: action.payload.links }
          : state.currentChapter,
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