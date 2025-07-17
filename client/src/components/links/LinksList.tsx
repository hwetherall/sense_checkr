import React from 'react';
import { LinkCard } from './LinkCard';
import { Link } from '../../types';

interface LinksListProps {
  links: Link[];
  onLinkHover?: (linkId: string | null) => void;
}

export function LinksList({ links, onLinkHover }: LinksListProps) {
  if (links.length === 0) {
    return (
      <div className="empty-state">
        <p className="body-large">No links found in the text.</p>
        <p className="body-small">Make sure your text contains markdown-formatted links like [text](url)</p>
      </div>
    );
  }

  // Group links by status for better organization
  const linksByStatus = links.reduce((acc, link) => {
    if (!acc[link.status]) {
      acc[link.status] = [];
    }
    acc[link.status].push(link);
    return acc;
  }, {} as Record<string, Link[]>);

  // Define status order for display - unverified first, then by severity
  const statusOrder = ['unverified', 'suspicious', 'invalid', 'valid'];
  const sortedStatuses = Object.keys(linksByStatus).sort(
    (a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b)
  );

  const getStatusTitle = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Valid Links';
      case 'invalid':
        return 'Invalid Links';
      case 'suspicious':
        return 'Suspicious Links';
      default:
        return 'Unverified Links';
    }
  };

  return (
    <div className="claims-list links-list">
      {sortedStatuses.map((status) => (
        <div key={status} className="claims-category">
          <h3 className="category-title">
            {getStatusTitle(status)}
            <span className="category-count">
              ({linksByStatus[status].length})
            </span>
          </h3>
          <div className="claims-grid">
            {linksByStatus[status].map((link) => (
              <LinkCard key={link.id} link={link} onHover={onLinkHover} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

 