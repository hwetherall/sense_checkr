import { useState, useCallback } from 'react';
import { Link } from '../types';
import { useApp } from '../contexts/AppContext';

export function useLinkExtraction() {
  const { dispatch } = useApp();
  const [isExtracting, setIsExtracting] = useState(false);

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

      dispatch({ type: 'SET_LINKS', payload: links });
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
    isExtracting,
  };
} 