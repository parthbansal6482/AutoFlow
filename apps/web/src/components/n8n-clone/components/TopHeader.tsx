import { History, MoreVertical } from 'lucide-react';

export function TopHeader() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#151515] text-white flex items-center justify-between p-2 h-14 border-b border-gray-800 shadow-sm">
      {/* Left side */}
      <div className="flex items-center gap-4 pl-2">
        <div className="flex items-center gap-2 cursor-pointer">
          {/* Logo Placeholder */}
          <div className="w-6 h-6 bg-rose-500 rounded-sm flex justify-center items-center text-xs font-bold shadow-md">
            n
          </div>
          <span className="font-semibold text-lg tracking-tight">n8n</span>
        </div>
        
        <button className="text-sm text-gray-400 hover:text-white transition-colors ml-4 flex items-center gap-1">
          <span className="text-lg leading-none">+</span> Add tag
        </button>
      </div>

      {/* Center Segmented Control */}
      <div className="flex items-center bg-[#1e1e1e] rounded-full p-1 border border-gray-800">
        <button className="px-5 py-1.5 text-sm font-medium rounded-full bg-[#2a2b2f] text-white shadow-sm transition-all">
          Editor
        </button>
        <button className="px-5 py-1.5 text-sm font-medium rounded-full text-gray-400 hover:text-gray-200 transition-all transparent">
          Executions
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-5 pr-2">
        {/* Toggle Switch */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Inactive</span>
          <div className="w-10 h-5 bg-gray-700 rounded-full relative cursor-pointer border border-gray-600">
            <div className="w-4 h-4 bg-gray-400 rounded-full absolute left-0.5 top-0.5 transition-all"></div>
          </div>
        </div>

        {/* Share Button */}
        <button className="px-3 py-1 text-sm font-medium rounded border border-gray-600 hover:bg-gray-800 transition-colors">
          Share
        </button>

        {/* Saved Text */}
        <span className="text-sm text-gray-400">Saved</span>

        {/* Action Icons */}
        <div className="flex items-center gap-3 text-gray-400">
          <button className="hover:text-white transition-colors">
            <History size={18} />
          </button>
          <button className="hover:text-white transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold shadow-md cursor-pointer border border-gray-700 text-white">
          N
        </div>
      </div>
    </div>
  );
}
