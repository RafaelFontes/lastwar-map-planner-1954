import { useCallback, useRef } from 'react';
import { Stage, Layer, Line, Text, Group, Rect } from 'react-konva';
import { polygonToPoints, calculatePolygonCentroid, constrainPointToPolygon } from '../../utils/geometryUtils';
import { getContrastingTextColor } from '../../utils/colorUtils';

export function MapCanvas({
  tileGeometry,
  tiles,
  selectedTile,
  onTileClick,
  onLabelMove,
  scale,
  position,
  isPanning,
  containerRef,
  stageRef,
  onPanStart,
  onPanMove,
  onPanEnd
}) {
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
    const isClickOnLabel = e.target !== e.currentTarget && e.target.getClassName() === 'Text';
    if (evt.button === 0 && !isClickOnTile && !isClickOnLabel) {
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

  // Get container dimensions
  const containerWidth = containerRef.current?.clientWidth || 800;
  const containerHeight = containerRef.current?.clientHeight || 600;

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
        width={containerWidth}
        height={containerHeight}
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
            const isSelected = selectedTile?.id === tileInfo.id;

            return (
              <TileShape
                key={tileInfo.id}
                tileInfo={tileInfo}
                tileData={tileData}
                isSelected={isSelected}
                isPanning={isPanning}
                onClick={() => !isPanning && onTileClick(tileInfo)}
              />
            );
          })}
        </Layer>

        {/* Highlight Layer */}
        <Layer>
          {selectedTile && (
            <Line
              points={polygonToPoints(selectedTile.polygon)}
              fill="rgba(220, 38, 38, 0.4)"
              closed={true}
              listening={false}
            />
          )}
        </Layer>

        {/* Text Layer - Numbers and icons */}
        <Layer>
          {tileGeometry.tiles.map((tileInfo) => {
            const tileData = tiles.get(tileInfo.id) || {};
            if (!tileData.number && tileData.number !== 0 && !tileData.icon) return null;

            const centroid = calculatePolygonCentroid(tileInfo.polygon);
            const textColor = getContrastingTextColor(tileData.color);
            const isSelected = selectedTile?.id === tileInfo.id;

            return (
              <TileLabel
                key={`label-${tileInfo.id}`}
                tileId={tileInfo.id}
                tileData={tileData}
                polygon={tileInfo.polygon}
                centroid={centroid}
                textColor={textColor}
                isSelected={isSelected}
                onLabelMove={onLabelMove}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

function TileShape({ tileInfo, tileData, isSelected, isPanning, onClick }) {
  const points = polygonToPoints(tileInfo.polygon);
  const fillColor = tileData.color || '#f8f9fa';

  return (
    <Line
      points={points}
      fill={fillColor}
      stroke="rgba(0, 0, 0, 0.15)"
      strokeWidth={1}
      closed={true}
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

function TileLabel({ tileId, tileData, polygon, centroid, textColor, isSelected, onLabelMove }) {
  const hasNumber = tileData.number !== undefined && tileData.number !== '';
  const hasIcon = !!tileData.icon;
  const groupRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Calculate label position from centroid + offset
  const labelOffset = tileData.labelOffset || { x: 0, y: 0 };
  const labelX = centroid.x + labelOffset.x;
  const labelY = centroid.y + labelOffset.y;

  const handleDragStart = useCallback((e) => {
    isDraggingRef.current = true;
    e.target.getStage().container().style.cursor = 'grabbing';
  }, []);

  const handleDragMove = useCallback((e) => {
    const node = e.target;
    const newPos = { x: node.x(), y: node.y() };

    // Constrain to polygon boundary
    const constrainedPos = constrainPointToPolygon(newPos, polygon);

    // Update position if constrained
    if (constrainedPos.x !== newPos.x || constrainedPos.y !== newPos.y) {
      node.x(constrainedPos.x);
      node.y(constrainedPos.y);
    }
  }, [polygon]);

  const handleDragEnd = useCallback((e) => {
    isDraggingRef.current = false;
    e.target.getStage().container().style.cursor = 'move';

    const node = e.target;
    const newPos = { x: node.x(), y: node.y() };

    // Constrain final position
    const constrainedPos = constrainPointToPolygon(newPos, polygon);

    // Calculate offset from centroid
    const newOffset = {
      x: constrainedPos.x - centroid.x,
      y: constrainedPos.y - centroid.y
    };

    // Notify parent of the move
    if (onLabelMove) {
      onLabelMove(tileId, newOffset);
    }
  }, [tileId, polygon, centroid, onLabelMove]);

  const handleMouseEnter = useCallback((e) => {
    if (isSelected && !isDraggingRef.current) {
      e.target.getStage().container().style.cursor = 'move';
    }
  }, [isSelected]);

  const handleMouseLeave = useCallback((e) => {
    if (!isDraggingRef.current) {
      e.target.getStage().container().style.cursor = 'default';
    }
  }, []);

  return (
    <Group
      ref={groupRef}
      x={labelX}
      y={labelY}
      draggable={isSelected}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
