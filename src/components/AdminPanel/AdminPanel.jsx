import { useState } from 'react';
import { useAlliance } from '../../contexts/AllianceContext';
import { useToast } from '../../contexts/ToastContext';
import { useTimeline } from '../../contexts/TimelineContext';
import { useMapEditorService } from '../../di/index.js';
import { supabase } from '../../lib/supabase.js';

export function AdminPanel() {
  const {
    alliance,
    allAlliances,
    switchAlliance,
    createAlliance,
    isAdmin
  } = useAlliance();
  const { toast } = useToast();
  const { currentDay, selectedDay } = useTimeline();
  const mapEditorService = useMapEditorService();

  const [newAllianceName, setNewAllianceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showMovesEditor, setShowMovesEditor] = useState(false);
  const [editingMoves, setEditingMoves] = useState({});
  const [isSavingMoves, setIsSavingMoves] = useState(false);

  // Only show for admin builds
  if (!isAdmin) return null;

  const handleCreateAlliance = async (e) => {
    e.preventDefault();
    if (!newAllianceName.trim()) {
      toast.error('Please enter an alliance name');
      return;
    }

    setIsCreating(true);
    // Color is auto-assigned based on alliance count
    const result = await createAlliance(newAllianceName);
    setIsCreating(false);

    if (result.success) {
      toast.success(`Created alliance "${result.alliance.name}"`);
      setNewAllianceName('');
      setShowCreateForm(false);
    } else {
      toast.error(result.error || 'Failed to create alliance');
    }
  };

  const handleClearHistory = async () => {
    if (!confirm(`Are you sure you want to clear claim history for Day ${selectedDay}? This cannot be undone.`)) {
      return;
    }
    setIsClearing(true);
    try {
      await mapEditorService.clearHistoryForDay(selectedDay);
      toast.success(`History for Day ${selectedDay} cleared successfully`);
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Failed to clear history');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearMoves = async () => {
    if (!confirm(`Are you sure you want to clear ALL moves for Day ${selectedDay}? This will remove all move records but NOT the tile claims.`)) {
      return;
    }
    setIsClearing(true);
    try {
      const { error } = await supabase
        .from('daily_moves')
        .delete()
        .eq('day', selectedDay);

      if (error) throw error;
      toast.success(`Moves for Day ${selectedDay} cleared successfully`);
    } catch (error) {
      console.error('Error clearing moves:', error);
      toast.error('Failed to clear moves');
    } finally {
      setIsClearing(false);
    }
  };

  const handleOpenMovesEditor = async () => {
    // Load current moves info for all alliances
    const movesData = {};

    for (const a of allAlliances) {
      // Count moves used by this alliance today
      const { count, error } = await supabase
        .from('daily_moves')
        .select('*', { count: 'exact', head: true })
        .eq('alliance_id', a.id)
        .eq('day', currentDay)
        .or('undone.is.null,undone.eq.false');

      const movesUsed = error ? 0 : (count || 0);

      // Get max moves setting (default 3)
      const { data: settingsData } = await supabase
        .from('alliance_day_settings')
        .select('max_moves')
        .eq('alliance_id', a.id)
        .eq('day', currentDay)
        .single();

      const maxMoves = settingsData?.max_moves || 3;

      movesData[a.id] = {
        used: movesUsed,
        max: maxMoves,
        available: Math.max(0, maxMoves - movesUsed)
      };
    }

    setEditingMoves(movesData);
    setShowMovesEditor(true);
  };

  const handleSaveMovesSettings = async () => {
    setIsSavingMoves(true);
    try {
      for (const [allianceId, movesData] of Object.entries(editingMoves)) {
        // Calculate the new max_moves needed to give them the desired available moves
        // newMax = used + desiredAvailable
        const newMaxMoves = movesData.used + movesData.available;

        const { error } = await supabase
          .from('alliance_day_settings')
          .upsert({
            alliance_id: allianceId,
            day: currentDay,
            max_moves: newMaxMoves
          }, {
            onConflict: 'alliance_id,day'
          });

        if (error) throw error;
      }
      toast.success('Available moves updated');
      setShowMovesEditor(false);
    } catch (error) {
      console.error('Error saving moves settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSavingMoves(false);
    }
  };

  return (
    <div className="p-4 border-b border-discord-lighter-gray bg-discord-dark/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-discord-yellow flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Admin Mode
        </h3>
      </div>

      {/* Current Alliance Selector */}
      <div className="mb-3">
        <label className="block mb-1.5 text-xs font-medium text-discord-text-secondary">
          Acting as Alliance:
        </label>
        <select
          value={alliance?.id || ''}
          onChange={(e) => switchAlliance(e.target.value)}
          className="w-full px-3 py-2 bg-discord-gray border border-discord-lighter-gray rounded text-sm text-discord-text focus:outline-none focus:border-discord-blurple"
        >
          {allAlliances.length === 0 && (
            <option value="">No alliances yet</option>
          )}
          {allAlliances.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Current alliance color indicator */}
      {alliance && (
        <div className="mb-3 flex items-center gap-2 text-xs text-discord-text-muted">
          <span
            className="w-4 h-4 rounded-full border border-discord-lighter-gray"
            style={{ backgroundColor: alliance.color }}
          />
          <span>Color: {alliance.color}</span>
        </div>
      )}

      {/* Create New Alliance */}
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full px-3 py-2 text-sm font-medium text-discord-text bg-discord-lighter-gray rounded hover:bg-discord-lightest-gray transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Alliance
        </button>
      ) : (
        <form onSubmit={handleCreateAlliance} className="space-y-3">
          <div>
            <label className="block mb-1 text-xs font-medium text-discord-text-secondary">
              Alliance Name
            </label>
            <input
              type="text"
              value={newAllianceName}
              onChange={(e) => setNewAllianceName(e.target.value)}
              placeholder="Enter alliance name..."
              className="w-full px-3 py-2 bg-discord-gray border border-discord-lighter-gray rounded text-sm text-discord-text focus:outline-none focus:border-discord-blurple"
              disabled={isCreating}
              autoFocus
            />
            <p className="mt-1 text-xs text-discord-text-muted">
              Color will be auto-assigned
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-discord-green rounded hover:bg-discord-green-hover transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewAllianceName('');
              }}
              className="px-3 py-2 text-sm font-medium text-discord-text bg-discord-lighter-gray rounded hover:bg-discord-lightest-gray transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <p className="mt-3 text-xs text-discord-text-muted">
        Select an alliance to claim tiles on their behalf. Changes persist to the database.
      </p>

      {/* Admin Actions */}
      <div className="mt-4 pt-4 border-t border-discord-lighter-gray">
        <h4 className="text-xs font-semibold text-discord-text-secondary mb-3 uppercase tracking-wide">
          Admin Actions
        </h4>

        <div className="flex flex-col gap-2">
          {/* Clear History */}
          <button
            onClick={handleClearHistory}
            disabled={isClearing}
            className="w-full px-3 py-2 text-sm font-medium text-discord-text bg-discord-lighter-gray rounded hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {isClearing ? 'Clearing...' : `Clear History (Day ${selectedDay})`}
          </button>

          {/* Clear Moves */}
          <button
            onClick={handleClearMoves}
            disabled={isClearing}
            className="w-full px-3 py-2 text-sm font-medium text-discord-text bg-discord-lighter-gray rounded hover:bg-red-500/20 hover:text-red-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isClearing ? 'Clearing...' : `Clear Moves (Day ${selectedDay})`}
          </button>

          {/* Edit Max Moves */}
          <button
            onClick={handleOpenMovesEditor}
            className="w-full px-3 py-2 text-sm font-medium text-discord-text bg-discord-lighter-gray rounded hover:bg-discord-blurple/20 hover:text-discord-blurple transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Available Moves
          </button>
        </div>
      </div>

      {/* Moves Editor Modal */}
      {showMovesEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-discord-gray rounded-lg p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-discord-text mb-2">
              Edit Available Moves - Day {currentDay}
            </h3>
            <p className="text-xs text-discord-text-muted mb-4">
              Adjust how many moves each alliance has remaining today.
            </p>

            <div className="space-y-3 mb-4">
              {allAlliances.map((a) => {
                const movesData = editingMoves[a.id] || { used: 0, max: 3, available: 3 };
                return (
                  <div key={a.id} className="p-3 bg-discord-dark rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0 border border-discord-lighter-gray"
                        style={{ backgroundColor: a.color }}
                      />
                      <span className="text-sm font-medium text-discord-text">{a.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-discord-text-muted">
                        Used: {movesData.used}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-discord-text-secondary">Available:</span>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={movesData.available}
                          onChange={(e) => setEditingMoves(prev => ({
                            ...prev,
                            [a.id]: {
                              ...prev[a.id],
                              available: parseInt(e.target.value) || 0
                            }
                          }))}
                          className="w-16 px-2 py-1 bg-discord-gray border border-discord-lighter-gray rounded text-sm text-discord-text text-center focus:outline-none focus:border-discord-blurple"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveMovesSettings}
                disabled={isSavingMoves}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-discord-green rounded hover:bg-discord-green-hover transition-colors disabled:opacity-50"
              >
                {isSavingMoves ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowMovesEditor(false)}
                className="px-3 py-2 text-sm font-medium text-discord-text bg-discord-lighter-gray rounded hover:bg-discord-lightest-gray transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
