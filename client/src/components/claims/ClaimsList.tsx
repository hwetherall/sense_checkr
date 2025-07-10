import React from 'react';
import { ClaimCard } from './ClaimCard';
import { Claim } from '../../types';

interface ClaimsListProps {
  claims: Claim[];
  onClaimHover?: (claimId: string | null) => void;
}

export function ClaimsList({ claims, onClaimHover }: ClaimsListProps) {
  if (claims.length === 0) {
    return (
      <div className="empty-state">
        <p className="body-large">No claims found in the memo.</p>
      </div>
    );
  }

  const categorizedClaims = claims.reduce((acc, claim) => {
    if (!acc[claim.category]) {
      acc[claim.category] = [];
    }
    acc[claim.category].push(claim);
    return acc;
  }, {} as Record<string, Claim[]>);

  const categoryOrder = ['financial', 'market', 'operational', 'other'];
  const sortedCategories = Object.keys(categorizedClaims).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <div className="claims-list">
      {sortedCategories.map((category) => (
        <div key={category} className="claims-category">
          <h3 className="category-title">
            {category.charAt(0).toUpperCase() + category.slice(1)} Claims
            <span className="category-count">
              ({categorizedClaims[category].length})
            </span>
          </h3>
          <div className="claims-grid">
            {categorizedClaims[category].map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onHover={onClaimHover}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Add component-specific styles
const styles = `
.claims-list {
  padding: var(--spacing-lg) 0;
}

.claims-category {
  margin-bottom: var(--spacing-xxl);
}

.category-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-secondary);
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
}

.category-count {
  font-size: 16px;
  font-weight: normal;
  color: var(--color-gray-600);
}

.claims-grid {
  display: grid;
  gap: var(--spacing-lg);
  grid-template-columns: 1fr;
}

@media (min-width: 1200px) {
  .claims-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .claims-list {
    padding: var(--spacing-md) 0;
  }
  
  .claims-category {
    margin-bottom: var(--spacing-xl);
  }
}
`;

export const claimsListStyles = styles; 