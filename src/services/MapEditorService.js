import { DEFAULT_TILE_DATA } from '../data/interfaces.js';

/**
 * MapEditorService handles all business logic for the map editor.
 * It coordinates between repositories and provides a clean API for the UI layer.
 */
export class MapEditorService {
  /**
   * @param {Object} repositories - Injected repositories
   * @param {import('../data/interfaces.js').ITileRepository} repositories.tileRepository
   * @param {import('../data/interfaces.js').ICommentRepository} repositories.commentRepository
   * @param {import('../data/interfaces.js').IHistoryRepository} repositories.historyRepository
   * @param {import('../data/interfaces.js').ITileGeometryRepository} repositories.tileGeometryRepository
   * @param {import('../data/interfaces.js').ILikeRepository} repositories.likeRepository
   */
  constructor({ tileRepository, commentRepository, historyRepository, tileGeometryRepository, likeRepository }) {
    this._tileRepository = tileRepository;
    this._commentRepository = commentRepository;
    this._historyRepository = historyRepository;
    this._tileGeometryRepository = tileGeometryRepository;
    this._likeRepository = likeRepository;
  }

  // ============================================
  // Tile Geometry (read-only, from JSON)
  // ============================================

  /**
   * Load tile geometry data
   * @returns {Promise<import('../data/interfaces.js').TileGeometry>}
   */
  async loadTileGeometry() {
    return this._tileGeometryRepository.load();
  }

  // ============================================
  // Tile Data Operations
  // ============================================

  /**
   * Get all tiles
   * @returns {Promise<Map<number, import('../data/interfaces.js').TileData>>}
   */
  async getAllTiles() {
    return this._tileRepository.getAll();
  }

  /**
   * Get tile data by ID, returns default if not found
   * @param {number} tileId
   * @returns {Promise<import('../data/interfaces.js').TileData>}
   */
  async getTileData(tileId) {
    const tile = await this._tileRepository.get(tileId);
    return tile || { ...DEFAULT_TILE_DATA };
  }

  /**
   * Save tile data and record history
   * @param {number} tileId
   * @param {import('../data/interfaces.js').TileData} newData
   * @param {import('../data/interfaces.js').TileData} [oldData] - Previous data for history
   * @returns {Promise<void>}
   */
  async saveTileData(tileId, newData, oldData) {
    // Get old data if not provided
    if (!oldData) {
      oldData = await this.getTileData(tileId);
    }

    await this._tileRepository.save(tileId, newData);
    await this._addHistoryEntry(tileId, oldData, newData);
  }

  /**
   * Clear tile data and record history
   * @param {number} tileId
   * @returns {Promise<void>}
   */
  async clearTileData(tileId) {
    const oldData = await this._tileRepository.get(tileId);
    if (oldData) {
      await this._tileRepository.delete(tileId);
      await this._addHistoryEntry(tileId, oldData, null);
    }
  }

  /**
   * Save tile data silently (no history entry)
   * Used for operations like moving labels that shouldn't clutter history
   * @param {number} tileId
   * @param {import('../data/interfaces.js').TileData} data
   * @returns {Promise<void>}
   */
  async saveTileDataSilent(tileId, data) {
    await this._tileRepository.save(tileId, data);
  }

  /**
   * Get labeled tiles (tiles with number or name), optionally filtered
   * @param {Map<number, import('../data/interfaces.js').TileData>} tiles - All tiles
   * @param {string} [filter] - Optional filter string
   * @returns {Array<{id: number} & import('../data/interfaces.js').TileData>}
   */
  getLabeledTiles(tiles, filter = '') {
    const labeledTiles = [];

    tiles.forEach((data, tileId) => {
      if (data.number !== '' || data.name) {
        labeledTiles.push({ id: tileId, ...data });
      }
    });

    // Filter
    const filterLower = filter.toLowerCase();
    const filteredTiles = labeledTiles.filter(tile => {
      if (!filter) return true;
      const numberMatch = tile.number !== undefined && tile.number.toString().includes(filter);
      const nameMatch = tile.name && tile.name.toLowerCase().includes(filterLower);
      return numberMatch || nameMatch;
    });

    // Sort by number
    filteredTiles.sort((a, b) => {
      const numA = parseInt(a.number) || 0;
      const numB = parseInt(b.number) || 0;
      return numA - numB;
    });

    return filteredTiles;
  }

  // ============================================
  // Comment Operations
  // ============================================

  /**
   * Get all comments
   * @returns {Promise<Map<number, import('../data/interfaces.js').Comment[]>>}
   */
  async getAllComments() {
    return this._commentRepository.getAll();
  }

  /**
   * Get comments for a specific tile
   * @param {number} tileId
   * @returns {Promise<import('../data/interfaces.js').Comment[]>}
   */
  async getComments(tileId) {
    return this._commentRepository.getForTile(tileId);
  }

  /**
   * Add a comment to a tile
   * @param {number} tileId
   * @param {string} text
   * @param {string} user
   * @returns {Promise<import('../data/interfaces.js').Comment|null>}
   */
  async addComment(tileId, text, user) {
    if (!text.trim()) return null;

    const comment = {
      user,
      text: text.trim(),
      timestamp: new Date().toLocaleString()
    };

    await this._commentRepository.add(tileId, comment);
    return comment;
  }

  /**
   * Delete a comment from a tile
   * @param {number} tileId
   * @param {number} commentIndex
   * @returns {Promise<void>}
   */
  async deleteComment(tileId, commentIndex) {
    await this._commentRepository.delete(tileId, commentIndex);
  }

  // ============================================
  // History Operations
  // ============================================

  /**
   * Get history entries
   * @param {number} [limit] - Maximum entries to return
   * @returns {Promise<import('../data/interfaces.js').HistoryEntry[]>}
   */
  async getHistory(limit) {
    return this._historyRepository.getAll(limit);
  }

  /**
   * Clear all history
   * @returns {Promise<void>}
   */
  async clearHistory() {
    await this._historyRepository.clear();
  }

  /**
   * Clear history for a specific day
   * @param {number} day - Day number
   * @returns {Promise<void>}
   */
  async clearHistoryForDay(day) {
    await this._historyRepository.clearForDay(day);
  }

  /**
   * Add a claim history entry
   * @param {Object} params
   * @param {number} params.tileId - Tile ID
   * @param {'claim' | 'unclaim'} params.action - Action type
   * @param {string} params.user - User display name
   * @param {string} params.allianceName - Alliance name
   * @param {string} params.allianceColor - Alliance color
   * @param {number} [params.day] - Day number (optional)
   * @returns {Promise<void>}
   */
  async addClaimHistory({ tileId, action, user, allianceName, allianceColor, day }) {
    const details = `${action === 'claim' ? 'claimed' : 'unclaimed'} tile L${tileId}`;
    const entry = {
      action,
      details,
      user,
      allianceName,
      allianceColor,
      tileId,
      day
    };
    await this._historyRepository.add(entry);
  }

  /**
   * Add a history entry based on tile changes
   * @param {number} tileId
   * @param {import('../data/interfaces.js').TileData} oldData
   * @param {import('../data/interfaces.js').TileData|null} newData
   * @returns {Promise<import('../data/interfaces.js').HistoryEntry>}
   * @private
   */
  async _addHistoryEntry(tileId, oldData, newData) {
    const timestamp = new Date().toLocaleString();
    let action = '';
    let details = '';

    const isOldEmpty = !oldData || Object.keys(oldData).every(k => !oldData[k]);

    if (isOldEmpty && newData) {
      action = 'Created';
      details = `Tile ${tileId}: ${newData.name || 'Unnamed'}`;
    } else if (!newData) {
      action = 'Cleared';
      details = `Tile ${tileId}: ${oldData?.name || 'Unnamed'}`;
    } else {
      action = 'Updated';
      const changes = [];
      if (oldData.number !== newData.number) changes.push('number');
      if (oldData.name !== newData.name) changes.push('name');
      if (oldData.icon !== newData.icon) changes.push('icon');
      if (oldData.color !== newData.color) changes.push('color');
      if (oldData.comments !== newData.comments) changes.push('comments');
      details = `Tile ${tileId}: ${changes.join(', ') || 'no changes'}`;
    }

    const entry = { timestamp, action, details };
    await this._historyRepository.add(entry);
    return entry;
  }

  // ============================================
  // Like Operations
  // ============================================

  /**
   * Get all likes
   * @returns {Promise<Map<number, import('../data/interfaces.js').Like[]>>}
   */
  async getAllLikes() {
    return this._likeRepository.getAll();
  }

  /**
   * Get likes for a specific tile
   * @param {number} tileId
   * @returns {Promise<import('../data/interfaces.js').Like[]>}
   */
  async getLikes(tileId) {
    return this._likeRepository.getForTile(tileId);
  }

  /**
   * Get like summary for a tile
   * @param {number} tileId
   * @param {string} [userId] - Optional user ID to check user's vote
   * @returns {Promise<import('../data/interfaces.js').TileLikeSummary>}
   */
  async getLikeSummary(tileId, userId) {
    return this._likeRepository.getSummary(tileId, userId);
  }

  /**
   * Vote on a tile (like or dislike)
   * @param {number} tileId
   * @param {'like' | 'dislike'} type
   * @param {string} user - Display name
   * @param {string} userId - User ID from auth
   * @returns {Promise<import('../data/interfaces.js').Like>}
   */
  async vote(tileId, type, user, userId) {
    return this._likeRepository.vote(tileId, type, user, userId);
  }

  /**
   * Remove vote from a tile
   * @param {number} tileId
   * @param {string} userId - User ID from auth
   * @returns {Promise<void>}
   */
  async removeVote(tileId, userId) {
    return this._likeRepository.removeVote(tileId, userId);
  }
}
