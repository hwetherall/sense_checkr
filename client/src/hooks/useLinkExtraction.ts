import { useState, useCallback } from 'react';
import { Link } from '../types';
import { useApp } from '../contexts/AppContext';
import { apiUrl } from '../config/api';

export function useLinkExtraction() {
  const { dispatch } = useApp();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isMatchingClaims, setIsMatchingClaims] = useState(false);

  const extractLinks = useCallback(async (linkText: string) => {
    setIsExtracting(true);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Extract markdown links using regex
      const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      // Extract plain URLs using regex
      const urlRegex = /https?:\/\/[^\s\]},;"']+/g;
      const links: Link[] = [];
      let match;
      
      // First, extract markdown-formatted links
      while ((match = markdownLinkRegex.exec(linkText)) !== null) {
        const linkId = `link-${Date.now()}-${links.length}`;
        links.push({
          id: linkId,
          text: match[1], // Link text
          url: match[2],  // Link URL
          status: 'unverified'
        });
      }
      
      // Then, extract plain URLs that aren't already part of markdown links
      const markdownUrls = new Set(links.map(link => link.url));
      while ((match = urlRegex.exec(linkText)) !== null) {
        const url = match[0];
        // Skip if this URL is already captured as part of a markdown link
        if (!markdownUrls.has(url)) {
          const linkId = `link-${Date.now()}-${links.length}`;
          links.push({
            id: linkId,
            text: `Plain URL: ${url}`, // Generate descriptive text for plain URLs
            url: url,
            status: 'unverified'
          });
        }
      }

      // Set initial links
      dispatch({ type: 'SET_LINKS', payload: links });

      // If we have links, match them with claims
      if (links.length > 0) {
        await matchLinksWithClaims(linkText, links);
      }

      dispatch({ type: 'SET_STEP', payload: 'verify' });

      return links;
    } catch (error) {
      const errorMessage = 'Failed to extract links. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      setIsExtracting(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const matchLinksWithClaims = useCallback(async (linkText: string, links: Link[]) => {
    if (links.length === 0) return;

    setIsMatchingClaims(true);
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await fetch(apiUrl('/api/claims/match-sources'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkText,
          links: links.map(link => ({ id: link.id, url: link.url }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to match links with claims');
      }

      const data = await response.json();
      const { linkClaimMatches } = data;

      // Update links with their supported claims
      const updatedLinks = links.map(link => {
        const match = linkClaimMatches.find((m: any) => m.linkId === link.id);
        if (match) {
          return {
            ...link,
            supportedClaim: match.supportedClaim,
            contextSnippet: match.contextSnippet,
            claimConfidence: match.confidence
          };
        }
        return link;
      });

      dispatch({ type: 'SET_LINKS', payload: updatedLinks });
      console.log(`Successfully matched ${linkClaimMatches.length} links with claims`);

    } catch (error) {
      console.error('Error matching links with claims:', error);
      // Don't throw error here, just log it - the link extraction still succeeded
    } finally {
      setIsMatchingClaims(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const updateLinkStatus = useCallback(
    (linkId: string, status: Link['status']) => {
      dispatch({
        type: 'UPDATE_LINK_STATUS',
        payload: { id: linkId, status },
      });
    },
    [dispatch]
  );

  return {
    extractLinks,
    updateLinkStatus,
    isExtracting: isExtracting || isMatchingClaims,
  };
} 