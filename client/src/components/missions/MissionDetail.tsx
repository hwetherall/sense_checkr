import React, { useState } from 'react';
import { ArrowLeft, Plus, Play, Download, FileJson, AlertCircle, Check, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useMissions } from '../../hooks/useMissions';
import { ChapterCard } from './ChapterCard';
import { ChapterModal } from './ChapterModal';

export function MissionDetail() {
  const { state, dispatch } = useApp();
  const { currentMission } = state;
  const { 
    addChapter, 
    processChapter, 
    processAllChapters,
    exportMissionSummary,
    isProcessing,
    isExporting 
  } = useMissions();
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [processingChapterId, setProcessingChapterId] = useState<string | null>(null);

  if (!currentMission) {
    return null;
  }

  const handleBack = () => {
    dispatch({ type: 'SET_CURRENT_MISSION', payload: undefined });
    dispatch({ type: 'SET_CURRENT_CHAPTER', payload: undefined });
  };

  const handleAddChapter = async (name: string, jsonContent: string) => {
    try {
      await addChapter(currentMission.id, name, jsonContent);
      setShowAddChapter(false);
    } catch (error) {
      console.error('Failed to add chapter:', error);
    }
  };

  const handleProcessChapter = async (chapterId: string) => {
    setProcessingChapterId(chapterId);
    try {
      await processChapter(currentMission.id, chapterId);
    } catch (error) {
      console.error('Failed to process chapter:', error);
    } finally {
      setProcessingChapterId(null);
    }
  };

  const handleProcessAll = async () => {
    await processAllChapters(currentMission);
  };

  const handleExport = async (format: 'json' | 'pdf') => {
    try {
      const summary = await exportMissionSummary(currentMission.id);
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentMission.name.replace(/\s+/g, '_')}_summary.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For now, export PDF as formatted JSON
        // TODO: Implement proper PDF export for missions
        const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentMission.name.replace(/\s+/g, '_')}_summary.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleDirectExport = async () => {
    try {
      const summary = await exportMissionSummary(currentMission.id);
      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentMission.name.replace(/\s+/g, '_')}_summary.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const pendingChapters = currentMission.chapters.filter(ch => ch.status === 'pending');
  const completedChapters = currentMission.chapters.filter(ch => ch.status === 'completed');
  const hasUnverifiedLinks = currentMission.totalLinks > currentMission.verifiedLinks;

  return (
    <div className="mission-detail">
      <div className="detail-header">
        <button className="btn-icon" onClick={handleBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="header-info">
          <h2>{currentMission.name}</h2>
          {currentMission.description && (
            <p className="mission-description">{currentMission.description}</p>
          )}
        </div>
        <div className="header-actions">
          {pendingChapters.length > 0 && (
            <button 
              className="btn btn-secondary"
              onClick={handleProcessAll}
              disabled={isProcessing}
            >
              <Play size={16} />
              Process All ({pendingChapters.length})
            </button>
          )}
          <button 
            className="btn btn-primary"
            onClick={handleDirectExport}
            disabled={currentMission.chapters.length === 0 || isExporting}
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : 'Export Summary'}
          </button>
        </div>
      </div>

      <div className="mission-summary">
        <div className="summary-card">
          <FileJson size={24} />
          <div>
            <span className="summary-label">Chapters</span>
            <span className="summary-value">{currentMission.chapters.length}</span>
          </div>
        </div>
        <div className="summary-card">
          <Check size={24} className="text-green" />
          <div>
            <span className="summary-label">Completed</span>
            <span className="summary-value">{completedChapters.length}</span>
          </div>
        </div>
        <div className="summary-card">
          <AlertCircle size={24} className={hasUnverifiedLinks ? 'text-orange' : 'text-green'} />
          <div>
            <span className="summary-label">Links Verified</span>
            <span className="summary-value">
              {currentMission.verifiedLinks} / {currentMission.totalLinks}
            </span>
          </div>
        </div>
      </div>

      {state.error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {state.error}
        </div>
      )}

      <div className="chapters-section">
        <div className="section-header">
          <h3>Chapters</h3>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowAddChapter(true)}
          >
            <Plus size={16} />
            Add Chapter
          </button>
        </div>

        {currentMission.chapters.length === 0 ? (
          <div className="empty-state">
            <FileJson size={48} className="empty-icon" />
            <p>No chapters added yet</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddChapter(true)}
            >
              Add First Chapter
            </button>
          </div>
        ) : (
          <div className="chapters-list">
            {currentMission.chapters.map((chapter, index) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                chapterNumber={index + 1}
                missionId={currentMission.id}
                onProcess={handleProcessChapter}
                isProcessing={processingChapterId === chapter.id}
              />
            ))}
          </div>
        )}
      </div>

      {showAddChapter && (
        <ChapterModal
          onClose={() => setShowAddChapter(false)}
          onSubmit={handleAddChapter}
          chapterNumber={currentMission.chapters.length + 1}
        />
      )}
    </div>
  );
} 