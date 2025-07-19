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
      // Improved URL regex that avoids trailing punctuation
      const urlRegex = /https?:\/\/[^\s\]},;"'<>()]+/g;
      const links: Link[] = [];
      let match;
      
      // Helper function to clean URLs by removing trailing punctuation
      const cleanUrl = (url: string): string => {
        // Remove trailing punctuation characters that commonly appear after URLs
        return url.replace(/[.,;:!?\]}>)\-_]+$/, '');
      };
      
      // First, extract markdown-formatted links
      while ((match = markdownLinkRegex.exec(linkText)) !== null) {
        const linkId = `link-${Date.now()}-${links.length}`;
        const cleanedUrl = cleanUrl(match[2]);
        links.push({
          id: linkId,
          text: match[1], // Link text
          url: cleanedUrl,  // Cleaned URL
          status: 'unverified'
        });
      }
      
      // Then, extract plain URLs that aren't already part of markdown links
      const markdownUrls = new Set(links.map(link => link.url));
      while ((match = urlRegex.exec(linkText)) !== null) {
        const url = match[0];
        const cleanedUrl = cleanUrl(url);
        
        // Skip if this URL is already captured as part of a markdown link
        // Also check if cleaned URL is already captured
        if (!markdownUrls.has(url) && !markdownUrls.has(cleanedUrl)) {
          const linkId = `link-${Date.now()}-${links.length}`;
          links.push({
            id: linkId,
            text: `Plain URL: ${cleanedUrl.substring(0, 50)}...`, // Use cleaned URL for display
            url: cleanedUrl,
            status: 'unverified'
          });
          // Add to set to prevent duplicates
          markdownUrls.add(cleanedUrl);
        }
      }

      // Set initial links
      dispatch({ type: 'SET_LINKS', payload: links });

      // If we have links, validate them and match with claims
      if (links.length > 0) {
        // First validate the links
        const validatedLinks = await validateLinks(links);
        console.log('Links after validation:', validatedLinks.map((link: Link) => ({ id: link.id, status: link.status, validationStatus: link.validationStatus })));
        
        // Then match them with claims (this preserves the validation status and classification)
        // Note: matchLinksWithClaims will dispatch the final state with both validation and claim data
        await matchLinksWithClaims(linkText, validatedLinks);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const validateLinks = useCallback(async (links: Link[]) => {
    if (links.length === 0) return links;

    console.log(`Starting validation of ${links.length} links...`);

    try {
      const response = await fetch(apiUrl('/api/links/validate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ links }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate links');
      }

      const data = await response.json();
      const { validatedLinks } = data;

      // Auto-classify links based on validation results
      const classifiedLinks = validatedLinks.map((link: Link) => {
        let status = link.status; // Keep original status by default

        // Auto-classify based on validation results
        if (link.validationStatus === 'broken') {
          status = 'invalid'; // Mark broken links as invalid
        } else if (link.validationStatus === 'restricted') {
          status = 'suspicious'; // Mark restricted links as suspicious
        }
        // Note: Don't auto-classify 'working' links as 'valid' since they still need content verification

        return {
          ...link,
          status
        };
      });

      console.log(`Successfully validated ${classifiedLinks.length} links`);
      return classifiedLinks;

    } catch (error) {
      console.error('Error validating links:', error);
      // Return original links with pending validation status if validation fails
      return links.map(link => ({
        ...link,
        validationStatus: 'error' as const,
        validationError: 'Validation service unavailable'
      }));
    }
  }, []);

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