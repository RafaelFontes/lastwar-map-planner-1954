import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useTimeline } from '../../contexts/TimelineContext';

export function Header({ scale, onZoom }) {
  const { user, loading, signInWithDiscord, signOut, isSupabaseConfigured } = useAuth();
  const { displayName, setShowProfileModal } = useProfile();
  const {
    currentDay,
    selectedDay,
    isViewingCurrentDay,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    getTimeUntilNextDay,
    formatTimeRemaining,
  } = useTimeline();
  const zoomLevel = Math.round(scale * 100);

  // Countdown timer state
  const [timeRemaining, setTimeRemaining] = useState(() => formatTimeRemaining(getTimeUntilNextDay()));

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(getTimeUntilNextDay()));
    }, 1000);
    return () => clearInterval(interval);
  }, [formatTimeRemaining, getTimeUntilNextDay]);

  return (
    <header className="bg-discord-not-quite-black text-white px-8 py-4 flex justify-between items-center shrink-0 border-b border-discord-lighter-gray max-md:px-3 max-md:py-2 landscape-compact-header">
      {/* Title - hidden on mobile to save space */}
      <h1 className="text-2xl font-semibold m-0 max-md:hidden">Last War Map Planner</h1>

      {/* Mobile: Compact single row layout */}
      <div className="hidden max-md:flex items-center justify-between w-full gap-2">
        {/* Day Navigation - compact */}
        <div className="flex items-center gap-1">
          <button
            className="bg-discord-lighter-gray text-discord-text border-none w-11 h-11 rounded font-bold cursor-pointer transition-all duration-200 flex items-center justify-center active:bg-discord-lightest-gray disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={goToPreviousDay}
            disabled={selectedDay <= 1}
            title="Previous Day"
          >
            ◀
          </button>
          <div className="flex flex-col items-center min-w-[60px]">
            <span className={`text-sm font-semibold ${isViewingCurrentDay ? 'text-discord-text' : 'text-discord-yellow'}`}>
              Day {selectedDay}
            </span>
            {!isViewingCurrentDay ? (
              <button
                className="text-xs text-discord-blurple font-medium"
                onClick={goToToday}
              >
                → Today
              </button>
            ) : (
              <span className="text-xs text-discord-text-muted font-mono">{timeRemaining}</span>
            )}
          </div>
          <button
            className="bg-discord-lighter-gray text-discord-text border-none w-11 h-11 rounded font-bold cursor-pointer transition-all duration-200 flex items-center justify-center active:bg-discord-lightest-gray disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={goToNextDay}
            disabled={selectedDay >= currentDay}
            title="Next Day"
          >
            ▶
          </button>
        </div>

        {/* Auth - compact on mobile */}
        {isSupabaseConfigured && (
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="text-discord-text-muted text-sm">...</span>
            ) : user ? (
              <button
                className="text-discord-text text-sm font-medium hover:text-discord-blurple transition-colors cursor-pointer bg-transparent border-none truncate max-w-[100px]"
                onClick={() => setShowProfileModal(true)}
                title="Click to edit profile"
              >
                {displayName}
              </button>
            ) : (
              <button
                className="bg-discord-blurple text-white border-none px-3 py-2 rounded text-xs font-medium cursor-pointer transition-all duration-200 active:bg-discord-blurple-hover whitespace-nowrap"
                onClick={signInWithDiscord}
              >
                Sign in
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop: Full layout */}
      <div className="flex items-center gap-6 max-md:hidden">
        {/* Timeline Controls */}
        <div className="flex items-center gap-2">
          <button
            className="bg-discord-lighter-gray text-discord-text border-none w-8 h-8 rounded font-bold cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-discord-lightest-gray disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={goToPreviousDay}
            disabled={selectedDay <= 1}
            title="Previous Day"
          >
            ◀
          </button>
          <div className="flex flex-col items-center min-w-[80px]">
            <span className={`text-sm font-semibold ${isViewingCurrentDay ? 'text-discord-text' : 'text-discord-warning'}`}>
              Day {selectedDay}
            </span>
            {!isViewingCurrentDay && (
              <span className="text-xs text-discord-text-muted">(viewing past)</span>
            )}
          </div>
          <button
            className="bg-discord-lighter-gray text-discord-text border-none w-8 h-8 rounded font-bold cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-discord-lightest-gray disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={goToNextDay}
            disabled={selectedDay >= currentDay}
            title="Next Day"
          >
            ▶
          </button>
          {!isViewingCurrentDay && (
            <button
              className="bg-discord-blurple text-white border-none h-8 px-3 rounded text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-discord-blurple-hover"
              onClick={goToToday}
              title="Go to Today"
            >
              Today
            </button>
          )}
          {isViewingCurrentDay && (
            <div className="flex flex-col items-center ml-2">
              <span className="text-xs text-discord-text-muted">Next day in</span>
              <span className="text-sm font-mono text-discord-text">{timeRemaining}</span>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            className="bg-discord-lighter-gray text-discord-text border-none w-9 h-9 rounded font-bold cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-discord-lightest-gray hover:scale-105 text-xl"
            onClick={() => onZoom('out')}
            title="Zoom Out"
          >
            −
          </button>
          <span className="text-discord-text-secondary text-sm min-w-[50px] text-center font-medium">{zoomLevel}%</span>
          <button
            className="bg-discord-lighter-gray text-discord-text border-none w-9 h-9 rounded font-bold cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-discord-lightest-gray hover:scale-105 text-xl"
            onClick={() => onZoom('in')}
            title="Zoom In"
          >
            +
          </button>
          <button
            className="bg-discord-lighter-gray text-discord-text border-none h-9 px-3 rounded text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-discord-lightest-gray hover:scale-105"
            onClick={() => onZoom('reset')}
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
        {isSupabaseConfigured && (
          <div className="flex items-center gap-3">
            {loading ? (
              <span className="text-discord-text-muted text-sm">...</span>
            ) : user ? (
              <>
                <button
                  className="text-discord-text text-sm font-medium hover:text-discord-blurple transition-colors cursor-pointer bg-transparent border-none"
                  onClick={() => setShowProfileModal(true)}
                  title="Click to edit profile"
                >
                  {displayName}
                </button>
                <button
                  className="bg-discord-lighter-gray text-discord-text border border-discord-lightest-gray px-4 py-2 rounded text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-discord-lightest-gray"
                  onClick={signOut}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                className="bg-discord-blurple text-white border-none px-4 py-2 rounded text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-discord-blurple-hover"
                onClick={signInWithDiscord}
              >
                Sign in with Discord
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
