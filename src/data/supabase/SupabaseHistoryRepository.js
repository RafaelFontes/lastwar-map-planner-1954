import { IHistoryRepository } from '../interfaces.js';
import { supabase } from '../../lib/supabase.js';

const MAX_HISTORY_ENTRIES = 50;

/**
 * Supabase implementation of IHistoryRepository
 */
export class SupabaseHistoryRepository extends IHistoryRepository {
  constructor() {
    super();
    this._cache = null;
  }

  _rowToEntry(row) {
    return {
      timestamp: new Date(row.created_at).toLocaleString(),
      action: row.action,
      details: row.details,
      user: row.user_name,
      allianceName: row.alliance_name,
      allianceColor: row.alliance_color,
      tileId: row.tile_id,
      day: row.day
    };
  }

  async getAll(limit) {
    const queryLimit = limit || MAX_HISTORY_ENTRIES;

    const { data, error } = await supabase
      .from('history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(queryLimit);

    if (error) {
      console.error('Error loading history from Supabase:', error);
      return [];
    }

    const entries = data.map(row => this._rowToEntry(row));
    this._cache = entries;
    return [...entries];
  }

  async add(entry) {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('history')
      .insert({
        action: entry.action,
        details: entry.details,
        user_id: user?.id || null,
        user_name: entry.user || user?.user_metadata?.full_name || user?.email || 'Unknown',
        alliance_name: entry.allianceName || null,
        alliance_color: entry.allianceColor || null,
        tile_id: entry.tileId || null,
        day: entry.day || null
      });

    if (error) {
      console.error('Error adding history entry to Supabase:', error);
      throw error;
    }

    // Invalidate cache
    this._cache = null;
  }

  async clear() {
    const { error } = await supabase
      .from('history')
      .delete()
      .neq('id', 0); // Delete all rows

    if (error) {
      console.error('Error clearing history from Supabase:', error);
      throw error;
    }

    this._cache = [];
  }

  async clearForDay(day) {
    const { error } = await supabase
      .from('history')
      .delete()
      .eq('day', day);

    if (error) {
      console.error('Error clearing history for day from Supabase:', error);
      throw error;
    }

    // Invalidate cache
    this._cache = null;
  }

  async saveAll(entries) {
    // This would require clearing all and re-inserting
    // For now, just invalidate cache - this method is mainly for migration
    console.warn('saveAll not fully implemented for Supabase history');
    this._cache = null;
  }

  invalidateCache() {
    this._cache = null;
  }
}
