import { useMemo, useCallback } from 'react';
import { usePlanner } from '../../contexts/PlannerContext';
import { useAlliance } from '../../contexts/AllianceContext';
import { useTimeline } from '../../contexts/TimelineContext';
import './PlaybackOverlay.css';

export function PlaybackOverlay() {
  const {
    isPlaying,
    playIndex,
    sequence,
    setPlayIndex,
    setIsPlaying,
  } = usePlanner();
  const { allAlliances } = useAlliance();
  const { currentDay } = useTimeline();

  // Calculate all alliances involved and their move counts up to current playIndex
  const playbackInfo = useMemo(() => {
    if (!isPlaying || playIndex < 0 || sequence.length === 0) {
      return null;
    }

    const currentItem = sequence[playIndex];

    // Get all unique alliances in the entire sequence
    const allianceIds = new Set();
    sequence.forEach(item => {
      if (item.type === 'move') {
        allianceIds.add(item.allianceId);
      }
    });

    // Calculate current day and moves per alliance up to playIndex
    let dayNumber = currentDay;
    const movesPerAllianceThisDay = {};

    // Initialize all alliances with 0 moves
    allianceIds.forEach(id => {
      movesPerAllianceThisDay[id] = 0;
    });

    for (let i = 0; i <= playIndex; i++) {
      const item = sequence[i];
      if (item.type === 'new_day') {
        dayNumber++;
        // Reset move counts for new day
        Object.keys(movesPerAllianceThisDay).forEach(key => {
          movesPerAllianceThisDay[key] = 0;
        });
      } else if (item.type === 'move' && item.action === 'claim') {
        movesPerAllianceThisDay[item.allianceId]++;
      }
    }

    // Build alliance info array with move counts
    const alliances = Array.from(allianceIds).map(id => {
      const alliance = allAlliances.find(a => a.id === id);
      return {
        id,
        name: alliance?.name || 'Unknown',
        color: alliance?.color || '#666',
        movesThisDay: movesPerAllianceThisDay[id] || 0,
        isCurrentTurn: currentItem.type === 'move' && currentItem.allianceId === id,
      };
    });

    // Check if we just started a new day
    const isNewDay = currentItem.type === 'new_day';

    return {
      isNewDay,
      dayNumber,
      alliances,
      currentAction: currentItem.type === 'move' ? currentItem.action : null,
    };
  }, [isPlaying, playIndex, sequence, allAlliances, currentDay]);

  // Step navigation handlers
  const handlePrevStep = useCallback(() => {
    if (playIndex > 0) {
      setPlayIndex(playIndex - 1);
    }
  }, [playIndex, setPlayIndex]);

  const handleNextStep = useCallback(() => {
    if (playIndex < sequence.length - 1) {
      setPlayIndex(playIndex + 1);
    }
  }, [playIndex, sequence.length, setPlayIndex]);

  // Close playback overlay
  const handleClose = useCallback(() => {
    setIsPlaying(false);
    setPlayIndex(-1);
  }, [setIsPlaying, setPlayIndex]);

  if (!playbackInfo) {
    return null;
  }

  // Show new day overlay (in addition to the panel)
  const newDayOverlay = playbackInfo.isNewDay && (
    <div className="playback-new-day-overlay">
      <div className="new-day-banner">
        <div className="new-day-icon">📅</div>
        <div className="new-day-text">Day {playbackInfo.dayNumber}</div>
        <div className="new-day-subtitle">New Day Begins</div>
      </div>
    </div>
  );

  return (
    <>
      {newDayOverlay}
      <div className="playback-panel">
        <div className="playback-panel-header">
          <span className="playback-panel-title">Day {playbackInfo.dayNumber}</span>
          <button
            className="playback-close-btn"
            onClick={handleClose}
            title="Close playback"
          >
            <svg className="playback-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Step Navigation */}
        <div className="playback-nav">
          <button
            className="playback-nav-btn"
            onClick={handlePrevStep}
            disabled={playIndex <= 0}
            title="Previous step"
          >
            <svg className="playback-nav-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <span className="playback-step-counter">
            Step {playIndex + 1} / {sequence.length}
          </span>
          <button
            className="playback-nav-btn"
            onClick={handleNextStep}
            disabled={playIndex >= sequence.length - 1}
            title="Next step"
          >
            <svg className="playback-nav-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
            </svg>
          </button>
        </div>

        <div className="playback-alliances">
          {playbackInfo.alliances.map(alliance => (
            <div
              key={alliance.id}
              className={`playback-alliance-row ${alliance.isCurrentTurn ? 'playback-alliance-row--active' : ''}`}
            >
              <div className="playback-alliance-info">
                <div
                  className="playback-alliance-color"
                  style={{ backgroundColor: alliance.color }}
                />
                <span className="playback-alliance-name">{alliance.name}</span>
              </div>
              <div className="playback-alliance-moves">
                <div className="playback-moves-bar">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`playback-move-pip ${i <= alliance.movesThisDay ? 'playback-move-pip--filled' : ''}`}
                      style={i <= alliance.movesThisDay ? { backgroundColor: alliance.color } : {}}
                    />
                  ))}
                </div>
                <span className="playback-moves-text">{alliance.movesThisDay}/3</span>
              </div>
              {alliance.isCurrentTurn && playbackInfo.currentAction && (
                <span className={`playback-action-badge playback-action-badge--${playbackInfo.currentAction}`}>
                  {playbackInfo.currentAction === 'claim' ? 'Claiming' : 'Unclaiming'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
