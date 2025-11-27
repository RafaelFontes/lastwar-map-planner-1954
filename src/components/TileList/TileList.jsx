export function TileList({ labeledTiles, filter, onFilterChange, onTileClick }) {
  return (
    <div className="w-[400px] max-lg:w-[320px] max-md:hidden bg-discord-gray border-l border-discord-lighter-gray p-4 pt-5 shrink-0 flex flex-col overflow-hidden">
      <div className="flex flex-col gap-3 mb-4">
        <h2 className="m-0 text-base font-semibold text-discord-text">Labeled Tiles</h2>
        <div>
          <input
            type="text"
            placeholder="Filter by number or name..."
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-3 py-2 border border-discord-lighter-gray rounded text-sm w-full bg-discord-dark text-discord-text placeholder-discord-text-muted transition-colors duration-200 focus:outline-none focus:border-discord-blurple focus:ring-2 focus:ring-discord-blurple/20"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto border border-discord-lighter-gray rounded">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-discord-not-quite-black sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-discord-text-secondary border-b-2 border-discord-lighter-gray">Number</th>
              <th className="px-4 py-3 text-left font-semibold text-discord-text-secondary border-b-2 border-discord-lighter-gray">Name</th>
            </tr>
          </thead>
          <tbody>
            {labeledTiles.length === 0 ? (
              <tr>
                <td colSpan="2" className="text-center text-discord-text-muted italic py-5 px-4">
                  {filter ? 'No matching tiles' : 'No labeled tiles yet'}
                </td>
              </tr>
            ) : (
              labeledTiles.map((tile) => (
                <tr
                  key={tile.id}
                  onClick={() => onTileClick(tile)}
                  className="hover:bg-discord-lighter-gray cursor-pointer transition-colors duration-150"
                >
                  <td className="px-4 py-3 border-b border-discord-lighter-gray text-discord-text">{tile.number !== '' ? tile.number : '-'}</td>
                  <td className="px-4 py-3 border-b border-discord-lighter-gray text-discord-text">{tile.name || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
