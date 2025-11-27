import { TileEditor } from './TileEditor';
import { CommentsPanel } from './CommentsPanel';
import { HistoryPanel } from './HistoryPanel';

export function Sidebar({
  selectedTile,
  tileData,
  comments,
  history,
  activeTab,
  onTabChange,
  onSaveTile,
  onClearTile,
  onAddComment,
  isReadOnly = false
}) {
  return (
    <div className="w-[320px] max-lg:w-[280px] max-md:w-full max-md:h-[40vh] max-md:border-l-0 max-md:border-t max-md:border-t-discord-lighter-gray flex flex-col border-l border-discord-lighter-gray bg-discord-gray overflow-y-auto shrink-0">
      <TileEditor
        selectedTile={selectedTile}
        tileData={tileData}
        onSave={onSaveTile}
        onClear={onClearTile}
        isReadOnly={isReadOnly}
      />

      <div className="p-4 pt-5 border-b border-discord-lighter-gray last:flex-1 last:border-b-0">
        <div className="flex gap-0 mb-4 border-b-2 border-discord-lighter-gray">
          <button
            className={`flex-1 px-4 py-2.5 border-none bg-transparent text-sm font-medium cursor-pointer transition-all duration-200 border-b-2 -mb-0.5 ${
              activeTab === 'comments'
                ? 'text-discord-blurple border-discord-blurple'
                : 'text-discord-text-muted border-transparent hover:text-discord-blurple'
            }`}
            onClick={() => onTabChange('comments')}
          >
            Comments
          </button>
          <button
            className={`flex-1 px-4 py-2.5 border-none bg-transparent text-sm font-medium cursor-pointer transition-all duration-200 border-b-2 -mb-0.5 ${
              activeTab === 'history'
                ? 'text-discord-blurple border-discord-blurple'
                : 'text-discord-text-muted border-transparent hover:text-discord-blurple'
            }`}
            onClick={() => onTabChange('history')}
          >
            History
          </button>
        </div>

        <div className={activeTab === 'comments' ? 'block' : 'hidden'}>
          <CommentsPanel
            selectedTile={selectedTile}
            comments={comments}
            onAddComment={onAddComment}
            isReadOnly={isReadOnly}
          />
        </div>

        <div className={activeTab === 'history' ? 'block' : 'hidden'}>
          <HistoryPanel history={history} />
        </div>
      </div>
    </div>
  );
}
