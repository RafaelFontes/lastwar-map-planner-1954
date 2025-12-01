import { LikeButton } from './LikeButton';
import { useGameState } from '../../contexts/GameStateContext';
import { useAlliance } from '../../contexts/AllianceContext';
import { useTimeline } from '../../contexts/TimelineContext';
import { usePlanner } from '../../contexts/PlannerContext';
import { useToast } from '../../contexts/ToastContext';

export function TileEditor({ selectedTile, tileData, likeSummary, onVote, isReadOnly = false, compact = false }) {
  const { claimTile, clearTile, getTileClaim, isOwnTile } = useGameState();
  const { alliance, isAdmin } = useAlliance();
  const { isViewingCurrentDay } = useTimeline();
  const { isPlannerMode, planClaim, planClear, getPlannedTileClaim, planningAlliance } = usePlanner();
  const { toast } = useToast();

  // Get claim info - use planner state if in planner mode
  const tileClaim = isPlannerMode && selectedTile
    ? getPlannedTileClaim(selectedTile.id)
    : selectedTile ? getTileClaim(selectedTile.id) : null;

  // In planner mode, ownership is based on the planning alliance
  const isOwned = isPlannerMode && selectedTile
    ? tileClaim?.allianceId === planningAlliance?.id
    : selectedTile ? isOwnTile(selectedTile.id) : false;

  const handleClaim = async () => {
    if (!selectedTile) return;

    if (isPlannerMode) {
      planClaim(selectedTile.id);
      return;
    }

    // Pass isAdmin flag to bypass claiming rules
    const result = await claimTile(selectedTile.id, isAdmin);
    if (!result.success) {
      toast.error(result.error || 'Failed to claim tile');
    }
  };

  const handleUnclaim = async () => {
    if (!selectedTile) return;

    if (isPlannerMode) {
      planClear(selectedTile.id);
      return;
    }

    // Pass isAdmin flag to bypass clearing rules
    const result = await clearTile(selectedTile.id, isAdmin);
    if (!result.success) {
      toast.error(result.error || 'Failed to unclaim tile');
    }
  };

  if (!selectedTile) {
    if (compact) {
      return (
        <p className="text-discord-text-muted italic text-sm py-1">
          Tap a tile on the map to view details
        </p>
      );
    }
    return (
      <div className="p-4 pt-5 border-b border-discord-lighter-gray">
        <h2 className="text-base font-semibold mb-4 text-discord-text">Tile Info</h2>
        <div className="mt-3">
          <p className="text-discord-text-muted italic text-sm">
            {isReadOnly ? 'Sign in with Discord to claim tiles' : 'Click on a tile to view details'}
          </p>
        </div>
      </div>
    );
  }

  // Determine claim button state
  // Admin can claim any unclaimed tile on any day, regular users only on current day
  const canClaim = alliance && (isViewingCurrentDay || isPlannerMode || isAdmin) && !tileClaim;
  // Admin can unclaim any tile (including other alliances'), regular users only their own
  const canUnclaim = alliance && (isViewingCurrentDay || isPlannerMode || isAdmin) && (isOwned || (isAdmin && tileClaim));
  const isClaimedByOther = tileClaim && !isOwned && !isAdmin;

  // Compact mode for mobile
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3">
        {/* Left side: Tile info */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-discord-text text-lg font-bold shrink-0">
            L{tileData.number || selectedTile.id}
          </span>
          {tileClaim && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-3 h-3 rounded-full inline-block shrink-0"
                style={{ backgroundColor: tileClaim.color || '#666' }}
              />
              <span className="text-discord-text-secondary text-sm truncate">
                {tileClaim.allianceName}
              </span>
            </div>
          )}
          {!tileClaim && (
            <span className="text-discord-text-muted text-sm">Unclaimed</span>
          )}
        </div>

        {/* Right side: Action button */}
        <div className="shrink-0">
          {canClaim && (
            <button
              onClick={handleClaim}
              className="px-4 py-2 border-none rounded text-sm font-medium cursor-pointer bg-discord-blurple text-white active:bg-discord-blurple-hover"
            >
              Claim
            </button>
          )}
          {canUnclaim && (
            <button
              onClick={handleUnclaim}
              className="px-4 py-2 border-none rounded text-sm font-medium cursor-pointer bg-red-500/80 text-white active:bg-red-500"
            >
              Unclaim
            </button>
          )}
          {!canClaim && !canUnclaim && (
            <LikeButton
              summary={likeSummary || { likes: 0, dislikes: 0, userVote: null }}
              onVote={(type) => onVote(selectedTile.id, type)}
              isReadOnly={isReadOnly}
              compact={true}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-5 border-b border-discord-lighter-gray">
      <h2 className="text-base font-semibold mb-4 text-discord-text">Tile Info</h2>
      <div className="mt-3">
        {/* Tile Level/Number - Read Only */}
        <div className="mb-4">
          <label className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Level:</label>
          <span className="text-discord-text text-lg font-bold">L{tileData.number || selectedTile.id}</span>
        </div>

        {/* Alliance Info - if claimed */}
        {tileClaim && (
          <div className="mb-4">
            <label className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Claimed by:</label>
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full inline-block border border-discord-lighter-gray"
                style={{ backgroundColor: tileClaim.color || '#666' }}
              />
              <span className="text-discord-text text-sm font-medium">{tileClaim.allianceName}</span>
            </div>
          </div>
        )}

        {/* Claim Status Message */}
        {!alliance && !isReadOnly && (
          <div className="mb-4 p-3 bg-discord-dark rounded-lg">
            <p className="text-discord-text-muted text-sm">Join an alliance to claim tiles</p>
          </div>
        )}

        {!isViewingCurrentDay && !isPlannerMode && !isAdmin && alliance && (
          <div className="mb-4 p-3 bg-discord-dark rounded-lg">
            <p className="text-discord-text-muted text-sm">Navigate to current day to claim tiles</p>
          </div>
        )}

        {isPlannerMode && (
          <div className="mb-4 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-xs text-yellow-400">
            Planner mode - changes are local only
          </div>
        )}

        {/* Claim/Unclaim Buttons */}
        {!isReadOnly && alliance && (isViewingCurrentDay || isPlannerMode || isAdmin) && (
          <div className="mb-4">
            {canClaim && (
              <button
                onClick={handleClaim}
                className="w-full px-4 py-2.5 border-none rounded text-sm font-medium cursor-pointer transition-all duration-200 bg-discord-blurple text-white hover:-translate-y-0.5 hover:shadow-lg hover:bg-discord-blurple-hover active:translate-y-0"
              >
                Claim Tile
              </button>
            )}

            {canUnclaim && (
              <button
                onClick={handleUnclaim}
                className="w-full px-4 py-2.5 border-none rounded text-sm font-medium cursor-pointer transition-all duration-200 bg-red-500/80 text-white hover:-translate-y-0.5 hover:shadow-lg hover:bg-red-500 active:translate-y-0"
              >
                Unclaim Tile
              </button>
            )}

            {isClaimedByOther && (
              <div className="p-3 bg-discord-dark rounded-lg">
                <p className="text-discord-text-muted text-sm">
                  This tile is claimed by {tileClaim.allianceName}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Votes */}
        <div className="mb-4">
          <label className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Votes:</label>
          <LikeButton
            summary={likeSummary || { likes: 0, dislikes: 0, userVote: null }}
            onVote={(type) => onVote(selectedTile.id, type)}
            isReadOnly={isReadOnly}
          />
        </div>

        {isReadOnly && (
          <p className="text-discord-text-muted italic text-sm">Sign in with Discord to claim tiles</p>
        )}
      </div>
    </div>
  );
}
