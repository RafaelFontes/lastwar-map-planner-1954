import { useCallback, useState, useEffect } from 'react';
import { Header } from './components/Header/Header';
import { MapCanvas } from './components/MapCanvas/MapCanvas';
import { TileList } from './components/TileList/TileList';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ProfileModal } from './components/ProfileModal/ProfileModal';
import { AllianceModal } from './components/AllianceModal/AllianceModal';
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
    handlePanEnd
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

      <div className="flex flex-1 overflow-hidden max-md:flex-col">
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
        />
      </div>
    </div>
  );
}

export default App;
