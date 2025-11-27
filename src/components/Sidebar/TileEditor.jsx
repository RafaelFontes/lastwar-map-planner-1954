import { useState, useEffect } from 'react';

const ICON_OPTIONS = [
  { value: '', label: 'None' },
  { value: '🏰', label: 'Castle 🏰' },
  { value: '⚔️', label: 'Sword ⚔️' },
  { value: '🛡️', label: 'Shield 🛡️' },
  { value: '👑', label: 'Crown 👑' },
  { value: '💎', label: 'Gem 💎' },
  { value: '🔥', label: 'Fire 🔥' },
  { value: '⭐', label: 'Star ⭐' },
  { value: '🎯', label: 'Target 🎯' }
];

const inputClasses = "w-full px-3 py-2 border border-discord-lighter-gray rounded text-sm bg-discord-dark text-discord-text transition-colors duration-200 focus:outline-none focus:border-discord-blurple focus:ring-2 focus:ring-discord-blurple/20 font-inherit";

export function TileEditor({ selectedTile, tileData, onSave, onClear, isReadOnly = false }) {
  const [formData, setFormData] = useState({
    number: '',
    name: '',
    icon: '',
    color: '#36393f',
    comments: ''
  });

  // Sync form data when tile selection changes
  useEffect(() => {
    if (selectedTile) {
      setFormData({
        number: tileData.number || '',
        name: tileData.name || '',
        icon: tileData.icon || '',
        color: tileData.color || '#36393f',
        comments: tileData.comments || ''
      });
    }
  }, [selectedTile, tileData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(selectedTile.id, formData);
  };

  const handleClear = () => {
    onClear(selectedTile.id);
    setFormData({
      number: '',
      name: '',
      icon: '',
      color: '#36393f',
      comments: ''
    });
  };

  if (!selectedTile) {
    return (
      <div className="p-4 pt-5 border-b border-discord-lighter-gray">
        <h2 className="text-base font-semibold mb-4 text-discord-text">Tile Editor</h2>
        <div className="mt-3">
          <p className="text-discord-text-muted italic text-sm">
            {isReadOnly ? 'Sign in with Discord to edit tiles' : 'Click on a tile to edit'}
          </p>
        </div>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="p-4 pt-5 border-b border-discord-lighter-gray">
        <h2 className="text-base font-semibold mb-4 text-discord-text">Tile Viewer</h2>
        <div className="mt-3">
          <div className="mb-4">
            <label className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Number:</label>
            <span className="text-discord-text text-sm">{tileData.number || '-'}</span>
          </div>
          <div className="mb-4">
            <label className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Name:</label>
            <span className="text-discord-text text-sm">{tileData.name || '-'}</span>
          </div>
          <div className="mb-4">
            <label className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Icon:</label>
            <span className="text-discord-text text-sm">{tileData.icon || '-'}</span>
          </div>
          <div className="mb-4">
            <label className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Color:</label>
            <span className="text-discord-text text-sm inline-flex items-center gap-2">
              <span className="w-5 h-5 rounded border border-discord-lighter-gray" style={{ backgroundColor: tileData.color || '#36393f' }}></span>
              {tileData.color || '#36393f'}
            </span>
          </div>
          {tileData.comments && (
            <div className="mb-4">
              <label className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Notes:</label>
              <p className="text-discord-text text-sm">{tileData.comments}</p>
            </div>
          )}
          <p className="text-discord-text-muted italic text-sm">Sign in with Discord to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-5 border-b border-discord-lighter-gray">
      <h2 className="text-base font-semibold mb-4 text-discord-text">Tile Editor</h2>
      <div className="mt-3">
        <div className="mb-4">
          <label htmlFor="tileNumber" className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Number:</label>
          <input
            type="number"
            id="tileNumber"
            min="0"
            max="99"
            value={formData.number}
            onChange={(e) => handleChange('number', e.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="tileName" className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Name:</label>
          <input
            type="text"
            id="tileName"
            placeholder="Enter tile name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="tileIcon" className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Icon:</label>
          <select
            id="tileIcon"
            value={formData.icon}
            onChange={(e) => handleChange('icon', e.target.value)}
            className={inputClasses}
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="tileColor" className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Tile Color:</label>
          <input
            type="color"
            id="tileColor"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
            className="w-full h-10 p-1 cursor-pointer border border-discord-lighter-gray rounded bg-discord-dark"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="tileComments" className="block mb-1.5 font-medium text-sm text-discord-text-secondary">Comments:</label>
          <textarea
            id="tileComments"
            placeholder="Add notes about this tile..."
            rows="3"
            value={formData.comments}
            onChange={(e) => handleChange('comments', e.target.value)}
            className={`${inputClasses} resize-y min-h-[60px]`}
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full mb-2 px-4 py-2.5 border-none rounded text-sm font-medium cursor-pointer transition-all duration-200 bg-discord-blurple text-white hover:-translate-y-0.5 hover:shadow-lg hover:bg-discord-blurple-hover active:translate-y-0"
        >
          Save Tile
        </button>
        <button
          onClick={handleClear}
          className="w-full px-4 py-2.5 border-none rounded text-sm font-medium cursor-pointer transition-all duration-200 bg-discord-lightest-gray text-discord-text hover:-translate-y-0.5 hover:shadow-lg hover:bg-discord-text-muted active:translate-y-0"
        >
          Clear Tile
        </button>
      </div>
    </div>
  );
}
