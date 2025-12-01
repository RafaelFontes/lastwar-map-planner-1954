import { useMemo, useState } from 'react';

// Shared content component used by both desktop and mobile
export function TileListContent({ labeledTiles, tileClaims, filter, onFilterChange, onTileClick, onTileHover, isMobile = false }) {
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [selectedLevels, setSelectedLevels] = useState(new Set());

  // Filter to only show claimed tiles
  const claimedTiles = useMemo(() => {
    return labeledTiles
      .map(tile => ({
        ...tile,
        claim: tileClaims?.get(tile.id)
      }))
      .filter(tile => tile.claim?.allianceName);
  }, [labeledTiles, tileClaims]);

  // Group tiles by level number
  const groupedByLevel = useMemo(() => {
    const groups = new Map();

    claimedTiles.forEach(tile => {
      const level = tile.number ?? '';
      if (!groups.has(level)) {
        groups.set(level, []);
      }
      groups.get(level).push(tile);
    });

    // Sort groups by level number and sort tiles within each group by alliance name
    const sortedEntries = Array.from(groups.entries())
      .sort(([a], [b]) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
      })
      .map(([level, tiles]) => [
        level,
        tiles.sort((a, b) => (a.claim.allianceName || '').localeCompare(b.claim.allianceName || ''))
      ]);

    return sortedEntries;
  }, [claimedTiles]);

  // Get all available levels for the filter checkboxes
  const availableLevels = useMemo(() => {
    return groupedByLevel.map(([level]) => level);
  }, [groupedByLevel]);

  // Apply text filter and level filter to grouped data
  const filteredGroups = useMemo(() => {
    let result = groupedByLevel;

    // Apply level filter if any levels are selected
    if (selectedLevels.size > 0) {
      result = result.filter(([level]) => selectedLevels.has(level));
    }

    // Apply text filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result
        .map(([level, tiles]) => {
          const filteredTiles = tiles.filter(tile =>
            (tile.number && tile.number.toString().includes(lowerFilter)) ||
            (tile.claim?.allianceName && tile.claim.allianceName.toLowerCase().includes(lowerFilter))
          );
          return [level, filteredTiles];
        })
        .filter(([, tiles]) => tiles.length > 0);
    }

    return result;
  }, [groupedByLevel, filter, selectedLevels]);

  const toggleCollapse = (level) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const toggleLevelFilter = (level) => {
    setSelectedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const clearLevelFilters = () => {
    setSelectedLevels(new Set());
  };

  // Get all tile IDs for a level
  const getTileIdsForLevel = (level) => {
    const group = groupedByLevel.find(([l]) => l === level);
    return group ? group[1].map(t => t.id) : [];
  };

  const isEmpty = filteredGroups.length === 0 || filteredGroups.every(([, tiles]) => tiles.length === 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-3 p-4 pb-2 shrink-0">
        <div>
          <input
            type="text"
            placeholder="Filter by level or alliance..."
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-3 py-2.5 border border-discord-lighter-gray rounded text-sm w-full bg-discord-dark text-discord-text placeholder-discord-text-muted transition-colors duration-200 focus:outline-none focus:border-discord-blurple focus:ring-2 focus:ring-discord-blurple/20"
          />
        </div>
        {availableLevels.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-discord-text-muted">Levels:</span>
            {availableLevels.map(level => (
              <label
                key={level}
                className={`flex items-center gap-1.5 text-xs cursor-pointer select-none ${isMobile ? 'py-1 px-2 rounded bg-discord-lighter-gray/50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedLevels.has(level)}
                  onChange={() => toggleLevelFilter(level)}
                  className="w-4 h-4 rounded border-discord-lighter-gray bg-discord-dark text-discord-blurple focus:ring-discord-blurple/20 cursor-pointer"
                />
                <span className={selectedLevels.has(level) ? 'text-discord-text' : 'text-discord-text-muted'}>
                  {level !== '' ? level : 'N/A'}
                </span>
              </label>
            ))}
            {selectedLevels.size > 0 && (
              <button
                onClick={clearLevelFilters}
                className="text-xs text-discord-text-muted hover:text-discord-text underline ml-1"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto mx-4 mb-4 border border-discord-lighter-gray rounded">
        {isEmpty ? (
          <div className="text-center text-discord-text-muted italic py-5 px-4">
            {filter ? 'No matching tiles' : 'No claimed tiles yet'}
          </div>
        ) : (
          <div className="divide-y divide-discord-lighter-gray">
            {filteredGroups.map(([level, tiles]) => {
              const isCollapsed = collapsedGroups.has(level);
              return (
                <div
                  key={level}
                  className="transition-colors duration-150"
                  onMouseEnter={() => !isMobile && onTileHover?.(getTileIdsForLevel(level))}
                  onMouseLeave={() => !isMobile && onTileHover?.(null)}
                >
                  {/* Level header - clickable to collapse/expand */}
                  <div
                    onClick={() => toggleCollapse(level)}
                    className={`px-4 bg-discord-not-quite-black sticky top-0 flex items-center justify-between cursor-pointer select-none ${
                      isMobile ? 'py-3 active:bg-discord-lighter-gray' : 'py-2 hover:bg-discord-lighter-gray'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-discord-text-muted text-xs transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                      >
                        ▶
                      </span>
                      <span className="font-semibold text-discord-text">
                        {level !== '' ? `Level ${level}` : 'No Level'}
                      </span>
                    </div>
                    <span className="text-discord-text-muted text-xs">
                      {tiles.length} tile{tiles.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Alliances in this level - collapsible */}
                  {!isCollapsed && (
                    <div className="divide-y divide-discord-lighter-gray/50">
                      {tiles.map((tile) => (
                        <div
                          key={tile.id}
                          onClick={() => onTileClick(tile)}
                          className={`px-4 pl-8 cursor-pointer transition-colors duration-150 ${
                            isMobile ? 'py-3 active:bg-discord-light-gray' : 'py-2 hover:bg-discord-light-gray'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-sm text-discord-text">
                            {tile.claim?.color && (
                              <span
                                className="w-3 h-3 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: tile.claim.color }}
                              />
                            )}
                            <span className="truncate">{tile.claim?.allianceName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Desktop container - hidden on mobile
export function TileList({ labeledTiles, tileClaims, filter, onFilterChange, onTileClick, onTileHover }) {
  return (
    <div className="w-[400px] max-lg:w-[320px] max-md:hidden bg-discord-gray border-l border-discord-lighter-gray pt-4 shrink-0 flex flex-col overflow-hidden">
      <h2 className="m-0 px-4 mb-2 text-base font-semibold text-discord-text">Claimed Tiles</h2>
      <TileListContent
        labeledTiles={labeledTiles}
        tileClaims={tileClaims}
        filter={filter}
        onFilterChange={onFilterChange}
        onTileClick={onTileClick}
        onTileHover={onTileHover}
        isMobile={false}
      />
    </div>
  );
}
