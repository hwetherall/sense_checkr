import { useState, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { Mission, Chapter, Link, MissionSummary } from '../types';
import { apiUrl } from '../config/api';

export function useMissions() {
  const { state, dispatch } = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all missions
  const fetchMissions = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(apiUrl('/api/missions'));
      if (!response.ok) throw new Error('Failed to fetch missions');
      
      const data = await response.json();
      dispatch({ type: 'SET_MISSIONS', payload: data.missions });
      return data.missions;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch missions' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  // Create new mission
  const createMission = useCallback(async (name: string, description?: string) => {
    setIsCreating(true);
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await fetch(apiUrl('/api/missions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      
      if (!response.ok) throw new Error('Failed to create mission');
      
      const data = await response.json();
      dispatch({ type: 'ADD_MISSION', payload: data.mission });
      dispatch({ type: 'SET_CURRENT_MISSION', payload: data.mission });
      
      return data.mission;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create mission';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [dispatch]);

  // Add chapter to mission
  const addChapter = useCallback(async (missionId: string, name: string, jsonContent: string) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await fetch(apiUrl(`/api/missions/${missionId}/chapters`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, jsonContent }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add chapter');
      }
      
      const data = await response.json();
      
      // Fetch updated mission
      const missionResponse = await fetch(apiUrl(`/api/missions/${missionId}`));
      const missionData = await missionResponse.json();
      
      dispatch({ type: 'UPDATE_MISSION', payload: missionData.mission });
      
      return data.chapter;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add chapter';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [dispatch]);

  // Process chapter (extract links)
  const processChapter = useCallback(async (missionId: string, chapterId: string) => {
    setIsProcessing(true);
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await fetch(apiUrl(`/api/missions/${missionId}/chapters/${chapterId}/process`), {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to process chapter');
      
      const data = await response.json();
      
      // Update chapter in state
      dispatch({ 
        type: 'UPDATE_CHAPTER', 
        payload: { missionId, chapter: data.chapter } 
      });
      
      return data.chapter;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process chapter';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch]);

  // Update link status
  const updateLinkStatus = useCallback(async (
    missionId: string, 
    chapterId: string, 
    linkId: string, 
    status: Link['status']
  ) => {
    try {
      const response = await fetch(
        apiUrl(`/api/missions/${missionId}/chapters/${chapterId}/links/${linkId}/verify`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      
      if (!response.ok) throw new Error('Failed to update link status');
      
      const data = await response.json();
      
      // Update link in current chapter
      if (state.currentChapter?.id === chapterId) {
        const updatedLinks = state.currentChapter.links.map(link =>
          link.id === linkId ? { ...link, status } : link
        );
        
        dispatch({
          type: 'UPDATE_CHAPTER_LINKS',
          payload: { chapterId, links: updatedLinks }
        });
      }
      
      // Fetch updated mission to get new totals
      const missionResponse = await fetch(apiUrl(`/api/missions/${missionId}`));
      const missionData = await missionResponse.json();
      dispatch({ type: 'UPDATE_MISSION', payload: missionData.mission });
      
    } catch (error) {
      console.error('Error updating link status:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update link status' });
    }
  }, [state.currentChapter, dispatch]);

  // Export mission summary
  const exportMissionSummary = useCallback(async (missionId: string): Promise<MissionSummary> => {
    setIsExporting(true);
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await fetch(apiUrl(`/api/missions/${missionId}/export`));
      if (!response.ok) throw new Error('Failed to export mission summary');
      
      const data = await response.json();
      return data.summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export summary';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [dispatch]);

  // Process all pending chapters in sequence
  const processAllChapters = useCallback(async (mission: Mission) => {
    const pendingChapters = mission.chapters.filter(ch => ch.status === 'pending');
    
    for (const chapter of pendingChapters) {
      try {
        await processChapter(mission.id, chapter.id);
        // Add a small delay between chapters to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to process chapter ${chapter.name}:`, error);
        // Continue with next chapter even if one fails
      }
    }
  }, [processChapter]);

  return {
    missions: state.missions,
    currentMission: state.currentMission,
    currentChapter: state.currentChapter,
    isCreating,
    isProcessing,
    isExporting,
    fetchMissions,
    createMission,
    addChapter,
    processChapter,
    updateLinkStatus,
    exportMissionSummary,
    processAllChapters,
  };
} 