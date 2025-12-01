import { useCallback, useState, useEffect } from 'react';
import { Header } from './components/Header/Header';
import { MapCanvas } from './components/MapCanvas/MapCanvas';
import { TileList, TileListContent } from './components/TileList/TileList';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ProfileModal } from './components/ProfileModal/ProfileModal';
import { AllianceModal } from './components/AllianceModal/AllianceModal';
import { MobileDrawer } from './components/MobileDrawer/MobileDrawer';
import { useMapEditor } from './hooks/useMapEditor';
import { useCanvasControls } from './hooks/useCanvasControls';
import { useAuth } from './contexts/AuthContext';
import { useGameState } from './contexts/GameStateContext';
import { usePlanner } from './contexts/PlannerContext';
import { useAlliance } from './contexts/AllianceContext';
import { useTimeline } from './contexts/TimelineContext';
import { useToast } from './contexts/ToastContext';

function App() {
  const { user } = useAuth();
  const { tileClaims, loading: gameStateLoading, claimTile, clearTile, getTileClaim, isOwnTile } = useGameState();
  const {
    isPlannerMode,
    plannedTileClaims,
    isPlaying,
    playbackTileClaims,
    playbackHighlightTileId,
    planClaim,
    planClear,
    getPlannedTileClaim,
    planningAlliance
  } = usePlanner();
  const { alliance, isAdmin } = useAlliance();
  const { isViewingCurrentDay } = useTimeline();
  const { toast } = useToast();
  const isReadOnly = !user;

  // Use playback claims during playback, otherwise planned claims in planner mode, otherwise normal claims
  const displayClaims = isPlaying && playbackTileClaims
    ? playbackTileClaims
    : isPlannerMode
      ? plannedTileClaims
      : tileClaims;
  const {
    isLoading,
    tileGeometry,
    tiles,
    history,
    selectedTile,
    getTileData,
    setTileData,
    clearTileData,
    selectTile,
    getLikes,
    getLikeSummary,
    vote,
    activeTab,
    setActiveTab,
    tileFilter,
    setTileFilter,
    getLabeledTiles
  } = useMapEditor();

  const {
    scale,
    position,
    isPanning,
    containerRef,
    stageRef,
    zoom,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useCanvasControls(tileGeometry);

  // Handle tile click from map
  const handleTileClick = useCallback((tileInfo) => {
    // Just select the tile - claim/unclaim actions are triggered from buttons
    selectTile(tileInfo);
  }, [selectTile]);

  // Handle tile click from list (need to find tile info)
  const handleTileListClick = useCallback((labeledTile) => {
    if (tileGeometry) {
      const tileInfo = tileGeometry.tiles.find(t => t.id === labeledTile.id);
      if (tileInfo) {
        selectTile(tileInfo);
      }
    }
  }, [tileGeometry, selectTile]);

  // Handle tile hover from list (can be array of IDs for level grouping)
  const [hoveredTileIds, setHoveredTileIds] = useState(null);
  const handleTileListHover = useCallback((tileIds) => {
    setHoveredTileIds(tileIds);
  }, []);

  // Mobile tile list drawer state
  const [isTileListDrawerOpen, setIsTileListDrawerOpen] = useState(false);

  // Mobile fullscreen map mode
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);

  // Close drawer when a tile is selected from the list
  const handleMobileTileListClick = useCallback((labeledTile) => {
    handleTileListClick(labeledTile);
    setIsTileListDrawerOpen(false);
  }, [handleTileListClick]);

  // Keyboard shortcut: 'C' to claim/unclaim selected tile
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Only handle 'C' key when not typing in an input
      if (e.key.toLowerCase() !== 'c') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!selectedTile || !alliance) return;

      // Get claim info - use planner state if in planner mode
      const currentTileClaim = isPlannerMode
        ? getPlannedTileClaim(selectedTile.id)
        : getTileClaim(selectedTile.id);

      // Check ownership - in planner mode, based on planning alliance
      const currentIsOwned = isPlannerMode
        ? currentTileClaim?.allianceId === planningAlliance?.id
        : isOwnTile(selectedTile.id);

      // Determine what action is available (same logic as TileEditor)
      const canClaim = (isViewingCurrentDay || isPlannerMode || isAdmin) && !currentTileClaim;
      const canUnclaim = (isViewingCurrentDay || isPlannerMode || isAdmin) && (currentIsOwned || (isAdmin && currentTileClaim));

      if (canClaim) {
        if (isPlannerMode) {
          planClaim(selectedTile.id);
        } else {
          const result = await claimTile(selectedTile.id, isAdmin);
          if (!result.success) {
            toast.error(result.error || 'Failed to claim tile');
          }
        }
      } else if (canUnclaim) {
        if (isPlannerMode) {
          planClear(selectedTile.id);
        } else {
          const result = await clearTile(selectedTile.id, isAdmin);
          if (!result.success) {
            toast.error(result.error || 'Failed to unclaim tile');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedTile, alliance, isPlannerMode, isViewingCurrentDay, isAdmin,
    getTileClaim, getPlannedTileClaim, isOwnTile, planningAlliance,
    claimTile, clearTile, planClaim, planClear, toast
  ]);

  // Get current tile data and likes
  const currentTileData = selectedTile ? getTileData(selectedTile.id) : {};
  const currentLikes = selectedTile ? getLikes(selectedTile.id) : [];
  const currentLikeSummary = selectedTile ? getLikeSummary(selectedTile.id) : { likes: 0, dislikes: 0, userVote: null };
  const labeledTiles = getLabeledTiles();

  if (isLoading || gameStateLoading) {
    return (
      <div className="w-full h-screen flex flex-col bg-discord-dark overflow-hidden">
        <div className="flex items-center justify-center flex-1 text-xl text-discord-text-muted">
          Loading map data...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-discord-dark overflow-hidden">
      <ProfileModal />
      <AllianceModal />
      <Header scale={scale} onZoom={zoom} />

      <div className="flex flex-1 overflow-hidden max-md:flex-col max-md:min-h-0">
        <MapCanvas
          tileGeometry={tileGeometry}
          tiles={tiles}
          tileClaims={displayClaims}
          selectedTile={selectedTile}
          hoveredTileIds={hoveredTileIds}
          playbackHighlightTileId={playbackHighlightTileId}
          onTileClick={handleTileClick}
          scale={scale}
          position={position}
          isPanning={isPanning}
          containerRef={containerRef}
          stageRef={stageRef}
          onPanStart={handlePanStart}
          onPanMove={handlePanMove}
          onPanEnd={handlePanEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        <TileList
          labeledTiles={labeledTiles}
          tileClaims={displayClaims}
          filter={tileFilter}
          onFilterChange={setTileFilter}
          onTileClick={handleTileListClick}
          onTileHover={handleTileListHover}
        />

        <Sidebar
          selectedTile={selectedTile}
          tileData={currentTileData}
          tiles={tiles}
          likes={currentLikes}
          likeSummary={currentLikeSummary}
          history={history}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onVote={vote}
          isReadOnly={isReadOnly}
          isFullscreenMap={isFullscreenMap}
        />
      </div>

      {/* Mobile Floating Action Buttons */}
      {!isFullscreenMap && (
        <button
          onClick={() => setIsTileListDrawerOpen(true)}
          className="hidden max-md:flex fixed bottom-24 right-4 w-14 h-14 bg-discord-blurple text-white rounded-full items-center justify-center shadow-lg active:bg-discord-blurple-hover z-40"
          title="View Claimed Tiles"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M2.625 6.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0A.75.75 0 0 1 8.25 6h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75ZM2.625 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0ZM7.5 12a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12A.75.75 0 0 1 7.5 12Zm-4.875 5.25a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Mobile Fullscreen Toggle Button */}
      <button
        onClick={() => setIsFullscreenMap(!isFullscreenMap)}
        className={`hidden max-md:flex fixed w-11 h-11 bg-discord-not-quite-black/80 text-white rounded-full items-center justify-center shadow-lg active:bg-discord-lighter-gray z-40 ${
          isFullscreenMap ? 'bottom-4 right-4' : 'top-16 right-4'
        }`}
        title={isFullscreenMap ? "Exit fullscreen" : "Fullscreen map"}
      >
        {isFullscreenMap ? (
          // Exit fullscreen icon (compress)
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M3.22 3.22a.75.75 0 0 1 1.06 0l3.97 3.97V4.5a.75.75 0 0 1 1.5 0V9a.75.75 0 0 1-.75.75H4.5a.75.75 0 0 1 0-1.5h2.69L3.22 4.28a.75.75 0 0 1 0-1.06Zm17.56 0a.75.75 0 0 1 0 1.06l-3.97 3.97h2.69a.75.75 0 0 1 0 1.5H15a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0ZM3.75 15a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-2.69l-3.97 3.97a.75.75 0 0 1-1.06-1.06l3.97-3.97H4.5a.75.75 0 0 1-.75-.75Zm10.5 0a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-2.69l3.97 3.97a.75.75 0 1 1-1.06 1.06l-3.97-3.97v2.69a.75.75 0 0 1-1.5 0V15Z" clipRule="evenodd" />
          </svg>
        ) : (
          // Enter fullscreen icon (expand)
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M15 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V5.56l-3.97 3.97a.75.75 0 1 1-1.06-1.06l3.97-3.97h-2.69a.75.75 0 0 1-.75-.75Zm-12 0A.75.75 0 0 1 3.75 3h4.5a.75.75 0 0 1 0 1.5H5.56l3.97 3.97a.75.75 0 0 1-1.06 1.06L4.5 5.56v2.69a.75.75 0 0 1-1.5 0v-4.5Zm11.47 11.78a.75.75 0 1 1 1.06-1.06l3.97 3.97v-2.69a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h2.69l-3.97-3.97Zm-4.94-1.06a.75.75 0 0 1 0 1.06L5.56 19.5h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Mobile Tile List Drawer */}
      <MobileDrawer
        isOpen={isTileListDrawerOpen}
        onClose={() => setIsTileListDrawerOpen(false)}
        title="Claimed Tiles"
        position="bottom"
      >
        <TileListContent
          labeledTiles={labeledTiles}
          tileClaims={displayClaims}
          filter={tileFilter}
          onFilterChange={setTileFilter}
          onTileClick={handleMobileTileListClick}
          onTileHover={() => {}}
          isMobile={true}
        />
      </MobileDrawer>
    </div>
  );
}

export default App;
