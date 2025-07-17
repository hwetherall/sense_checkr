import React, { useEffect, useState } from 'react';
import { Plus, Folder, ChevronRight, Download, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useMissions } from '../../hooks/useMissions';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MissionModal } from './MissionModal';
import { MissionDetail } from './MissionDetail';

export function MissionDashboard() {
  const { state, dispatch } = useApp();
  const { 
    missions, 
    currentMission, 
    fetchMissions, 
    createMission,
    isCreating 
  } = useMissions();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleCreateMission = async (name: string, description?: string) => {
    try {
      await createMission(name, description);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create mission:', error);
    }
  };

  const handleSelectMission = (missionId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (mission) {
      dispatch({ type: 'SET_CURRENT_MISSION', payload: mission });
    }
  };

  if (state.isLoading && missions.length === 0) {
    return <LoadingSpinner message="Loading missions..." />;
  }

  if (currentMission) {
    return <MissionDetail />;
  }

  return (
    <div className="mission-dashboard">
      <div className="dashboard-header">
        <h2>Missions</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={20} />
          New Mission
        </button>
      </div>

      {state.error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {state.error}
        </div>
      )}

      {missions.length === 0 ? (
        <div className="empty-state">
          <Folder size={64} className="empty-icon" />
          <h3>No missions yet</h3>
          <p>Create your first mission to start analyzing JSON documents</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={20} />
            Create Mission
          </button>
        </div>
      ) : (
        <div className="missions-grid">
          {missions.map(mission => (
            <div 
              key={mission.id} 
              className="mission-card"
              onClick={() => handleSelectMission(mission.id)}
            >
              <div className="mission-card-header">
                <h3>{mission.name}</h3>
                <span className={`status-badge status-${mission.status}`}>
                  {mission.status}
                </span>
              </div>
              
              {mission.description && (
                <p className="mission-description">{mission.description}</p>
              )}
              
              <div className="mission-stats">
                <div className="stat">
                  <span className="stat-label">Chapters</span>
                  <span className="stat-value">{mission.chapters.length}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Links</span>
                  <span className="stat-value">{mission.totalLinks}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Verified</span>
                  <span className="stat-value">
                    {mission.totalLinks > 0 
                      ? Math.round((mission.verifiedLinks / mission.totalLinks) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
              
              <div className="mission-actions">
                <button className="btn btn-text">
                  View Details
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <MissionModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateMission}
          isLoading={isCreating}
        />
      )}
    </div>
  );
} 