import React from 'react';
import { FileText, CheckCircle, Link } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function Header() {
  const { state, dispatch } = useApp();
  const { currentStep, appMode } = state;

  const handleModeChange = (mode: 'memo' | 'links') => {
    dispatch({ type: 'SET_APP_MODE', payload: mode });
  };

  const getStepLabels = () => {
    if (appMode === 'memo') {
      return { step1: 'Input Memo', step2: 'Verify Claims' };
    }
    return { step1: 'Input Text', step2: 'Verify Links' };
  };

  const stepLabels = getStepLabels();

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="header-brand">
            <h1 className="brand-title">
              <span className="brand-icon">
                <FileText size={32} />
              </span>
              Sense Checkr
            </h1>
            <p className="brand-subtitle">Professional Investment Analysis & Fact-Checking</p>
            
            <div className="header-tabs">
              <button
                onClick={() => handleModeChange('memo')}
                className={`tab-option ${appMode === 'memo' ? 'active' : ''}`}
                aria-pressed={appMode === 'memo'}
              >
                <FileText size={16} />
                Full Investment Memo
              </button>
              <div className="tab-divider"></div>
              <button
                onClick={() => handleModeChange('links')}
                className={`tab-option ${appMode === 'links' ? 'active' : ''}`}
                aria-pressed={appMode === 'links'}
              >
                <Link size={16} />
                Links
              </button>
            </div>
          </div>
          
          <nav className="header-nav">
            <div className="step-indicator">
              <div className={`step ${currentStep === 'input' ? 'active' : 'completed'}`}>
                <span className="step-number">1</span>
                <span className="step-label">{stepLabels.step1}</span>
              </div>
              <div className="step-connector"></div>
              <div className={`step ${currentStep === 'verify' ? 'active' : ''}`}>
                <span className="step-number">
                  {currentStep === 'verify' ? '2' : <CheckCircle size={20} />}
                </span>
                <span className="step-label">{stepLabels.step2}</span>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

 