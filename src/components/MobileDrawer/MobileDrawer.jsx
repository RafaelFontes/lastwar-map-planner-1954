import { useEffect, useRef, useCallback } from 'react';

export function MobileDrawer({ isOpen, onClose, title, children, position = 'bottom' }) {
  const drawerRef = useRef(null);
  const startY = useRef(null);
  const currentY = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Touch handlers for swipe to close
  const handleTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!startY.current) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    // Only allow dragging down for bottom drawer
    if (position === 'bottom' && diff > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateY(${diff}px)`;
    }
  }, [position]);

  const handleTouchEnd = useCallback(() => {
    if (!startY.current || !currentY.current) {
      startY.current = null;
      currentY.current = null;
      return;
    }

    const diff = currentY.current - startY.current;

    // Close if dragged more than 100px down
    if (position === 'bottom' && diff > 100) {
      onClose();
    }

    // Reset transform
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
    }

    startY.current = null;
    currentY.current = null;
  }, [position, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`absolute bg-discord-gray flex flex-col transition-transform duration-300 ease-out ${
          position === 'bottom'
            ? 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl'
            : 'top-0 bottom-0 right-0 w-[85vw] max-w-[400px]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar for bottom drawer */}
        {position === 'bottom' && (
          <div className="flex justify-center py-2 shrink-0">
            <div className="w-10 h-1 bg-discord-lightest-gray rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-discord-lighter-gray shrink-0">
          <h2 className="text-lg font-semibold text-discord-text">{title}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-discord-text-muted hover:text-discord-text rounded-full hover:bg-discord-lighter-gray transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
