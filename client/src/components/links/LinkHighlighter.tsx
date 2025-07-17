import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { LinksList } from './LinksList';
import { LinkProgressIndicator } from './LinkProgressIndicator';

export function LinkHighlighter() {
  const { state, dispatch } = useApp();
  const { linkText, links } = state;
  const [isTextCollapsed, setIsTextCollapsed] = useState(true);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const highlightedText = useMemo(() => {
    if (!linkText || links.length === 0) return linkText;

    let highlightedContent = linkText;
    let processedLinks = [];

    // Separate markdown links from plain URLs
    const markdownLinks = links.filter(link => !link.text.startsWith('Plain URL:'));
    const plainUrls = links.filter(link => link.text.startsWith('Plain URL:'));

    // Process markdown links first (in reverse order to maintain correct positions)
    const sortedMarkdownLinks = [...markdownLinks].sort((a, b) => {
      const aIndex = linkText.indexOf(`[${a.text}](${a.url})`);
      const bIndex = linkText.indexOf(`[${b.text}](${b.url})`);
      return bIndex - aIndex;
    });

    sortedMarkdownLinks.forEach((link) => {
      const linkMarkdown = `[${link.text}](${link.url})`;
      const linkIndex = highlightedContent.indexOf(linkMarkdown);
      
      if (linkIndex !== -1) {
        const beforeLink = highlightedContent.substring(0, linkIndex);
        const afterLink = highlightedContent.substring(linkIndex + linkMarkdown.length);
        
        const isHovered = hoveredLinkId === link.id;
        const highlightedLink = `<span class="highlighted-link status-${link.status} ${isHovered ? 'hovered' : ''}" data-link-id="${link.id}">${linkMarkdown}</span>`;
        
        highlightedContent = beforeLink + highlightedLink + afterLink;
        processedLinks.push(link);
      }
    });

    // Process plain URLs (in reverse order by position to maintain correct positions)
    const sortedPlainUrls = [...plainUrls].sort((a, b) => {
      const aIndex = highlightedContent.lastIndexOf(a.url);
      const bIndex = highlightedContent.lastIndexOf(b.url);
      return bIndex - aIndex;
    });

    sortedPlainUrls.forEach((link) => {
      // Find all instances of this URL that aren't already highlighted
      let searchStartIndex = 0;
      let urlIndex;
      
      while ((urlIndex = highlightedContent.indexOf(link.url, searchStartIndex)) !== -1) {
        // Check if this URL is already inside a highlighted span
        const beforeUrl = highlightedContent.substring(0, urlIndex);
        const openSpanCount = (beforeUrl.match(/<span[^>]*class="highlighted-link/g) || []).length;
        const closeSpanCount = (beforeUrl.match(/<\/span>/g) || []).length;
        
        // If we're not inside a span, highlight this URL
        if (openSpanCount === closeSpanCount) {
          const beforeLink = highlightedContent.substring(0, urlIndex);
          const afterLink = highlightedContent.substring(urlIndex + link.url.length);
          
          const isHovered = hoveredLinkId === link.id;
          const highlightedLink = `<span class="highlighted-link status-${link.status} ${isHovered ? 'hovered' : ''}" data-link-id="${link.id}">${link.url}</span>`;
          
          highlightedContent = beforeLink + highlightedLink + afterLink;
          processedLinks.push(link);
          break; // Only highlight the first occurrence to avoid duplicates
        }
        
        searchStartIndex = urlIndex + 1;
      }
    });

    return highlightedContent;
  }, [linkText, links, hoveredLinkId]);

  // Scroll to highlighted link when hovering
  useEffect(() => {
    if (hoveredLinkId && textRef.current) {
      const element = textRef.current.querySelector(`[data-link-id="${hoveredLinkId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [hoveredLinkId]);

  const handleBackToInput = () => {
    dispatch({ type: 'RESET' });
  };

  const toggleTextCollapse = () => {
    setIsTextCollapsed(!isTextCollapsed);
  };

  const handleLinkHover = (linkId: string | null) => {
    setHoveredLinkId(linkId);
  };

  return (
    <div className="memo-highlighter link-highlighter">
      <div className="highlighter-header">
        <button onClick={handleBackToInput} className="btn btn-ghost btn-icon">
          <ArrowLeft size={20} />
          Back to Input
        </button>
        <h2 className="headline-2">Verify Links for Hallucinations</h2>
        <p className="body-medium" style={{ color: 'var(--color-gray-600)', marginTop: '8px' }}>
          Review {links.length} extracted links to identify potential hallucinations or invalid references
        </p>
      </div>

      <div className={`highlighter-content ${isTextCollapsed ? 'text-collapsed' : ''}`}>
        <div className={`text-panel ${isTextCollapsed ? 'collapsed' : ''}`}>
          {!isTextCollapsed && (
            <div className="panel-header">
              <div className="panel-header-content">
                <h3 className="headline-3">Original Text</h3>
                <p className="body-small">Hover over links below to highlight them in the text</p>
              </div>
            </div>
          )}
          {!isTextCollapsed && (
            <div ref={textRef} className="memo-text-container">
              <div 
                className="memo-text" 
                dangerouslySetInnerHTML={{ __html: highlightedText.replace(/\n/g, '<br>') }}
              />
            </div>
          )}
        </div>

        <div className="claims-panel links-panel">
          <div className="progress-wrapper">
            <LinkProgressIndicator 
              links={links} 
              isTextCollapsed={isTextCollapsed}
              onToggleTextCollapse={toggleTextCollapse}
            />
          </div>
          <div className="claims-list-wrapper">
            <LinksList links={links} onLinkHover={handleLinkHover} />
          </div>
        </div>
      </div>
    </div>
  );
}

 