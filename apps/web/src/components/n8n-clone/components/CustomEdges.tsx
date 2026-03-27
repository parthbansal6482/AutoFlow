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
            stroke: 'rgba(43, 110, 245, 0.4)',
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
          stroke: selected ? '#2b6ef5' : '#64748b',
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
            stroke: 'rgba(168, 85, 247, 0.4)',
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
          stroke: selected ? '#a855f7' : '#475569',
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
