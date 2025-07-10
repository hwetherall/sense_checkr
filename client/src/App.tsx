import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { MemoInput } from './components/memo/MemoInput';
import { MemoHighlighter } from './components/memo/MemoHighlighter';
import './styles/index.css';

function AppContent() {
  const { state } = useApp();
  const { currentStep, isLoading } = state;

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="container">
          {isLoading ? (
            <LoadingSpinner message="Extracting claims from your investment memo..." />
          ) : (
            <>
              {currentStep === 'input' && <MemoInput />}
              {currentStep === 'verify' && <MemoHighlighter />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
