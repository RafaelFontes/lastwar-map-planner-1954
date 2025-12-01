import { useState } from 'react';
import { TileEditor } from './TileEditor';
import { HistoryPanel } from './HistoryPanel';
import { LikeButton } from './LikeButton';
import { LikeHistory } from './LikeHistory';
import { MovesPanel } from './MovesPanel';
import { PlannerPanel } from './PlannerPanel';
import { AdminPanel } from '../AdminPanel/AdminPanel';

export function Sidebar({
  selectedTile,
  tileData,
  tiles,
  likes,
  likeSummary,
  history,
  activeTab,
  onTabChange,
  onVote,
  isReadOnly = false,
  isFullscreenMap = false
}) {
  // Mobile expanded state for showing full content
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="w-[320px] max-lg:w-[280px] max-md:hidden flex flex-col border-l border-discord-lighter-gray bg-discord-gray overflow-y-auto shrink-0">
        <AdminPanel />
        <TileEditor
          selectedTile={selectedTile}
          tileData={tileData}
          likeSummary={likeSummary}
          onVote={onVote}
          isReadOnly={isReadOnly}
        />

        <div className="p-4 pt-5 border-b border-discord-lighter-gray last:flex-1 last:border-b-0">
          <div className="flex gap-0 mb-4 border-b-2 border-discord-lighter-gray">
            <button
              className={`flex-1 px-3 py-2.5 border-none bg-transparent text-sm font-medium cursor-pointer transition-all duration-200 border-b-2 -mb-0.5 ${
                activeTab === 'moves'
                  ? 'text-discord-blurple border-discord-blurple'
                  : 'text-discord-text-muted border-transparent hover:text-discord-blurple'
              }`}
              onClick={() => onTabChange('moves')}
            >
              Moves
            </button>
            <button
              className={`flex-1 px-3 py-2.5 border-none bg-transparent text-sm font-medium cursor-pointer transition-all duration-200 border-b-2 -mb-0.5 ${
                activeTab === 'planner'
                  ? 'text-discord-blurple border-discord-blurple'
                  : 'text-discord-text-muted border-transparent hover:text-discord-blurple'
              }`}
              onClick={() => onTabChange('planner')}
            >
              Planner
            </button>
            <button
              className={`flex-1 px-3 py-2.5 border-none bg-transparent text-sm font-medium cursor-pointer transition-all duration-200 border-b-2 -mb-0.5 ${
                activeTab === 'likes'
                  ? 'text-discord-blurple border-discord-blurple'
                  : 'text-discord-text-muted border-transparent hover:text-discord-blurple'
              }`}
              onClick={() => onTabChange('likes')}
            >
              Votes
            </button>
            <button
              className={`flex-1 px-3 py-2.5 border-none bg-transparent text-sm font-medium cursor-pointer transition-all duration-200 border-b-2 -mb-0.5 ${
                activeTab === 'history'
                  ? 'text-discord-blurple border-discord-blurple'
                  : 'text-discord-text-muted border-transparent hover:text-discord-blurple'
              }`}
              onClick={() => onTabChange('history')}
            >
              History
            </button>
          </div>

          <div className={activeTab === 'moves' ? 'block' : 'hidden'}>
            <MovesPanel />
          </div>

          <div className={activeTab === 'planner' ? 'block' : 'hidden'}>
            <PlannerPanel tiles={tiles} />
          </div>

          <div className={activeTab === 'likes' ? 'block' : 'hidden'}>
            {selectedTile ? (
              <LikeHistory likes={likes} />
            ) : (
              <p className="text-discord-text-muted italic text-sm">
                Select a tile to see votes
              </p>
            )}
          </div>

          <div className={activeTab === 'history' ? 'block' : 'hidden'}>
            <HistoryPanel history={history} />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet - hidden in fullscreen mode */}
      <div className={`hidden max-md:flex flex-col bg-discord-gray border-t border-discord-lighter-gray shrink-0 landscape-compact-sidebar ${isFullscreenMap ? 'max-md:hidden' : ''}`}>
        {/* Drag handle - tap to expand/collapse */}
        <button
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="flex justify-center py-1.5 bg-discord-not-quite-black border-none cursor-pointer"
        >
          <div className="w-10 h-1 bg-discord-lightest-gray rounded-full" />
        </button>

        {/* Compact Tile Info */}
        <div className="px-4 py-2 border-b border-discord-lighter-gray">
          <TileEditor
            selectedTile={selectedTile}
            tileData={tileData}
            likeSummary={likeSummary}
            onVote={onVote}
            isReadOnly={isReadOnly}
            compact={true}
          />
        </div>

        {/* Tabs - always visible */}
        <div className="flex gap-0 border-b border-discord-lighter-gray bg-discord-not-quite-black">
          <button
            className={`flex-1 px-2 py-3 border-none bg-transparent text-xs font-medium cursor-pointer transition-all duration-200 ${
              activeTab === 'moves'
                ? 'text-discord-blurple bg-discord-gray'
                : 'text-discord-text-muted active:bg-discord-lighter-gray'
            }`}
            onClick={() => {
              onTabChange('moves');
              setMobileExpanded(true);
            }}
          >
            Moves
          </button>
          <button
            className={`flex-1 px-2 py-3 border-none bg-transparent text-xs font-medium cursor-pointer transition-all duration-200 ${
              activeTab === 'planner'
                ? 'text-discord-blurple bg-discord-gray'
                : 'text-discord-text-muted active:bg-discord-lighter-gray'
            }`}
            onClick={() => {
              onTabChange('planner');
              setMobileExpanded(true);
            }}
          >
            Planner
          </button>
          <button
            className={`flex-1 px-2 py-3 border-none bg-transparent text-xs font-medium cursor-pointer transition-all duration-200 ${
              activeTab === 'likes'
                ? 'text-discord-blurple bg-discord-gray'
                : 'text-discord-text-muted active:bg-discord-lighter-gray'
            }`}
            onClick={() => {
              onTabChange('likes');
              setMobileExpanded(true);
            }}
          >
            Votes
          </button>
          <button
            className={`flex-1 px-2 py-3 border-none bg-transparent text-xs font-medium cursor-pointer transition-all duration-200 ${
              activeTab === 'history'
                ? 'text-discord-blurple bg-discord-gray'
                : 'text-discord-text-muted active:bg-discord-lighter-gray'
            }`}
            onClick={() => {
              onTabChange('history');
              setMobileExpanded(true);
            }}
          >
            History
          </button>
        </div>

        {/* Expandable content */}
        <div
          className={`overflow-y-auto transition-all duration-300 ease-out ${
            mobileExpanded ? 'max-h-[50vh]' : 'max-h-0'
          }`}
        >
          <div className="p-4">
            <div className={activeTab === 'moves' ? 'block' : 'hidden'}>
              <MovesPanel />
            </div>

            <div className={activeTab === 'planner' ? 'block' : 'hidden'}>
              <PlannerPanel tiles={tiles} />
            </div>

            <div className={activeTab === 'likes' ? 'block' : 'hidden'}>
              {selectedTile ? (
                <LikeHistory likes={likes} />
              ) : (
                <p className="text-discord-text-muted italic text-sm">
                  Select a tile to see votes
                </p>
              )}
            </div>

            <div className={activeTab === 'history' ? 'block' : 'hidden'}>
              <HistoryPanel history={history} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
