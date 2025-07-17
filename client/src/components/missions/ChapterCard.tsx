import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Play, AlertCircle, Check, X, Link as LinkIcon } from 'lucide-react';
import { Chapter } from '../../types';
import { useMissions } from '../../hooks/useMissions';
import { useApp } from '../../contexts/AppContext';

interface ChapterCardProps {
  chapter: Chapter;
  chapterNumber: number;
  missionId: string;
  onProcess: (chapterId: string) => void;
  isProcessing: boolean;
}

export function ChapterCard({ 
  chapter, 
  chapterNumber, 
  missionId, 
  onProcess, 
  isProcessing 
}: ChapterCardProps) {
  const { dispatch } = useApp();
  const { updateLinkStatus } = useMissions();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);

  const handleViewChapter = () => {
    dispatch({ type: 'SET_CURRENT_CHAPTER', payload: chapter });
  };

  const handleLinkStatusChange = async (linkId: string, status: 'valid' | 'invalid' | 'suspicious') => {
    await updateLinkStatus(missionId, chapter.id, linkId, status);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check size={16} className="text-green" />;
      case 'error':
        return <X size={16} className="text-red" />;
      case 'processing':
        return <div className="spinner-small" />;
      default:
        return null;
    }
  };

  const getStatusClass = () => {
    switch (chapter.status) {
      case 'completed':
        return 'status-completed';
      case 'error':
        return 'status-error';
      case 'processing':
        return 'status-processing';
      default:
        return 'status-pending';
    }
  };

  return (
    <div className={`chapter-card ${getStatusClass()}`}>
      <div className="chapter-header">
        <div className="chapter-info">
          <h4>Chapter {chapterNumber}: {chapter.name}</h4>
          <div className="chapter-meta">
            <span className="status-badge">
              {getStatusIcon(chapter.status)}
              {chapter.status}
            </span>
            {chapter.links.length > 0 && (
              <span className="link-count">
                <LinkIcon size={14} />
                {chapter.links.length} links
              </span>
            )}
          </div>
        </div>
        
        <div className="chapter-actions">
          {chapter.status === 'pending' && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => onProcess(chapter.id)}
              disabled={isProcessing}
            >
              <Play size={14} />
              Process
            </button>
          )}
          
          {chapter.status === 'completed' && chapter.links.length > 0 && (
            <button 
              className="btn btn-text btn-sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded ? 'Hide' : 'Show'} Links
            </button>
          )}
        </div>
      </div>

      {chapter.status === 'error' && chapter.error && (
        <div className="chapter-error">
          <AlertCircle size={16} />
          {chapter.error}
        </div>
      )}

      {chapter.summary && (
        <div className="chapter-summary">
          <div className="summary-stats">
            <span className="stat valid">
              <Check size={14} />
              {chapter.summary.validLinks} valid
            </span>
            <span className="stat invalid">
              <X size={14} />
              {chapter.summary.invalidLinks} broken
            </span>
            <span className="stat suspicious">
              <AlertCircle size={14} />
              {chapter.summary.suspiciousLinks} suspicious
            </span>
            {chapter.summary.unverifiedLinks > 0 && (
              <span className="stat unverified">
                {chapter.summary.unverifiedLinks} unverified
              </span>
            )}
          </div>
          
          {chapter.summary.keyFindings && chapter.summary.keyFindings.length > 0 && (
            <div className="key-findings">
              {chapter.summary.keyFindings.map((finding, index) => (
                <div key={index} className="finding">{finding}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {isExpanded && chapter.links.length > 0 && (
        <div className="chapter-links">
          {chapter.links.map((link) => (
            <div key={link.id} className="link-item">
              <div className="link-header">
                <div className="link-info">
                  <span className="link-text">{link.text}</span>
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link-url"
                  >
                    {link.url}
                  </a>
                </div>
                
                <div className="link-status">
                  {link.status === 'unverified' ? (
                    <div className="verify-buttons">
                      <button 
                        className="btn-icon btn-sm valid"
                        title="Mark as valid"
                        onClick={() => handleLinkStatusChange(link.id, 'valid')}
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        className="btn-icon btn-sm invalid"
                        title="Mark as broken"
                        onClick={() => handleLinkStatusChange(link.id, 'invalid')}
                      >
                        <X size={14} />
                      </button>
                      <button 
                        className="btn-icon btn-sm suspicious"
                        title="Mark as suspicious"
                        onClick={() => handleLinkStatusChange(link.id, 'suspicious')}
                      >
                        <AlertCircle size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className={`status-badge status-${link.status}`}>
                      {link.status === 'valid' && <Check size={14} />}
                      {link.status === 'invalid' && <X size={14} />}
                      {link.status === 'suspicious' && <AlertCircle size={14} />}
                      {link.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 