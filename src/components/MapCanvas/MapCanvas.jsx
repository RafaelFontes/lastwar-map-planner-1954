import { useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Line, Text, Group, Rect } from 'react-konva';
import { polygonToPoints, calculatePolygonCentroid } from '../../utils/geometryUtils';
import { getContrastingTextColor } from '../../utils/colorUtils';

export function MapCanvas({
  tileGeometry,
  tiles,
  tileClaims,
  selectedTile,
  playbackHighlightTileId,
  onTileClick,
  scale,
  position,
  isPanning,
  containerRef,
  stageRef,
  onPanStart,
  onPanMove,
  onPanEnd
}) {
  // Track container dimensions in state to trigger re-renders when they change
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update dimensions when container changes or on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions(prev => {
          if (prev.width !== clientWidth || prev.height !== clientHeight) {
            return { width: clientWidth, height: clientHeight };
          }
          return prev;
        });
      }
    };

    // Initial measurement
    updateDimensions();

    // Use ResizeObserver for more reliable dimension tracking
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [containerRef]);
  // Handle mouse events for panning
  const handleMouseDown = useCallback((e) => {
    const evt = e.evt;

    // Middle mouse or shift+click always pans
    if (evt.button === 1 || (evt.shiftKey && evt.button === 0)) {
      onPanStart(evt.clientX, evt.clientY);
      return;
    }

    // Left click on empty space (stage background) pans
    const isClickOnTile = e.target !== e.currentTarget && e.target.getClassName() === 'Line';
    const isClickOnLabel = e.target !== e.currentTarget &&
      (e.target.getClassName() === 'Text' || e.target.getClassName() === 'Group');
    // Check if clicking on a draggable element (label that can be repositioned)
    const isClickOnDraggable = e.target.isDragging?.() || e.target.draggable?.() ||
      (e.target.parent && e.target.parent.draggable?.());

    console.log('MouseDown:', {
      className: e.target.getClassName(),
      isClickOnTile,
      isClickOnLabel,
      isClickOnDraggable,
      parentDraggable: e.target.parent?.draggable?.()
    });

    if (evt.button === 0 && !isClickOnTile && !isClickOnLabel && !isClickOnDraggable) {
      onPanStart(evt.clientX, evt.clientY);
    }
  }, [onPanStart]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      onPanMove(e.evt.clientX, e.evt.clientY);
    }
  }, [isPanning, onPanMove]);

  const handleMouseUp = useCallback(() => {
    onPanEnd();
  }, [onPanEnd]);

  const handleMouseLeave = useCallback(() => {
    onPanEnd();
  }, [onPanEnd]);

  if (!tileGeometry) {
    return (
      <div className="flex-1 flex justify-center items-center bg-discord-light-gray overflow-hidden max-md:h-[60vh]" ref={containerRef}>
        <div className="text-discord-text-muted text-base italic">Loading map data...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex justify-center items-center bg-discord-light-gray overflow-hidden max-md:h-[60vh]" ref={containerRef}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        {/* Background Layer - covers actual tile area */}
        <Layer>
          <Rect
            x={0}
            y={0}
            width={685}
            height={560}
            fill="#f8f9fa"
            listening={false}
          />
        </Layer>

        {/* Map Layer - Tile shapes */}
        <Layer>
          {tileGeometry.tiles.map((tileInfo) => {
            const tileData = tiles.get(tileInfo.id) || {};
            const claim = tileClaims?.get(tileInfo.id);
            const isSelected = selectedTile?.id === tileInfo.id;

            return (
              <TileShape
                key={tileInfo.id}
                tileInfo={tileInfo}
                tileData={tileData}
                claim={claim}
                isSelected={isSelected}
                isPanning={isPanning}
                onClick={() => !isPanning && onTileClick(tileInfo)}
              />
            );
          })}
        </Layer>

        {/* Highlight Layer */}
        <Layer>
          {/* Playback highlight - yellow pulsing effect */}
          {playbackHighlightTileId && tileGeometry.tiles.find(t => t.id === playbackHighlightTileId) && (
            <Line
              points={polygonToPoints(tileGeometry.tiles.find(t => t.id === playbackHighlightTileId).polygon)}
              stroke="#facc15"
              strokeWidth={4}
              fill="rgba(250, 204, 21, 0.5)"
              closed={true}
              listening={false}
            />
          )}
          {/* Selected tile highlight - yellow glow */}
          {selectedTile && (
            <Line
              points={polygonToPoints(selectedTile.polygon)}
              stroke="#fbbf24"
              strokeWidth={4}
              closed={true}
              listening={false}
              shadowColor="#fbbf24"
              shadowBlur={15}
              shadowOpacity={0.8}
            />
          )}
        </Layer>

        {/* Text Layer - Numbers and icons */}
        <Layer>
          {tileGeometry.tiles.map((tileInfo) => {
            const tileData = tiles.get(tileInfo.id) || {};
            if (!tileData.number && tileData.number !== 0 && !tileData.icon) return null;

            const claim = tileClaims?.get(tileInfo.id);
            const centroid = calculatePolygonCentroid(tileInfo.polygon);
            // Use claim color for text contrast if tile is claimed
            const bgColor = claim?.color || '#f8f9fa';
            const textColor = getContrastingTextColor(bgColor);

            return (
              <TileLabel
                key={`label-${tileInfo.id}`}
                tileData={tileData}
                centroid={centroid}
                textColor={textColor}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

function TileShape({ tileInfo, tileData, claim, isSelected, isPanning, onClick }) {
  const points = polygonToPoints(tileInfo.polygon);
  // Use claim's alliance color if tile is claimed, otherwise default background
  const fillColor = claim?.color || '#f8f9fa';
  const hasLabel = tileData.number !== undefined && tileData.number !== '';

  return (
    <Line
      points={points}
      fill={fillColor}
      stroke="rgba(0, 0, 0, 0.15)"
      strokeWidth={1}
      closed={true}
      listening={!(isSelected && hasLabel)}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!isPanning) {
          e.target.fill('#e3e8f0');
          e.target.getLayer().batchDraw();
          e.target.getStage().container().style.cursor = 'pointer';
        }
      }}
      onMouseLeave={(e) => {
        if (!isPanning) {
          e.target.fill(fillColor);
          e.target.getLayer().batchDraw();
          e.target.getStage().container().style.cursor = 'default';
        }
      }}
    />
  );
}

function TileLabel({ tileData, centroid, textColor }) {
  const hasNumber = tileData.number !== undefined && tileData.number !== '';
  const hasIcon = !!tileData.icon;

  // Calculate label position from centroid + offset (read-only)
  const labelOffset = tileData.labelOffset || { x: 0, y: 0 };
  const labelX = centroid.x + labelOffset.x;
  const labelY = centroid.y + labelOffset.y;

  return (
    <Group
      x={labelX}
      y={labelY}
      listening={false}
    >
      {hasNumber && (
        <Text
          x={0}
          y={0}
          text={String(tileData.number)}
          fontSize={18}
          fontFamily="Arial"
          fontStyle="bold"
          fill={textColor}
          offsetX={0}
          offsetY={0}
          align="center"
          verticalAlign="middle"
        />
      )}
      {hasIcon && (
        <Text
          x={0}
          y={hasNumber ? 15 : 0}
          text={tileData.icon}
          fontSize={20}
          fontFamily="Arial"
          offsetX={0}
          offsetY={0}
          align="center"
          verticalAlign="middle"
        />
      )}
    </Group>
  );
}
