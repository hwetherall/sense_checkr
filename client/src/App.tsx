import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { MemoInput } from './components/memo/MemoInput';
import { MemoHighlighter } from './components/memo/MemoHighlighter';
import { LinkInput } from './components/links/LinkInput';
import { LinkHighlighter } from './components/links/LinkHighlighter';
import './styles/index.css';

function AppContent() {
  const { state } = useApp();
  const { appMode, currentStep, isLoading } = state;

  const getLoadingMessage = () => {
    if (appMode === 'memo') {
      return 'Extracting claims from your investment memo...';
    }
    return 'Extracting links and matching them with claims...';
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner message={getLoadingMessage()} />;
    }

    if (appMode === 'memo') {
      return (
        <>
          {currentStep === 'input' && <MemoInput />}
          {currentStep === 'verify' && <MemoHighlighter />}
        </>
      );
    }

    if (appMode === 'links') {
      return (
        <>
          {currentStep === 'input' && <LinkInput />}
          {currentStep === 'verify' && <LinkHighlighter />}
        </>
      );
    }

    return null;
  };

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="container">
          {renderContent()}
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
