import React from 'react';
import { FileText, CheckCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function Header() {
  const { state } = useApp();
  const { currentStep } = state;

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
            <p className="brand-subtitle">Professional Investment Memo Fact-Checking</p>
          </div>
          
          <nav className="header-nav">
            <div className="step-indicator">
              <div className={`step ${currentStep === 'input' ? 'active' : 'completed'}`}>
                <span className="step-number">1</span>
                <span className="step-label">Input Memo</span>
              </div>
              <div className="step-connector"></div>
              <div className={`step ${currentStep === 'verify' ? 'active' : ''}`}>
                <span className="step-number">
                  {currentStep === 'verify' ? '2' : <CheckCircle size={20} />}
                </span>
                <span className="step-label">Verify Claims</span>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

// Add styles
const styles = `
.header {
  background-color: white;
  border-bottom: 2px solid var(--color-primary);
  padding: var(--spacing-lg) 0;
  box-shadow: var(--shadow-sm);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-brand {
  display: flex;
  flex-direction: column;
}

.brand-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 28px;
  font-weight: bold;
  color: var(--color-secondary);
  margin: 0;
}

.brand-icon {
  color: var(--color-primary);
}

.brand-subtitle {
  font-size: 14px;
  color: var(--color-gray-600);
  margin: 4px 0 0 48px;
}

.header-nav {
  display: flex;
  align-items: center;
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.step {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  transition: all var(--transition-medium);
}

.step.active {
  background-color: var(--color-gray-100);
}

.step.completed .step-number {
  color: var(--color-success);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--color-gray-200);
  font-weight: 600;
  font-size: 14px;
  transition: all var(--transition-medium);
}

.step.active .step-number {
  background-color: var(--color-primary);
  color: white;
}

.step-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-secondary);
}

.step-connector {
  width: 40px;
  height: 2px;
  background-color: var(--color-gray-300);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: var(--spacing-lg);
  }
  
  .brand-subtitle {
    margin-left: 0;
  }
}
`;

// Export styles for inclusion in main CSS
export const headerStyles = styles; 