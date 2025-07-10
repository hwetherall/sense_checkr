import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="spinner-container">
      <div className="spinner-content">
        <div className="spinner"></div>
        <p className="spinner-message">{message}</p>
      </div>
    </div>
  );
}

// Add spinner-specific styles
const styles = `
.spinner-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.spinner-message {
  font-size: 16px;
  color: var(--color-gray-600);
  margin: 0;
  animation: fadeIn var(--transition-medium) ease-out;
}
`;

export const loadingSpinnerStyles = styles; 