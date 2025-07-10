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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SET_MEMO_TEXT':
      return { ...state, memoText: action.payload };
    
    case 'SET_CLAIMS':
      return { ...state, claims: action.payload };
    
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