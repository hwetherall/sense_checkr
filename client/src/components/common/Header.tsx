import React from 'react';
import { CheckSquare, Link, Target } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function Header() {
  const { state, dispatch } = useApp();
  const { appMode } = state;

  const handleModeChange = (mode: 'memo' | 'links' | 'missions') => {
    dispatch({ type: 'SET_APP_MODE', payload: mode });
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <CheckSquare size={28} className="logo" />
          <h1>Sense Checkr</h1>
        </div>
        
        <nav className="header-nav">
          <button 
            className={`nav-tab ${appMode === 'memo' ? 'active' : ''}`}
            onClick={() => handleModeChange('memo')}
          >
            <CheckSquare size={20} />
            Memo Analysis
          </button>
          <button 
            className={`nav-tab ${appMode === 'links' ? 'active' : ''}`}
            onClick={() => handleModeChange('links')}
          >
            <Link size={20} />
            Link Verification
          </button>
          <button 
            className={`nav-tab ${appMode === 'missions' ? 'active' : ''}`}
            onClick={() => handleModeChange('missions')}
          >
            <Target size={20} />
            Missions
          </button>
        </nav>
      </div>
    </header>
  );
}

 