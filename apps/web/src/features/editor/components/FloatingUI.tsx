import { useReactFlow } from '@xyflow/react';
import { useWorkflowStore } from '../store/workflow.store';

export function FloatingUI() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { isLocked, toggleLock } = useWorkflowStore();

  return (
    <div className="absolute bottom-8 left-8 flex items-center gap-2 p-1 bg-surface-container-high rounded-full glass-panel z-10">
      <button 
        onClick={() => zoomIn({ duration: 300 })}
        className="p-3 text-on-surface hover:bg-surface-container-highest rounded-full flex items-center justify-center transition-colors"
        title="Zoom In"
      >
        <span className="material-symbols-outlined shrink-0 text-xl leading-none">zoom_in</span>
      </button>
      <button 
        onClick={() => zoomOut({ duration: 300 })}
        className="p-3 text-on-surface hover:bg-surface-container-highest rounded-full flex items-center justify-center transition-colors"
        title="Zoom Out"
      >
        <span className="material-symbols-outlined shrink-0 text-xl leading-none">zoom_out</span>
      </button>
      <div className="w-px h-6 bg-outline-variant mx-1"></div>
      <button 
        onClick={() => fitView({ duration: 800 })}
        className="p-3 text-on-surface hover:bg-surface-container-highest rounded-full flex items-center justify-center transition-colors"
        title="Fit View"
      >
        <span className="material-symbols-outlined shrink-0 text-xl leading-none">center_focus_weak</span>
      </button>
      <button 
        onClick={toggleLock}
        className={`p-3 rounded-full flex items-center justify-center transition-all ${
          isLocked 
            ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(var(--color-primary),0.5)]' 
            : 'text-on-surface hover:bg-surface-container-highest'
        }`}
        title={isLocked ? "Unlock Workflow" : "Lock Workflow"}
      >
        <span className="material-symbols-outlined shrink-0 text-xl leading-none">
          {isLocked ? 'lock' : 'lock_open'}
        </span>
      </button>
    </div>
  );
}
