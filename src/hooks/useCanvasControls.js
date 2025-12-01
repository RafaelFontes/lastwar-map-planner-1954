import { useState, useCallback, useRef, useEffect } from 'react';

const STORAGE_KEY = 'mapEditor_canvasState';

function loadCanvasState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load canvas state from localStorage:', e);
  }
  return null;
}

function saveCanvasState(scale, position) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scale, position }));
  } catch (e) {
    console.warn('Failed to save canvas state to localStorage:', e);
  }
}

export function useCanvasControls(tileGeometry) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const lastPointerPosition = useRef(null);
  const containerRef = useRef(null);
  const stageRef = useRef(null);

  // Touch gesture refs
  const lastTouchDistance = useRef(null);
  const lastTouchCenter = useRef(null);
  const touchStartTime = useRef(null);
  const isTouchPanning = useRef(false);

  // Fit map to screen
  const fitToScreen = useCallback(() => {
    if (!tileGeometry || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const mapWidth = tileGeometry.width;
    const mapHeight = tileGeometry.height;

    const scaleX = containerWidth / mapWidth;
    const scaleY = containerHeight / mapHeight;
    const newScale = Math.min(scaleX, scaleY) * 0.95;

    setScale(newScale);

    const scaledWidth = mapWidth * newScale;
    const scaledHeight = mapHeight * newScale;
    const offsetX = (containerWidth - scaledWidth) / 2;
    const offsetY = (containerHeight - scaledHeight) / 2;
    setPosition({ x: offsetX, y: offsetY });
  }, [tileGeometry]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (tileGeometry) {
        fitToScreen();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tileGeometry, fitToScreen]);

  // Initial load: restore saved state or fit to screen
  useEffect(() => {
    if (tileGeometry && !hasRestoredState) {
      const savedState = loadCanvasState();
      if (savedState && savedState.scale && savedState.position) {
        setScale(savedState.scale);
        setPosition(savedState.position);
      } else {
        fitToScreen();
      }
      setHasRestoredState(true);
    }
  }, [tileGeometry, hasRestoredState, fitToScreen]);

  // Save state to localStorage when scale or position changes
  useEffect(() => {
    if (hasRestoredState) {
      saveCanvasState(scale, position);
    }
  }, [scale, position, hasRestoredState]);

  // Zoom controls
  const zoom = useCallback((direction) => {
    const scaleBy = 1.1;
    let newScale;

    if (direction === 'in') {
      newScale = scale * scaleBy;
    } else if (direction === 'out') {
      newScale = scale / scaleBy;
    } else {
      fitToScreen();
      return;
    }

    // Limit zoom
    if (newScale < 0.5 || newScale > 3) return;

    // Zoom to center
    if (containerRef.current) {
      const container = containerRef.current;
      const center = {
        x: container.clientWidth / 2,
        y: container.clientHeight / 2
      };

      const mousePointTo = {
        x: (center.x - position.x) / scale,
        y: (center.y - position.y) / scale,
      };

      const newPos = {
        x: center.x - mousePointTo.x * newScale,
        y: center.y - mousePointTo.y * newScale,
      };

      setScale(newScale);
      setPosition(newPos);
    } else {
      setScale(newScale);
    }
  }, [scale, position, fitToScreen]);

  // Pan handlers
  const handlePanStart = useCallback((clientX, clientY) => {
    setIsPanning(true);
    lastPointerPosition.current = { x: clientX, y: clientY };
  }, []);

  const handlePanMove = useCallback((clientX, clientY) => {
    if (!isPanning || !lastPointerPosition.current) return;

    const dx = clientX - lastPointerPosition.current.x;
    const dy = clientY - lastPointerPosition.current.y;

    setPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));

    lastPointerPosition.current = { x: clientX, y: clientY };
  }, [isPanning]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    lastPointerPosition.current = null;
  }, []);

  // Touch gesture handlers
  const getTouchDistance = useCallback((touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getTouchCenter = useCallback((touches) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }, []);

  const handleTouchStart = useCallback((e) => {
    const touches = e.touches;
    touchStartTime.current = Date.now();

    if (touches.length === 2) {
      // Pinch gesture start
      e.preventDefault();
      lastTouchDistance.current = getTouchDistance(touches);
      lastTouchCenter.current = getTouchCenter(touches);
      isTouchPanning.current = false;
    } else if (touches.length === 1) {
      // Single touch - potential pan
      isTouchPanning.current = true;
      lastPointerPosition.current = {
        x: touches[0].clientX,
        y: touches[0].clientY
      };
    }
  }, [getTouchDistance, getTouchCenter]);

  const handleTouchMove = useCallback((e) => {
    const touches = e.touches;

    if (touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch to zoom
      e.preventDefault();
      const newDistance = getTouchDistance(touches);
      const newCenter = getTouchCenter(touches);

      // Calculate scale change
      const scaleChange = newDistance / lastTouchDistance.current;
      const newScale = Math.min(Math.max(scale * scaleChange, 0.3), 4);

      // Get the container-relative center point
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = newCenter.x - rect.left;
        const centerY = newCenter.y - rect.top;

        // Calculate the point on the map that's at the center of the pinch
        const pointTo = {
          x: (centerX - position.x) / scale,
          y: (centerY - position.y) / scale
        };

        // Calculate new position to keep the center point stationary
        const newPos = {
          x: centerX - pointTo.x * newScale,
          y: centerY - pointTo.y * newScale
        };

        // Also handle pan during pinch
        if (lastTouchCenter.current) {
          const dx = newCenter.x - lastTouchCenter.current.x;
          const dy = newCenter.y - lastTouchCenter.current.y;
          newPos.x += dx;
          newPos.y += dy;
        }

        setScale(newScale);
        setPosition(newPos);
      }

      lastTouchDistance.current = newDistance;
      lastTouchCenter.current = newCenter;
    } else if (touches.length === 1 && isTouchPanning.current && lastPointerPosition.current) {
      // Single touch pan
      const touch = touches[0];
      const dx = touch.clientX - lastPointerPosition.current.x;
      const dy = touch.clientY - lastPointerPosition.current.y;

      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));

      lastPointerPosition.current = {
        x: touch.clientX,
        y: touch.clientY
      };
      setIsPanning(true);
    }
  }, [scale, position, getTouchDistance, getTouchCenter]);

  const handleTouchEnd = useCallback((e) => {
    const touches = e.touches;

    if (touches.length < 2) {
      lastTouchDistance.current = null;
      lastTouchCenter.current = null;
    }

    if (touches.length === 0) {
      isTouchPanning.current = false;
      lastPointerPosition.current = null;
      setIsPanning(false);
    } else if (touches.length === 1) {
      // Transition from pinch to single-touch pan
      isTouchPanning.current = true;
      lastPointerPosition.current = {
        x: touches[0].clientX,
        y: touches[0].clientY
      };
    }

    touchStartTime.current = null;
  }, []);

  return {
    scale,
    position,
    isPanning,
    containerRef,
    stageRef,
    zoom,
    fitToScreen,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    // Touch gesture handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}
