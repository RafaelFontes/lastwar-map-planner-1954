import { useState } from 'react';

export function CommentsPanel({ selectedTile, comments, onAddComment, isReadOnly = false }) {
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (newComment.trim() && selectedTile) {
      onAddComment(selectedTile.id, newComment);
      setNewComment('');
    }
  };

  if (!selectedTile) {
    return (
      <div className="max-h-[300px] overflow-y-auto mb-4">
        <p className="text-discord-text-muted italic text-sm">Select a tile to view comments</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-h-[300px] overflow-y-auto mb-4">
        {comments.length === 0 ? (
          <p className="text-discord-text-muted italic text-sm">No comments yet</p>
        ) : (
          comments.map((comment, index) => (
            <div key={index} className="p-3 mb-2 bg-discord-light-gray rounded text-sm border-l-3 border-l-discord-blurple">
              <div className="flex justify-between items-center mb-2">
                <span className="text-discord-blurple font-semibold text-xs">{comment.user}</span>
                <span className="text-discord-text-muted text-[11px]">{comment.timestamp}</span>
              </div>
              <div className="text-discord-text leading-relaxed">{comment.text}</div>
            </div>
          ))
        )}
      </div>
      {!isReadOnly && (
        <div className="mt-4">
          <div className="mb-4">
            <textarea
              placeholder="Add a comment..."
              rows="3"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full px-3 py-2 border border-discord-lighter-gray rounded text-sm bg-discord-dark text-discord-text transition-colors duration-200 focus:outline-none focus:border-discord-blurple focus:ring-2 focus:ring-discord-blurple/20 font-inherit resize-y min-h-[60px]"
            />
          </div>
          <button
            onClick={handleAddComment}
            className="w-full px-4 py-2.5 border-none rounded text-sm font-medium cursor-pointer transition-all duration-200 bg-discord-blurple text-white hover:-translate-y-0.5 hover:shadow-lg hover:bg-discord-blurple-hover active:translate-y-0"
          >
            Add Comment
          </button>
        </div>
      )}
      {isReadOnly && (
        <p className="text-discord-text-muted italic text-sm">Sign in with Discord to add comments</p>
      )}
    </>
  );
}
