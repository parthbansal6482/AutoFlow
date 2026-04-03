import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

// Main Flow Edge
export function MainFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {selected && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            strokeWidth: 8,
            stroke: 'rgba(255, 255, 255, 0.15)',
            filter: 'blur(4px)',
          }}
        />
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />
    </>
  );
}

// Resource Edge (Dashed)
export function ResourceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {selected && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            strokeWidth: 8,
            stroke: 'rgba(255, 255, 255, 0.1)',
            filter: 'blur(4px)',
          }}
        />
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
          strokeDasharray: '6 6',
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />
    </>
  );
}

export const edgeTypes = {
  mainFlow: MainFlowEdge,
  resource: ResourceEdge,
};
