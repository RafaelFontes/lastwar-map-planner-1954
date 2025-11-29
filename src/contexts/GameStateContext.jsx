import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useAlliance } from './AllianceContext';
import { useTimeline } from './TimelineContext';
import { useProfile } from './ProfileContext';
import { useMapEditorService } from '../di/index.js';

const GameStateContext = createContext({});

export function GameStateProvider({ children }) {
  const { user } = useAuth();
  const { displayName } = useProfile();
  const { alliance, getAllianceColor, getAllianceName } = useAlliance();
  const { selectedDay, currentDay, isViewingCurrentDay } = useTimeline();
  const isViewingPastDay = selectedDay < currentDay;
  const mapEditorService = useMapEditorService();

  // Map state: tile claims for selected day
  const [tileClaims, setTileClaims] = useState(new Map()); // Map<tileId, {allianceId, allianceName, color}>
  const [loading, setLoading] = useState(true);

  // Move tracking
  const [movesInfo, setMovesInfo] = useState({ movesUsed: 0, movesRemaining: 3, maxMoves: 3 });
  const [userMoves, setUserMoves] = useState([]); // For undo

  // Load tile claims when day changes
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    loadMapState(selectedDay);
  }, [selectedDay]);

  // Load moves info when viewing current day
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user || !isViewingCurrentDay) {
      return;
    }
    loadMovesInfo();
    loadUserMoves();
  }, [user, isViewingCurrentDay, selectedDay]);

  const loadMapState = async (day) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_map_state', { p_day: day });

      if (error) {
        console.error('Error loading map state:', error);
        setTileClaims(new Map());
        return;
      }

      const claims = new Map();
      if (data) {
        for (const claim of data) {
          // Use getAllianceColor to ensure we get the right color from color_index if needed
          const color = claim.alliance_color || getAllianceColor(claim.alliance_id);
          claims.set(claim.tile_id, {
            allianceId: claim.alliance_id,
            allianceName: claim.alliance_name,
            color: color,
            claimedAt: claim.claimed_at,
          });
        }
      }
      setTileClaims(claims);
    } catch (error) {
      console.error('Error loading map state:', error);
      setTileClaims(new Map());
    } finally {
      setLoading(false);
    }
  };

  const loadMovesInfo = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_alliance_moves', { p_day: currentDay });

      if (error) {
        console.error('Error loading moves info:', error);
        return;
      }

      if (data && !data.error) {
        setMovesInfo({
          movesUsed: data.moves_used,
          movesRemaining: data.moves_remaining,
          maxMoves: data.max_moves,
        });
      }
    } catch (error) {
      console.error('Error loading moves info:', error);
    }
  };

  const loadUserMoves = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_moves', { p_day: currentDay });

      if (error) {
        console.error('Error loading user moves:', error);
        return;
      }

      setUserMoves(data || []);
    } catch (error) {
      console.error('Error loading user moves:', error);
    }
  };

  // Claim a tile
  const claimTile = useCallback(async (tileId, isAdmin = false) => {
    if (!user || !alliance) {
      return { success: false, error: 'Not authenticated or no alliance' };
    }

    if (!isViewingCurrentDay && !isAdmin) {
      return { success: false, error: 'Can only claim tiles on current day' };
    }

    try {
      // For admin, pass the selected alliance ID and day so we can claim on their behalf
      const { data, error } = await supabase.rpc('claim_tile', {
        p_tile_id: tileId,
        p_is_admin: isAdmin,
        p_alliance_id: isAdmin ? alliance.id : null,
        p_day: isAdmin ? selectedDay : null,
      });

      if (error) {
        console.error('Error claiming tile:', error);
        return { success: false, error: error.message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      // Optimistic update - use getAllianceColor to ensure correct color from color_index
      const allianceColor = alliance.color || getAllianceColor(alliance.id);
      setTileClaims(prev => {
        const newClaims = new Map(prev);
        newClaims.set(tileId, {
          allianceId: alliance.id,
          allianceName: alliance.name,
          color: allianceColor,
          claimedAt: new Date().toISOString(),
        });
        return newClaims;
      });

      // Log to history
      try {
        await mapEditorService.addClaimHistory({
          tileId,
          action: 'claim',
          user: displayName || 'Unknown',
          allianceName: alliance.name,
          allianceColor: allianceColor,
          day: selectedDay,
          isAdjustment: isViewingPastDay,
        });
      } catch (historyError) {
        console.error('Error logging claim history:', historyError);
      }

      // Reload moves info
      await loadMovesInfo();
      await loadUserMoves();

      return { success: true };
    } catch (error) {
      console.error('Error claiming tile:', error);
      return { success: false, error: error.message };
    }
  }, [user, alliance, isViewingCurrentDay, isViewingPastDay, selectedDay, displayName, mapEditorService, getAllianceColor]);

  // Clear a tile
  const clearTile = useCallback(async (tileId, isAdmin = false) => {
    if (!user || !alliance) {
      return { success: false, error: 'Not authenticated or no alliance' };
    }

    if (!isViewingCurrentDay && !isAdmin) {
      return { success: false, error: 'Can only clear tiles on current day' };
    }

    try {
      // For admin, pass the selected alliance ID and day
      const { data, error } = await supabase.rpc('clear_tile', {
        p_tile_id: tileId,
        p_is_admin: isAdmin,
        p_alliance_id: isAdmin ? alliance.id : null,
        p_day: isAdmin ? selectedDay : null,
      });

      if (error) {
        console.error('Error clearing tile:', error);
        return { success: false, error: error.message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      // Optimistic update
      setTileClaims(prev => {
        const newClaims = new Map(prev);
        newClaims.delete(tileId);
        return newClaims;
      });

      // Log to history
      const allianceColor = alliance.color || getAllianceColor(alliance.id);
      try {
        await mapEditorService.addClaimHistory({
          tileId,
          action: 'unclaim',
          user: displayName || 'Unknown',
          allianceName: alliance.name,
          allianceColor: allianceColor,
          day: selectedDay,
          isAdjustment: isViewingPastDay,
        });
      } catch (historyError) {
        console.error('Error logging unclaim history:', historyError);
      }

      // Reload user moves (for undo) - skip for past day adjustments
      await loadUserMoves();

      return { success: true };
    } catch (error) {
      console.error('Error clearing tile:', error);
      return { success: false, error: error.message };
    }
  }, [user, alliance, isViewingCurrentDay, isViewingPastDay, selectedDay, displayName, mapEditorService, getAllianceColor]);

  // Undo a move
  const undoMove = useCallback(async (moveId) => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.rpc('undo_move', {
        p_move_id: moveId,
      });

      if (error) {
        console.error('Error undoing move:', error);
        return { success: false, error: error.message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      // Reload everything
      await loadMapState(currentDay);
      await loadMovesInfo();
      await loadUserMoves();

      return { success: true };
    } catch (error) {
      console.error('Error undoing move:', error);
      return { success: false, error: error.message };
    }
  }, [user, currentDay]);

  // Get claim info for a tile
  const getTileClaim = useCallback((tileId) => {
    return tileClaims.get(tileId) || null;
  }, [tileClaims]);

  // Check if tile is claimed by user's alliance
  const isOwnTile = useCallback((tileId) => {
    const claim = tileClaims.get(tileId);
    return claim && alliance && claim.allianceId === alliance.id;
  }, [tileClaims, alliance]);

  // Get all tiles claimed by an alliance
  const getAllianceTiles = useCallback((allianceId) => {
    const tiles = [];
    tileClaims.forEach((claim, tileId) => {
      if (claim.allianceId === allianceId) {
        tiles.push(tileId);
      }
    });
    return tiles;
  }, [tileClaims]);

  // Get user's alliance tiles
  const getOwnTiles = useCallback(() => {
    if (!alliance) return [];
    return getAllianceTiles(alliance.id);
  }, [alliance, getAllianceTiles]);

  const value = {
    tileClaims,
    loading,
    movesInfo,
    userMoves,
    claimTile,
    clearTile,
    undoMove,
    getTileClaim,
    isOwnTile,
    getAllianceTiles,
    getOwnTiles,
    refreshMapState: () => loadMapState(selectedDay),
    refreshMoves: loadMovesInfo,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}
