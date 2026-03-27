import { useReactFlow } from '@xyflow/react';
import { Plus, Minus, Maximize, Square } from 'lucide-react';

export function FloatingUI() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <>
      {/* Top Right: Add Node Button */}
      <div className="absolute top-20 right-6 z-40">
        <button className="w-12 h-12 bg-[#2a2b2f] text-white rounded-xl shadow-lg border border-gray-700 flex items-center justify-center hover:bg-gray-700 transition-colors">
          <Plus size={24} />
        </button>
      </div>

      {/* Bottom Left: Zoom Controls */}
      <div className="absolute bottom-6 left-6 z-40 flex flex-col gap-2">
        <button 
          onClick={() => fitView({ duration: 800 })}
          className="w-10 h-10 bg-[#2a2b2f] text-gray-300 rounded-lg shadow-lg border border-gray-700 flex items-center justify-center hover:text-white hover:bg-gray-700 transition-colors"
          title="Fit View"
        >
          <Maximize size={18} />
        </button>
        <button 
          onClick={() => zoomIn({ duration: 300 })}
          className="w-10 h-10 bg-[#2a2b2f] text-gray-300 rounded-lg shadow-lg border border-gray-700 flex items-center justify-center hover:text-white hover:bg-gray-700 transition-colors"
          title="Zoom In"
        >
          <Plus size={20} />
        </button>
        <button 
          onClick={() => zoomOut({ duration: 300 })}
          className="w-10 h-10 bg-[#2a2b2f] text-gray-300 rounded-lg shadow-lg border border-gray-700 flex items-center justify-center hover:text-white hover:bg-gray-700 transition-colors"
          title="Zoom Out"
        >
          <Minus size={20} />
        </button>
      </div>

      {/* Bottom Center: Status Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-stretch shadow-xl rounded-full overflow-hidden border border-gray-800 h-10">
        <div className="bg-orange-500/90 hover:bg-orange-500 text-white px-5 flex items-center justify-center text-sm font-medium backdrop-blur-sm cursor-pointer transition-colors">
          Waiting for trigger event
        </div>
        <button className="bg-[#1e1e1e] hover:bg-gray-800 text-white w-12 flex items-center justify-center transition-colors border-l border-gray-800">
          <Square size={14} fill="white" />
        </button>
      </div>

      {/* Bottom Right: Chat Widget */}
      <div className="absolute bottom-6 right-6 z-40 flex items-end gap-3 group">
        <div className="bg-[#2a2b2f] text-gray-200 border border-gray-700 px-4 py-2.5 rounded-2xl rounded-br-sm shadow-xl text-sm font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-max">
          Hello again! How can I help you today?
        </div>
        <button className="w-14 h-14 bg-[#2a2b2f] border border-gray-700 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 to-purple-400">N</span>
        </button>
      </div>
    </>
  );
}
